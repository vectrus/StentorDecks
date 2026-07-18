/** Pure audio mapping math — docs/03. No Web Audio dependency. */

export function channelFaderGain(pos: number, shape: number): number {
  const p = clamp01(pos);
  if (p <= 0) return 0;
  const shaped = Math.pow(p, Math.pow(2, shape / 50));
  const dB = -60 + shaped * 60;
  return Math.pow(10, dB / 20);
}

/** dB at a fader position (for tests / curve editor). */
export function channelFaderDb(pos: number, shape: number): number {
  const g = channelFaderGain(pos, shape);
  if (g <= 0) return -Infinity;
  return 20 * Math.log10(g);
}

/**
 * Pitch fader: linear with center dead-zone, continuous remap outside.
 * Returns normalized rate offset in [-1..1] where rate = 1 + offset * pitchRange.
 */
export function pitchFaderNormalized(pos: number, deadZone: number): number {
  const p = clamp01(pos);
  const half = deadZone / 2;
  if (Math.abs(p - 0.5) < half) return 0;
  if (p < 0.5) {
    // map [0 .. 0.5-half] → [-1 .. 0]
    const lo = 0.5 - half;
    return lo <= 0 ? -1 : -((lo - p) / lo);
  }
  // map [0.5+half .. 1] → [0 .. 1]
  const hi = 0.5 + half;
  return hi >= 1 ? 1 : (p - hi) / (1 - hi);
}

export function pitchRate(pos: number, deadZone: number, pitchRange: number): number {
  return 1 + pitchFaderNormalized(pos, deadZone) * pitchRange;
}

/**
 * Inverse of pitchRate → fader position 0..1 (approx; dead-zone maps rate 1 → 0.5).
 */
export function pitchPosFromRate(
  rate: number,
  deadZone: number,
  pitchRange: number,
): number {
  if (pitchRange <= 0) return 0.5;
  const norm = clamp((rate - 1) / pitchRange, -1, 1);
  const half = deadZone / 2;
  if (Math.abs(norm) < 1e-9) return 0.5;
  if (norm < 0) {
    const lo = 0.5 - half;
    if (lo <= 0) return 0;
    return lo + norm * lo; // norm in [-1,0]
  }
  const hi = 0.5 + half;
  if (hi >= 1) return 1;
  return hi + norm * (1 - hi);
}

/**
 * EQ knob 0..1 → dB with γ=1.6 and soft shoulder near extremes (R2.12).
 */
export function eqKnobDb(t: number, eqMaxDb: number, gamma = 1.6): number {
  const u = 2 * clamp01(t) - 1;
  if (u === 0) return 0;
  const shaped = Math.sign(u) * Math.pow(Math.abs(u), gamma);
  // Soft edge: smoothstep saturation on last ~10% of |shaped|
  const abs = Math.abs(shaped);
  const soft =
    abs < 0.9 ? abs : 0.9 + 0.1 * smoothstep(0, 1, (abs - 0.9) / 0.1);
  return Math.sign(shaped) * soft * eqMaxDb;
}

/** Trim dB (-inf..+12) → linear gain. */
export function trimDbToGain(dB: number): number {
  if (!Number.isFinite(dB) || dB <= -120) return 0;
  return Math.pow(10, Math.min(dB, 12) / 20);
}

/**
 * MIDI gain knob raw 0..1 ↔ trim dB (docs/03 soft takeover inverse).
 * Forward (MIDI → software): `trimDb = (raw - 0.5) * 24` → −12..+12.
 */
export function trimDbFromGainKnob(raw: number): number {
  return (clamp01(raw) - 0.5) * 24;
}

/** Inverse: software trim dB → raw knob for takeover comparison. */
export function gainKnobFromTrimDb(trimDb: number): number {
  if (!Number.isFinite(trimDb)) return 0.5;
  return clamp01(trimDb / 24 + 0.5);
}

/** Auto-gain: LUFS → trim dB toward target (clamped). */
export function autoGainTrimDb(loudnessLufs: number, targetLufs: number): number {
  const delta = targetLufs - loudnessLufs;
  return clamp(delta, -60, 12);
}

export function equalPowerCrossfade(t: number): { a: number; b: number } {
  const x = clamp01(t) * (Math.PI / 2);
  return { a: Math.cos(x), b: Math.sin(x) };
}

/** Filter amount → mode + cutoff Hz + Q (docs/03). */
export function filterFromAmount(amount: number): {
  mode: 'bypass' | 'lowpass' | 'highpass';
  frequency: number;
  Q: number;
} {
  const a = clamp01(amount);
  if (Math.abs(a - 0.5) <= 0.03) {
    return { mode: 'bypass', frequency: 1000, Q: 0.7 };
  }
  if (a < 0.5) {
    const t = (0.5 - a) / 0.5; // 0 at center → 1 at left
    const frequency = logLerp(20_000, 80, t);
    const Q = lerp(0.7, 8, t);
    return { mode: 'lowpass', frequency, Q };
  }
  const t = (a - 0.5) / 0.5;
  const frequency = logLerp(20, 8_000, t);
  const Q = lerp(0.7, 8, t);
  return { mode: 'highpass', frequency, Q };
}

export function endOfTrackWarnLevel(
  remainingSec: number,
  thresholds: readonly [number, number, number] = [30, 15, 10],
): 0 | 30 | 15 | 10 {
  if (remainingSec <= thresholds[2]!) return 10;
  if (remainingSec <= thresholds[1]!) return 15;
  if (remainingSec <= thresholds[0]!) return 30;
  return 0;
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function logLerp(a: number, b: number, t: number): number {
  return Math.exp(lerp(Math.log(a), Math.log(b), clamp01(t)));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
