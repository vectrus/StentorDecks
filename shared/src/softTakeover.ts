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
  return { ...state, armed: true, softwareValue: clamp01(softwareValue) };
}

/**
 * Snap software to last known hardware and go live (deck load reconcile).
 * Returns null when no hardware sample exists yet.
 */
export function adoptHardwareTakeover(state: TakeoverState): TakeoverState | null {
  if (state.hardwareValue == null || !Number.isFinite(state.hardwareValue)) return null;
  const hw = clamp01(state.hardwareValue);
  return { armed: false, softwareValue: hw, hardwareValue: hw };
}

/**
 * Keep a live control live after an unrelated software event (e.g. load kept pitch/EQ).
 * If still armed but hardware already matches the software target, go live immediately.
 */
export function preserveTakeoverAfterLoad(
  state: TakeoverState,
  softwareValue: number,
): TakeoverState {
  const soft = clamp01(softwareValue);
  if (!state.armed) {
    return { ...state, softwareValue: soft };
  }
  if (state.hardwareValue != null && Math.abs(state.hardwareValue - soft) <= PICKUP_EPS) {
    return { armed: false, softwareValue: soft, hardwareValue: state.hardwareValue };
  }
  // Still armed and mismatched — refresh target only (do not force a fresh arm).
  return { ...state, softwareValue: soft };
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
