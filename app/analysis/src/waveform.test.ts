import { describe, expect, it } from 'vitest';
import { computeWaveforms } from './waveform';

describe('computeWaveforms', () => {
  it('packs 800 overview triplets', () => {
    const mono = new Float32Array(44100);
    for (let i = 0; i < mono.length; i++) mono[i] = Math.sin((i / 44100) * Math.PI * 2 * 440);
    const w = computeWaveforms(mono, 44100);
    expect(w.overview.length).toBe(800 * 3);
    expect(w.detailPps).toBe(50);
    expect(w.detail.length).toBeGreaterThan(0);
    expect(w.detail.length % 3).toBe(0);
  });
});
