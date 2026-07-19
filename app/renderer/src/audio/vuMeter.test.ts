import { describe, expect, it } from 'vitest';
import { dbToVuNorm, isPeaking, vuSegments } from './vuMeter';

describe('vuSegments (R7.6 / mockup 05)', () => {
  it('is silent below floor', () => {
    expect(vuSegments(-120)).toEqual({ ok: 0, hot: 0, clip: 0 });
  });

  it('fills only green in the safe zone', () => {
    const s = vuSegments(-30);
    expect(s.ok).toBeGreaterThan(0.4);
    expect(s.ok).toBeLessThan(0.7);
    expect(s.hot).toBe(0);
    expect(s.clip).toBe(0);
  });

  it('stacks green+amber in the hot zone (not 100% green)', () => {
    const s = vuSegments(-6);
    expect(s.ok).toBeCloseTo(dbToVuNorm(-9), 5);
    expect(s.hot).toBeGreaterThan(0);
    expect(s.clip).toBe(0);
    expect(s.ok + s.hot).toBeCloseTo(dbToVuNorm(-6), 5);
    expect(s.ok).toBeLessThan(1);
  });

  it('shows red when peaking', () => {
    const s = vuSegments(-1);
    expect(s.clip).toBeGreaterThan(0);
    expect(s.ok + s.hot + s.clip).toBeCloseTo(dbToVuNorm(-1), 5);
    expect(isPeaking(-1)).toBe(true);
    expect(isPeaking(-6)).toBe(false);
  });
});
