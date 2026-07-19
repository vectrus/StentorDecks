import { describe, expect, it } from 'vitest';
import {
  detailHalfWindowSec,
  detailSecPerPx,
  detailTimeAtX,
  overviewNormAtX,
} from './waveformScrub';

describe('waveformScrub', () => {
  it('maps center of detail strip to playhead', () => {
    const rect = { left: 0, width: 400 } as DOMRect;
    expect(detailTimeAtX(200, rect, 30, 4)).toBeCloseTo(30, 5);
  });

  it('maps left/right edges to ±half window', () => {
    const rect = { left: 0, width: 400 } as DOMRect;
    expect(detailTimeAtX(0, rect, 30, 4)).toBeCloseTo(26, 5);
    expect(detailTimeAtX(400, rect, 30, 4)).toBeCloseTo(34, 5);
  });

  it('detailSecPerPx scales with width', () => {
    expect(detailSecPerPx(400, 4)).toBeCloseTo(8 / 400, 8);
  });

  it('overviewNormAtX clamps', () => {
    const rect = { left: 10, width: 100 } as DOMRect;
    expect(overviewNormAtX(10, rect)).toBe(0);
    expect(overviewNormAtX(60, rect)).toBeCloseTo(0.5, 5);
    expect(overviewNormAtX(200, rect)).toBe(1);
  });

  it('detailHalfWindowSec follows pitch rate', () => {
    expect(detailHalfWindowSec(1)).toBe(4);
    expect(detailHalfWindowSec(2)).toBe(8);
  });
});
