import { makeAutoObservable, runInAction } from 'mobx';
import {
  autoGainTrimDb,
  endOfTrackWarnLevel,
  pitchPosFromRate,
  pitchRate,
  resolveCueHoldEnd,
  resolveCueHoldStart,
  resolveCuePress,
  type Settings,
} from '@stentordeck/shared';
import { audioEngine } from '../audio/AudioEngine';
import { decodeArrayBufferOffThread } from '../audio/decodeAudio';
import type { DeckId } from '../audio/DeckGraph';

export class DeckPlayingError extends Error {
  constructor(public readonly deckId: DeckId) {
    super(`Deck ${deckId} is playing`);
    this.name = 'DeckPlayingError';
  }
}

export type LoadedTrackMeta = {
  title: string;
  artist: string;
  fileBpm: number | null;
  loudnessLufs: number | null;
};

export class DeckStore {
  readonly id: DeckId;
  state: 'empty' | 'stopped' | 'playing' = 'empty';
  title = '';
  artist = '';
  fileBpm: number | null = null;
  loudnessLufs: number | null = null;
  loading = false;

  /** Logical pitch fader 0..1 */
  pitchPos = 0.5;
  nudgeFactor = 1;
  /** Latching SYNC — lit while on; press again to release (docs/06). */
  syncArmed = false;
  /** Partner deck id while sync is on (for tempo follow). */
  syncPartner: DeckId | null = null;
  cueOffset = 0;
  cuePreviewing = false;

  trimDb = 0;
  eq = { low: 0.5, mid: 0.5, high: 0.5 };
  kills = { low: false, mid: false, high: false };
  filterOn = false;
  filterAmount = 0.5;
  flangerOn = false;
  flangerWet = 0;
  pfl = false;
  /** True when we auto-started transport so a stopped deck can be heard in PFL. */
  private pflMonitor = false;

  position = 0;
  duration = 0;
  eotWarn: 0 | 30 | 15 | 10 = 0;

  private nudgeTimer: number | null = null;
  private seekHoldTimer: number | null = null;
  /** Temporary pitch bend while held (docs/04: ±0.5%). */
  bendFactor = 1;
  private getSettings: () => Settings;
  /**
   * Compressed file bytes for rebuilds — not observable.
   * Re-decode into the live AudioContext after USB/teardown (never stash PCM:
   * cloning from a dying context truncated tracks to ~25–28s).
   */
  fileBytes: ArrayBuffer | null = null;

  constructor(id: DeckId, getSettings: () => Settings) {
    this.id = id;
    this.getSettings = getSettings;
    makeAutoObservable(this, { fileBytes: false }, { autoBind: true });
  }

  get effectiveRate(): number {
    const s = this.getSettings();
    return (
      pitchRate(this.pitchPos, s.mixer.pitchFaders.centerDeadZone, s.mixer.pitchFaders.range) *
      this.nudgeFactor *
      this.bendFactor
    );
  }

  get effectiveBpm(): number | null {
    if (this.fileBpm == null) return null;
    return this.fileBpm * this.effectiveRate;
  }

  /** Single choke point for load (R4.2 / R3.3). */
  async load(file: File, meta?: Partial<LoadedTrackMeta>): Promise<void> {
    if (this.state === 'playing') {
      throw new DeckPlayingError(this.id);
    }
    this.loading = true;
    try {
      await audioEngine.waitUntilDecodeReady();
      audioEngine.beginDecode();
      try {
        await audioEngine.ensureRunning();
        const ab = await file.arrayBuffer();
        // Independent copy — decodeAudioData may detach its argument.
        const fileBytes = ab.slice(0);
        const buffer = await this.decodeIntoLiveContext(fileBytes);
        const transport = audioEngine.transport(this.id);
        if (!transport) throw new Error('No transport');

        this.fileBytes = fileBytes;
        transport.setBuffer(buffer);
        this.resetOnLoad(meta);
        runInAction(() => {
          this.title = meta?.title ?? file.name;
          this.artist = meta?.artist ?? '';
          this.fileBpm = meta?.fileBpm ?? null;
          this.loudnessLufs = meta?.loudnessLufs ?? null;
          this.duration = buffer.duration;
          this.position = 0;
          this.state = 'stopped';
          this.applyAutoGain();
          this.loading = false;
        });
        this.pushGraph();
      } finally {
        audioEngine.endDecode();
      }
    } catch (err) {
      runInAction(() => {
        this.loading = false;
      });
      throw err;
    }
  }

