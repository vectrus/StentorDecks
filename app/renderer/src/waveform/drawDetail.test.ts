import { describe, expect, it, vi } from 'vitest';
import {
  DETAIL_HALF_WINDOW_SEC,
  DETAIL_PPS_DEFAULT,
  DETAIL_WINDOW_BUCKETS,
  beatTimesInWindow,
  detailBucketCount,
  detailWindowStartBucket,
  drawDetailWaveform,
  sampleDetailLerped,
  timeToDetailX,
} from './drawDetail';

function makeDetail(buckets: number, level = 200): Uint8Array {
  const out = new Uint8Array(buckets * 3);
  for (let b = 0; b < buckets; b++) {
    const o = b * 3;
    out[o] = 128 - 40;
    out[o + 1] = 128 + 40;
    out[o + 2] = level;
  }
  return out;
}

describe('detail window math', () => {
  it('exports 400-bucket window at 50 pps ±4s', () => {
    expect(DETAIL_WINDOW_BUCKETS).toBe(400);
    expect(DETAIL_HALF_WINDOW_SEC * 2 * DETAIL_PPS_DEFAULT).toBe(400);
  });

  it('detailWindowStartBucket is unclamped (empty left near t=0)', () => {
    expect(detailWindowStartBucket(0, 50)).toBe(-200); // −4 s × 50
    expect(detailWindowStartBucket(4, 50)).toBe(0);
    expect(detailWindowStartBucket(10, 50)).toBe(300);
  });

  it('timeToDetailX maps center playhead', () => {
    expect(timeToDetailX(10, 10, 400)).toBe(200);
    expect(timeToDetailX(6, 10, 400)).toBe(0);
    expect(timeToDetailX(14, 10, 400)).toBe(400);
  });

  it('beatTimesInWindow lists beats from 0:00 origin', () => {
    // 120 BPM → 0.5 s period; window 6..14 around position 10
    const beats = beatTimesInWindow(10, 120);
    expect(beats[0]).toBeGreaterThanOrEqual(6 - 1e-6);
    expect(beats[beats.length - 1]!).toBeLessThanOrEqual(14 + 1e-6);
    expect(beats).toContain(10);
  });

  it('detailBucketCount', () => {
    expect(detailBucketCount(makeDetail(50))).toBe(50);
  });

  it('sampleDetailLerped blends adjacent buckets', () => {
    const d = makeDetail(2, 0);
    // bucket 0 rms=0, set bucket 1 rms high
    d[2] = 0;
    d[5] = 255;
    const mid = sampleDetailLerped(d, 2, 0.5);
    expect(mid).not.toBeNull();
    expect(mid!.rms).toBeCloseTo(0.5, 5);
  });
});

describe('drawDetailWaveform', () => {
  it('draws without throwing', () => {
    const fillRect = vi.fn();
    const clearRect = vi.fn();
    const ctx = {
      clearRect,
      fillRect,
      globalAlpha: 1,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawDetailWaveform(ctx, makeDetail(800), {
      width: 400,
      height: 56,
      positionSec: 10,
      durationSec: 100,
      cueOffsetSec: 10.5,
      detailPps: 50,
      accent: '#ffb454',
      tickColor: '#8a94a6',
      effectiveBpm: 128,
      showBeatTicks: true,
    });

    expect(clearRect).toHaveBeenCalled();
    expect(fillRect.mock.calls.length).toBeGreaterThan(100);
  });

  it('no-ops on empty detail', () => {
    const fillRect = vi.fn();
    const ctx = {
      clearRect: vi.fn(),
      fillRect,
      globalAlpha: 1,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D;
    drawDetailWaveform(ctx, new Uint8Array(0), {
      width: 100,
      height: 40,
      positionSec: 0,
      durationSec: 10,
      cueOffsetSec: 0,
      detailPps: 50,
      accent: '#fff',
      tickColor: '#888',
      effectiveBpm: null,
      showBeatTicks: false,
    });
    expect(fillRect).not.toHaveBeenCalled();
  });
});
