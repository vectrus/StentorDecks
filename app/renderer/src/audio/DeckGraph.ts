import {
  channelFaderGain,
  eqKnobDb,
  filterFromAmount,
  trimDbToGain,
} from '@stentordeck/shared';
import { linearRampParam, rampParam } from './ramp';

export type DeckId = 'A' | 'B';

export type DeckGraphParams = {
  trimDb: number;
  eq: { low: number; mid: number; high: number }; // knobs 0..1
  eqMaxDb: number;
  kills: { low: boolean; mid: boolean; high: boolean };
  faderPos: number;
  faderShape: number;
  filterOn: boolean;
  filterAmount: number;
  flangerOn: boolean;
  flangerWet: number;
  flanger: { rateHz: number; depthMs: number; feedback: number };
  pfl: boolean;
  crossfaderEnabled: boolean;
  crossfaderGain: number; // 0..1 when enabled; else forced 1
};

/**
 * Per-deck node chain (docs/03). Source is (re)created by transport layer.
 */
export class DeckGraph {
  readonly input: GainNode;
  readonly pflOut: GainNode;
  readonly masterOut: GainNode;
  readonly channelMeter: AnalyserNode;

  private readonly trim: GainNode;
  private readonly eqLow: BiquadFilterNode;
  private readonly eqMid: BiquadFilterNode;
  private readonly eqHigh: BiquadFilterNode;
  private readonly filter: BiquadFilterNode;
  private readonly filterDry: GainNode;
  private readonly filterWet: GainNode;
  private readonly flangerInput: GainNode;
  private readonly flangerDry: GainNode;
  private readonly flangerWetGain: GainNode;
  private readonly delay: DelayNode;
  private readonly feedback: GainNode;
  private readonly lfo: OscillatorNode;
  private readonly lfoGain: GainNode;
  private readonly fader: GainNode;
  private readonly xfader: GainNode;
  private readonly pflGain: GainNode;
  private readonly ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.input = ctx.createGain();
    this.trim = ctx.createGain();
    this.eqLow = ctx.createBiquadFilter();
    this.eqMid = ctx.createBiquadFilter();
    this.eqHigh = ctx.createBiquadFilter();
    this.filter = ctx.createBiquadFilter();
    this.filterDry = ctx.createGain();
    this.filterWet = ctx.createGain();
    this.flangerInput = ctx.createGain();
    this.flangerDry = ctx.createGain();
    this.flangerWetGain = ctx.createGain();
    this.delay = ctx.createDelay(0.05);
    this.feedback = ctx.createGain();
    this.lfo = ctx.createOscillator();
    this.lfoGain = ctx.createGain();
    this.pflGain = ctx.createGain();
    this.fader = ctx.createGain();
    this.xfader = ctx.createGain();
    this.pflOut = ctx.createGain();
    this.masterOut = ctx.createGain();
    this.channelMeter = ctx.createAnalyser();
    this.channelMeter.fftSize = 2048;

    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 180;
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 0.9;
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 4500;

