/**
 * Scrolling detail waveform (docs/05): fixed center playhead, ±4 s @ 50 pps → 400 buckets.
 * Canvas redraw from typed arrays — no React in the draw path.
 */

import { u8SignedToUnit, u8UnsignedToUnit } from './drawOverview';

export const DETAIL_HALF_WINDOW_SEC = 4;
export const DETAIL_PPS_DEFAULT = 50;
/** Visible buckets in the ±4 s window at 50 pps. */
export const DETAIL_WINDOW_BUCKETS = DETAIL_HALF_WINDOW_SEC * 2 * DETAIL_PPS_DEFAULT;

export type DetailDrawOpts = {
  width: number;
  height: number;
  /** Playhead time (seconds). */
  positionSec: number;
  durationSec: number;
  cueOffsetSec: number;
  /** Peaks per second in the detail blob (usually 50). */
  detailPps: number;
  accent: string;
  tickColor: string;
  /** Effective BPM for beat ticks; null → no ticks. */
  effectiveBpm: number | null;
  showBeatTicks: boolean;
};

/**
 * First detail bucket that may appear in the window (for tests / diagnostics).
 * Not clamped to keep left side empty near t=0 — drawing uses time→x mapping.
 */
export function detailWindowStartBucket(
  positionSec: number,
  detailPps: number,
  halfWindowSec = DETAIL_HALF_WINDOW_SEC,
): number {
  const pps = detailPps > 0 ? detailPps : DETAIL_PPS_DEFAULT;
  return Math.floor((positionSec - halfWindowSec) * pps);
}

/** Map absolute time → x in the detail window (center = positionSec). */
export function timeToDetailX(
  timeSec: number,
  positionSec: number,
  width: number,
  halfWindowSec = DETAIL_HALF_WINDOW_SEC,
): number {
  const t0 = positionSec - halfWindowSec;
  const t1 = positionSec + halfWindowSec;
  if (t1 <= t0) return width / 2;
  return ((timeSec - t0) / (t1 - t0)) * width;
}

/** Beat times (seconds from 0:00) that fall inside the visible window. */
export function beatTimesInWindow(
  positionSec: number,
  effectiveBpm: number,
  halfWindowSec = DETAIL_HALF_WINDOW_SEC,
): number[] {
  if (!(effectiveBpm > 0)) return [];
  const period = 60 / effectiveBpm;
  const t0 = positionSec - halfWindowSec;
  const t1 = positionSec + halfWindowSec;
  let n = Math.ceil(t0 / period - 1e-9);
  if (n < 0) n = 0;
  const out: number[] = [];
  for (let t = n * period; t <= t1 + 1e-9; t += period) {
    if (t >= t0 - 1e-9) out.push(t);
    if (out.length > 64) break;
  }
  return out;
}

export function detailBucketCount(detail: Uint8Array): number {
  return Math.floor(detail.length / 3);
}

/**
 * Draw scrolling detail into an already-sized canvas.
 * Center playhead is a CSS overlay; waveform scrolls under it via time→x.
 */
export function drawDetailWaveform(
  ctx: CanvasRenderingContext2D,
  detail: Uint8Array,
  opts: DetailDrawOpts,
): void {
  const {
    width,
    height,
    positionSec,
    durationSec,
    cueOffsetSec,
    detailPps,
    accent,
    tickColor,
    effectiveBpm,
    showBeatTicks,
  } = opts;
  ctx.clearRect(0, 0, width, height);
  if (detail.length < 3 || width <= 0 || height <= 0 || durationSec <= 0) return;

  const pps = detailPps > 0 ? detailPps : DETAIL_PPS_DEFAULT;
  const bucketCount = detailBucketCount(detail);
  const mid = height / 2;
  const centerX = width / 2;
  const t0 = positionSec - DETAIL_HALF_WINDOW_SEC;
  const t1 = positionSec + DETAIL_HALF_WINDOW_SEC;
  const b0 = Math.floor(t0 * pps);
  const b1 = Math.ceil(t1 * pps);

  for (let b = b0; b < b1; b++) {
    if (b < 0 || b >= bucketCount) continue;
    const timeSec = (b + 0.5) / pps;
    const xCenter = timeToDetailX(timeSec, positionSec, width);
    const x0 = Math.floor(timeToDetailX(b / pps, positionSec, width));
    const x1 = Math.ceil(timeToDetailX((b + 1) / pps, positionSec, width));
    const w = Math.max(1, x1 - x0);
    if (x1 < 0 || x0 > width) continue;

    const o = b * 3;
    const min = u8SignedToUnit(detail[o]!);
    const max = u8SignedToUnit(detail[o + 1]!);
    const rms = u8UnsignedToUnit(detail[o + 2]!);
    const past = xCenter < centerX;
    const alpha = past ? 0.55 : 1;

    const yMin = mid - max * mid * 0.92;
    const yMax = mid - min * mid * 0.92;
    const top = Math.min(yMin, yMax);
    const bot = Math.max(yMin, yMax);

    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = accent;
    ctx.fillRect(x0, top, w, Math.max(1, bot - top));

    const rmsH = rms * mid * 0.75;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x0, mid - rmsH, w, Math.max(1, rmsH * 2));
  }

  if (showBeatTicks && effectiveBpm != null && effectiveBpm > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = tickColor;
    for (const t of beatTimesInWindow(positionSec, effectiveBpm)) {
      const x = Math.round(timeToDetailX(t, positionSec, width));
      if (x < 0 || x > width) continue;
      ctx.fillRect(x, 0, 1, height);
    }
  }

  if (cueOffsetSec >= 0 && cueOffsetSec <= durationSec) {
    const cueX = timeToDetailX(cueOffsetSec, positionSec, width);
    if (cueX >= -1 && cueX <= width + 1) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = accent;
      ctx.fillRect(Math.round(cueX) - 1, 0, 2, height);
    }
  }

  ctx.globalAlpha = 1;
}
