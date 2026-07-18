import { describe, expect, it } from 'vitest';
import {
  createJogActivity,
  createJogImpulse,
  defaultJogSettings,
  dualZoneSoftJogSettings,
  fineFloodGain,
  gateJogPlayingSeek,
  jogFeelFromSettings,
  jogNudgeIntensity,
  jogSpinIntensity,
  scaleJogTick,
  updateJogActivity,
  JOG_FINE_IMPULSE_CAP_SEC,
  JOG_FINE_SEEK_SEC,
  JOG_FINE_RATE,
  JOG_NUDGE_CHUNK_SEC,
  JOG_NUDGE_IMPULSE_CAP_SEC,
  JOG_RIDE_RATE,
  JOG_SPIN_SEEK_SEC,
  JOG_SPIN_RATE,
} from './jogFeel.js';

const softFeel = jogFeelFromSettings(defaultJogSettings);
const vinylFeel = jogFeelFromSettings(dualZoneSoftJogSettings);

describe('Soft ride vs nudge chunk', () => {
  it('slow rim is ride-only (rate, no chunk)', () => {
    const s = scaleJogTick(1, 10, softFeel);
    expect(s.playingRateAmount).toBeCloseTo(JOG_RIDE_RATE, 5);
    expect(s.playingSeekSec).toBeLessThan(0.0002);
    expect(s.intensity).toBeLessThan(0.1);
  });

  it('fast rim opens sticky nudge chunk and fades ride', () => {
    const s = scaleJogTick(1, 100, softFeel);
    expect(s.intensity).toBeGreaterThan(0.9);
    expect(s.playingSeekSec).toBeCloseTo(JOG_NUDGE_CHUNK_SEC, 5);
    expect(s.playingRateAmount).toBeLessThan(JOG_RIDE_RATE * 0.3);
  });

  it('nudge intensity is smooth between thresholds', () => {
    const mid = jogNudgeIntensity(66, softFeel);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.9);
  });

  it('Soft impulse cap allows a meaningful chunk, not sub-ms dust', () => {
    expect(softFeel.fineImpulseCapSec).toBeCloseTo(JOG_NUDGE_IMPULSE_CAP_SEC, 6);
    let imp = createJogImpulse();
    let total = 0;
    for (let i = 0; i < 8; i++) {
      const g = gateJogPlayingSeek(imp, 0.003, 0.5, 1000 + i * 5, softFeel);
      imp = g.impulse;
      total += Math.abs(g.seekSec);
    }
    expect(total).toBeCloseTo(JOG_NUDGE_IMPULSE_CAP_SEC, 5);
  });
});

describe('jogSpinIntensity (Vinyl)', () => {
  it('stays off in Soft even at high tick rate', () => {
    expect(jogSpinIntensity(1, 200, softFeel)).toBe(0);
  });

  it('opens spin at high tick rate when dual-zone', () => {
    expect(jogSpinIntensity(1, 220, vinylFeel)).toBeGreaterThan(0.4);
    expect(jogSpinIntensity(1, 340, vinylFeel)).toBeGreaterThan(0.95);
  });

  it('does not open spin from packed |delta| alone', () => {
    expect(jogSpinIntensity(12, 5, vinylFeel)).toBeLessThan(0.05);
  });
});

describe('scaleJogTick (Vinyl dual)', () => {
  it('fine tick is quiet sticky seek with ~0 rate', () => {
    const s = scaleJogTick(1, 8, vinylFeel);
    const flood = fineFloodGain(8, s.intensity);
    expect(s.playingSeekSec).toBeCloseTo(JOG_FINE_SEEK_SEC * flood, 5);
    expect(s.playingRateAmount).toBeCloseTo(JOG_FINE_RATE, 5);
  });

  it('spin tick ≈ spinback seek / stronger rate', () => {
    const s = scaleJogTick(1, 340, vinylFeel);
    expect(s.playingSeekSec).toBeCloseTo(JOG_SPIN_SEEK_SEC, 5);
    expect(s.playingRateAmount).toBeCloseTo(JOG_SPIN_RATE, 5);
  });
});

describe('gateJogPlayingSeek', () => {
  it('caps Vinyl fine-zone seek inside one impulse window', () => {
    let imp = createJogImpulse();
    let total = 0;
    for (let i = 0; i < 20; i++) {
      const g = gateJogPlayingSeek(imp, 0.0002, 0, 1000 + i, vinylFeel);
      imp = g.impulse;
      total += Math.abs(g.seekSec);
    }
    expect(total).toBeCloseTo(JOG_FINE_IMPULSE_CAP_SEC, 6);
  });

  it('does not cap Vinyl spin intensity', () => {
    const g = gateJogPlayingSeek(createJogImpulse(), 0.01, 0.9, 1000, vinylFeel);
    expect(g.seekSec).toBeCloseTo(0.01, 6);
  });
});

describe('updateJogActivity', () => {
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
