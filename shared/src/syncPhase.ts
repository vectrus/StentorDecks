/**
 * SYNC phase snap + soft assist (R2.3).
 * Beat phase uses analyzed beatgrid: (position − offset) mod period.
 * Soft assist while armed; hard continuous phase-lock is out of scope.
 */

/** Wrap into [0, period). */
export function wrapPhaseSec(t: number, periodSec: number): number {
  if (!(periodSec > 0) || !Number.isFinite(periodSec) || !Number.isFinite(t)) return 0;
  let r = t % periodSec;
  if (r < 0) r += periodSec;
  return r;
}

/** Beat phase at playhead for a track with grid offset. */
export function beatPhaseSec(
  positionSec: number,
  beatGridOffsetSec: number,
  periodSec: number,
): number {
  return wrapPhaseSec(positionSec - beatGridOffsetSec, periodSec);
}

/**
 * Shortest signed delta (seconds) to add to `thisPosSec` so beat phases match.
 * Offsets default to 0 (legacy 0:00 grid) when omitted.
 */
export function phaseSnapDeltaSec(
  thisPosSec: number,
  otherPosSec: number,
  beatPeriodSec: number,
  thisOffsetSec = 0,
  otherOffsetSec = 0,
): number {
  if (!(beatPeriodSec > 0) || !Number.isFinite(beatPeriodSec)) return 0;
  if (!Number.isFinite(thisPosSec) || !Number.isFinite(otherPosSec)) return 0;
  if (!Number.isFinite(thisOffsetSec) || !Number.isFinite(otherOffsetSec)) return 0;

  const thisPhase = beatPhaseSec(thisPosSec, thisOffsetSec, beatPeriodSec);
  const otherPhase = beatPhaseSec(otherPosSec, otherOffsetSec, beatPeriodSec);
  let delta = otherPhase - thisPhase;
  const half = beatPeriodSec / 2;
  if (delta > half) delta -= beatPeriodSec;
  if (delta < -half) delta += beatPeriodSec;
  return delta;
}

/** Current phase error (other − this), shortest signed seconds — for soft assist. */
export function phaseErrorSec(
  thisPosSec: number,
  otherPosSec: number,
  beatPeriodSec: number,
  thisOffsetSec = 0,
  otherOffsetSec = 0,
): number {
  return phaseSnapDeltaSec(
    thisPosSec,
    otherPosSec,
    beatPeriodSec,
    thisOffsetSec,
    otherOffsetSec,
  );
}

/**
 * After ½ / ×2 BPM, keep the same absolute first-beat time, wrapped into the new period.
 */
export function rescaleBeatGridOffsetSec(
  offsetSec: number | null | undefined,
  newBpm: number,
): number | null {
  if (offsetSec == null || !Number.isFinite(offsetSec)) return null;
  if (!(newBpm > 0) || !Number.isFinite(newBpm)) return null;
  const period = 60 / newBpm;
  return wrapPhaseSec(offsetSec, period);
}

export function beatPeriodSec(effectiveBpm: number): number | null {
  if (!(effectiveBpm > 0) || !Number.isFinite(effectiveBpm)) return null;
  return 60 / effectiveBpm;
}

/** Soft-assist deadband (seconds) — ignore tiny errors. */
export const PHASE_ASSIST_DEADBAND_SEC = 0.006;
/** Max seek correction per assist tick (seconds) — glue, not teleport. */
export const PHASE_ASSIST_MAX_SEEK_SEC = 0.012;
/** After jog: pause assist so we don't fight the wheel. */
export const PHASE_ASSIST_JOG_MUTE_MS = 300;

/**
 * Correction to apply to `this` so phase error becomes `targetErr`
 * (target 0 = grid lock; non-zero = hold a jogged musical offset).
 */
export function phaseAssistDeltaSec(
  thisPosSec: number,
  otherPosSec: number,
  beatPeriodSec: number,
  thisOffsetSec: number,
  otherOffsetSec: number,
  targetErrSec: number,
): number {
  const err = phaseErrorSec(
    thisPosSec,
    otherPosSec,
    beatPeriodSec,
    thisOffsetSec,
    otherOffsetSec,
  );
  if (!(beatPeriodSec > 0)) return 0;
  let delta = err - targetErrSec;
  const half = beatPeriodSec / 2;
  if (delta > half) delta -= beatPeriodSec;
  if (delta < -half) delta += beatPeriodSec;
  return delta;
}
