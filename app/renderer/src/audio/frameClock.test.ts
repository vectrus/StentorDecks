import { afterEach, describe, expect, it } from 'vitest';
import {
  getVisualLatencySec,
  registerFrameDraw,
  runFrameDraws,
  setVisualLatencySec,
  visualPositionSec,
} from './frameClock';

describe('frameClock', () => {
  afterEach(() => {
    setVisualLatencySec(0);
  });

  it('runs registered drawers once per runFrameDraws', () => {
    let n = 0;
    const unsub = registerFrameDraw(() => {
      n += 1;
    });
    runFrameDraws();
    runFrameDraws();
    expect(n).toBe(2);
    unsub();
    runFrameDraws();
    expect(n).toBe(2);
  });

  it('visualPositionSec subtracts clamped latency', () => {
    setVisualLatencySec(0.04);
    expect(getVisualLatencySec()).toBeCloseTo(0.04, 5);
    expect(visualPositionSec(1.0)).toBeCloseTo(0.96, 5);
    expect(visualPositionSec(0.01)).toBe(0);
  });
});
