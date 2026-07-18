/**
 * Dual-zone jog feel (R2.2 / docs/03):
 * - Fine: SL-1200 fingertip phase nudge
 * - Spin: fast twist / spinback — larger sticky seek + stronger temp rate
 *
 * Tunables live in settings.mixer.jog (docs/07). Constants below are the defaults.
 */

/** Default engine units (matches defaultJogSettings) — tests / docs. */
export const JOG_FINE_SEEK_SEC = 0.0004;
export const JOG_SPIN_SEEK_SEC = 0.016;
export const JOG_FINE_RATE = 0.0008;
export const JOG_SPIN_RATE = 0.06;
export const JOG_RATE_DECAY_MS = 480;
export const JOG_PAUSED_FINE_SEEK_SEC = 0.002;
export const JOG_PAUSED_SPIN_SEEK_SEC = 0.02;
export const JOG_TPS_FINE = 45;
export const JOG_TPS_SPIN = 130;

/** Human-unit jog settings (matches settings.mixer.jog). */
export type JogSettings = {
  dualZone: boolean;
  fineSeekMs: number;
  spinSeekMs: number;
  fineRatePercent: number;
  spinRatePercent: number;
  rateDecayMs: number;
  pausedFineSeekMs: number;
  pausedSpinSeekMs: number;
  spinStartsAtTps: number;
  spinFullAtTps: number;
};

/**
 * Default = very subtle fingertip (SL-1200).
 * A light push must barely move phase; spinback only on a real hard twist.
 */
export const defaultJogSettings: JogSettings = {
  dualZone: true,
  fineSeekMs: 0.4,
  spinSeekMs: 16,
  fineRatePercent: 0.08,
  spinRatePercent: 6,
  rateDecayMs: 480,
  pausedFineSeekMs: 2,
  pausedSpinSeekMs: 20,
  spinStartsAtTps: 45,
  spinFullAtTps: 130,
};

/** Previous factory defaults — migrate once so saved itchy settings quiet down. */
export const LEGACY_ITCHY_JOG_DEFAULTS: readonly JogSettings[] = [
  {
    dualZone: true,
    fineSeekMs: 2,
    spinSeekMs: 32,
    fineRatePercent: 0.3,
    spinRatePercent: 12,
    rateDecayMs: 380,
    pausedFineSeekMs: 5,
    pausedSpinSeekMs: 40,
    spinStartsAtTps: 18,
    spinFullAtTps: 85,
  },
  {
    dualZone: true,
    fineSeekMs: 1.5,
    spinSeekMs: 18,
    fineRatePercent: 0.25,
    spinRatePercent: 8,
    rateDecayMs: 420,
    pausedFineSeekMs: 4,
    pausedSpinSeekMs: 28,
    spinStartsAtTps: 22,
    spinFullAtTps: 100,
  },
];

export function jogSettingsEqual(a: JogSettings, b: JogSettings): boolean {
  return (
    a.dualZone === b.dualZone &&
    a.fineSeekMs === b.fineSeekMs &&
    a.spinSeekMs === b.spinSeekMs &&
    a.fineRatePercent === b.fineRatePercent &&
    a.spinRatePercent === b.spinRatePercent &&
    a.rateDecayMs === b.rateDecayMs &&
    a.pausedFineSeekMs === b.pausedFineSeekMs &&
    a.pausedSpinSeekMs === b.pausedSpinSeekMs &&
    a.spinStartsAtTps === b.spinStartsAtTps &&
    a.spinFullAtTps === b.spinFullAtTps
  );
}

/** Replace known-itchy factory bundles with the subtle default. */
export function migrateItchyJogSettings(jog: JogSettings): JogSettings {
  for (const legacy of LEGACY_ITCHY_JOG_DEFAULTS) {
    if (jogSettingsEqual(jog, legacy)) return { ...defaultJogSettings };
  }
  return jog;
}

/** Named bundles for Settings UI — values only; stored state is always the numbers. */
export const JOG_PRESETS = {
  soft: {
    label: 'Soft (SL-1200)',
    jog: { ...defaultJogSettings } satisfies JogSettings,
  },
  balanced: {
    label: 'Balanced',
    jog: {
      dualZone: true,
      fineSeekMs: 1,
      spinSeekMs: 24,
      fineRatePercent: 0.2,
      spinRatePercent: 10,
      rateDecayMs: 400,
      pausedFineSeekMs: 4,
      pausedSpinSeekMs: 32,
      spinStartsAtTps: 28,
      spinFullAtTps: 95,
    } satisfies JogSettings,
  },
  spinny: {
    label: 'Spinny',
    jog: {
      dualZone: true,
      fineSeekMs: 1.5,
      spinSeekMs: 40,
      fineRatePercent: 0.35,
      spinRatePercent: 16,
      rateDecayMs: 320,
      pausedFineSeekMs: 6,
      pausedSpinSeekMs: 50,
      spinStartsAtTps: 20,
      spinFullAtTps: 80,
    } satisfies JogSettings,
  },
} as const;

