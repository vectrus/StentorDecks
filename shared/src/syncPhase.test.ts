import { describe, expect, it } from 'vitest';
import {
  beatPeriodSec,
  beatPhaseSec,
  phaseAssistDeltaSec,
  phaseAssistDeltaTrackSec,
  phaseAssistRateBias,
  phaseSnapDeltaSec,
  phaseSnapDeltaTrackSec,
  rescaleBeatGridOffsetSec,
  wrapPhaseSec,
} from './syncPhase.js';

describe('phaseSnapDeltaSec', () => {
  const period = 0.5; // 120 BPM

  it('returns 0 when already aligned (0:00 grid)', () => {
    expect(phaseSnapDeltaSec(10.0, 4.0, period)).toBeCloseTo(0, 10);
    expect(phaseSnapDeltaSec(10.25, 4.25, period)).toBeCloseTo(0, 10);
  });

  it('snaps forward to match other phase (shortest path)', () => {
    expect(phaseSnapDeltaSec(10.1, 4.3, period)).toBeCloseTo(0.2, 10);
  });

  it('snaps backward when that is shorter', () => {
    expect(phaseSnapDeltaSec(10.4, 4.05, period)).toBeCloseTo(0.15, 10);
  });

  it('prefers negative when other side is shorter', () => {
    expect(phaseSnapDeltaSec(10.05, 4.4, period)).toBeCloseTo(-0.15, 10);
  });

  it('returns 0 for invalid period', () => {
    expect(phaseSnapDeltaSec(1, 2, 0)).toBe(0);
    expect(phaseSnapDeltaSec(1, 2, -1)).toBe(0);
  });

  it('aligns tracks with different intro offsets (silence prefix)', () => {
    // Slave grid starts at 1.0s, master at 0.2s; both at "beat 0" in their grids
    // slave pos 1.0 → phase 0; master pos 0.2 → phase 0 → delta 0
    expect(phaseSnapDeltaSec(1.0, 0.2, period, 1.0, 0.2)).toBeCloseTo(0, 10);
    // slave at 1.1 (phase 0.1), master at 0.35 (phase 0.15) → +0.05
    expect(phaseSnapDeltaSec(1.1, 0.35, period, 1.0, 0.2)).toBeCloseTo(0.05, 10);
  });
});

describe('beatPhaseSec / wrapPhaseSec', () => {
  it('wraps negative and large values', () => {
    expect(wrapPhaseSec(-0.1, 0.5)).toBeCloseTo(0.4, 10);
    expect(wrapPhaseSec(1.2, 0.5)).toBeCloseTo(0.2, 10);
  });

  it('phase relative to offset', () => {
    expect(beatPhaseSec(1.25, 1.0, 0.5)).toBeCloseTo(0.25, 10);
  });
});

describe('rescaleBeatGridOffsetSec', () => {
  it('keeps absolute first-beat time when BPM doubles (wrap into new period)', () => {
    // 120 BPM period 0.5, offset 0.4 → 240 BPM period 0.25 → wrap 0.15
    expect(rescaleBeatGridOffsetSec(0.4, 240)).toBeCloseTo(0.15, 10);
  });

  it('returns null for missing offset', () => {
    expect(rescaleBeatGridOffsetSec(null, 128)).toBeNull();
  });
});

describe('beatPeriodSec', () => {
  it('from BPM', () => {
    expect(beatPeriodSec(120)).toBeCloseTo(0.5, 10);
    expect(beatPeriodSec(0)).toBeNull();
  });
});

describe('phaseAssistDeltaSec', () => {
  const period = 0.5;

  it('targets zero like a snap when targetErr is 0', () => {
    expect(phaseAssistDeltaSec(10.1, 4.3, period, 0, 0, 0)).toBeCloseTo(0.2, 10);
  });

  it('holds a non-zero glue target (no correction when already there)', () => {
    // err = 0.2; target = 0.2 → delta 0
    expect(phaseAssistDeltaSec(10.1, 4.3, period, 0, 0, 0.2)).toBeCloseTo(0, 10);
  });

  it('corrects back toward a glue target', () => {
    // err = 0; target = 0.1 → need delta -0.1 on this (increase phase / seek back)
    expect(phaseAssistDeltaSec(10.0, 4.0, period, 0, 0, 0.1)).toBeCloseTo(-0.1, 10);
  });
});

describe('phaseSnapDeltaTrackSec (file BPM / track time)', () => {
  it('matches shared-period snap when both decks share file BPM', () => {
    const a = phaseSnapDeltaTrackSec(10.1, 4.3, 120, 120);
    const b = phaseSnapDeltaSec(10.1, 4.3, 0.5);
    expect(a).toBeCloseTo(b, 10);
  });

  it('aligns beat fractions across different file BPMs', () => {
    // this 120 BPM at beat phase 0; other 128 BPM also at beat phase 0 → 0
    expect(phaseSnapDeltaTrackSec(1.0, 2.0, 120, 128, 1.0, 2.0)).toBeCloseTo(0, 10);
  });

  it('assist holds glue on track-time lattice', () => {
    const err = phaseSnapDeltaTrackSec(10.1, 4.3, 120, 120);
    expect(
      phaseAssistDeltaTrackSec(10.1, 4.3, 120, 120, 0, 0, err),
    ).toBeCloseTo(0, 10);
  });
});

describe('phaseAssistRateBias', () => {
  it('returns 1 inside deadband', () => {
    expect(phaseAssistRateBias(0)).toBe(1);
    expect(phaseAssistRateBias(0.001)).toBe(1);
  });

  it('slows when this is ahead (positive delta)', () => {
    expect(phaseAssistRateBias(0.02)).toBeLessThan(1);
  });

  it('speeds when this is behind (negative delta)', () => {
    expect(phaseAssistRateBias(-0.02)).toBeGreaterThan(1);
  });
});
