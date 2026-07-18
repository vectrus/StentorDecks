/**
 * Soft takeover state machine (R2.7 / docs/03).
 * Compares raw hardware 0..1 against software raw; arms until crossed / within 1/128.
 */

const PICKUP_EPS = 1 / 128;

export type TakeoverState = {
  armed: boolean;
  softwareValue: number;
  hardwareValue: number | null;
};

export function createTakeover(softwareValue = 0.5): TakeoverState {
  return { armed: true, softwareValue, hardwareValue: null };
}

/** Software-side change (sync, load, UI) — re-arm. */
export function armTakeover(state: TakeoverState, softwareValue: number): TakeoverState {
  return { ...state, armed: true, softwareValue };
}

/**
 * While armed, keep the pickup target on the current software raw
 * (e.g. SYNC tempo follow moves pitch without a new arm event).
 * Does not change `armed`. Live (disarmed) controls are unchanged.
 */
export function refreshTakeoverSoftware(
  state: TakeoverState,
  softwareValue: number,
): TakeoverState {
  if (!state.armed) return state;
  return { ...state, softwareValue: clamp01(softwareValue) };
}

/**
 * Incoming hardware raw 0..1.
 * Returns updated state + whether the value should be applied to software.
 */
export function processTakeoverInput(
  state: TakeoverState,
  hardwareValue: number,
): { state: TakeoverState; apply: boolean; value: number } {
  const hw = clamp01(hardwareValue);
  const next: TakeoverState = { ...state, hardwareValue: hw };

  if (!state.armed) {
    return {
      state: { ...next, softwareValue: hw },
      apply: true,
      value: hw,
    };
  }

  const soft = state.softwareValue;
  const crossed =
    Math.abs(hw - soft) <= PICKUP_EPS ||
    (state.hardwareValue != null &&
      ((state.hardwareValue < soft && hw >= soft) ||
        (state.hardwareValue > soft && hw <= soft)));

  if (crossed) {
    return {
      state: { armed: false, softwareValue: hw, hardwareValue: hw },
      apply: true,
      value: hw,
    };
  }

  return { state: next, apply: false, value: soft };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
