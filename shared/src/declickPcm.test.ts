import { describe, expect, it } from 'vitest';
import { declickChannelsInPlace, declickParams } from './declickPcm.js';

describe('declickPcm', () => {
  it('off does nothing', () => {
    expect(declickParams('off')).toBeNull();
    const ch = [new Float32Array([0, 0.9, 0])];
    expect(declickChannelsInPlace(ch, 'off')).toBe(0);
    expect(ch[0]![1]).toBeCloseTo(0.9, 5);
  });

  it('light heals a large jump', () => {
    const ch = [new Float32Array(64)];
    for (let i = 0; i < 32; i++) ch[0]![i] = 0.1;
    ch[0]![32] = 0.9; // big spike jump from 0.1
    for (let i = 33; i < 64; i++) ch[0]![i] = 0.1;
    const hits = declickChannelsInPlace(ch, 'light');
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(Math.abs(ch[0]![32]! - 0.1)).toBeLessThan(0.35);
  });

  it('strong uses a lower threshold', () => {
    const light = declickParams('light')!;
    const strong = declickParams('strong')!;
    expect(strong.threshold).toBeLessThan(light.threshold);
    expect(strong.halfWin).toBeGreaterThan(light.halfWin);
  });
});
