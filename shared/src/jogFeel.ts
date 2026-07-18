/**
 * Jog feel (R2.2 / docs/03) — Vinyl button toggles modes:
 *
 * - **Single-zone** (Vinyl OFF, default): playing = tempo nudge only (CDJ jog).
 *   No sticky seeks while playing — phase rides smoothly via temporary rate.
 * - **Dual-zone** (Vinyl ON): fine sticky phase seek + spinback boost
 *   (flood compression + impulse cap so a short push ≠ vinyl slip).
 *
 * Tunables live in settings.mixer.jog (docs/07). RMX2 relative jogs flood ±1 CCs
 * (~50–150 msg/s on a light turn); spin thresholds must sit above that flood.
 */

/** Dual-zone Soft engine units (Vinyl ON / Balanced baseline) — tests / docs. */
export const JOG_FINE_SEEK_SEC = 0.00005;
export const JOG_SPIN_SEEK_SEC = 0.012;
/** Dual-zone fine is seek-primary (no tempo warble). */
export const JOG_FINE_RATE = 0;
/** Single-zone Soft playing bend (fraction; matches fineRatePercent 0.22). */
export const JOG_SINGLE_ZONE_FINE_RATE = 0.0022;
export const JOG_SPIN_RATE = 0.04;
export const JOG_RATE_DECAY_MS = 280;
export const JOG_PAUSED_FINE_SEEK_SEC = 0.001;
export const JOG_PAUSED_SPIN_SEEK_SEC = 0.012;
export const JOG_TPS_FINE = 140;
export const JOG_TPS_SPIN = 320;
/** Max sticky phase (sec) in one fine impulse window (~0.22 ms). */
export const JOG_FINE_IMPULSE_CAP_SEC = 0.00022;
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
 * Default = Vinyl OFF → single-zone (R2.2 tempo nudge while playing).
 * Vinyl ON → dual-zone sticky seek + spinback.
 */
export const defaultJogSettings: JogSettings = {
  dualZone: false,
  fineSeekMs: 0.06,
  spinSeekMs: 10,
  /** Single-zone playing bend (~0.22% at full tick unit) — smooth CDJ phase ride. */
  fineRatePercent: 0.22,
  spinRatePercent: 4,
  rateDecayMs: 280,
  pausedFineSeekMs: 0.8,
  pausedSpinSeekMs: 10,
  spinStartsAtTps: 160,
  spinFullAtTps: 340,
};

/** Dual-zone Soft numbers for Vinyl ON tests / Balanced-ish seek-primary. */
export const dualZoneSoftJogSettings: JogSettings = {
  dualZone: true,
  fineSeekMs: 0.05,
  spinSeekMs: 12,
  fineRatePercent: 0,
  spinRatePercent: 4,
  rateDecayMs: 280,
  pausedFineSeekMs: 1,
  pausedSpinSeekMs: 12,
  spinStartsAtTps: 140,
  spinFullAtTps: 320,
};