    this.delay.delayTime.value = 0.002;
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.25;
    this.lfoGain.gain.value = 0.0015;
    this.feedback.gain.value = 0.5;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.delay.delayTime);
    this.lfo.start();

    // input → trim → EQ → filter split → flanger → pfl tap / fader → xfader → master
    this.input.connect(this.trim);
    this.trim.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);

    this.eqHigh.connect(this.filterDry);
    this.eqHigh.connect(this.filter);
    this.filter.connect(this.filterWet);

    const filterSum = ctx.createGain();
    this.filterDry.connect(filterSum);
    this.filterWet.connect(filterSum);
    filterSum.connect(this.flangerInput);

    this.flangerInput.connect(this.flangerDry);
    this.flangerInput.connect(this.delay);
    this.delay.connect(this.flangerWetGain);
    this.delay.connect(this.feedback);
    this.feedback.connect(this.delay);

    const flangerSum = ctx.createGain();
    this.flangerDry.connect(flangerSum);
    this.flangerWetGain.connect(flangerSum);

    flangerSum.connect(this.pflGain);
    this.pflGain.connect(this.pflOut);

    flangerSum.connect(this.fader);
    this.fader.connect(this.channelMeter);
    this.fader.connect(this.xfader);
    this.xfader.connect(this.masterOut);

    this.apply({
      trimDb: 0,
      eq: { low: 0.5, mid: 0.5, high: 0.5 },
      eqMaxDb: 12,
      kills: { low: false, mid: false, high: false },
      faderPos: 1,
      faderShape: 35,
      filterOn: false,
      filterAmount: 0.5,
      flangerOn: false,
      flangerWet: 0,
      flanger: { rateHz: 0.25, depthMs: 1.5, feedback: 0.5 },
      pfl: false,
      crossfaderEnabled: false,
      crossfaderGain: 1,
    });
  }

  apply(p: DeckGraphParams): void {
    const ctx = this.ctx;
    rampParam(this.trim.gain, trimDbToGain(p.trimDb), ctx);

    const lowDb = p.kills.low ? -40 : eqKnobDb(p.eq.low, p.eqMaxDb);
    const midDb = p.kills.mid ? -40 : eqKnobDb(p.eq.mid, p.eqMaxDb);
    const highDb = p.kills.high ? -40 : eqKnobDb(p.eq.high, p.eqMaxDb);
    rampParam(this.eqLow.gain, lowDb, ctx);
    rampParam(this.eqMid.gain, midDb, ctx);
    rampParam(this.eqHigh.gain, highDb, ctx);

    // Filter bypass crossfade — never snap freq/Q mid-playback (docs/03).
    const filt = filterFromAmount(p.filterAmount);
    if (!p.filterOn || filt.mode === 'bypass') {
      rampParam(this.filterDry.gain, 1, ctx);
      rampParam(this.filterWet.gain, 0, ctx);
    } else {
      if (this.filter.type !== filt.mode) {
        this.filter.type = filt.mode;
      }
      rampParam(this.filter.frequency, filt.frequency, ctx);
      rampParam(this.filter.Q, filt.Q, ctx);
      rampParam(this.filterDry.gain, 0, ctx);
      rampParam(this.filterWet.gain, 1, ctx);
    }

    // Flanger — ramp rate/depth/feedback (≥15 ms)
    rampParam(this.lfo.frequency, p.flanger.rateHz, ctx);
    rampParam(this.lfoGain.gain, p.flanger.depthMs / 1000, ctx);
    rampParam(this.feedback.gain, p.flanger.feedback, ctx);
    const wet = p.flangerOn ? p.flangerWet : 0;
    const dry = Math.cos((wet * Math.PI) / 2);
    const wetG = Math.sin((wet * Math.PI) / 2);
    rampParam(this.flangerDry.gain, dry, ctx);
    rampParam(this.flangerWetGain.gain, wetG, ctx);

    // PFL: always ramp (≥15 ms) — never snap into the cue bus.
    const pflTarget = p.pfl ? 1 : 0;
    linearRampParam(this.pflGain.gain, pflTarget, ctx, 0.02);

    const faderGain = channelFaderGain(p.faderPos, p.faderShape);
    if (faderGain <= 0) {
      // Hard mute master path — setTargetAtTime would leak a click onto the PA.
      this.snapMasterMute();
    } else {
      rampParam(this.fader.gain, faderGain, ctx);
    }
    rampParam(this.xfader.gain, p.crossfaderEnabled ? p.crossfaderGain : 1, ctx);
  }

  /** Instant mute of post-PFL master path (fader). Call before starting PFL monitor. */
  snapMasterMute(): void {
    const t = this.ctx.currentTime;
    this.fader.gain.cancelScheduledValues(t);
    this.fader.gain.setValueAtTime(0, t);
  }

  /** Fade deck input 0→1 so buffer starts / cue jumps don't click. */
  softStartInput(seconds = 0.025): void {
    const t = this.ctx.currentTime;
    this.input.gain.cancelScheduledValues(t);
    // Always start from digital silence — never ramp from a stale mid-value.
    this.input.gain.setValueAtTime(0, t);
    this.input.gain.linearRampToValueAtTime(1, t + Math.max(seconds, 0.02));
  }

  /** Fade deck input → 0 before pause/stop (cue release, PFL edge, etc.). */
  softStopInput(seconds = 0.025): void {
    const t = this.ctx.currentTime;
    this.input.gain.cancelScheduledValues(t);
    this.input.gain.setValueAtTime(this.input.gain.value, t);
    this.input.gain.linearRampToValueAtTime(0, t + Math.max(seconds, 0.02));
  }

  /** After soft-stop pause: return input to unity without a step click. */
  restoreInputGain(): void {
    const t = this.ctx.currentTime;
    this.input.gain.cancelScheduledValues(t);
    this.input.gain.setValueAtTime(this.input.gain.value, t);
    this.input.gain.linearRampToValueAtTime(1, t + 0.02);
  }

  disconnect(): void {
    try {
      this.lfo.stop();
    } catch {
      /* ignore */
    }
    // Best-effort; GC + context close handles the rest on rebuild
  }
}

