import { describe, expect, it } from 'vitest';
import { detectBpm } from './bpm';

describe('detectBpm', () => {
  it('finds tempo near a synthetic click track', () => {
    const sr = 44100;
    const bpm = 128;
    const period = Math.round((60 / bpm) * sr);
    const mono = new Float32Array(sr * 8);
    for (let i = 0; i < mono.length; i += period) {
      for (let j = 0; j < 40 && i + j < mono.length; j++) {
        mono[i + j] = 1 - j / 40;
      }
    }
    const result = detectBpm(mono, sr);
    expect(result).not.toBeNull();
    // Allow half/double fold error band for synthetic clicks
    const ratio = result!.bpm / bpm;
    const near =
      Math.abs(result!.bpm - bpm) < 4 ||
      Math.abs(ratio - 2) < 0.05 ||
      Math.abs(ratio - 0.5) < 0.05;
    expect(near).toBe(true);
    expect(result!.beatGridOffsetSec).toBeGreaterThanOrEqual(0);
    expect(result!.beatGridOffsetSec).toBeLessThan(60 / result!.bpm + 1e-6);
  });

  it('places grid offset near first click after silence prefix', () => {
    const sr = 44100;
    const bpm = 120;
    const period = Math.round((60 / bpm) * sr);
    const silence = Math.round(sr * 1.0); // 1 s intro
    const mono = new Float32Array(sr * 10);
    for (let i = silence; i < mono.length; i += period) {
      for (let j = 0; j < 48 && i + j < mono.length; j++) {
        mono[i + j] = 1 - j / 48;
      }
    }
    const result = detectBpm(mono, sr);
    expect(result).not.toBeNull();
    // Offset should be near 1.0 s mod period (period=0.5 → ~0 or ~0.5 depending on fold)
    const periodSec = 60 / result!.bpm;
    const expected = 1.0 % periodSec;
    const err = Math.min(
      Math.abs(result!.beatGridOffsetSec - expected),
      periodSec - Math.abs(result!.beatGridOffsetSec - expected),
    );
    expect(err).toBeLessThan(0.08);
  });
});
