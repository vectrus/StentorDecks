/**
 * Jog feel (R2.2 / docs/03)
 *
 * Soft / Vinyl OFF — rim-speed regimes (owner contract):
 * - Slow rim (~&lt;1 cm/s outer): **ride** — forward speeds up a bit / phase creeps
 *   forward; back slows / phase creeps back. Temporary rate only.
 * - Faster rim: **nudge chunk** — sticky micro-seek “push the record” a little.
 *
 * Vinyl ON / dualZone — fine sticky phase + spinback on sustained whip.
 *
 * Tunables: settings.mixer.jog (docs/07). RMX2: 1 MIDI msg = 1 tick for speed EMA
 * (packed |delta| is not a second gear).
 */

/** Dual-zone Soft engine units (Vinyl ON) — tests / docs. */
export const JOG_FINE_SEEK_SEC = 0.00005;
export const JOG_SPIN_SEEK_SEC = 0.012;
export const JOG_FINE_RATE = 0;
/** Soft ride bend (fraction; matches fineRatePercent 0.45). */
export const JOG_RIDE_RATE = 0.0045;
/** Soft nudge chunk at full intensity (matches fineSeekMs 3). */
export const JOG_NUDGE_CHUNK_SEC = 0.003;
export const JOG_SPIN_RATE = 0.04;
export const JOG_RATE_DECAY_MS = 140;
export const JOG_PAUSED_FINE_SEEK_SEC = 0.001;
export const JOG_PAUSED_SPIN_SEEK_SEC = 0.012;
/** Soft: message-rate proxy for ~1 cm/s outer rim → nudge opens (RMX2, tune in Settings). */
export const JOG_NUDGE_START_TPS = 42;
export const JOG_NUDGE_FULL_TPS = 90;
export const JOG_TPS_FINE = 140;
export const JOG_TPS_SPIN = 320;
/** Dual-zone fine impulse cap (~0.22 ms). */
export const JOG_FINE_IMPULSE_CAP_SEC = 0.00022;
/** Soft nudge: max sticky phase per impulse window (~12 ms). */
export const JOG_NUDGE_IMPULSE_CAP_SEC = 0.012;
export const JOG_IMPULSE_WINDOW_MS = 55;

/** @deprecated use JOG_RIDE_RATE */
export const JOG_SINGLE_ZONE_FINE_RATE = JOG_RIDE_RATE;

/** Human-unit jog settings (matches settings.mixer.jog). */
export type JogSettings = {
  dualZone: boolean;
  /** Soft: nudge chunk ms · Vinyl: fine sticky seek ms */
  fineSeekMs: number;
  spinSeekMs: number;
  /** Soft: ride rate % · Vinyl: forced 0 while dual */
  fineRatePercent: number;
  spinRatePercent: number;
  rateDecayMs: number;
  pausedFineSeekMs: number;
  pausedSpinSeekMs: number;
  /** Soft: nudge opens at this msg/s · Vinyl: spin opens */
  spinStartsAtTps: number;
  spinFullAtTps: number;
};

/**
 * Default Soft = ride + chunk nudge (Vinyl OFF).
 * Vinyl ON → dualZone true (seek + spinback).
 */
export const defaultJogSettings: JogSettings = {
  dualZone: false,
  fineSeekMs: 3,
  spinSeekMs: 10,
  fineRatePercent: 0.45,
  spinRatePercent: 4,
  rateDecayMs: 140,
  pausedFineSeekMs: 0.8,
  pausedSpinSeekMs: 10,
  spinStartsAtTps: JOG_NUDGE_START_TPS,
  spinFullAtTps: JOG_NUDGE_FULL_TPS,
};

