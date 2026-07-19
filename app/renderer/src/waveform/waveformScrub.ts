import { DETAIL_HALF_WINDOW_SEC } from './drawDetail';

/** Visible half-window (sec) matching DetailWaveform draw (pitch-rate scaled). */
export function detailHalfWindowSec(pitchOnlyRate: number): number {
  const rate = Math.min(4, Math.max(0.25, pitchOnlyRate || 1));
  return DETAIL_HALF_WINDOW_SEC * rate;
}

/** Track time under a pointer on a fixed-center detail strip. */
export function detailTimeAtX(
  clientX: number,
  rect: DOMRect,
  positionSec: number,
  halfWindowSec: number,
): number {
  const xNorm = (clientX - rect.left) / Math.max(1, rect.width);
  return positionSec + (xNorm - 0.5) * 2 * halfWindowSec;
}

/** Seconds per CSS pixel for relative scrub on the detail strip. */
export function detailSecPerPx(rectWidth: number, halfWindowSec: number): number {
  return (2 * halfWindowSec) / Math.max(1, rectWidth);
}

/** Overview strip: normalize 0..1 from client X. */
export function overviewNormAtX(clientX: number, rect: DOMRect): number {
  return Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width)));
}
