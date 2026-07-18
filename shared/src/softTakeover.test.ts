import { describe, expect, it } from 'vitest';
import { armTakeover, createTakeover, processTakeoverInput } from './softTakeover.js';

describe('soft takeover (R2.7)', () => {
  it('ignores hardware until it crosses software value', () => {
    let s = createTakeover(0.5);
    let r = processTakeoverInput(s, 0.2);
    expect(r.apply).toBe(false);
    s = r.state;
    r = processTakeoverInput(s, 0.4);
    expect(r.apply).toBe(false);
    s = r.state;
    r = processTakeoverInput(s, 0.51);
    expect(r.apply).toBe(true);
    expect(r.state.armed).toBe(false);
    expect(r.value).toBeCloseTo(0.51);
  });

  it('picks up within 1/128 without crossing', () => {
    const s = createTakeover(0.5);
    const r = processTakeoverInput(s, 0.5 + 1 / 200);
    expect(r.apply).toBe(true);
    expect(r.state.armed).toBe(false);
  });

  it('software change re-arms', () => {
    let s = createTakeover(0.5);
    s = processTakeoverInput(s, 0.5).state;
    expect(s.armed).toBe(false);
    s = armTakeover(s, 0.8);
    expect(s.armed).toBe(true);
    const r = processTakeoverInput(s, 0.5);
    expect(r.apply).toBe(false);
  });
});
