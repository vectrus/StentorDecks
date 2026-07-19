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
    const ch = [new Float32Array(128)];
    for (let i = 0; i < 128; i++) ch[0]![i] = 0.1;
    ch[0]![64] = 0.95; // impulse
    const hits = declickChannelsInPlace(ch, 'light');
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(Math.abs(ch[0]![64]! - 0.1)).toBeLessThan(0.25);
  });

  it('light heals a single-sample spike without huge consecutive jump setup', () => {
    const ch = [new Float32Array(128)];
    for (let i = 0; i < 128; i++) ch[0]![i] = 0.05;
    // Spike: neighbors stay low; sample is high (squeak tick).
    ch[0]![60] = 0.85;
    const hits = declickChannelsInPlace(ch, 'light');
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(Math.abs(ch[0]![60]!)).toBeLessThan(0.4);
  });

  it('strong is more aggressive than light', () => {
    const light = declickParams('light')!;
    const strong = declickParams('strong')!;
    expect(strong.absFloor).toBeLessThan(light.absFloor);
    expect(strong.rmsMul).toBeLessThan(light.rmsMul);
    expect(strong.halfWin).toBeGreaterThan(light.halfWin);
    expect(strong.passes).toBeGreaterThan(light.passes);
  });

  it('leaves a slow ramp alone', () => {
    const ch = [new Float32Array(256)];
    for (let i = 0; i < 256; i++) ch[0]![i] = (i / 255) * 0.4;
    const before = ch[0]![128]!;
    const hits = declickChannelsInPlace(ch, 'light');
    expect(hits).toBe(0);
    expect(ch[0]![128]).toBeCloseTo(before, 5);
  });
});
