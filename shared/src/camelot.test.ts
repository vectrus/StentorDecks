import { describe, expect, it } from 'vitest';
import { averageTapBpm, isCamelotKey } from './camelot.js';

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
