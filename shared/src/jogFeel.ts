/**
 * Dual-zone jog feel (R2.2 / docs/03):
 * - Fine: SL-1200 fingertip phase nudge (impulse + flood compression)
 * - Spin: fast twist / spinback — larger sticky seek + stronger temp rate
 *
 * Tunables live in settings.mixer.jog (docs/07). Constants below are the defaults.
 *
 * RMX2 relative jogs flood ±1 CCs (~50–150 msg/s on a light turn). Spin thresholds
 * must sit above that flood or every nudge opens spinback and feels "too sensitive".
 * Fine seeks are also window-capped so a short nudge ≠ N × fineSeekMs.
 */

/** Default engine units (matches defaultJogSettings) — tests / docs. */
export const JOG_FINE_SEEK_SEC = 0.00008;
export const JOG_SPIN_SEEK_SEC = 0.012;
export const JOG_FINE_RATE = 0.0002;
export const JOG_SPIN_RATE = 0.04;
export const JOG_RATE_DECAY_MS = 280;
export const JOG_PAUSED_FINE_SEEK_SEC = 0.001;
export const JOG_PAUSED_SPIN_SEEK_SEC = 0.012;
export const JOG_TPS_FINE = 140;
export const JOG_TPS_SPIN = 320;
/** Max sticky phase (sec) applied in one fine-zone impulse window. */
export const JOG_FINE_IMPULSE_CAP_SEC = 0.0004;
export const JOG_IMPULSE_WINDOW_MS = 50;

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
 * Default = heavy-platter fingertip (SL-1200).
 * Light push stays in fine; spinback only on a real hard twist.
 */
export const defaultJogSettings: JogSettings = {
  dualZone: true,
  fineSeekMs: 0.08,
  spinSeekMs: 12,
  fineRatePercent: 0.02,
  spinRatePercent: 4,
  rateDecayMs: 280,
  pausedFineSeekMs: 1,
  pausedSpinSeekMs: 12,
  spinStartsAtTps: 140,
  spinFullAtTps: 320,
};

/** Previous factory defaults — migrate once so saved itchy settings quiet down. */
export const LEGACY_ITCHY_JOG_DEFAULTS: readonly JogSettings[] = [
  // 2026-07-18 Soft after first quiet pass — still too jumpy on short nudges
  {
    dualZone: true,
    fineSeekMs: 0.15,
    spinSeekMs: 12,
    fineRatePercent: 0.03,
    spinRatePercent: 4,
    rateDecayMs: 300,
    pausedFineSeekMs: 1,
    pausedSpinSeekMs: 12,
    spinStartsAtTps: 120,
    spinFullAtTps: 300,
  },
  // 2026-07-18 "very subtle" — still too hot for RMX2 tick flood
  {
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
  },
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
    label: 'Soft (heavy platter)',
    jog: { ...defaultJogSettings } satisfies JogSettings,
  },
  balanced: {
    label: 'Balanced',
    jog: {
      dualZone: true,
      fineSeekMs: 0.35,
      spinSeekMs: 18,
      fineRatePercent: 0.08,
      spinRatePercent: 7,
      rateDecayMs: 340,
      pausedFineSeekMs: 2,
      pausedSpinSeekMs: 18,
      spinStartsAtTps: 90,
      spinFullAtTps: 240,
    } satisfies JogSettings,
  },
  spinny: {
    label: 'Spinny',
    jog: {
      dualZone: true,
      fineSeekMs: 0.7,
      spinSeekMs: 28,
      fineRatePercent: 0.18,
      spinRatePercent: 12,
      rateDecayMs: 280,
      pausedFineSeekMs: 3.5,
      pausedSpinSeekMs: 32,
      spinStartsAtTps: 60,
      spinFullAtTps: 180,
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
  /** Max |seek| in one fine impulse window (heavy-platter cap). */
  fineImpulseCapSec: number;
  impulseWindowMs: number;
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
    fineImpulseCapSec: JOG_FINE_IMPULSE_CAP_SEC,
    impulseWindowMs: JOG_IMPULSE_WINDOW_MS,
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
 *
 * Attack is intentionally soft: RMX2 sends bursty ±1 floods; a hard attack
 * would open the spin zone on every fingertip nudge.
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
  // Soft attack / faster release — spin needs sustained high rate, not a burst.
  const alpha = inst > prev.ticksPerSec ? 0.28 : 0.18;
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
  // Only large packed deltas open spin early (ignore ±1…±4 RMX2 noise packs).
  const fromDelta = jogSmoothstep(5, 12, mag);
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

/**
 * Flood compression in the fine zone: many ±1 ticks share one fingertip push,
 * so each tick's sticky seek shrinks as tick-rate rises (heavy platter).
 */
export function fineFloodGain(ticksPerSec: number, intensity: number): number {
  if (intensity >= 0.35) return 1;
  const tps = Number.isFinite(ticksPerSec) ? Math.max(0, ticksPerSec) : 0;
  // ~1.0 at idle; ~0.35 at 80 t/s; ~0.2 at 140 t/s
  return 1 / (1 + tps / 45);
}

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
  const flood = fineFloodGain(ticksPerSec, intensity);
  return {
    sign,
    intensity,
    playingSeekSec: mix(params.fineSeekSec, params.spinSeekSec) * unit * flood,
    playingRateAmount: mix(params.fineRate, params.spinRate) * unit,
    pausedSeekSec:
      mix(params.pausedFineSeekSec, params.pausedSpinSeekSec) * Math.max(unit, 0.35),
    rateDecayMs: params.rateDecayMs,
  };
}

/** Per-deck fine-zone impulse window (absolute seek already applied). */
export type JogImpulse = {
  windowStartMs: number;
  appliedAbsSeekSec: number;
};

export function createJogImpulse(): JogImpulse {
  return { windowStartMs: 0, appliedAbsSeekSec: 0 };
}

/**
 * Cap fine-zone sticky seek inside a short impulse window (SL-1200 mass).
 * Spin intensity passes through uncapped. Pure — caller stores returned impulse.
 */
export function gateJogPlayingSeek(
  prev: JogImpulse,
  signedSeekSec: number,
  intensity: number,
  nowMs: number,
  params: Pick<JogFeelParams, 'fineImpulseCapSec' | 'impulseWindowMs'>,
): { impulse: JogImpulse; seekSec: number } {
  const raw = Number.isFinite(signedSeekSec) ? signedSeekSec : 0;
  if (raw === 0) return { impulse: prev, seekSec: 0 };

  // Spin / whip: no heavy-platter cap
  if (intensity >= 0.35) {
    return { impulse: createJogImpulse(), seekSec: raw };
  }

  const windowMs = Math.max(16, params.impulseWindowMs);
  const cap = Math.max(0, params.fineImpulseCapSec);
  let windowStartMs = prev.windowStartMs;
  let applied = prev.appliedAbsSeekSec;
  if (windowStartMs <= 0 || nowMs - windowStartMs > windowMs) {
    windowStartMs = nowMs;
    applied = 0;
  }
  const remaining = Math.max(0, cap - applied);
  const mag = Math.min(Math.abs(raw), remaining);
  const seekSec = Math.sign(raw) * mag;
  return {
    impulse: {
      windowStartMs,
      appliedAbsSeekSec: applied + mag,
    },
    seekSec,
  };
}
