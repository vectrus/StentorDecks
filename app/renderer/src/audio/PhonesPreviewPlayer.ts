import { linearRampParam, rampParam } from './ramp';
import { audioEngine } from './AudioEngine';

const RAMP_S = 0.02;
/** Auto-stop long previews so phones aren't left running. */
const MAX_PREVIEW_SEC = 45;

export type PhonesPreviewKind = 'fixer' | 'normalize';
/** A/B leg while a phones preview is running (R5.9). */
export type PhonesPreviewLeg = 'original' | 'processed';

/**
 * One-shot AudioBuffer → headphones only (inject at headGain, never master/limiter).
 * Fixer preview and normalize preview share this singleton — not both at once.
 * Holds original + processed buffers so the operator can A/B without restarting from 0.
 */
export class PhonesPreviewPlayer {
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private gen = 0;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;

  private originalBuf: AudioBuffer | null = null;
  private processedBuf: AudioBuffer | null = null;
  private originalGain = 0.85;
  private processedGain = 0.85;
  private startedAtCtx = 0;
  private offsetAtStart = 0;
  private sessionStartCtx = 0;

  kind: PhonesPreviewKind | null = null;
  leg: PhonesPreviewLeg | null = null;
  /** Fired when preview ends (stop, timeout, or buffer end) — sync MobX UI. */
  onIdle: (() => void) | null = null;

  get playing(): boolean {
    return this.source != null;
  }

  /**
   * Start A/B phones preview. Defaults to the processed leg.
   * Switching legs keeps approximate playhead via setLeg().
   */
  async startAb(opts: {
    kind: PhonesPreviewKind;
    original: AudioBuffer;
    processed: AudioBuffer;
    originalGain?: number;
    processedGain?: number;
    startLeg?: PhonesPreviewLeg;
  }): Promise<void> {
    await this.stop({ notifyIdle: false });
    const ctx = audioEngine.masterCtx;
    const dest = audioEngine.phonesInjectNode();
    if (!ctx || !dest) {
      throw new Error('Audio engine not ready — open Audio setup / wait for outputs');
    }
    await audioEngine.ensureRunning();

    this.originalBuf = opts.original;
    this.processedBuf = opts.processed;
    this.originalGain = Math.max(0, Math.min(2, opts.originalGain ?? 0.85));
    this.processedGain = Math.max(0, Math.min(2, opts.processedGain ?? 0.85));
    this.kind = opts.kind;
    this.sessionStartCtx = ctx.currentTime;
    this.leg = opts.startLeg ?? 'processed';

    await this.playLeg(this.leg, 0);
  }

  /** Switch Original ↔ Processed at the current playhead (short fade). */
  async setLeg(next: PhonesPreviewLeg): Promise<void> {
    if (!this.playing || this.kind == null || !this.originalBuf || !this.processedBuf) {
      return;
    }
    if (next === this.leg) return;
    const offset = this.playbackOffsetSec();
    await this.playLeg(next, offset);
  }

  async toggleLeg(): Promise<void> {
    if (this.leg == null) return;
    await this.setLeg(this.leg === 'original' ? 'processed' : 'original');
  }

  async stop(opts?: { notifyIdle?: boolean }): Promise<void> {
    const notifyIdle = opts?.notifyIdle !== false;
    if (this.stopTimer != null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    const ctx = audioEngine.masterCtx;
    const gain = this.gain;
    const source = this.source;
    if (!gain || !source || !ctx) {
      this.cleanupNodes();
      this.clearSession();
      if (notifyIdle) this.onIdle?.();
      return;
    }
    const myGen = this.gen;
    rampParam(gain.gain, 0, ctx, RAMP_S);
    await sleep(RAMP_S * 1000 + 30);
    if (this.gen !== myGen) return;
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    this.cleanupNodes();
    this.clearSession();
    if (notifyIdle) this.onIdle?.();
  }

  private playbackOffsetSec(): number {
    const ctx = audioEngine.masterCtx;
    if (!ctx || this.startedAtCtx <= 0) return this.offsetAtStart;
    return Math.max(0, this.offsetAtStart + (ctx.currentTime - this.startedAtCtx));
  }

  private async playLeg(leg: PhonesPreviewLeg, offsetSec: number): Promise<void> {
    const ctx = audioEngine.masterCtx;
    const dest = audioEngine.phonesInjectNode();
    const buf = leg === 'original' ? this.originalBuf : this.processedBuf;
    if (!ctx || !dest || !buf) {
      throw new Error('Audio engine not ready — open Audio setup / wait for outputs');
    }

    // Fade out current source if any (leg switch).
    if (this.source && this.gain) {
      const oldGain = this.gain;
      const oldSource = this.source;
      const myGen = ++this.gen;
      rampParam(oldGain.gain, 0, ctx, RAMP_S);
      await sleep(RAMP_S * 1000 + 20);
      if (this.gen !== myGen) return;
      try {
        oldSource.stop();
      } catch {
        /* ignore */
      }
      try {
        oldSource.disconnect();
      } catch {
        /* ignore */
      }
      try {
        oldGain.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
      this.gain = null;
    } else {
      this.gen += 1;
    }

    const myGen = this.gen;
    const maxDur = Math.min(buf.duration, MAX_PREVIEW_SEC);
    const offset = Math.min(Math.max(0, offsetSec), Math.max(0, maxDur - 0.05));
    const remain = Math.max(0.05, maxDur - offset);

    const gain = ctx.createGain();
    gain.gain.value = 0;
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.connect(gain);
    gain.connect(dest);

    const target = leg === 'original' ? this.originalGain : this.processedGain;
    linearRampParam(gain.gain, target, ctx, RAMP_S);
    source.onended = () => {
      if (this.gen !== myGen) return;
      this.cleanupNodes();
      this.clearSession();
      this.onIdle?.();
    };

    this.source = source;
    this.gain = gain;
    this.leg = leg;
    this.offsetAtStart = offset;
    this.startedAtCtx = ctx.currentTime;
    source.start(0, offset);

    if (this.stopTimer != null) clearTimeout(this.stopTimer);
    const sessionElapsed = Math.max(0, ctx.currentTime - this.sessionStartCtx);
    const sessionRemainMs = Math.max(0, MAX_PREVIEW_SEC * 1000 - sessionElapsed * 1000);
    const durMs = Math.min(remain * 1000, sessionRemainMs) + RAMP_S * 1000 + 50;
    this.stopTimer = setTimeout(() => {
      if (this.gen === myGen) void this.stop();
    }, durMs);
  }

  private clearSession(): void {
    this.kind = null;
    this.leg = null;
    this.originalBuf = null;
    this.processedBuf = null;
    this.startedAtCtx = 0;
    this.offsetAtStart = 0;
    this.sessionStartCtx = 0;
  }

  private cleanupNodes(): void {
    try {
      this.source?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      this.gain?.disconnect();
    } catch {
      /* ignore */
    }
    this.source = null;
    this.gain = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export const phonesPreviewPlayer = new PhonesPreviewPlayer();
