import { describe, expect, it } from 'vitest';
import {
  autoGainTrimDb,
  CHANNEL_FADER_SMOOTH_SHAPE,
  channelFaderDb,
  channelFaderEasedPos,
  channelFaderGain,
  endOfTrackWarnLevel,
  eqKnobDb,
  filterFromAmount,
  gainKnobFromTrimDb,
  migrateLegacyChannelFaderShape,
  pitchFaderNormalized,
  pitchPosFromRate,
  pitchRate,
  trimDbFromGainKnob,
} from './audioCurves.js';

describe('channel fader curves', () => {
  it('migrates legacy smooth shape 35 → 55', () => {
    expect(migrateLegacyChannelFaderShape(35)).toBe(CHANNEL_FADER_SMOOTH_SHAPE);
    expect(migrateLegacyChannelFaderShape(0)).toBe(0);
    expect(migrateLegacyChannelFaderShape(40)).toBe(40);
  });

  it('eases the first 20% of throw into the first 10% of domain', () => {
    expect(channelFaderEasedPos(0)).toBe(0);
    expect(channelFaderEasedPos(0.2)).toBeCloseTo(0.1, 5);
    expect(channelFaderEasedPos(0.1)).toBeCloseTo(0.05, 5);
    expect(channelFaderEasedPos(1)).toBe(1);
    // Mid-throw sits above the toe
    expect(channelFaderEasedPos(0.6)).toBeGreaterThan(0.5);
  });

  it('linear s=0 respects toe then linear dB in eased domain', () => {
    expect(channelFaderGain(0, 0)).toBe(0);
    expect(channelFaderDb(1, 0)).toBeCloseTo(0, 5);
    // pos 0.2 → eased 0.1 → −54 dB
    expect(channelFaderDb(0.2, 0)).toBeCloseTo(-54, 5);
    // quieter in the open toe than a raw-linear 20% (−48 dB)
    expect(channelFaderDb(0.2, 0)).toBeLessThan(-48);
  });

  it('smooth s=55 is quieter than linear at mid for fine top control', () => {
    expect(channelFaderGain(0.5, 55)).toBeLessThan(channelFaderGain(0.5, 0));
  });

  it('first 20% has half the domain slope of the remaining throw', () => {
    const toeSlope =
      (channelFaderEasedPos(0.2) - channelFaderEasedPos(0)) / 0.2;
    const restSlope =
      (channelFaderEasedPos(1) - channelFaderEasedPos(0.2)) / 0.8;
    expect(toeSlope).toBeCloseTo(0.5, 5);
    expect(restSlope).toBeCloseTo(1.125, 5);
    expect(toeSlope).toBeLessThan(restSlope);
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

describe('EQ curve', () => {
  it('center is 0 dB', () => {
    expect(eqKnobDb(0.5, 12)).toBe(0);
  });

  it('extremes approach ±max', () => {
    expect(eqKnobDb(1, 12)).toBeCloseTo(12, 1);
    expect(eqKnobDb(0, 12)).toBeCloseTo(-12, 1);
  });
});

describe('filter amount', () => {
  it('center is bypass', () => {
    expect(filterFromAmount(0.5).mode).toBe('bypass');
  });

  it('left is lowpass, right is highpass', () => {
    expect(filterFromAmount(0.2).mode).toBe('lowpass');
    expect(filterFromAmount(0.8).mode).toBe('highpass');
  });
});

describe('auto-gain / trim', () => {
  it('autoGainTrimDb targets loudness', () => {
    expect(autoGainTrimDb(-20, -14)).toBeCloseTo(6, 5);
  });

  it('gain knob ↔ trim dB round-trip at 0 dB', () => {
    const kn = gainKnobFromTrimDb(0);
    expect(trimDbFromGainKnob(kn)).toBeCloseTo(0, 5);
  });
});

describe('end of track warn', () => {
  it('thresholds', () => {
    expect(endOfTrackWarnLevel(40)).toBe(0);
    expect(endOfTrackWarnLevel(25)).toBe(30);
    expect(endOfTrackWarnLevel(12)).toBe(15);
    expect(endOfTrackWarnLevel(5)).toBe(10);
  });
});