/** Dual-zone Soft numbers for Vinyl ON tests. */
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
  // Rate-only Soft (pre ride/chunk)
  {
    dualZone: false,
    fineSeekMs: 0.06,
    spinSeekMs: 10,
    fineRatePercent: 0.22,
    spinRatePercent: 4,
    rateDecayMs: 280,
    pausedFineSeekMs: 0.8,
    pausedSpinSeekMs: 10,
    spinStartsAtTps: 160,
    spinFullAtTps: 340,
  },
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
    label: 'Soft (ride + chunk)',
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
    // Soft keeps ride rate; Vinyl dual fine stays seek-primary.
    fineRate: jog.dualZone ? 0 : fineRateFrac,
    spinRate: Math.max(0, jog.spinRatePercent) / 100,
    rateDecayMs: Math.max(50, jog.rateDecayMs),
    pausedFineSeekSec: Math.max(0, jog.pausedFineSeekMs) / 1000,
    pausedSpinSeekSec: Math.max(0, jog.pausedSpinSeekMs) / 1000,
    spinStartsAtTps: start,
    spinFullAtTps: full,
    fineImpulseCapSec: jog.dualZone
      ? JOG_FINE_IMPULSE_CAP_SEC
      : JOG_NUDGE_IMPULSE_CAP_SEC,
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
 * Each MIDI message = one tick (packed |delta| does not inflate speed).
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
    return { lastTickMs: nowMs, ticksPerSec: 0 };
  }
  const dt = Math.max(1, nowMs - prev.lastTickMs);
  const inst = 1000 / dt;
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
 * Soft nudge-chunk intensity 0..1 from rim-speed proxy (msg/s).
 * Vinyl dual uses the same knobs for spinback.
 */
export function jogNudgeIntensity(
  ticksPerSec: number,
  params: Pick<JogFeelParams, 'spinStartsAtTps' | 'spinFullAtTps'>,
): number {
  return jogSmoothstep(params.spinStartsAtTps, params.spinFullAtTps, ticksPerSec);
}

/**
 * Spin intensity 0..1 (dual-zone only). Soft uses jogNudgeIntensity instead.
 */
export function jogSpinIntensity(
  absDelta: number,
  ticksPerSec: number,
  params: Pick<JogFeelParams, 'dualZone' | 'spinStartsAtTps' | 'spinFullAtTps'>,
): number {
  if (!params.dualZone) return 0;
  void absDelta;
  return jogNudgeIntensity(ticksPerSec, params);
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
 * Flood compression for sticky seeks under message flood.
 */
export function fineFloodGain(ticksPerSec: number, intensity: number): number {
  if (intensity >= 0.35) return 1;
  const tps = Number.isFinite(ticksPerSec) ? Math.max(0, ticksPerSec) : 0;
  return 1 / (1 + tps / 40);
}

/**
 * Map one relative jog tick into ride / chunk (Soft) or fine / spin (Vinyl).
 */
export function scaleJogTick(
  delta: number,
  ticksPerSec: number,
  params: JogFeelParams,
): JogScaled {
  const v = Number.isFinite(delta) ? delta : 0;
  const sign = Math.sign(v) || 1;
  const mag = Math.min(8, Math.abs(v));
  const unit = 1;

  if (!params.dualZone) {
    // Soft: slow rim = ride (rate); faster rim = sticky chunk (+ light ride fade).
    const nudge = jogNudgeIntensity(ticksPerSec, params);
    const ride = 1 - nudge * 0.85;
    return {
      sign,
      intensity: nudge,
      playingSeekSec: params.fineSeekSec * nudge,
      playingRateAmount: params.fineRate * ride,
      pausedSeekSec:
        (params.pausedFineSeekSec +
          (params.pausedSpinSeekSec - params.pausedFineSeekSec) * nudge) *
        Math.max(0.35, Math.min(1, mag)),
      rateDecayMs: params.rateDecayMs,
    };
  }

  const intensity = jogSpinIntensity(mag, ticksPerSec, params);
  const mix = (fine: number, spin: number) => fine + (spin - fine) * intensity;
  const flood = fineFloodGain(ticksPerSec, intensity);
  return {
    sign,
    intensity,
    playingSeekSec: mix(params.fineSeekSec, params.spinSeekSec) * unit * flood,
    playingRateAmount: mix(params.fineRate, params.spinRate) * unit,
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
 * Cap sticky seek inside a short impulse window (Soft nudge / Vinyl fine).
 * Vinyl spin whip (dualZone + high intensity) passes through uncapped.
 */
export function gateJogPlayingSeek(
  prev: JogImpulse,
  signedSeekSec: number,
  intensity: number,
  nowMs: number,
  params: Pick<JogFeelParams, 'dualZone' | 'fineImpulseCapSec' | 'impulseWindowMs'>,
): { impulse: JogImpulse; seekSec: number } {
  const raw = Number.isFinite(signedSeekSec) ? signedSeekSec : 0;
  if (raw === 0) return { impulse: prev, seekSec: 0 };

  if (params.dualZone && intensity >= 0.35) {
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
