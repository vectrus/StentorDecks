import { makeAutoObservable, runInAction } from 'mobx';
import {
  autoGainTrimDb,
  beatPeriodSec,
  endOfTrackWarnLevel,
  JOG_PLAYING_SEEK_SEC,
  PHASE_ASSIST_DEADBAND_SEC,
  PHASE_ASSIST_JOG_MUTE_MS,
  PHASE_ASSIST_MAX_SEEK_SEC,
  phaseAssistDeltaSec,
  phaseErrorSec,
  phaseSnapDeltaSec,
  pitchPosFromRate,
  pitchRate,
  resolveCueHoldEnd,
  resolveCueHoldStart,
  resolveCuePress,
  type ControlId,
  type Settings,
} from '@stentordeck/shared';
import { audioEngine } from '../audio/AudioEngine';
import { decodeArrayBufferOffThread } from '../audio/decodeAudio';
import type { DeckId } from '../audio/DeckGraph';
import { invoke } from '../ipc/client';

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
  keyCamelot: string | null;
  loudnessLufs: number | null;
  /** Analyzed first-beat offset (sec); null → tempo-only SYNC. */
  beatGridOffsetSec: number | null;
  /** Library row id when loaded via Prep/Perf browse (E4/E6). */
  libraryTrackId: number | null;
  /** Hint for resilient MP3 decode when Chromium truncates (docs/E5 follow-up). */
  durationMs: number | null;
};

export class DeckStore {
  readonly id: DeckId;
  state: 'empty' | 'stopped' | 'playing' = 'empty';
  title = '';
  artist = '';
  fileBpm: number | null = null;
  keyCamelot: string | null = null;
  loudnessLufs: number | null = null;
  /** First-beat offset from analysis; null if unknown. */
  beatGridOffsetSec: number | null = null;
  libraryTrackId: number | null = null;
  /** Overview waveform 800×(min,max,rms) u8 — null until analysis / fetch. */
  overviewWaveform: Uint8Array | null = null;
  /** Detail waveform 50 pps × (min,max,rms) u8 — scrolling well. */
  detailWaveform: Uint8Array | null = null;
  detailPps = 50;
  loading = false;

  /** Logical pitch fader 0..1 */
  pitchPos = 0.5;
  nudgeFactor = 1;
  /** Latching SYNC — lit while on; press again to release (docs/06). */
  syncArmed = false;
  /** Partner deck id while sync is on (for tempo follow). */
  syncPartner: DeckId | null = null;
  /** Last sync strategy — for harness / UI honesty. */
  syncMode: 'off' | 'bpm' | 'pitchPercent' = 'off';
  /** True when BPM target was outside ±pitch range (clamped). */
  syncClamped = false;
  /** True while armed and both decks had beatgrid offsets at engage. */
  syncHasGrid = false;
  /**
   * After SYNC off: keep soft phase assist toward this error (jogged musical offset).
   * Cleared by pitch fader, load, or re-engaging SYNC.
   */
  phaseGluePartner: DeckId | null = null;
  phaseGlueTargetSec: number | null = null;
  /** performance.now() until which assist is muted (jog). */
  phaseAssistMuteUntil = 0;
  /** After jog while glue active — retarget to new phase error when unmute. */
  phaseGlueRetarget = false;
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
  /** Soft-takeover re-arm hooks (wired from root → MidiStore; not observable). */
  takeoverSoftwareChange: ((id: ControlId) => void) | null = null;
  takeoverLoaded: ((deckId: DeckId) => void) | null = null;

  constructor(id: DeckId, getSettings: () => Settings) {
    this.id = id;
    this.getSettings = getSettings;
    makeAutoObservable(
      this,
      {
        fileBytes: false,
        takeoverSoftwareChange: false,
        takeoverLoaded: false,
      },
      { autoBind: true },
    );
  }

  setTakeoverHooks(opts: {
    onSoftwareChange?: (id: ControlId) => void;
    onLoaded?: (deckId: DeckId) => void;
  }): void {
    this.takeoverSoftwareChange = opts.onSoftwareChange ?? null;
    this.takeoverLoaded = opts.onLoaded ?? null;
  }

