import { linearRampParam, rampParam } from './ramp';
import { audioEngine } from './AudioEngine';

const RAMP_S = 0.02;
/** Auto-stop long previews so phones aren't left running. */
const MAX_PREVIEW_SEC = 45;

/**
 * One-shot AudioBuffer → headphones only (inject at headGain, never master/limiter).
 * Fixer preview and normalize preview share this singleton — not both at once.
 */
export class PhonesPreviewPlayer {
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private gen = 0;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  /** 'fixer' | 'normalize' | null */
  kind: 'fixer' | 'normalize' | null = null;
  /** Fired when preview ends (stop, timeout, or buffer end) — sync MobX UI. */
  onIdle: (() => void) | null = null;

  get playing(): boolean {
    return this.source != null;
  }

  async start(
    buffer: AudioBuffer,
    opts: { kind: 'fixer' | 'normalize'; gainLinear?: number },
  ): Promise<void> {
    await this.stop();
    const ctx = audioEngine.masterCtx;
    const dest = audioEngine.phonesInjectNode();
    if (!ctx || !dest) {
      throw new Error('Audio engine not ready — open Audio setup / wait for outputs');
    }
    await audioEngine.ensureRunning();

    const myGen = ++this.gen;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(dest);

    const target = Math.max(0, Math.min(2, opts.gainLinear ?? 0.85));
    linearRampParam(gain.gain, target, ctx, RAMP_S);
    source.onended = () => {
      if (this.gen !== myGen) return;
      this.cleanupNodes();
      this.kind = null;
      this.onIdle?.();
    };

    this.source = source;
    this.gain = gain;
    this.kind = opts.kind;
    source.start(0);

    const durMs = Math.min(buffer.duration, MAX_PREVIEW_SEC) * 1000 + RAMP_S * 1000 + 50;
    this.stopTimer = setTimeout(() => {
      if (this.gen === myGen) void this.stop();
    }, durMs);
  }

  async stop(): Promise<void> {
    if (this.stopTimer != null) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    const ctx = audioEngine.masterCtx;
    const gain = this.gain;
    const source = this.source;
    if (!gain || !source || !ctx) {
      this.cleanupNodes();
      this.kind = null;
      this.onIdle?.();
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
    this.kind = null;
    this.onIdle?.();
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
