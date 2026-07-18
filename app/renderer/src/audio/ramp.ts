/** AudioParam ramps — never snap .value mid-playback (docs/03). */

const TAU = 15 / 1000 / 3; // setTarget time constant ≈ 15 ms settle

export function rampParam(
  param: AudioParam,
  value: number,
  ctx: BaseAudioContext,
  seconds = 0.015,
): void {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  if (seconds <= 0) {
    param.setValueAtTime(value, t);
    return;
  }
  param.setTargetAtTime(value, t, Math.max(seconds / 3, TAU));
}

export function linearRampParam(
  param: AudioParam,
  value: number,
  ctx: BaseAudioContext,
  seconds = 0.015,
): void {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(value, t + seconds);
}
