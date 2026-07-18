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
  });
});
