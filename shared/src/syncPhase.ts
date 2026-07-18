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

export function beatPeriodSec(bpm: number): number | null {
  if (!(bpm > 0) || !Number.isFinite(bpm)) return null;
  return 60 / bpm;
}

/**
 * Shortest correction (seconds of *this* deck's buffer time) so beat fractions match.
 * Uses each deck's **file BPM** lattice — positions are track time, not pitched output time.
 * (Using pitchOnlyBpm as a buffer-time period made SYNC assist crawl the waveforms.)
 */
export function phaseSnapDeltaTrackSec(
  thisPosSec: number,
  otherPosSec: number,
  thisFileBpm: number,
  otherFileBpm: number,
  thisOffsetSec = 0,
  otherOffsetSec = 0,
): number {
  const thisPeriod = beatPeriodSec(thisFileBpm);
  const otherPeriod = beatPeriodSec(otherFileBpm);
  if (thisPeriod == null || otherPeriod == null) return 0;
  if (!Number.isFinite(thisPosSec) || !Number.isFinite(otherPosSec)) return 0;
  if (!Number.isFinite(thisOffsetSec) || !Number.isFinite(otherOffsetSec)) return 0;

  const thisBeat =
    beatPhaseSec(thisPosSec, thisOffsetSec, thisPeriod) / thisPeriod;
  const otherBeat =
    beatPhaseSec(otherPosSec, otherOffsetSec, otherPeriod) / otherPeriod;
  let deltaBeats = otherBeat - thisBeat;
  if (deltaBeats > 0.5) deltaBeats -= 1;
  if (deltaBeats < -0.5) deltaBeats += 1;
  return deltaBeats * thisPeriod;
}

export function phaseErrorTrackSec(
  thisPosSec: number,
  otherPosSec: number,
  thisFileBpm: number,
  otherFileBpm: number,
  thisOffsetSec = 0,
  otherOffsetSec = 0,
): number {
  return phaseSnapDeltaTrackSec(
    thisPosSec,
    otherPosSec,
    thisFileBpm,
    otherFileBpm,
    thisOffsetSec,
    otherOffsetSec,
  );
}

/** Soft-assist deadband (seconds) — ignore tiny errors. */
export const PHASE_ASSIST_DEADBAND_SEC = 0.006;
/** Max seek correction per assist tick (seconds) — glue, not teleport. */
export const PHASE_ASSIST_MAX_SEEK_SEC = 0.012;
/** After jog: pause assist so we don't fight the wheel. */
export const PHASE_ASSIST_JOG_MUTE_MS = 800;
/**
 * Below this |error|, assist uses a tiny rate bias instead of seek
 * (fewer crossfades; less crawl vs jog).
 */
export const PHASE_ASSIST_RATE_BIAS_MAX_ERR_SEC = 0.02;
/** Max |rate − 1| applied for soft phase rate bias. */
export const PHASE_ASSIST_RATE_BIAS_MAX = 0.004;
/** Min ms between assist seeks (large errors only). */
export const PHASE_ASSIST_SEEK_MIN_INTERVAL_MS = 64;

/**
 * Temporary playback-rate multiplier toward zero phase error.
 * Positive delta (this ahead) → slow down slightly.
 */
export function phaseAssistRateBias(deltaSec: number): number {
  if (!Number.isFinite(deltaSec) || Math.abs(deltaSec) < PHASE_ASSIST_DEADBAND_SEC) {
    return 1;
  }
  const t = Math.min(1, Math.abs(deltaSec) / PHASE_ASSIST_RATE_BIAS_MAX_ERR_SEC);
  const mag = PHASE_ASSIST_RATE_BIAS_MAX * t;
  return deltaSec > 0 ? 1 - mag : 1 + mag;
}

/**
 * Correction to apply to `this` so phase error becomes `targetErr`
 * (target 0 = grid lock; non-zero = hold a jogged musical offset).
 * Periods are file-BPM track-time lattices.
 */
export function phaseAssistDeltaTrackSec(
  thisPosSec: number,
  otherPosSec: number,
  thisFileBpm: number,
  otherFileBpm: number,
  thisOffsetSec: number,
  otherOffsetSec: number,
  targetErrSec: number,
): number {
  const thisPeriod = beatPeriodSec(thisFileBpm);
  if (thisPeriod == null) return 0;
  const err = phaseErrorTrackSec(
    thisPosSec,
    otherPosSec,
    thisFileBpm,
    otherFileBpm,
    thisOffsetSec,
    otherOffsetSec,
  );
  let delta = err - targetErrSec;
  const half = thisPeriod / 2;
  if (delta > half) delta -= thisPeriod;
  if (delta < -half) delta += thisPeriod;
  return delta;
}

/**
 * @deprecated Prefer phaseAssistDeltaTrackSec (file BPM / track time).
 * Kept for tests that use a shared period.
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
