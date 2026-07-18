import { describe, expect, it } from 'vitest';
import {
  autoGainTrimDb,
  channelFaderDb,
  channelFaderGain,
  endOfTrackWarnLevel,
  eqKnobDb,
  filterFromAmount,
  gainKnobFromTrimDb,
  pitchFaderNormalized,
  pitchPosFromRate,
  pitchRate,
  trimDbFromGainKnob,
} from './audioCurves.js';

describe('channel fader curves', () => {
  it('linear s=0 hits documented midpoints', () => {
    expect(channelFaderGain(0, 0)).toBe(0);
    expect(channelFaderDb(0.5, 0)).toBeCloseTo(-30, 5);
    expect(channelFaderDb(1, 0)).toBeCloseTo(0, 5);
    expect(channelFaderDb(0.25, 0)).toBeCloseTo(-45, 5);
    expect(channelFaderDb(0.75, 0)).toBeCloseTo(-15, 5);
  });

  it('smooth s=35 is quieter than linear at mid for fine top control', () => {
    // positive shape → more throw near top → quieter at mid vs linear
    expect(channelFaderGain(0.5, 35)).toBeLessThan(channelFaderGain(0.5, 0));
  });
});

describe('pitch fader', () => {
  it('dead-zone snaps to 0', () => {
    expect(pitchFaderNormalized(0.5, 0.04)).toBe(0);
    expect(pitchFaderNormalized(0.51, 0.04)).toBe(0);
    expect(pitchRate(0.5, 0.04, 0.08)).toBe(1);
  });

  it('extremes reach ± range', () => {
    expect(pitchRate(0, 0.04, 0.08)).toBeCloseTo(0.92, 5);
    expect(pitchRate(1, 0.04, 0.08)).toBeCloseTo(1.08, 5);
    expect(pitchRate(1, 0.04, 0.16)).toBeCloseTo(1.16, 5);
  });

  it('pitchPosFromRate round-trips rate at center and extremes', () => {
    for (const pos of [0, 0.5, 1]) {
      const rate = pitchRate(pos, 0.04, 0.08);
      const back = pitchPosFromRate(rate, 0.04, 0.08);
      expect(pitchRate(back, 0.04, 0.08)).toBeCloseTo(rate, 5);
    }
  });
});

describe('EQ knob', () => {
  it('center is 0 dB; extremes approach ±max', () => {
    expect(eqKnobDb(0.5, 12)).toBe(0);
    expect(Math.abs(eqKnobDb(0.25, 12))).toBeLessThan(Math.abs(eqKnobDb(0, 12)));
    expect(eqKnobDb(1, 12)).toBeCloseTo(12, 0);
    expect(eqKnobDb(0, 12)).toBeCloseTo(-12, 0);
  });
});

describe('gain knob inverse (soft takeover raw space)', () => {
  it('round-trips raw ↔ trim dB', () => {
    expect(trimDbFromGainKnob(0.5)).toBe(0);
    expect(trimDbFromGainKnob(1)).toBe(12);
    expect(trimDbFromGainKnob(0)).toBe(-12);
    expect(gainKnobFromTrimDb(0)).toBeCloseTo(0.5, 5);
    expect(gainKnobFromTrimDb(6)).toBeCloseTo(0.75, 5);
  });
});

describe('filter amount', () => {
  it('center bypass; left LP; right HP', () => {
    expect(filterFromAmount(0.5).mode).toBe('bypass');
    expect(filterFromAmount(0.2).mode).toBe('lowpass');
    expect(filterFromAmount(0.8).mode).toBe('highpass');
  });
});

describe('auto-gain + EOT warn', () => {
  it('computes trim toward target', () => {
    expect(autoGainTrimDb(-8, -14)).toBeCloseTo(-6, 5);
    expect(autoGainTrimDb(-20, -14)).toBeCloseTo(6, 5);
  });

  it('warn levels', () => {
    expect(endOfTrackWarnLevel(40)).toBe(0);
    expect(endOfTrackWarnLevel(25)).toBe(30);
    expect(endOfTrackWarnLevel(12)).toBe(15);
    expect(endOfTrackWarnLevel(5)).toBe(10);
  });
});