export type JogPresetId = keyof typeof JOG_PRESETS;

/** Engine-facing params (seconds / rate fraction). */
export type JogFeelParams = {
  dualZone: boolean;
  fineSeekSec: number;
  spinSeekSec: number;
  fineRate: number;
  spinRate: number;
  rateDecayMs: number;
  pausedFineSeekSec: number;
  pausedSpinSeekSec: number;
  spinStartsAtTps: number;
  spinFullAtTps: number;
};

export function jogFeelFromSettings(jog: JogSettings): JogFeelParams {
  const start = jog.spinStartsAtTps;
  const full = Math.max(start + 1, jog.spinFullAtTps);
  return {
    dualZone: jog.dualZone,
    fineSeekSec: Math.max(0, jog.fineSeekMs) / 1000,
    spinSeekSec: Math.max(0, jog.spinSeekMs) / 1000,
    fineRate: Math.max(0, jog.fineRatePercent) / 100,
    spinRate: Math.max(0, jog.spinRatePercent) / 100,
    rateDecayMs: Math.max(50, jog.rateDecayMs),
    pausedFineSeekSec: Math.max(0, jog.pausedFineSeekMs) / 1000,
    pausedSpinSeekSec: Math.max(0, jog.pausedSpinSeekMs) / 1000,
    spinStartsAtTps: start,
    spinFullAtTps: full,
  };
}

export type JogActivity = {
  lastTickMs: number;
  /** EMA of absolute ticks per second. */
  ticksPerSec: number;
};

export function createJogActivity(): JogActivity {
  return { lastTickMs: 0, ticksPerSec: 0 };
}

/**
 * Update tick-rate EMA from one relative message.
 * Pure — caller replaces stored state with the return value.
 */
export function updateJogActivity(
  prev: JogActivity,
  absDelta: number,
  nowMs: number,
): JogActivity {
  const mag = Number.isFinite(absDelta) ? Math.max(0, absDelta) : 0;
  if (!(nowMs > 0) || mag <= 0) {
    return { lastTickMs: nowMs > 0 ? nowMs : prev.lastTickMs, ticksPerSec: prev.ticksPerSec };
  }
  if (prev.lastTickMs <= 0) {
    // Cold start stays in the fine zone — spin opens only after tight follow-ups.
    return { lastTickMs: nowMs, ticksPerSec: 0 };
  }
  const dt = Math.max(1, nowMs - prev.lastTickMs);
  const inst = (mag * 1000) / dt;
  // Fast attack / slower release so a spin opens quickly and fades after.
  const alpha = inst > prev.ticksPerSec ? 0.55 : 0.22;
  const ticksPerSec = prev.ticksPerSec + alpha * (inst - prev.ticksPerSec);
  return { lastTickMs: nowMs, ticksPerSec };
}

/** Smoothstep 0..1 between edge0 and edge1. */
export function jogSmoothstep(edge0: number, edge1: number, x: number): number {
  if (!(edge1 > edge0)) return x >= edge1 ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Spin intensity 0..1 from message |delta| and recent tick rate.
 * Light fingertip ≈ 0; hard spinback ≈ 1. Forced 0 when dualZone is off.
 */
export function jogSpinIntensity(
  absDelta: number,
  ticksPerSec: number,
  params: Pick<JogFeelParams, 'dualZone' | 'spinStartsAtTps' | 'spinFullAtTps'>,
): number {
  if (!params.dualZone) return 0;
  const mag = Number.isFinite(absDelta) ? Math.max(0, absDelta) : 0;
  const fromRate = jogSmoothstep(params.spinStartsAtTps, params.spinFullAtTps, ticksPerSec);
  // Only large packed deltas open spin early (ignore ±1…±2 noise).
  const fromDelta = jogSmoothstep(3, 8, mag);
  return Math.min(1, Math.max(fromRate, fromDelta));
}

export type JogScaled = {
  sign: number;
  intensity: number;
  playingSeekSec: number;
  playingRateAmount: number;
  pausedSeekSec: number;
  rateDecayMs: number;
};

/** Map one relative jog tick into dual-zone seek / rate amounts. */
export function scaleJogTick(
  delta: number,
  ticksPerSec: number,
  params: JogFeelParams,
): JogScaled {
  const v = Number.isFinite(delta) ? delta : 0;
  const sign = Math.sign(v) || 1;
  const mag = Math.min(8, Math.abs(v));
  const intensity = jogSpinIntensity(mag, ticksPerSec, params);
  const unit = Math.min(1, mag);
  const mix = (fine: number, spin: number) => fine + (spin - fine) * intensity;
  return {
    sign,
    intensity,
    playingSeekSec: mix(params.fineSeekSec, params.spinSeekSec) * unit,
    playingRateAmount: mix(params.fineRate, params.spinRate) * unit,
    pausedSeekSec:
      mix(params.pausedFineSeekSec, params.pausedSpinSeekSec) * Math.max(unit, 0.35),
    rateDecayMs: params.rateDecayMs,
  };
}
