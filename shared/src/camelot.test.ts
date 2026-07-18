import { describe, expect, it } from 'vitest';
import {
  averageTapBpm,
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
