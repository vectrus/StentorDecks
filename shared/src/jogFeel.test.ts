import { describe, expect, it } from 'vitest';
import {
  createJogActivity,
  createJogImpulse,
  defaultJogSettings,
  fineFloodGain,
  fineSeekBlend,
  gateJogPlayingSeek,
  jogFeelFromSettings,
  jogSpinIntensity,
  scaleJogTick,
  updateJogActivity,
  JOG_FINE_IMPULSE_CAP_SEC,
  JOG_FINE_RATE,
  JOG_PLATTER_DIAMETER_SCALE,
  JOG_SPIN_SEEK_SEC,
  JOG_SPIN_RATE,
} from './jogFeel.js';

const defaultFeel = jogFeelFromSettings(defaultJogSettings);

describe('jogSpinIntensity', () => {
  it('stays in the fine zone for slow ±1 ticks', () => {
    expect(jogSpinIntensity(1, 10, defaultFeel)).toBeLessThan(0.15);
  });

  it('stays fine through a typical RMX2 fingertip flood (~80 t/s)', () => {
    expect(jogSpinIntensity(1, 80, defaultFeel)).toBeLessThan(0.1);
  });

  it('opens the spin zone at high tick rate', () => {
    expect(jogSpinIntensity(1, 240, defaultFeel)).toBeGreaterThan(0.4);
    expect(jogSpinIntensity(1, 360, defaultFeel)).toBeGreaterThan(0.95);
  });

  it('ignores small packed |delta|; opens only on large packs', () => {
    expect(jogSpinIntensity(4, 5, defaultFeel)).toBeLessThan(0.15);
    expect(jogSpinIntensity(12, 5, defaultFeel)).toBeGreaterThan(0.9);
  });

  it('stays fine when dualZone is off', () => {
    const fineOnly = jogFeelFromSettings({ ...defaultJogSettings, dualZone: false });
    expect(jogSpinIntensity(1, 200, fineOnly)).toBe(0);
    expect(jogSpinIntensity(8, 5, fineOnly)).toBe(0);
  });
});

describe('fineSeekBlend (small heavy wheel)', () => {
  it('kills sticky seek on a steady light turn (rate-primary)', () => {
    expect(fineSeekBlend(80, 0)).toBeLessThan(0.02);
  });

  it('allows only a tiny fraction on a short burst', () => {
    const burst = fineSeekBlend(8, 0);
    expect(burst).toBeGreaterThan(0);
    expect(burst).toBeLessThanOrEqual(0.25 * JOG_PLATTER_DIAMETER_SCALE + 1e-9);
  });
});

describe('scaleJogTick', () => {
  it('fine steady turn: near-zero seek, gentle rate for smooth crawl', () => {
    const s = scaleJogTick(1, 80, defaultFeel);
    expect(s.playingSeekSec).toBeLessThan(0.00001);
    expect(s.playingRateAmount).toBeGreaterThan(0);
    expect(s.playingRateAmount).toBeLessThan(JOG_FINE_RATE);
    expect(s.intensity).toBeLessThan(0.2);
  });

  it('short burst seek is far smaller than a vinyl-style push', () => {
    const s = scaleJogTick(1, 8, defaultFeel);
    expect(s.playingSeekSec).toBeLessThan(0.00002);
    expect(s.playingRateAmount).toBeCloseTo(
      JOG_FINE_RATE *
        (JOG_PLATTER_DIAMETER_SCALE + (1 - JOG_PLATTER_DIAMETER_SCALE) * 0.55),
      5,
    );
  });

  it('spin tick ≈ spinback seek / stronger rate', () => {
    const s = scaleJogTick(1, 360, defaultFeel);
    expect(s.playingSeekSec).toBeCloseTo(JOG_SPIN_SEEK_SEC, 5);
    expect(s.playingRateAmount).toBeCloseTo(JOG_SPIN_RATE, 5);
    expect(s.intensity).toBeGreaterThan(0.95);
  });

  it('preserves sign', () => {
    expect(scaleJogTick(-1, 50, defaultFeel).sign).toBe(-1);
    expect(scaleJogTick(1, 50, defaultFeel).sign).toBe(1);
  });

  it('respects settings overrides', () => {
    const feel = jogFeelFromSettings({
      ...defaultJogSettings,
      dualZone: false,
      fineSeekMs: 10,
      fineRatePercent: 1,
    });
    const s = scaleJogTick(1, 8, feel);
    const flood = fineFloodGain(8, 0);
    const blend = fineSeekBlend(8, 0);
    expect(s.playingSeekSec).toBeCloseTo(0.01 * flood * blend, 5);
  });
});

describe('gateJogPlayingSeek', () => {
  it('caps fine-zone seek inside one impulse window', () => {
    let imp = createJogImpulse();
    let total = 0;
    for (let i = 0; i < 20; i++) {
      const g = gateJogPlayingSeek(imp, 0.0002, 0, 1000 + i, defaultFeel);
      imp = g.impulse;
      total += Math.abs(g.seekSec);
    }
    expect(total).toBeCloseTo(JOG_FINE_IMPULSE_CAP_SEC, 6);
  });

  it('does not cap spin intensity', () => {
    const g = gateJogPlayingSeek(createJogImpulse(), 0.01, 0.9, 1000, defaultFeel);
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
    // Soft attack — a short burst must not instantly claim 100 t/s.
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
});