export type TransportSnapshot = {
  playing: boolean;
  /** Buffer offset in seconds at last start/pause. */
  offset: number;
  startCtxTime: number;
  rate: number;
};

/** Playing seek overlap — docs/03 ≥15 ms floor for large/cue jumps (jog zipper). */
export const TRANSPORT_SEEK_CROSSFADE_SEC = 0.015;
/** Micro-seeks (jog/assist) — shorter overlap; still ramped (not cold cut). */
export const TRANSPORT_SEEK_MICRO_CROSSFADE_SEC = 0.01;

type FadingSource = {
  src: AudioBufferSourceNode;
  gain: GainNode;
};

export class DeckTransport {
  private source: AudioBufferSourceNode | null = null;
  /** Per-source gain — used for overlap crossfade seeks. */
  private sourceGain: GainNode | null = null;
  private fadingOut: FadingSource[] = [];
  private buffer: AudioBuffer | null = null;
  private snap: TransportSnapshot = {
    playing: false,
    offset: 0,
    startCtxTime: 0,
    rate: 1,
  };
  private rateAccumOffset = 0;
  private rateAccumCtxTime = 0;
  private rateAccumRate = 1;

  constructor(
    private readonly ctx: AudioContext,
    private readonly dest: AudioNode,
  ) {}

  get isPlaying(): boolean {
    return this.snap.playing;
  }

  get duration(): number {
    return this.buffer?.duration ?? 0;
  }

  setBuffer(buffer: AudioBuffer | null): void {
    this.stopImmediate();
    this.buffer = buffer;
    this.snap.offset = 0;
    this.rateAccumOffset = 0;
    this.rateAccumCtxTime = 0;
  }

  getBuffer(): AudioBuffer | null {
    return this.buffer;
  }

  position(): number {
    if (!this.buffer) return 0;
    if (!this.snap.playing) return this.snap.offset;
    // Use live AudioParam during ramps so the playhead doesn't race ahead of audio.
    const rate = this.source?.playbackRate.value ?? this.rateAccumRate;
    const elapsed = (this.ctx.currentTime - this.rateAccumCtxTime) * rate;
    return Math.min(this.buffer.duration, this.rateAccumOffset + elapsed);
  }

  play(rate: number): void {
    if (!this.buffer || this.snap.playing) return;
    this.startSource(this.snap.offset, rate);
  }

  pause(): void {
    if (!this.snap.playing) return;
    const pos = this.position();
    this.stopImmediate();
    this.snap.offset = pos;
    this.snap.playing = false;
  }

  seek(offset: number, opts?: { micro?: boolean }): void {
    const dur = this.buffer?.duration ?? 0;
    const next = Math.max(0, Math.min(dur, offset));
    const wasPlaying = this.snap.playing && this.source != null;
    const rate = this.snap.rate;
    if (!wasPlaying) {
      this.stopImmediate();
      this.snap.offset = next;
      this.rateAccumOffset = next;
      return;
    }
    const fade = opts?.micro
      ? TRANSPORT_SEEK_MICRO_CROSSFADE_SEC
      : TRANSPORT_SEEK_CROSSFADE_SEC;
    this.seekPlayingCrossfade(next, rate, fade);
  }

  setRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    // Avoid restarting a 20 ms ramp every rAF when already on target (waveform drift).
    const live = this.source?.playbackRate.value ?? this.snap.rate;
    if (
      Math.abs(this.snap.rate - rate) < 1e-6 &&
      Math.abs(live - rate) < 1e-4
    ) {
      return;
    }
    if (this.snap.playing) {
      // Re-anchor with the instantaneous rate before scheduling a new ramp.
      const pos = this.position();
      this.rateAccumOffset = pos;
      this.rateAccumCtxTime = this.ctx.currentTime;
      this.rateAccumRate = rate;
    }
    this.snap.rate = rate;
    if (this.source) {
      linearRampParam(this.source.playbackRate, rate, this.ctx, 0.02);
    }
  }

  /** Brake: ramp rate → 0 then stop. */
  brake(ms: number): void {
    if (!this.snap.playing || !this.source) {
      this.pause();
      return;
    }
    const src = this.source;
    const t = this.ctx.currentTime;
    src.playbackRate.cancelScheduledValues(t);
    src.playbackRate.setValueAtTime(src.playbackRate.value, t);
    src.playbackRate.linearRampToValueAtTime(0.001, t + ms / 1000);
    globalThis.setTimeout(() => {
      const pos = this.position();
      this.stopImmediate();
      this.snap.offset = pos;
      this.snap.playing = false;
    }, ms + 20);
  }

  stopImmediate(): void {
    this.killSourcePair(this.source, this.sourceGain);
    this.source = null;
    this.sourceGain = null;
    for (const f of this.fadingOut) {
      this.killSourcePair(f.src, f.gain);
    }
    this.fadingOut = [];
    this.snap.playing = false;
  }

  /** Cold start / play — replace any active source. */
  private startSource(offset: number, rate: number): void {
    this.stopImmediate();
    this.armSource(offset, rate, 0);
  }

  /**
   * Playing seek: overlap old→new BufferSources so jog sticky phase
   * does not zipper (R2.2 / docs/03). Micro-seeks use a shorter fade.
   */
  private seekPlayingCrossfade(next: number, rate: number, fadeSec: number): void {
    const t = this.ctx.currentTime;
    const fade = fadeSec;
    const oldSrc = this.source;
    const oldGain = this.sourceGain;
    if (!oldSrc || !oldGain) {
      this.startSource(next, rate);
      return;
    }

    oldSrc.onended = null;
    oldGain.gain.cancelScheduledValues(t);
    oldGain.gain.setValueAtTime(oldGain.gain.value, t);
    oldGain.gain.linearRampToValueAtTime(0, t + fade);

    const fading: FadingSource = { src: oldSrc, gain: oldGain };
    this.fadingOut.push(fading);
    this.source = null;
    this.sourceGain = null;

    const fadeMs = Math.ceil(fade * 1000) + 12;
    globalThis.setTimeout(() => {
      this.killSourcePair(fading.src, fading.gain);
      this.fadingOut = this.fadingOut.filter((x) => x !== fading);
    }, fadeMs);

    this.armSource(next, rate, fade);
  }

  private armSource(offset: number, rate: number, fadeInSec: number): void {
    if (!this.buffer) return;
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = this.buffer;
    src.playbackRate.value = rate;
    src.connect(gain);
    gain.connect(this.dest);
    const t = this.ctx.currentTime;
    if (fadeInSec > 0) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + fadeInSec);
    } else {
      gain.gain.setValueAtTime(1, t);
    }
    src.start(t, offset);
    // Natural buffer end: latch offset at duration so DeckStore tick can run EOT
    // stop→cue (R2.11). Clearing playing without updating offset left a stale
    // mid-track position and a stuck "playing" deck that blocked load (R4.2).
    src.onended = () => {
      if (this.source !== src) return;
      this.source = null;
      this.sourceGain = null;
      const dur = this.buffer?.duration ?? 0;
      this.snap.offset = dur;
      this.rateAccumOffset = dur;
      this.rateAccumCtxTime = this.ctx.currentTime;
      this.snap.playing = false;
    };
    this.source = src;
    this.sourceGain = gain;
    this.snap.playing = true;
    this.snap.offset = offset;
    this.snap.startCtxTime = t;
    this.snap.rate = rate;
    this.rateAccumOffset = offset;
    this.rateAccumCtxTime = t;
    this.rateAccumRate = rate;
  }

  private killSourcePair(
    src: AudioBufferSourceNode | null,
    gain: GainNode | null,
  ): void {
    if (src) {
      try {
        src.onended = null;
        src.stop();
        src.disconnect();
      } catch {
        /* ignore */
      }
    }
    if (gain) {
      try {
        gain.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
}
