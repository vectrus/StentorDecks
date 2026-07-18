/**
 * BPM via onset envelope + autocorrelation (docs/05 §3).
 * Also estimates beat_grid_offset_sec (first-beat phase) for SYNC (R2.3).
 * Dance-floor prior 85–150; fold into 70–180.
 */

import { magSpectrum } from './fft';

export type BpmResult = {
  bpm: number;
  lowConfidence: boolean;
  /** First beat offset from file start, in [0, beatPeriod). */
  beatGridOffsetSec: number;
};

const TARGET_SR = 11025;
const FFT_SIZE = 1024;
const HOP = 256;

export function detectBpm(mono: Float32Array, sampleRate: number): BpmResult | null {
  if (mono.length < sampleRate) return null;
  const down = downsample(mono, sampleRate, TARGET_SR);
  const envelope = spectralFluxEnvelope(down);
  if (envelope.length < 64) return null;

  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.floor((60 / maxBpm) * (TARGET_SR / HOP));
  const maxLag = Math.ceil((60 / minBpm) * (TARGET_SR / HOP));
  const ac = autocorrelate(envelope, minLag, maxLag);

  let bestLag = minLag;
  let bestScore = -Infinity;
  let second = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const idx = lag - minLag;
    let score = ac[idx] ?? 0;
    const bpm = (60 * (TARGET_SR / HOP)) / lag;
    // dance prior
    if (bpm >= 85 && bpm <= 150) score *= 1.15;
    // comb: reinforce half/double
    const half = lag * 2;
    if (half <= maxLag) score += 0.35 * (ac[half - minLag] ?? 0);
    if (score > bestScore) {
      second = bestScore;
      bestScore = score;
      bestLag = lag;
    } else if (score > second) {
      second = score;
    }
  }

  // quadratic refine around peak
  const i0 = bestLag - minLag;
  const y0 = ac[i0 - 1] ?? bestScore;
  const y1 = ac[i0] ?? bestScore;
  const y2 = ac[i0 + 1] ?? bestScore;
  const denom = y0 - 2 * y1 + y2;
  const delta = Math.abs(denom) > 1e-12 ? (0.5 * (y0 - y2)) / denom : 0;
  const refinedLag = bestLag + Math.max(-0.5, Math.min(0.5, delta));
  let bpm = (60 * (TARGET_SR / HOP)) / refinedLag;

  // fold into 70–180
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  // prefer 85–150 on near ties at boundary
  if (bpm < 85 && bpm * 2 <= 180) bpm *= 2;
  if (bpm > 150 && bpm / 2 >= 70) bpm /= 2;

  const prominence = second > 0 ? bestScore / second : 10;
  const lowConfidence = prominence < 1.12;
  const bpmRounded = Math.round(bpm * 10) / 10;
  const beatGridOffsetSec = estimateBeatGridOffsetSec(envelope, bpmRounded);

  return {
    bpm: bpmRounded,
    lowConfidence,
    beatGridOffsetSec,
  };
}

/**
 * Score candidate grid origins by summing onset energy on the beat lattice.
 * Returns offset in [0, period).
 */
export function estimateBeatGridOffsetSec(
  envelope: Float32Array,
  bpm: number,
): number {
  if (!(bpm > 0) || envelope.length < 8) return 0;
  const periodSec = 60 / bpm;
  const frameSec = HOP / TARGET_SR;
  const periodFrames = periodSec / frameSec;
  if (!(periodFrames > 2)) return 0;

  const steps = 64;
  let bestO = 0;
  let bestScore = -Infinity;
  for (let s = 0; s < steps; s++) {
    const oFrames = (s / steps) * periodFrames;
    let score = 0;
    let n = 0;
    for (let t = oFrames; t < envelope.length; t += periodFrames) {
      const i0 = Math.floor(t);
      const i1 = Math.min(envelope.length - 1, i0 + 1);
      const frac = t - i0;
      const e = (envelope[i0] ?? 0) * (1 - frac) + (envelope[i1] ?? 0) * frac;
      score += e;
      n++;
      if (n > 400) break;
    }
    if (n > 0) score /= n;
    // Prefer earlier downbeats slightly (intro silence → later first hit still wins on energy)
    score += (1 - s / steps) * 0.02;
    if (score > bestScore) {
      bestScore = score;
      bestO = oFrames * frameSec;
    }
  }
  // wrap into [0, period)
  let o = bestO % periodSec;
  if (o < 0) o += periodSec;
  return Math.round(o * 10000) / 10000;
}

function downsample(mono: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return mono;
  const ratio = from / to;
  const outLen = Math.floor(mono.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const frac = src - i0;
    const a = mono[i0] ?? 0;
    const b = mono[i0 + 1] ?? a;
    out[i] = a + (b - a) * frac;
  }
  return out;
}

function spectralFluxEnvelope(mono: Float32Array): Float32Array {
  const frames: number[] = [];
  let prev: Float64Array | null = null;
  const window = hann(FFT_SIZE);
  for (let start = 0; start + FFT_SIZE < mono.length; start += HOP) {
    const frame = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      frame[i] = (mono[start + i] ?? 0) * window[i]!;
    }
    const mag = magSpectrum(frame);
    let flux = 0;
    if (prev) {
      for (let i = 0; i < mag.length; i++) {
        const d = mag[i]! - prev[i]!;
        if (d > 0) flux += d;
      }
    }
    prev = mag;
    frames.push(flux);
  }
  // half-wave already (positive flux only); normalize
  let max = 0;
  for (const v of frames) if (v > max) max = v;
  const env = new Float32Array(frames.length);
  if (max <= 0) return env;
  for (let i = 0; i < frames.length; i++) env[i] = frames[i]! / max;
  return env;
}

function autocorrelate(env: Float32Array, minLag: number, maxLag: number): Float32Array {
  const out = new Float32Array(maxLag - minLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    const n = env.length - lag;
    for (let i = 0; i < n; i++) sum += env[i]! * env[i + lag]!;
    out[lag - minLag] = n > 0 ? sum / n : 0;
  }
  return out;
}

function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}
