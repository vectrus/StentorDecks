import { describe, expect, it } from 'vitest';
import {
  createJogActivity,
  createJogImpulse,
  defaultJogSettings,
  dualZoneSoftJogSettings,
  fineFloodGain,
  gateJogPlayingSeek,
  jogFeelFromSettings,
  jogSpinIntensity,
  scaleJogTick,
  updateJogActivity,
  JOG_FINE_IMPULSE_CAP_SEC,
  JOG_FINE_SEEK_SEC,
  JOG_FINE_RATE,
  JOG_SINGLE_ZONE_FINE_RATE,
  JOG_SPIN_SEEK_SEC,
  JOG_SPIN_RATE,
} from './jogFeel.js';

const singleFeel = jogFeelFromSettings(defaultJogSettings);
const vinylFeel = jogFeelFromSettings(dualZoneSoftJogSettings);

describe('jogSpinIntensity', () => {
  it('stays off in single-zone even at high tick rate', () => {
    expect(jogSpinIntensity(1, 200, singleFeel)).toBe(0);
    expect(jogSpinIntensity(8, 5, singleFeel)).toBe(0);
  });

  it('stays in the fine zone for slow ±1 ticks (Vinyl dual)', () => {
    expect(jogSpinIntensity(1, 10, vinylFeel)).toBeLessThan(0.15);
  });

  it('stays fine through a typical RMX2 fingertip flood (~80 t/s)', () => {
    expect(jogSpinIntensity(1, 80, vinylFeel)).toBeLessThan(0.1);
  });

  it('opens the spin zone at high tick rate when dual-zone', () => {
    expect(jogSpinIntensity(1, 220, vinylFeel)).toBeGreaterThan(0.4);
    expect(jogSpinIntensity(1, 340, vinylFeel)).toBeGreaterThan(0.95);
  });

  it('does not open spin from packed |delta| alone (short nudge packs)', () => {
    expect(jogSpinIntensity(12, 5, vinylFeel)).toBeLessThan(0.05);
  });
});

describe('scaleJogTick (single-zone CDJ nudge)', () => {
  it('default Soft is constant rate per message (no TPS gear change)', () => {
    const slow = scaleJogTick(1, 0, singleFeel);
    const fast = scaleJogTick(1, 120, singleFeel);
    const packed = scaleJogTick(6, 40, singleFeel);
    expect(slow.playingRateAmount).toBeCloseTo(JOG_SINGLE_ZONE_FINE_RATE, 5);
    expect(fast.playingRateAmount).toBeCloseTo(JOG_SINGLE_ZONE_FINE_RATE, 5);
    expect(packed.playingRateAmount).toBeCloseTo(JOG_SINGLE_ZONE_FINE_RATE, 5);
    expect(slow.intensity).toBe(0);
  });
});

describe('scaleJogTick (Vinyl dual seek-primary fine)', () => {
  it('fine tick is quiet sticky seek with ~0 rate (no tempo warble)', () => {
    const s = scaleJogTick(1, 8, vinylFeel);
    const flood = fineFloodGain(8, s.intensity);
    expect(s.playingSeekSec).toBeCloseTo(JOG_FINE_SEEK_SEC * flood, 5);
    expect(s.playingRateAmount).toBeCloseTo(JOG_FINE_RATE, 5);
    expect(s.playingRateAmount).toBe(0);
    expect(s.intensity).toBeLessThan(0.2);
  });

  it('compresses fine seek under RMX2 flood t/s', () => {
    const idle = scaleJogTick(1, 8, vinylFeel).playingSeekSec;
    const flood = scaleJogTick(1, 80, vinylFeel).playingSeekSec;
    expect(flood).toBeLessThan(idle * 0.6);
    expect(flood).toBeGreaterThan(0);
  });

  it('spin tick ≈ spinback seek / stronger rate', () => {
    const s = scaleJogTick(1, 340, vinylFeel);
    expect(s.playingSeekSec).toBeCloseTo(JOG_SPIN_SEEK_SEC, 5);
    expect(s.playingRateAmount).toBeCloseTo(JOG_SPIN_RATE, 5);
    expect(s.intensity).toBeGreaterThan(0.95);
  });

  it('preserves sign', () => {
    expect(scaleJogTick(-1, 50, vinylFeel).sign).toBe(-1);
    expect(scaleJogTick(1, 50, vinylFeel).sign).toBe(1);
  });

  it('playing seek ignores packed |delta| size (no second gear)', () => {
    const one = scaleJogTick(1, 8, vinylFeel).playingSeekSec;
    const pack = scaleJogTick(6, 8, vinylFeel).playingSeekSec;
    expect(pack).toBeCloseTo(one, 5);
  });

  it('respects settings overrides', () => {
    const feel = jogFeelFromSettings({
      ...defaultJogSettings,
      dualZone: false,
      fineSeekMs: 10,
      fineRatePercent: 1,
    });
    const s = scaleJogTick(1, 70, feel);
    expect(s.playingRateAmount).toBeCloseTo(0.01, 5);
  });
});

describe('gateJogPlayingSeek', () => {
  it('caps fine-zone seek inside one impulse window', () => {
    let imp = createJogImpulse();
    let total = 0;
    for (let i = 0; i < 20; i++) {
      const g = gateJogPlayingSeek(imp, 0.0002, 0, 1000 + i, vinylFeel);
      imp = g.impulse;
      total += Math.abs(g.seekSec);
    }
    expect(total).toBeCloseTo(JOG_FINE_IMPULSE_CAP_SEC, 6);
  });

  it('does not cap spin intensity', () => {
    const g = gateJogPlayingSeek(createJogImpulse(), 0.01, 0.9, 1000, vinylFeel);
    expect(g.seekSec).toBeCloseTo(0.01, 6);
  });
});

describe('updateJogActivity', () => {
  it('cold start stays at 0 t/s (fine zone)', () => {
    const a = updateJogActivity(createJogActivity(), 1, 1000);
    expect(a.ticksPerSec).toBe(0);
  });

  it('EMA rises when ticks arrive close together (soft attack)', () => {
    let a = createJogActivity();
    a = updateJogActivity(a, 1, 1000);
    a = updateJogActivity(a, 1, 1010);
    a = updateJogActivity(a, 1, 1020);
    a = updateJogActivity(a, 1, 1030);
    a = updateJogActivity(a, 1, 1040);
    expect(a.ticksPerSec).toBeGreaterThan(25);
    expect(a.ticksPerSec).toBeLessThan(90);
  });

  it('EMA falls when ticks slow down', () => {
    let a = createJogActivity();
    a = updateJogActivity(a, 1, 1000);
    a = updateJogActivity(a, 1, 1008);
    a = updateJogActivity(a, 1, 1016);
    const hot = a.ticksPerSec;
    a = updateJogActivity(a, 1, 1200);
    expect(a.ticksPerSec).toBeLessThan(hot);
  });

  it('packed |delta| does not inflate tick-rate vs ±1 at same spacing', () => {
    let a1 = createJogActivity();
    let a8 = createJogActivity();
    for (let t = 1000; t <= 1050; t += 10) {
      a1 = updateJogActivity(a1, 1, t);
      a8 = updateJogActivity(a8, 8, t);
    }
    expect(a8.ticksPerSec).toBeCloseTo(a1.ticksPerSec, 5);
  });
});
