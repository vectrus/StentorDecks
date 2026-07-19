import { describe, expect, it } from 'vitest';
import {
  averageTapBpm,
  camelotHarmonicBand,
  camelotHarmonicSortRank,
  camelotRelation,
  isCamelotCompatible,
  isCamelotKey,
} from './camelot.js';

describe('averageTapBpm (R6.6)', () => {
  it('needs at least 4 taps', () => {
    expect(averageTapBpm([0, 500, 1000])).toBeNull();
  });

  it('averages intervals to BPM', () => {
    // 128 BPM → 468.75 ms
    const step = 60000 / 128;
    const taps = [0, 1, 2, 3, 4].map((i) => i * step);
    expect(averageTapBpm(taps)).toBeCloseTo(128, 0);
  });

  it('isCamelotKey', () => {
    expect(isCamelotKey('8A')).toBe(true);
    expect(isCamelotKey('13A')).toBe(false);
  });
});

describe('camelotRelation (harmonic next)', () => {
  it('same / adjacent / relative', () => {
    expect(camelotRelation('8A', '8A')).toBe('same');
    expect(camelotRelation('8A', '7A')).toBe('adjacent');
    expect(camelotRelation('8A', '9A')).toBe('adjacent');
    expect(camelotRelation('8A', '8B')).toBe('relative');
    expect(camelotRelation('1A', '12A')).toBe('adjacent'); // wheel wrap
  });

  it('rejects far keys', () => {
    expect(camelotRelation('8A', '3A')).toBeNull();
    expect(camelotRelation('8A', '9B')).toBeNull();
    expect(isCamelotCompatible('8A', '8B')).toBe(true);
    expect(isCamelotCompatible('8A', '3B')).toBe(false);
  });
});

describe('camelotHarmonicBand (soft-rank)', () => {
  it('band 0 for neighbours', () => {
    expect(camelotHarmonicBand('8A', '8A')).toBe(0);
    expect(camelotHarmonicBand('8A', '7A')).toBe(0);
    expect(camelotHarmonicBand('8A', '8B')).toBe(0);
    expect(camelotHarmonicBand('1A', '12A')).toBe(0);
  });

  it('band 1 for ±2 same letter (incl. wrap)', () => {
    expect(camelotHarmonicBand('8A', '6A')).toBe(1);
    expect(camelotHarmonicBand('8A', '10A')).toBe(1);
    expect(camelotHarmonicBand('1A', '11A')).toBe(1);
    expect(camelotHarmonicBand('12A', '2A')).toBe(1);
  });

  it('band 2 for farther keys; null/unknown → sort rank 3', () => {
    expect(camelotHarmonicBand('8A', '3A')).toBe(2);
    expect(camelotHarmonicBand('8A', '9B')).toBe(2);
    expect(camelotHarmonicSortRank('8A', null)).toBe(3);
    expect(camelotHarmonicSortRank('8A', 'nope')).toBe(3);
  });
});