  private notify(suffix: string): void {
    const id = `deck${this.id}.${suffix}` as ControlId;
    this.takeoverSoftwareChange?.(id);
  }

  /** Pitch-fader rate only (no jog nudge / pitch-bend). SYNC follow target. */
  get pitchOnlyRate(): number {
    const s = this.getSettings();
    return pitchRate(
      this.pitchPos,
      s.mixer.pitchFaders.centerDeadZone,
      s.mixer.pitchFaders.range,
    );
  }

  get effectiveRate(): number {
    return this.pitchOnlyRate * this.nudgeFactor * this.bendFactor;
  }

  get effectiveBpm(): number | null {
    if (this.fileBpm == null) return null;
    return this.fileBpm * this.effectiveRate;
  }

  /** Stable BPM from pitch fader — partner jogs must not yank a SYNC slave. */
  get pitchOnlyBpm(): number | null {
    if (this.fileBpm == null) return null;
    return this.fileBpm * this.pitchOnlyRate;
  }

  /** Single choke point for load (R4.2 / R3.3). */
  async load(file: File, meta?: Partial<LoadedTrackMeta>): Promise<void> {
    if (this.state === 'playing') {
      throw new DeckPlayingError(this.id);
    }
    this.loading = true;
    try {
      await audioEngine.acquireDecode();
      try {
        await audioEngine.ensureRunning();
        const ab = await file.arrayBuffer();
        // Independent copy — decodeAudioData may detach its argument.
        const fileBytes = ab.slice(0);
        const expectedDurationSec =
          meta?.durationMs != null && meta.durationMs > 0 ? meta.durationMs / 1000 : null;
        const buffer = await this.decodeIntoLiveContext(fileBytes, expectedDurationSec);
        const transport = audioEngine.transport(this.id);
        if (!transport) throw new Error('No transport');

        this.fileBytes = fileBytes;
        transport.setBuffer(buffer);
        this.resetOnLoad(meta);
        runInAction(() => {
          this.title = meta?.title ?? file.name;
          this.artist = meta?.artist ?? '';
          this.fileBpm = meta?.fileBpm ?? null;
          this.keyCamelot = meta?.keyCamelot ?? null;
          this.loudnessLufs = meta?.loudnessLufs ?? null;
          this.beatGridOffsetSec = meta?.beatGridOffsetSec ?? null;
          this.libraryTrackId = meta?.libraryTrackId ?? null;
          this.overviewWaveform = null;
          this.detailWaveform = null;
          this.detailPps = 50;
          this.duration = buffer.duration;
          this.position = 0;
          this.state = 'stopped';
          this.applyAutoGain();
          this.loading = false;
        });
        this.pushGraph();
        this.takeoverLoaded?.(this.id);
        if (this.libraryTrackId != null) {
          void this.fetchWaveforms(this.libraryTrackId);
        }
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
  private async decodeIntoLiveContext(
    fileBytes: ArrayBuffer,
    expectedDurationSec?: number | null,
  ): Promise<AudioBuffer> {
    for (let attempt = 0; attempt < 4; attempt++) {
      await audioEngine.waitUntilDecodeReady();
      const epoch = audioEngine.epoch;
      const ctx = audioEngine.masterCtx;
      if (!ctx) throw new Error('Audio engine not ready');
      const buffer = await decodeArrayBufferOffThread(ctx, fileBytes, { expectedDurationSec });
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

  /** Fetch / refresh overview + detail blobs for the loaded library track (E6). */
  async fetchWaveforms(trackId?: number): Promise<void> {
    const id = trackId ?? this.libraryTrackId;
    if (id == null) return;
    try {
      const [overview, detail] = await Promise.all([
        invoke('library:waveform', { id, kind: 'overview' }),
        invoke('library:waveform', { id, kind: 'detail' }),
      ]);
      if (this.libraryTrackId !== id) return;
      runInAction(() => {
        this.overviewWaveform = overview?.bytes ?? null;
        this.detailWaveform = detail?.bytes ?? null;
        this.detailPps = detail?.detailPps ?? 50;
      });
    } catch (err) {
      console.warn('[deck] waveform fetch failed', err);
    }
  }

  /** After analysis commit — refresh waveforms (+ key) if this deck holds that track. */
  refreshOverviewIf(trackId: number): void {
    if (this.libraryTrackId !== trackId) return;
    void this.fetchWaveforms(trackId);
    void this.refreshKeyFromLibrary(trackId);
  }

  private async refreshKeyFromLibrary(trackId: number): Promise<void> {
    try {
      const row = await invoke('library:track', { id: trackId });
      if (this.libraryTrackId !== trackId || !row) return;
      runInAction(() => {
        this.keyCamelot = row.keyCamelot;
        if (row.bpm != null) this.fileBpm = row.bpm;
        this.beatGridOffsetSec = row.beatGridOffsetSec;
      });
    } catch {
      /* non-fatal */
    }
  }

  seek(offset: number): void {
    const clamped = Math.max(0, Math.min(this.duration || 0, offset));
    audioEngine.transport(this.id)?.seek(clamped);
    this.position = clamped;
  }

  setPitchPos(pos: number): void {
    this.pitchPos = Math.min(1, Math.max(0, pos));
    // Moving pitch releases SYNC + phase glue (docs/03).
    this.clearSync();
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
    this.notify('pitch');
  }

  clearPhaseGlue(): void {
    this.phaseGluePartner = null;
    this.phaseGlueTargetSec = null;
    this.phaseGlueRetarget = false;
  }

  clearSync(): void {
    this.syncArmed = false;
    this.syncPartner = null;
    this.syncMode = 'off';
    this.syncClamped = false;
    this.syncHasGrid = false;
    this.clearPhaseGlue();
  }

  /**
   * SYNC off → keep pitch frozen and soft-hold current phase relationship (glue).
   */
  releaseSyncToGlue(other: DeckStore): void {
    if (
      this.syncMode === 'bpm' &&
      this.hasBeatGridWith(other) &&
      other.state !== 'empty'
    ) {
      const bpm = other.pitchOnlyBpm;
      const period = bpm != null ? beatPeriodSec(bpm) : null;
      if (period != null) {
        const thisPos = audioEngine.transport(this.id)?.position() ?? this.position;
        const otherPos = audioEngine.transport(other.id)?.position() ?? other.position;
        const err = phaseErrorSec(
          thisPos,
          otherPos,
          period,
          this.beatGridOffsetSec ?? 0,
          other.beatGridOffsetSec ?? 0,
        );
        this.phaseGluePartner = other.id;
        this.phaseGlueTargetSec = err;
        this.phaseGlueRetarget = false;
      }
    }
    this.syncArmed = false;
    this.syncPartner = null;
    this.syncMode = 'off';
    this.syncClamped = false;
    this.syncHasGrid = false;
  }

  /**
   * SYNC is a latching on/off control (docs/06 lit until released).
   * On → sole slave: match tempo, grid snap, soft phase to zero.
   * Off → freeze pitch + phase glue (hold current offset until jog retargets / pitch / load).
   */
  toggleSync(other: DeckStore): void {
    if (this.syncArmed) {
      this.releaseSyncToGlue(other);
      return;
    }
    if (this.state === 'empty' || other.state === 'empty') return;
    // One slave at a time — Sync A and Sync B are mutually exclusive (R2.3).
    other.clearSync();
    this.clearPhaseGlue();
    this.syncPartner = other.id;
    this.syncArmed = true;
    this.syncHasGrid = this.hasBeatGridWith(other);
    this.applySyncTo(other);
    this.snapPhaseTo(other);
  }

  /**
   * Human-readable sync status for the harness (why Sync “did nothing”).
   */
  get syncStatusLine(): string | null {
    if (this.phaseGluePartner != null && this.phaseGlueTargetSec != null && !this.syncArmed) {
      return 'SYNC off: phase glue holding jog offset (pitch frozen)';
    }
    if (!this.syncArmed) return null;
    if (this.syncMode === 'bpm') {
      const bpm = this.effectiveBpm?.toFixed(1) ?? '?';
      if (this.syncClamped) {
        return `SYNC: BPM (~${bpm}) — target outside ±pitch range (clamped)`;
      }
      if (!this.syncHasGrid) {
        return `SYNC: BPM (~${bpm}) — tempo follow; no beatgrid (Detect in Prep)`;
      }
      return `SYNC: BPM + grid snap + soft phase (~${bpm})`;
    }
    if (this.fileBpm == null) {
      return 'SYNC: pitch-% only — set File BPM on THIS deck for BPM + phase';
    }
    return 'SYNC: pitch-% only — partner needs File BPM for BPM + phase';
  }

  /** True when both decks have usable beatgrid offsets for phase snap/assist. */
  private hasBeatGridWith(other: DeckStore): boolean {
    return this.beatGridOffsetSec != null && other.beatGridOffsetSec != null;
  }

  /** Match tempo to `other` (pitch-only BPM when known; else pitch %). Called while armed too. */
  applySyncTo(other: DeckStore): void {
    if (this.state === 'empty' || other.state === 'empty') return;
    const s = this.getSettings();
    const range = s.mixer.pitchFaders.range;
    const dead = s.mixer.pitchFaders.centerDeadZone;

    // Follow partner pitch fader only — ignore their jog nudge / pitch-bend so
    // temporary master bends don't yank the slave (release SYNC to take over manually).
    if (other.pitchOnlyBpm != null && this.fileBpm != null && this.fileBpm !== 0) {
      const targetRate = other.pitchOnlyBpm / this.fileBpm;
      const minRate = 1 - range;
      const maxRate = 1 + range;
      this.syncClamped = targetRate < minRate - 1e-9 || targetRate > maxRate + 1e-9;
      this.pitchPos = pitchPosFromRate(targetRate, dead, range);
      this.syncMode = 'bpm';
    } else {
      // No analysis BPM yet — match pitch fader (same % rate). Set file BPM
      // on BOTH decks for real beatmatch across different tracks.
      this.pitchPos = other.pitchPos;
      this.syncMode = 'pitchPercent';
      this.syncClamped = false;
    }
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
  }

  /**
   * One-shot phase snap after tempo match (R2.3). Aligns beat phases using
   * analyzed beatgrid offsets (same as visual ticks). Soft assist continues in tick.
   */
  snapPhaseTo(other: DeckStore): void {
    if (this.syncMode !== 'bpm') return;
    if (!this.hasBeatGridWith(other)) return;
    const bpm = other.pitchOnlyBpm;
    const period = bpm != null ? beatPeriodSec(bpm) : null;
    if (period == null) return;

    const thisPos = audioEngine.transport(this.id)?.position() ?? this.position;
    const otherPos = audioEngine.transport(other.id)?.position() ?? other.position;
    const delta = phaseSnapDeltaSec(
      thisPos,
      otherPos,
      period,
      this.beatGridOffsetSec ?? 0,
      other.beatGridOffsetSec ?? 0,
    );
    if (Math.abs(delta) < 1e-4) return;
    this.seek(thisPos + delta);
  }

  /**
   * Soft phase assist: SYNC armed → target 0; SYNC off with glue → hold jog offset.
   * Muted briefly after jog so the wheel wins.
   */
  applySoftPhaseAssist(other: DeckStore): void {
    const armed =
      this.syncArmed && this.syncMode === 'bpm' && other.id === this.syncPartner;
    const glue =
      !this.syncArmed &&
      this.phaseGluePartner === other.id &&
      this.phaseGlueTargetSec != null;
    if (!armed && !glue) return;
    if (!this.hasBeatGridWith(other)) return;
    if (this.state !== 'playing' && other.state !== 'playing') return;
    if (typeof performance !== 'undefined' && performance.now() < this.phaseAssistMuteUntil) {
      return;
    }

    const bpm = other.pitchOnlyBpm;
    const period = bpm != null ? beatPeriodSec(bpm) : null;
    if (period == null) return;

    const thisPos = audioEngine.transport(this.id)?.position() ?? this.position;
    const otherPos = audioEngine.transport(other.id)?.position() ?? other.position;
    const thisOff = this.beatGridOffsetSec ?? 0;
    const otherOff = other.beatGridOffsetSec ?? 0;

    if (glue && this.phaseGlueRetarget) {
      this.phaseGlueTargetSec = phaseErrorSec(
        thisPos,
        otherPos,
        period,
        thisOff,
        otherOff,
      );
      this.phaseGlueRetarget = false;
    }

    const target = armed ? 0 : (this.phaseGlueTargetSec ?? 0);
    const delta = phaseAssistDeltaSec(
      thisPos,
      otherPos,
      period,
      thisOff,
      otherOff,
      target,
    );
    if (Math.abs(delta) < PHASE_ASSIST_DEADBAND_SEC) return;
    const step =
      Math.sign(delta) * Math.min(Math.abs(delta), PHASE_ASSIST_MAX_SEEK_SEC);
    this.seek(thisPos + step);
  }

  setFileBpm(bpm: number | null): void {
    if (bpm == null || !Number.isFinite(bpm) || bpm <= 0) {
      this.fileBpm = null;
      return;
    }
    this.fileBpm = bpm;
    // Next tick() will re-apply Sync if armed — no partner ref here.
  }

  /** @deprecated use toggleSync — kept for tests that apply a one-shot match */
  syncTo(other: DeckStore): void {
    if (this.state === 'empty' || other.state === 'empty') return;
    this.syncPartner = other.id;
    this.syncArmed = true;
    this.syncHasGrid = this.hasBeatGridWith(other);
    this.applySyncTo(other);
    this.snapPhaseTo(other);
  }

  nudge(velocity: number): void {
    // Don't fight the wheel with soft assist / glue for a moment.
    if (typeof performance !== 'undefined') {
      this.phaseAssistMuteUntil = performance.now() + PHASE_ASSIST_JOG_MUTE_MS;
    }
    if (this.phaseGluePartner != null) {
      this.phaseGlueRetarget = true;
    }

    const v = Number.isFinite(velocity) ? velocity : 0;
    const sign = Math.sign(v) || 1;
    const mag = Math.min(1, Math.abs(v));

    if (this.state === 'playing') {
      // Sticky phase: micro-seek so the offset stays after the rate nudge decays.
      const pos = audioEngine.transport(this.id)?.position() ?? this.position;
      this.seek(pos + JOG_PLAYING_SEEK_SEC * sign * Math.max(0.35, mag));
      this.nudgeFactor = 1 + 0.02 * v;
      audioEngine.transport(this.id)?.setRate(this.effectiveRate);
      if (this.nudgeTimer != null) globalThis.clearTimeout(this.nudgeTimer);
      this.nudgeTimer = globalThis.setTimeout(() => {
        this.nudgeFactor = 1;
        audioEngine.transport(this.id)?.setRate(this.effectiveRate);
      }, 250) as unknown as number;
    } else {
      this.seek(this.position + 0.02 * sign);
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
    this.notify('gain');
  }

  setEq(band: 'low' | 'mid' | 'high', value: number): void {
    this.eq = { ...this.eq, [band]: value };
    this.pushGraph();
    const suffix = band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh';
    this.notify(suffix);
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
    this.notify('filter');
  }

  toggleFlanger(): void {
    this.flangerOn = !this.flangerOn;
    this.pushGraph();
  }

  setFlangerWet(v: number): void {
    this.flangerWet = v;
    this.pushGraph();
    this.notify('wet');
  }

  /** Headphones cue only (R2.8) — never starts/stops transport. */
  togglePfl(): void {
    this.pfl = !this.pfl;
    // PFL gain ramps in DeckGraph (≥20 ms). Never touch channel fader (pre-fader listen).
    this.pushGraph();
  }

  tick(other?: DeckStore): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    const pos = t.position();
    const dur = t.duration;
    this.position = pos;
    this.duration = dur;

    // SYNC armed: tempo follow. Armed or post-SYNC glue: soft phase assist.
    if (other && other.state !== 'empty') {
      if (this.syncArmed && other.id === this.syncPartner) {
        this.applySyncTo(other);
      }
      this.applySoftPhaseAssist(other);
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
      await audioEngine.acquireDecode();
      try {
        await audioEngine.ensureRunning();
        // Prefer Xing inside fileBytes — do not pass this.duration (may be truncated).
        const buffer = await this.decodeIntoLiveContext(bytes, null);
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
