import { describe, expect, it } from 'vitest';
import { beatPeriodSec, phaseSnapDeltaSec } from './syncPhase.js';

describe('phaseSnapDeltaSec', () => {
  const period = 0.5; // 120 BPM

  it('returns 0 when already aligned', () => {
    expect(phaseSnapDeltaSec(10.0, 4.0, period)).toBeCloseTo(0, 10);
    expect(phaseSnapDeltaSec(10.25, 4.25, period)).toBeCloseTo(0, 10);
  });

  it('snaps forward to match other phase (shortest path)', () => {
    // this at phase 0.1, other at 0.3 → +0.2
    expect(phaseSnapDeltaSec(10.1, 4.3, period)).toBeCloseTo(0.2, 10);
  });

  it('snaps backward when that is shorter', () => {
    // this 0.4, other 0.05 → delta -0.35 or +0.15; shortest is +0.15? 
    // 0.05 - 0.4 = -0.35; -0.35 + 0.5 = 0.15. Yes +0.15
    expect(phaseSnapDeltaSec(10.4, 4.05, period)).toBeCloseTo(0.15, 10);
  });

  it('prefers negative when other side is shorter', () => {
    // this 0.05, other 0.4 → 0.4-0.05=0.35 → wrap to -0.15
    expect(phaseSnapDeltaSec(10.05, 4.4, period)).toBeCloseTo(-0.15, 10);
  });

  it('returns 0 for invalid period', () => {
    expect(phaseSnapDeltaSec(1, 2, 0)).toBe(0);
    expect(phaseSnapDeltaSec(1, 2, -1)).toBe(0);
  });
});

describe('beatPeriodSec', () => {
  it('from BPM', () => {
    expect(beatPeriodSec(120)).toBeCloseTo(0.5, 10);
    expect(beatPeriodSec(0)).toBeNull();
  });
});
