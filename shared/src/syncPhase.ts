/**
 * One-shot SYNC phase snap (R2.3): align beat phase after tempo match.
 * Beat grid origin is 0:00 per track (same as visual beat ticks, R7.5).
 * Not continuous phase-lock — call only on SYNC engage.
 */

/** Shortest signed delta (seconds) to add to `thisPosSec` so phases match. */
export function phaseSnapDeltaSec(
  thisPosSec: number,
  otherPosSec: number,
  beatPeriodSec: number,
): number {
  if (!(beatPeriodSec > 0) || !Number.isFinite(beatPeriodSec)) return 0;
  if (!Number.isFinite(thisPosSec) || !Number.isFinite(otherPosSec)) return 0;

  const wrap = (t: number): number => {
    let r = t % beatPeriodSec;
    if (r < 0) r += beatPeriodSec;
    return r;
  };

  const thisPhase = wrap(thisPosSec);
  const otherPhase = wrap(otherPosSec);
  let delta = otherPhase - thisPhase;
  const half = beatPeriodSec / 2;
  if (delta > half) delta -= beatPeriodSec;
  if (delta < -half) delta += beatPeriodSec;
  return delta;
}

export function beatPeriodSec(effectiveBpm: number): number | null {
  if (!(effectiveBpm > 0) || !Number.isFinite(effectiveBpm)) return null;
  return 60 / effectiveBpm;
}
