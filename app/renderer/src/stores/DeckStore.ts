import { makeAutoObservable, runInAction } from 'mobx';
import {
  autoGainTrimDb,
  endOfTrackWarnLevel,
  pitchRate,
  type Settings,
} from '@stentordeck/shared';
import { audioEngine } from '../audio/AudioEngine';
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
  syncArmed = false;
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
  private getSettings: () => Settings;

  constructor(id: DeckId, getSettings: () => Settings) {
    this.id = id;
    this.getSettings = getSettings;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get effectiveRate(): number {
    const s = this.getSettings();
    return (
      pitchRate(this.pitchPos, s.mixer.pitchFaders.centerDeadZone, s.mixer.pitchFaders.range) *
      this.nudgeFactor
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
      const ctx = audioEngine.masterCtx;
      if (!ctx) throw new Error('Audio engine not ready');
      await audioEngine.ensureRunning();
      const ab = await file.arrayBuffer();
      const buffer = await ctx.decodeAudioData(ab.slice(0));
      const transport = audioEngine.transport(this.id);
      if (!transport) throw new Error('No transport');

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
    } catch (err) {
      runInAction(() => {
        this.loading = false;
      });
      throw err;
    }
  }

  /** Unit-testable reset checklist (R3.3). */
  resetOnLoad(meta?: Partial<LoadedTrackMeta>): void {
    this.filterOn = false;
    this.filterAmount = 0.5;
    this.flangerOn = false;
    this.flangerWet = 0;
    this.kills = { low: false, mid: false, high: false };
    this.nudgeFactor = 1;
    this.syncArmed = false;
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

  play(): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    void audioEngine.ensureRunning();
    t.setRate(this.effectiveRate);
    t.play(this.effectiveRate);
    this.state = 'playing';
    this.cuePreviewing = false;
  }

  pause(opts?: { brake?: boolean }): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state !== 'playing') return;
    const s = this.getSettings();
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

  /** Classic CDJ cue press (docs/03). */
  cuePress(): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    const pos = t.position();

    if (this.state === 'playing') {
      t.seek(this.cueOffset);
      t.setRate(this.effectiveRate);
      this.position = this.cueOffset;
      return;
    }

    // stopped/paused
    if (Math.abs(pos - this.cueOffset) > 0.001) {
      this.cueOffset = pos;
    }
    // hold preview starts on cueHold
  }

  cueHoldStart(): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'playing' || this.state === 'empty') return;
    this.cuePreviewing = true;
    t.seek(this.cueOffset);
    t.setRate(this.effectiveRate);
    t.play(this.effectiveRate);
    this.state = 'playing';
  }

  cueHoldEnd(): void {
    if (!this.cuePreviewing) return;
    const t = audioEngine.transport(this.id);
    t?.pause();
    t?.seek(this.cueOffset);
    this.position = this.cueOffset;
    this.state = 'stopped';
    this.cuePreviewing = false;
  }

  seek(offset: number): void {
    audioEngine.transport(this.id)?.seek(offset);
    this.position = offset;
  }

  setPitchPos(pos: number): void {
    this.pitchPos = Math.min(1, Math.max(0, pos));
    this.syncArmed = false;
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
  }

  /** One-shot SYNC — match other deck effective BPM. */
  syncTo(other: DeckStore): void {
    if (other.effectiveBpm == null || this.fileBpm == null || this.fileBpm === 0) return;
    const targetRate = other.effectiveBpm / this.fileBpm;
    const s = this.getSettings();
    const range = s.mixer.pitchFaders.range;
    // rate = 1 + norm * range → norm = (rate - 1) / range
    const norm = (targetRate - 1) / range;
    const clamped = Math.min(1, Math.max(-1, norm));
    // invert pitchFaderNormalized approximately via center mapping
    this.pitchPos = 0.5 + clamped * 0.5;
    this.syncArmed = true;
    audioEngine.transport(this.id)?.setRate(this.effectiveRate);
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
    if (this.pfl) {
      // Stopped decks have no running source — start a monitor play so PFL has audio.
      // Master path is muted via fader while pflMonitor is active (PFL tap is pre-fader).
      if (this.state === 'stopped' && this.duration > 0) {
        this.pflMonitor = true;
        this.play();
      }
    } else if (this.pflMonitor) {
      this.pflMonitor = false;
      this.pause();
    }
    this.pushGraph();
  }

  tick(): void {
    const t = audioEngine.transport(this.id);
    if (!t || this.state === 'empty') return;
    const pos = t.position();
    const dur = t.duration;
    this.position = pos;
    this.duration = dur;

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

  pushGraph(): void {
    const g = audioEngine.graph(this.id);
    if (!g) return;
    const s = this.getSettings();
    const liveFader = this.id === 'A' ? mixerFaderA() : mixerFaderB();
    // PFL monitor: keep cue audible (pre-fader) but don't spill onto the master bus.
    const faderPos = this.pflMonitor ? 0 : liveFader;
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
