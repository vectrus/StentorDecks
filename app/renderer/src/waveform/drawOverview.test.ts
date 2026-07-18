import { describe, expect, it, vi } from 'vitest';
import {
  OVERVIEW_BUCKETS,
  drawOverviewWaveform,
  u8SignedToUnit,
  u8UnsignedToUnit,
} from './drawOverview';

function makeFlatOverview(level = 200): Uint8Array {
  const out = new Uint8Array(OVERVIEW_BUCKETS * 3);
  for (let b = 0; b < OVERVIEW_BUCKETS; b++) {
    const o = b * 3;
    out[o] = 128 - 40; // min
    out[o + 1] = 128 + 40; // max
    out[o + 2] = level; // rms
  }
  return out;
}

describe('drawOverview helpers', () => {
  it('maps signed/unsigned u8', () => {
    expect(u8SignedToUnit(0)).toBeCloseTo(-1);
    expect(u8SignedToUnit(255)).toBeCloseTo(1);
    expect(u8SignedToUnit(128)).toBeCloseTo(0.0039, 2);
    expect(u8UnsignedToUnit(0)).toBe(0);
    expect(u8UnsignedToUnit(255)).toBe(1);
  });
});

describe('drawOverviewWaveform', () => {
  it('draws buckets and cue without throwing', () => {
    const fillRect = vi.fn();
    const clearRect = vi.fn();
    const ctx = {
      clearRect,
      fillRect,
      globalAlpha: 1,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawOverviewWaveform(ctx, makeFlatOverview(), {
      width: 400,
      height: 48,
      progress: 0.25,
      cueNorm: 0.1,
      accent: '#ffb454',
      clip: '#ff5d5d',
      remainingSec: 20,
    });

    expect(clearRect).toHaveBeenCalledWith(0, 0, 400, 48);
    expect(fillRect.mock.calls.length).toBeGreaterThan(OVERVIEW_BUCKETS);
  });

  it('no-ops on short buffer', () => {
    const fillRect = vi.fn();
    const clearRect = vi.fn();
    const ctx = {
      clearRect,
      fillRect,
      globalAlpha: 1,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawOverviewWaveform(ctx, new Uint8Array(10), {
      width: 100,
      height: 20,
      progress: 0,
      cueNorm: 0,
      accent: '#fff',
      clip: '#f00',
      remainingSec: null,
    });
    expect(clearRect).toHaveBeenCalled();
    expect(fillRect).not.toHaveBeenCalled();
  });
});