/** Previous factory defaults — migrate once so saved itchy settings quiet down. */
export const LEGACY_ITCHY_JOG_DEFAULTS: readonly JogSettings[] = [
  // First Vinyl-off Soft (rate a touch shy) → current CDJ nudge default
  {
    dualZone: false,
    fineSeekMs: 0.06,
    spinSeekMs: 10,
    fineRatePercent: 0.15,
    spinRatePercent: 4,
    rateDecayMs: 220,
    pausedFineSeekMs: 0.8,
    pausedSpinSeekMs: 10,
    spinStartsAtTps: 160,
    spinFullAtTps: 340,
  },
  // Pre-Vinyl Soft (seek-primary dual) — migrate to CDJ nudge default
  {
    dualZone: true,
    fineSeekMs: 0.05,
    spinSeekMs: 12,
    fineRatePercent: 0,
    spinRatePercent: 4,
    rateDecayMs: 280,
    pausedFineSeekMs: 1,
    pausedSpinSeekMs: 12,
    spinStartsAtTps: 140,
    spinFullAtTps: 320,
  },
  // 2026-07-18 rate-primary Soft — dead / warbly (reverted)
  {
    dualZone: true,
    fineSeekMs: 0.025,
    spinSeekMs: 12,
    fineRatePercent: 0.035,
    spinRatePercent: 4,
    rateDecayMs: 160,
    pausedFineSeekMs: 1,
    pausedSpinSeekMs: 12,
    spinStartsAtTps: 150,
    spinFullAtTps: 340,
  },
  // 2026-07-18 Soft — still too “vinyl push” on short nudges
  {
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
  },
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
    label: 'Soft (CDJ nudge)',
    jog: { ...defaultJogSettings } satisfies JogSettings,
  },
  balanced: {
    label: 'Balanced (Vinyl dual)',
    jog: {
      dualZone: true,
      fineSeekMs: 0.2,
      spinSeekMs: 14,
      fineRatePercent: 0.12,
      spinRatePercent: 6,
      rateDecayMs: 280,
      pausedFineSeekMs: 1.5,
      pausedSpinSeekMs: 14,
      spinStartsAtTps: 150,
      spinFullAtTps: 320,
    } satisfies JogSettings,
  },
  spinny: {
    label: 'Spinny',
    jog: {
      dualZone: true,
      fineSeekMs: 0.5,
      spinSeekMs: 22,
      fineRatePercent: 0.15,
      spinRatePercent: 10,
      rateDecayMs: 260,
      pausedFineSeekMs: 2.5,
      pausedSpinSeekMs: 24,
      spinStartsAtTps: 100,
      spinFullAtTps: 260,
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
  const fineRateFrac = Math.max(0, jog.fineRatePercent) / 100;
  return {
    dualZone: jog.dualZone,
    fineSeekSec: Math.max(0, jog.fineSeekMs) / 1000,
    spinSeekSec: Math.max(0, jog.spinSeekMs) / 1000,
    // Dual-zone fine stays seek-primary (no tempo warble); single-zone uses rate nudge.
    fineRate: jog.dualZone ? 0 : fineRateFrac,
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
 * Each MIDI message counts as **one** tick for the rate EMA. RMX2 packs larger
 * |delta| on short fast bursts; weighting by mag made those look like a second
 * “high gear” and opened spin/rate boosts too early.
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
  // One message = one tick (ignore packed magnitude for speed estimate).
  const inst = 1000 / dt;
  // Soft attack / faster release — spin needs sustained high rate, not a burst.
  const alpha = inst > prev.ticksPerSec ? 0.22 : 0.16;
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
 * Spin intensity 0..1 from recent message **rate** (dual-zone only).
 * Packed |delta| alone must not open spin — RMX2 uses larger packs on short nudges.
 */
export function jogSpinIntensity(
  absDelta: number,
  ticksPerSec: number,
  params: Pick<JogFeelParams, 'dualZone' | 'spinStartsAtTps' | 'spinFullAtTps'>,
): number {
  if (!params.dualZone) return 0;
  void absDelta;
  return jogSmoothstep(params.spinStartsAtTps, params.spinFullAtTps, ticksPerSec);
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
  // ~1.0 at idle; ~0.45 at 50 t/s; ~0.3 at 90 t/s
  return 1 / (1 + tps / 40);
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
  // Playing bend/seek: one MIDI message = one unit (packed |delta| ≠ second gear).
  const unit = 1;
  const mix = (fine: number, spin: number) => fine + (spin - fine) * intensity;
  const flood = fineFloodGain(ticksPerSec, intensity);
  // Single-zone: constant temp bend per message — flood rate only keeps it held.
  const playingRateAmount = params.dualZone
    ? mix(params.fineRate, params.spinRate) * unit
    : params.fineRate;
  return {
    sign,
    intensity,
    playingSeekSec: mix(params.fineSeekSec, params.spinSeekSec) * unit * flood,
    playingRateAmount,
    // Paused scrub may use pack size lightly so a fast whip still jumps farther.
    pausedSeekSec:
      mix(params.pausedFineSeekSec, params.pausedSpinSeekSec) *
      Math.max(0.35, Math.min(1, mag)),
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
