import { describe, expect, it } from 'vitest';
import { gainKnobFromTrimDb, trimDbFromGainKnob } from './audioCurves.js';
import {
  adoptHardwareTakeover,
  armTakeover,
  createTakeover,
  preserveTakeoverAfterLoad,
  processTakeoverInput,
  refreshTakeoverSoftware,
} from './softTakeover.js';

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

  it('refreshTakeoverSoftware moves pickup target while armed (SYNC follow)', () => {
    let s = createTakeover(0.5);
    s = refreshTakeoverSoftware(s, 0.7);
    expect(s.armed).toBe(true);
    expect(s.softwareValue).toBeCloseTo(0.7);
    // Hardware at old 0.5 must not pick up; must cross 0.7
    let r = processTakeoverInput(s, 0.5);
    expect(r.apply).toBe(false);
    s = r.state;
    r = processTakeoverInput(s, 0.71);
    expect(r.apply).toBe(true);
  });

  it('gain knob ↔ trim dB inverse round-trips for takeover raw space', () => {
    for (const raw of [0, 0.25, 0.5, 0.75, 1]) {
      const db = trimDbFromGainKnob(raw);
      expect(gainKnobFromTrimDb(db)).toBeCloseTo(raw, 5);
    }
  });

  it('adoptHardwareTakeover goes live at last HW', () => {
    let s = createTakeover(0.5);
    s = processTakeoverInput(s, 0.2).state;
    expect(s.armed).toBe(true);
    const adopted = adoptHardwareTakeover(s);
    expect(adopted).not.toBeNull();
    expect(adopted!.armed).toBe(false);
    expect(adopted!.softwareValue).toBeCloseTo(0.2);
  });

  it('preserveTakeoverAfterLoad keeps live controls live', () => {
    let s = createTakeover(0.5);
    s = processTakeoverInput(s, 0.5).state;
    expect(s.armed).toBe(false);
    s = preserveTakeoverAfterLoad(s, 0.5);
    expect(s.armed).toBe(false);
    expect(s.softwareValue).toBeCloseTo(0.5);
  });

  it('preserveTakeoverAfterLoad auto-picks up when HW already matches', () => {
    let s = createTakeover(0.5);
    s = { ...s, hardwareValue: 0.5, armed: true };
    s = preserveTakeoverAfterLoad(s, 0.5);
    expect(s.armed).toBe(false);
  });
});
