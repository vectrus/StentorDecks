/**
 * De-click for Prep MP3 fix (R5.9) — after resilient stitch.
 *
 * Catches “bad contact” ticks / squeaks that absolute jump thresholds miss:
 * - local RMS-adaptive threshold
 * - consecutive-sample jump
 * - single-sample spike vs neighbors (classic impulse)
 * - second-difference (acceleration) gate
 * - cosine crossfade heal over a short window
 * - multi-pass on strong
 */

export type DeclickLevel = 'off' | 'light' | 'strong';

export type DeclickParams = {
  /** Absolute floor on impulse size. */
  absFloor: number;
  /** Multiply local RMS for adaptive threshold. */
  rmsMul: number;
  /** Half-window for replace (samples). */
  halfWin: number;
  /** RMS analysis half-window. */
  rmsHalf: number;
  /** Second-difference must exceed this × impulse. */
  accelMul: number;
  passes: number;
};

export function declickParams(level: DeclickLevel): DeclickParams | null {
  if (level === 'off') return null;
  if (level === 'light') {
    return {
      absFloor: 0.1,
      rmsMul: 4.0,
      halfWin: 16,
      rmsHalf: 64,
      accelMul: 0.5,
      passes: 1,
    };
  }
  return {
    absFloor: 0.045,
    rmsMul: 2.6,
    halfWin: 40,
    rmsHalf: 128,
    accelMul: 0.32,
    passes: 3,
  };
}

function localRms(ch: Float32Array, i: number, half: number): number {
  const a = Math.max(0, i - half);
  const b = Math.min(ch.length - 1, i + half);
  let s = 0;
  let n = 0;
  for (let k = a; k <= b; k++) {
    const v = ch[k]!;
    s += v * v;
    n += 1;
  }
  return n > 0 ? Math.sqrt(s / n) : 0;
}

function maxJumpAt(channelData: Float32Array[], i: number): number {
  let jump = 0;
  for (const ch of channelData) {
    const d = Math.abs(ch[i]! - ch[i - 1]!);
    if (d > jump) jump = d;
  }
  return jump;
}

/** |sample − mid(prev,next)| — catches single-sample ticks. */
function maxSpikeAt(channelData: Float32Array[], i: number): number {
  const n = channelData[0]!.length;
  if (i + 1 >= n) return 0;
  let spike = 0;
  for (const ch of channelData) {
    const mid = 0.5 * (ch[i - 1]! + ch[i + 1]!);
    const s = Math.abs(ch[i]! - mid);
    if (s > spike) spike = s;
  }
  return spike;
}

function maxAccelAt(channelData: Float32Array[], i: number): number {
  if (i < 2) return 0;
  let accel = 0;
  for (const ch of channelData) {
    const d1 = ch[i]! - ch[i - 1]!;
    const d0 = ch[i - 1]! - ch[i - 2]!;
    const a = Math.abs(d1 - d0);
    if (a > accel) accel = a;
  }
  return accel;
}

function healWindow(channelData: Float32Array[], center: number, halfWin: number): void {
  const n = channelData[0]!.length;
  const a = Math.max(0, center - halfWin);
  const b = Math.min(n - 1, center + halfWin);
  const span = b - a;
  if (span < 1) return;
  for (const ch of channelData) {
    const y0 = ch[a]!;
    const y1 = ch[b]!;
    for (let k = a; k <= b; k++) {
      const t = (k - a) / span;
      // Cosine ease — softer than linear for tick edges.
      const w = 0.5 - 0.5 * Math.cos(t * Math.PI);
      ch[k] = y0 + (y1 - y0) * w;
    }
  }
}

/**
 * In-place de-click. Returns number of clicks healed (sum across passes).
 */
export function declickChannelsInPlace(
  channelData: Float32Array[],
  level: DeclickLevel,
): number {
  const p = declickParams(level);
  if (!p || channelData.length === 0) return 0;
  const n = channelData[0]!.length;
  if (n < p.halfWin * 2 + 4) return 0;

  let hits = 0;
  for (let pass = 0; pass < p.passes; pass++) {
    for (let i = 2; i < n - 1; i++) {
      const jump = maxJumpAt(channelData, i);
      const spike = maxSpikeAt(channelData, i);
      const impulse = Math.max(jump, spike);
      const rms = localRms(channelData[0]!, i, p.rmsHalf);
      const thr = Math.max(p.absFloor, rms * p.rmsMul);
      if (impulse < thr) continue;
      const accel = maxAccelAt(channelData, i);
      // Impulses have high curvature; skip slow musical edges.
      if (accel < impulse * p.accelMul) continue;

      hits += 1;
      healWindow(channelData, i, p.halfWin);
      i += p.halfWin;
    }
  }
  return hits;
}
