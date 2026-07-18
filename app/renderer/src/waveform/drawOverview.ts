/**
 * Overview waveform draw (docs/05 rendering contract) — pure, unit-tested.
 * 800 buckets × (min, max, rms) u8 triplets.
 */

export const OVERVIEW_BUCKETS = 800;

export type OverviewDrawOpts = {
  width: number;
  height: number;
  /** Playhead 0..1 */
  progress: number;
  /** Cue marker 0..1 */
  cueNorm: number;
  accent: string;
  clip: string;
  /** Seconds remaining; ≤30 / 15 / 10 tint remaining region toward clip. */
  remainingSec: number | null;
};

function eotAlpha(remainingSec: number | null): number {
  if (remainingSec == null) return 0;
  if (remainingSec <= 10) return 0.55;
  if (remainingSec <= 15) return 0.4;
  if (remainingSec <= 30) return 0.25;
  return 0;
}

/** Decode signed u8 sample (−1..1). */
export function u8SignedToUnit(v: number): number {
  return (v / 255) * 2 - 1;
}

/** Decode unsigned u8 RMS (0..1). */
export function u8UnsignedToUnit(v: number): number {
  return v / 255;
}

/**
 * Draw overview strip into an already-sized canvas context.
 * Played region: full accent opacity; remainder: 40 %. Cue: 2 px vertical.
 */
export function drawOverviewWaveform(
  ctx: CanvasRenderingContext2D,
  overview: Uint8Array,
  opts: OverviewDrawOpts,
): void {
  const { width, height, progress, cueNorm, accent, clip, remainingSec } = opts;
  ctx.clearRect(0, 0, width, height);
  if (overview.length < OVERVIEW_BUCKETS * 3 || width <= 0 || height <= 0) return;

  const mid = height / 2;
  const playedX = Math.max(0, Math.min(width, progress * width));
  const warnA = eotAlpha(remainingSec);

  for (let b = 0; b < OVERVIEW_BUCKETS; b++) {
    const o = b * 3;
    const min = u8SignedToUnit(overview[o]!);
    const max = u8SignedToUnit(overview[o + 1]!);
    const rms = u8UnsignedToUnit(overview[o + 2]!);
    const x0 = Math.floor((b * width) / OVERVIEW_BUCKETS);
    const x1 = Math.floor(((b + 1) * width) / OVERVIEW_BUCKETS);
    const w = Math.max(1, x1 - x0);
    const played = x0 < playedX;
    const alpha = played ? 1 : 0.4;

    const yMin = mid - max * mid * 0.95;
    const yMax = mid - min * mid * 0.95;
    const top = Math.min(yMin, yMax);
    const bot = Math.max(yMin, yMax);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = accent;
    ctx.fillRect(x0, top, w, Math.max(1, bot - top));

    const rmsH = rms * mid * 0.7;
    ctx.globalAlpha = alpha * 0.85;
    ctx.fillRect(x0, mid - rmsH, w, Math.max(1, rmsH * 2));
  }

  if (warnA > 0 && remainingSec != null && remainingSec > 0) {
    // Tint unplayed remainder toward clip.
    ctx.globalAlpha = warnA;
    ctx.fillStyle = clip;
    ctx.fillRect(playedX, 0, width - playedX, height);
  }

  // Cue marker
  const cueX = Math.round(Math.max(0, Math.min(1, cueNorm)) * width);
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.fillRect(cueX - 1, 0, 2, height);

  ctx.globalAlpha = 1;
}