  /**
   * Decode file bytes into the current master context.
   * If the engine rebuilds mid-await, retry on the new context (epoch guard).
   */
  private async decodeIntoLiveContext(fileBytes: ArrayBuffer): Promise<AudioBuffer> {
    for (let attempt = 0; attempt < 4; attempt++) {
      await audioEngine.waitUntilDecodeReady();
      const epoch = audioEngine.epoch;
      const ctx = audioEngine.masterCtx;
      if (!ctx) throw new Error('Audio engine not ready');
      const buffer = await decodeArrayBufferOffThread(ctx, fileBytes);
      if (audioEngine.epoch === epoch && audioEngine.masterCtx === ctx) {
        return buffer;
      }
    }
    throw new Error('Audio engine kept rebuilding while decoding — try loading again');
  }

  /** Unit-testable reset checklist (R3.3). */
  resetOnLoad(meta?: Partial<LoadedTrackMeta>): void {
    this.filterOn = false;
    this.filterAmount = 0.5;
    this.flangerOn = false;
    this.flangerWet = 0;
    this.kills = { low: false, mid: false, high: false };
    this.nudgeFactor = 1;
    this.bendFactor = 1;
    this.stopSeekHold();
    this.clearSync();
    this.cueOffset = 0;
    this.cuePreviewing = false;
    this.pfl = false;
    this.pflMonitor = false;
    this.eotWarn = 0;
    if (meta?.loudnessLufs != null) this.loudnessLufs = meta.loudnessLufs;
    // pitchPos kept (soft takeover re-arm is MIDI-layer concern)
  }

  applyAutoGain(): void {
    const s = this.getSettings();
    if (!s.audio.autoGain || this.loudnessLufs == null) {
      this.trimDb = 0;
      return;
    }
    this.trimDb = autoGainTrimDb(this.loudnessLufs, s.audio.autoGainTargetLufs);
  }

