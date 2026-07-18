/**
 * Key via chroma + Krumhansl–Kessler (docs/05 §4) → Camelot.
 */

import { camelotDisplayName, type CamelotKey } from '@stentordeck/shared';
import { magSpectrum } from './fft';

export type KeyResult = {
  keyCamelot: CamelotKey;
  keyName: string;
  lowConfidence: boolean;
};

const FFT_SIZE = 8192;
const HOP = 4096;

/** KK major / minor profiles (standard). */
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

/** Pitch class → Camelot: index 0 = C … 11 = B */
const MAJOR_CAMELOT: CamelotKey[] = [
  '8B',
  '3B',
  '10B',
  '5B',
  '12B',
  '7B',
  '2B',
  '9B',
  '4B',
  '11B',
  '6B',
  '1B',
];
const MINOR_CAMELOT: CamelotKey[] = [
  '5A',
  '12A',
  '7A',
  '2A',
  '9A',
  '4A',
  '11A',
  '6A',
  '1A',
  '8A',
  '3A',
  '10A',
];

export function detectKey(mono: Float32Array, sampleRate: number): KeyResult | null {
  if (mono.length < FFT_SIZE * 2) return null;
  const start = Math.floor(mono.length * 0.2);
  const end = Math.floor(mono.length * 0.8);
  const chroma = new Float64Array(12);
  const window = hann(FFT_SIZE);
  let frames = 0;

  for (let s = start; s + FFT_SIZE < end; s += HOP) {
    const frame = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      frame[i] = (mono[s + i] ?? 0) * window[i]!;
    }
    const mag = magSpectrum(frame);
    accumulateChroma(mag, sampleRate, chroma);
    frames += 1;
  }
  if (frames === 0) return null;
  for (let i = 0; i < 12; i++) chroma[i]! /= frames;

  let bestScore = -Infinity;
  let second = -Infinity;
  let bestMode: 'major' | 'minor' = 'minor';
  let bestRoot = 0;

  for (let root = 0; root < 12; root++) {
    const maj = pearson(chroma, rotate(KK_MAJOR, root));
    const min = pearson(chroma, rotate(KK_MINOR, root));
    if (maj > bestScore) {
      second = bestScore;
      bestScore = maj;
      bestMode = 'major';
      bestRoot = root;
    } else if (maj > second) second = maj;
    if (min > bestScore) {
      second = bestScore;
      bestScore = min;
      bestMode = 'minor';
      bestRoot = root;
    } else if (min > second) second = min;
  }

  const keyCamelot =
    bestMode === 'major' ? MAJOR_CAMELOT[bestRoot]! : MINOR_CAMELOT[bestRoot]!;
  const prominence = second > -Infinity && second !== 0 ? bestScore / Math.max(1e-6, second) : 10;
  return {
    keyCamelot,
    keyName: camelotDisplayName(keyCamelot),
    lowConfidence: prominence < 1.05 || bestScore < 0.5,
  };
}

function accumulateChroma(mag: Float64Array, sampleRate: number, chroma: Float64Array): void {
  const binHz = sampleRate / (mag.length * 2);
  for (let i = 1; i < mag.length; i++) {
    const hz = i * binHz;
    if (hz < 55 || hz > 1760) continue;
    const midi = 69 + 12 * Math.log2(hz / 440);
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    // harmonic weighting: fundamental-ish stronger
    const w = 1 / (1 + Math.floor((midi - 36) / 12) * 0.15);
    chroma[pc]! += mag[i]! * w;
  }
}

function rotate(profile: number[], root: number): Float64Array {
  const out = new Float64Array(12);
  for (let i = 0; i < 12; i++) out[i] = profile[(i - root + 12) % 12]!;
  return out;
}

function pearson(a: Float64Array, b: Float64Array): number {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < 12; i++) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= 12;
  mb /= 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i++) {
    const xa = a[i]! - ma;
    const xb = b[i]! - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den > 0 ? num / den : 0;
}

function hann(n: number): Float32Array {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return w;
}
