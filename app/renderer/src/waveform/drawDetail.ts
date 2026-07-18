/**
 * Scrolling detail waveform (docs/05): fixed center playhead, ±4 s @ 50 pps data.
 * Drawn per device-pixel column with linear interpolation so fullscreen isn't blocky.
 */

import { u8SignedToUnit, u8UnsignedToUnit } from './drawOverview';

export const DETAIL_HALF_WINDOW_SEC = 4;
export const DETAIL_PPS_DEFAULT = 50;
/** Source buckets in the ±4 s window at 50 pps (analysis density). */
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
  /** File BPM for beat ticks (track-time lattice); null → no ticks. */
  gridBpm: number | null;
  /** Analyzed first-beat offset (sec); default 0 = legacy 0:00 grid. */
  beatGridOffsetSec?: number | null;
  showBeatTicks: boolean;
  /** Device pixel ratio — column step ≈ 1 CSS px (E7). */
  devicePixelRatio?: number;
};

export type DetailSample = { min: number; max: number; rms: number };

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

/**
 * Beat times (seconds) that fall inside the visible window.
 * Lattice: beatGridOffset + n × period (same grid as SYNC, R2.3 / R7.5).
 */
export function beatTimesInWindow(
  positionSec: number,
  effectiveBpm: number,
  halfWindowSec = DETAIL_HALF_WINDOW_SEC,
  beatGridOffsetSec = 0,
): number[] {
  if (!(effectiveBpm > 0)) return [];
  const period = 60 / effectiveBpm;
  if (!(period > 0)) return [];
  const offset =
    Number.isFinite(beatGridOffsetSec) && beatGridOffsetSec >= 0
      ? beatGridOffsetSec % period
      : 0;
  const t0 = positionSec - halfWindowSec;
  const t1 = positionSec + halfWindowSec;
  // First beat index with offset + n*period >= t0
  let n = Math.ceil((t0 - offset) / period - 1e-9);
  if (n < 0) n = 0;
  const out: number[] = [];
  for (let t = offset + n * period; t <= t1 + 1e-9; t += period) {
    if (t >= t0 - 1e-9 && t >= 0) out.push(t);
    if (out.length > 64) break;
  }
  return out;
}

export function detailBucketCount(detail: Uint8Array): number {
  return Math.floor(detail.length / 3);
}

function readBucket(detail: Uint8Array, i: number): DetailSample {
  const o = i * 3;
  return {
    min: u8SignedToUnit(detail[o]!),
    max: u8SignedToUnit(detail[o + 1]!),
    rms: u8UnsignedToUnit(detail[o + 2]!),
  };
}

/** Lerp min/max/rms between adjacent 50 pps buckets (display upsampling). */
export function sampleDetailLerped(
  detail: Uint8Array,
  bucketCount: number,
  bucketFloat: number,
): DetailSample | null {
  if (bucketCount <= 0) return null;
  if (bucketFloat < -1e-9 || bucketFloat >= bucketCount) return null;
  const clamped = Math.max(0, Math.min(bucketCount - 1e-9, bucketFloat));
  const i0 = Math.floor(clamped);
  const i1 = Math.min(bucketCount - 1, i0 + 1);
  const t = clamped - i0;
  const a = readBucket(detail, i0);
  if (i0 === i1 || t < 1e-9) return a;
  const b = readBucket(detail, i1);
  return {
    min: a.min + (b.min - a.min) * t,
    max: a.max + (b.max - a.max) * t,
    rms: a.rms + (b.rms - a.rms) * t,
  };
}

/**
 * Draw scrolling detail into an already-sized canvas.
 * Column step ≈ CSS pixel (every `devicePixelRatio` device px) for E7 rAF budget.
 * Data contract unchanged: ±4 s @ 50 pps (docs/05).
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
    gridBpm,
    beatGridOffsetSec,
    showBeatTicks,
    devicePixelRatio = 1,
  } = opts;
  ctx.clearRect(0, 0, width, height);
  if (detail.length < 3 || width <= 0 || height <= 0 || durationSec <= 0) return;

  const pps = detailPps > 0 ? detailPps : DETAIL_PPS_DEFAULT;
  const bucketCount = detailBucketCount(detail);
  const mid = height / 2;
  const centerX = width / 2;
  const t0 = positionSec - DETAIL_HALF_WINDOW_SEC;
  const t1 = positionSec + DETAIL_HALF_WINDOW_SEC;
  const span = t1 - t0;
  if (span <= 0) return;

  // ~1 CSS px per column (min 2 device px on extreme DPR) — fills cover the gap.
  const step = Math.max(2, Math.round(devicePixelRatio || 1));

  ctx.fillStyle = accent;
  for (let x = 0; x < width; x += step) {
    const timeSec = t0 + ((x + step * 0.5) / width) * span;
    const sample = sampleDetailLerped(detail, bucketCount, timeSec * pps);
    if (!sample) continue;

    const past = x < centerX;
    const alpha = past ? 0.55 : 1;

    const yMin = mid - sample.max * mid * 0.92;
    const yMax = mid - sample.min * mid * 0.92;
    const top = Math.min(yMin, yMax);
    const bot = Math.max(yMin, yMax);

    ctx.globalAlpha = alpha * 0.55;
    ctx.fillRect(x, top, step, Math.max(1, bot - top));

    const rmsH = sample.rms * mid * 0.75;
    ctx.globalAlpha = alpha;
    ctx.fillRect(x, mid - rmsH, step, Math.max(1, rmsH * 2));
  }

  if (showBeatTicks && gridBpm != null && gridBpm > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = tickColor;
    for (const t of beatTimesInWindow(
      positionSec,
      gridBpm,
      DETAIL_HALF_WINDOW_SEC,
      beatGridOffsetSec ?? 0,
    )) {
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