  play(opts?: { soft?: boolean }): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    void audioEngine.ensureRunning();
    if (opts?.soft !== false) {
      // Default soft-start — avoids PA/cue clicks on buffer create.
      audioEngine.graph(this.id)?.softStartInput(0.02);
    }
    t.setRate(this.effectiveRate);
    t.play(this.effectiveRate);
    this.state = 'playing';
    this.cuePreviewing = false;
  }

  pause(opts?: { brake?: boolean; soft?: boolean }): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state !== 'playing') return;
    const s = this.getSettings();
    const graph = audioEngine.graph(this.id);
    if (opts?.soft) {
      graph?.softStopInput(0.015);
      window.setTimeout(() => {
        runInAction(() => {
          if (opts?.brake ?? s.audio.brakeOnStop) {
            t.brake(s.audio.brakeMs);
          } else {
            t.pause();
            this.position = t.position();
          }
          this.state = 'stopped';
          graph?.restoreInputGain();
        });
      }, 18);
      return;
    }
    if (opts?.brake ?? s.audio.brakeOnStop) {
      t.brake(s.audio.brakeMs);
      this.state = 'stopped';
      return;
    }
    t.pause();
    this.position = t.position();
    this.state = 'stopped';
  }

  togglePlay(): void {
    if (this.state === 'playing') this.pause();
    else this.play();
  }

  /** Classic CDJ cue press (docs/03 / R2.10) — playing → jump to cue and stop. */
  cuePress(): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    const action = resolveCuePress(this.state, t.position(), this.cueOffset);
    if (action.kind === 'setCue') {
      this.cueOffset = action.cueOffset;
      return;
    }
    if (action.kind === 'jumpAndStop') {
      const graph = audioEngine.graph(this.id);
      graph?.softStopInput(0.02);
      t.pause();
      t.seek(action.seekTo);
      this.position = action.seekTo;
      this.state = 'stopped';
      this.cuePreviewing = false;
      graph?.restoreInputGain();
    }
  }

  cueHoldStart(): void {
    const t = audioEngine.transport(this.id);
    if (!t) return;
    const action = resolveCueHoldStart(this.state, this.cueOffset);
    if (action.kind !== 'previewFromCue') return;
    this.cuePreviewing = true;
    t.seek(action.seekTo);
    t.setRate(this.effectiveRate);
    this.play({ soft: true });
    this.cuePreviewing = true; // play() clears it — restore
  }

  cueHoldEnd(): void {
    const action = resolveCueHoldEnd(this.cuePreviewing, this.cueOffset);
    if (action.kind !== 'stopSnapCue') return;
    this.cuePreviewing = false;
    const t = audioEngine.transport(this.id);
    const graph = audioEngine.graph(this.id);
    // Longer soft-stop before pause — cue release was the main click source.
    graph?.softStopInput(0.025);
    window.setTimeout(() => {
      runInAction(() => {
        t?.pause();
        t?.seek(action.seekTo);
        this.position = action.seekTo;
        this.state = 'stopped';
        graph?.restoreInputGain();
      });
    }, 28);
  }

  seek(offset: number): void {
    audioEngine.transport(this.id)?.seek(offset);
    this.position = offset;
  }

  setPitchPos(pos: number): void {
    this.pitchPos = Math.min(1, Math.max(0, pos));
    // Moving pitch releases SYNC (docs/03).
    this.clearSync();
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
  }

  clearSync(): void {
    this.syncArmed = false;
    this.syncPartner = null;
  }

  /**
   * SYNC is a latching on/off control (docs/06 lit until released).
   * On → match other deck tempo and stay armed (follow while on).
   * Off → clear armed; leave pitch where it is.
   */
  toggleSync(other: DeckStore): void {
    if (this.syncArmed) {
      this.clearSync();
      return;
    }
    if (this.state === 'empty' || other.state === 'empty') return;
    this.syncPartner = other.id;
    this.syncArmed = true;
    this.applySyncTo(other);
  }

  /** Match tempo to `other` (BPM when known; else pitch fader %). */
  applySyncTo(other: DeckStore): void {
    if (this.state === 'empty' || other.state === 'empty') return;
    const s = this.getSettings();
    const range = s.mixer.pitchFaders.range;
    const dead = s.mixer.pitchFaders.centerDeadZone;

    if (other.effectiveBpm != null && this.fileBpm != null && this.fileBpm !== 0) {
      const targetRate = other.effectiveBpm / this.fileBpm;
      this.pitchPos = pitchPosFromRate(targetRate, dead, range);
    } else {
      // No analysis BPM yet — match pitch fader (same % rate). Set file BPM
      // in the harness for real beatmatch across different tracks.
      this.pitchPos = other.pitchPos;
    }
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
  }

  setFileBpm(bpm: number | null): void {
    if (bpm == null || !Number.isFinite(bpm) || bpm <= 0) {
      this.fileBpm = null;
      return;
    }
    this.fileBpm = bpm;
  }

  /** @deprecated use toggleSync — kept for tests that apply a one-shot match */
  syncTo(other: DeckStore): void {
    if (this.state === 'empty' || other.state === 'empty') return;
    this.syncPartner = other.id;
    this.syncArmed = true;
    this.applySyncTo(other);
  }

  nudge(velocity: number): void {
    if (this.state === 'playing') {
      this.nudgeFactor = 1 + 0.02 * velocity;
      audioEngine.transport(this.id)?.setRate(this.effectiveRate);
      if (this.nudgeTimer != null) window.clearTimeout(this.nudgeTimer);
      this.nudgeTimer = window.setTimeout(() => {
        this.nudgeFactor = 1;
        audioEngine.transport(this.id)?.setRate(this.effectiveRate);
      }, 250);
    } else {
      this.seek(this.position + 0.02 * Math.sign(velocity || 1));
    }
  }

  /** Pitch bend ±0.5% while held (docs/04). */
  setPitchBend(dir: -1 | 0 | 1): void {
    this.bendFactor = dir === 0 ? 1 : 1 + 0.005 * dir;
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
  }

  /** FF/RW hold — seek in 0.25 s steps (~5×). */
  startSeekHold(dir: -1 | 1): void {
    this.stopSeekHold();
    const step = () => {
      if (this.state === 'empty') return;
      this.seek(this.position + dir * 0.25);
    };
    step();
    this.seekHoldTimer = window.setInterval(step, 50);
  }

  stopSeekHold(): void {
    if (this.seekHoldTimer != null) {
      window.clearInterval(this.seekHoldTimer);
      this.seekHoldTimer = null;
    }
  }

  setTrimDb(db: number): void {
    this.trimDb = db;
    this.pushGraph();
  }

  setEq(band: 'low' | 'mid' | 'high', value: number): void {
    this.eq = { ...this.eq, [band]: value };
    this.pushGraph();
  }

  toggleKill(band: 'low' | 'mid' | 'high'): void {
    this.kills = { ...this.kills, [band]: !this.kills[band] };
    this.pushGraph();
  }

  toggleFilter(): void {
    this.filterOn = !this.filterOn;
    this.pushGraph();
  }

  setFilterAmount(v: number): void {
    this.filterAmount = v;
    this.pushGraph();
  }

  toggleFlanger(): void {
    this.flangerOn = !this.flangerOn;
    this.pushGraph();
  }

  setFlangerWet(v: number): void {
    this.flangerWet = v;
    this.pushGraph();
  }

  togglePfl(): void {
    this.pfl = !this.pfl;
    // PFL gain ramps in DeckGraph (≥20 ms). Never touch channel fader (pre-fader listen).
    this.pushGraph();
    if (this.pfl) {
      // Stopped decks have no source — soft-start transport for cue bus only.
      if (this.state === 'stopped' && this.duration > 0) {
        this.pflMonitor = true;
        this.play({ soft: true });
      }
      return;
    }
    // Turning PFL off does not pause or steal the fader.
    this.pflMonitor = false;
  }

  tick(other?: DeckStore): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    const pos = t.position();
    const dur = t.duration;
    this.position = pos;
    this.duration = dur;

    // While SYNC is on, keep matching the partner's tempo (latching follow).
    if (this.syncArmed && other && other.id === this.syncPartner && other.state !== 'empty') {
      this.applySyncTo(other);
    }

    if (this.state === 'playing' && dur > 0 && pos >= dur - 0.02) {
      // EOT: stop → cue (R2.11)
      t.pause();
      t.seek(this.cueOffset);
      this.position = this.cueOffset;
      this.state = 'stopped';
      this.eotWarn = 0;
      return;
    }

    if (this.state === 'playing') {
      const remaining = Math.max(0, dur - pos);
      this.eotWarn = endOfTrackWarnLevel(
        remaining,
        this.getSettings().ui.endOfTrackWarnSec,
      );
    } else {
      this.eotWarn = 0;
    }

    // Keep graph rate in sync
    if (this.state === 'playing') {
      t.setRate(this.effectiveRate);
    }
  }

  /** Device lost / engine teardown — stop logical transport; keep cue & metadata. */
  onEngineInterrupted(): void {
    if (this.state === 'playing' || this.cuePreviewing) {
      this.state = 'stopped';
      this.cuePreviewing = false;
    }
    this.pflMonitor = false;
    const t = audioEngine.transport(this.id);
    if (t) this.position = t.position();
  }

  /** After graph rebuild — re-decode stashed file bytes into the new context. */
  async adoptEngineRestore(): Promise<void> {
    const bytes = this.fileBytes;
    if (!bytes) {
      if (this.state !== 'empty') this.state = 'stopped';
      return;
    }
    const keepPos = this.position;
    try {
      await audioEngine.waitUntilDecodeReady();
      audioEngine.beginDecode();
      try {
        await audioEngine.ensureRunning();
        const buffer = await this.decodeIntoLiveContext(bytes);
        const t = audioEngine.transport(this.id);
        if (!t) return;
        t.setBuffer(buffer);
        t.seek(keepPos);
        runInAction(() => {
          this.duration = t.duration;
          this.position = t.position();
          this.state = 'stopped';
          this.cuePreviewing = false;
        });
        this.pushGraph();
      } finally {
        audioEngine.endDecode();
      }
    } catch (err) {
      console.error(`[deck ${this.id}] restore after rebuild failed`, err);
      runInAction(() => {
        this.state = 'stopped';
      });
    }
  }

  pushGraph(): void {
    const g = audioEngine.graph(this.id);
    if (!g) return;
    const s = this.getSettings();
    // PFL is pre-fader (docs/03) — channel fader always drives master independently.
    const faderPos = this.id === 'A' ? mixerFaderA() : mixerFaderB();
    const shape =
      this.id === 'A' ? s.mixer.channelFaders.a.shape : s.mixer.channelFaders.b.shape;
    g.apply({
      trimDb: this.trimDb,
      eq: this.eq,
      eqMaxDb: s.mixer.eq.maxDb,
      kills: this.kills,
      faderPos,
      faderShape: shape,
      filterOn: this.filterOn,
      filterAmount: this.filterAmount,
      flangerOn: this.flangerOn,
      flangerWet: this.flangerWet,
      flanger: s.fx.flanger,
      pfl: this.pfl,
      crossfaderEnabled: s.mixer.crossfader.enabled,
      crossfaderGain: 1,
    });
  }
}

// Late-bound mixer fader positions to avoid circular imports at module init
let _faderA = 1;
let _faderB = 1;
export function setMixerFaderPositions(a: number, b: number): void {
  _faderA = a;
  _faderB = b;
}
function mixerFaderA(): number {
  return _faderA;
}
function mixerFaderB(): number {
  return _faderB;
}
