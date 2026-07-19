import { describe, expect, it } from 'vitest';
import { bpmDistanceHalfDouble, scoreMixmatchRules } from './mixmatchRules.js';

describe('bpmDistanceHalfDouble', () => {
  it('treats half/double as close', () => {
    expect(bpmDistanceHalfDouble(128, 64)).toBeCloseTo(0, 5);
    expect(bpmDistanceHalfDouble(128, 256)).toBeCloseTo(0, 5);
    expect(bpmDistanceHalfDouble(128, 130)).toBeCloseTo(2, 5);
  });
});

describe('scoreMixmatchRules', () => {
  const pool = [
    { id: 1, bpm: 128, keyCamelot: '8A' },
    { id: 2, bpm: 128, keyCamelot: '7A' },
    { id: 3, bpm: 128, keyCamelot: '6A' },
    { id: 4, bpm: 140, keyCamelot: '3A' },
    { id: 5, bpm: 128, keyCamelot: '8B' },
    { id: 9, bpm: 128, keyCamelot: '8A' }, // loaded exclude
  ];

  it('ranks neighbours above far keys and excludes loaded', () => {
    const hits = scoreMixmatchRules(pool, {
      refKey: '8A',
      refBpm: 128,
      excludeIds: new Set([9]),
      limit: 5,
    });
    expect(hits.every((h) => h.id !== 9)).toBe(true);
    const ids = hits.map((h) => h.id);
    // 8A / 7A / 8B should beat 3A
    expect(ids.indexOf(1)).toBeLessThan(ids.indexOf(4));
    expect(ids.indexOf(2)).toBeLessThan(ids.indexOf(4));
    expect(ids.indexOf(5)).toBeLessThan(ids.indexOf(4));
  });

  it('demotes session-played', () => {
    const hits = scoreMixmatchRules(pool, {
      refKey: '8A',
      refBpm: 128,
      excludeIds: new Set([9]),
      playedIds: new Set([1]),
      limit: 4,
    });
    expect(hits[0]?.id).not.toBe(1);
  });
});
