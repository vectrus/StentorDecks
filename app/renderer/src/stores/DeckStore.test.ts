import { describe, expect, it } from 'vitest';
import { autoGainTrimDb, defaultSettings, type Settings } from '@stentordeck/shared';
import { DeckPlayingError, DeckStore } from './DeckStore';

describe('DeckStore load interlock & reset (R4.2 / R3.3)', () => {
  it('throws DeckPlayingError when playing', async () => {
    const deck = new DeckStore('A', () => defaultSettings);
    deck.state = 'playing';
    await expect(deck.load(new File([], 'x.wav'))).rejects.toBeInstanceOf(DeckPlayingError);
  });

  it('togglePfl only flips headphone cue — never starts play (R2.8)', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    deck.state = 'stopped';
    deck.duration = 120;
    expect(deck.pfl).toBe(false);
    deck.togglePfl();
    expect(deck.pfl).toBe(true);
    expect(deck.state).toBe('stopped');
    deck.togglePfl();
    expect(deck.pfl).toBe(false);
    expect(deck.state).toBe('stopped');
  });

  it('resetOnLoad clears FX, kills, sync, cue, nudge, PFL', () => {
    const deck = new DeckStore('B', () => defaultSettings);
    deck.filterOn = true;
    deck.filterAmount = 0.1;
    deck.flangerOn = true;
    deck.flangerWet = 0.8;
    deck.kills = { low: true, mid: true, high: true };
    deck.nudgeFactor = 1.02;
    deck.syncArmed = true;
    deck.cueOffset = 12;
    deck.cuePreviewing = true;
    deck.pfl = true;
    deck.pitchPos = 0.7;
    deck.trimDb = 4;

    deck.resetOnLoad();

    expect(deck.filterOn).toBe(false);
    expect(deck.filterAmount).toBe(0.5);
    expect(deck.flangerOn).toBe(false);
    expect(deck.flangerWet).toBe(0);
    expect(deck.kills).toEqual({ low: false, mid: false, high: false });
    expect(deck.nudgeFactor).toBe(1);
    expect(deck.syncArmed).toBe(false);
    expect(deck.cueOffset).toBe(0);
    expect(deck.cuePreviewing).toBe(false);
    expect(deck.pfl).toBe(false);
    expect(deck.pitchPos).toBe(0.7); // pitch kept
  });

  it('applyAutoGain sets trim from loudness toward target (R2.13)', () => {
    const settings: Settings = {
      ...defaultSettings,
      audio: { ...defaultSettings.audio, autoGain: true, autoGainTargetLufs: -14 },
    };
    const deck = new DeckStore('A', () => settings);
    deck.loudnessLufs = -8;
    deck.applyAutoGain();
    expect(deck.trimDb).toBeCloseTo(autoGainTrimDb(-8, -14), 5);
  });

  it('applyAutoGain zeros trim when auto-gain disabled', () => {
    const settings: Settings = {
      ...defaultSettings,
      audio: { ...defaultSettings.audio, autoGain: false },
    };
    const deck = new DeckStore('A', () => settings);
    deck.loudnessLufs = -8;
    deck.trimDb = 3;
    deck.applyAutoGain();
    expect(deck.trimDb).toBe(0);
  });

  it('toggleSync matches pitch without file BPM and latches on/off', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    const other = new DeckStore('B', () => defaultSettings);
    deck.state = 'stopped';
    other.state = 'stopped';
    other.pitchPos = 1;
    deck.toggleSync(other);
    expect(deck.syncArmed).toBe(true);
    expect(deck.syncMode).toBe('pitchPercent');
    expect(deck.pitchPos).toBe(1);
    expect(deck.effectiveRate).toBeCloseTo(other.effectiveRate, 5);
    expect(deck.syncStatusLine).toMatch(/File BPM/i);
    deck.toggleSync(other);
    expect(deck.syncArmed).toBe(false);
    expect(deck.syncMode).toBe('off');
  });

  it('toggleSync matches effective BPM when both have file BPM', () => {
    // ±8% range: 128 → max ~138.2; use 132 so target is reachable
    const deck = new DeckStore('A', () => defaultSettings);
    const other = new DeckStore('B', () => defaultSettings);
    deck.state = 'stopped';
    other.state = 'stopped';
    deck.fileBpm = 128;
    other.fileBpm = 132;
    deck.beatGridOffsetSec = 0;
    other.beatGridOffsetSec = 0;
    other.pitchPos = 0.5; // effective 132
    deck.toggleSync(other);
    expect(deck.syncArmed).toBe(true);
    expect(deck.syncMode).toBe('bpm');
    expect(deck.effectiveBpm).toBeCloseTo(132, 1);
    expect(deck.syncStatusLine).toMatch(/BPM \+ grid snap \+ soft phase/i);
  });

  it('toggleSync one-shot phase snap aligns beat phase on beatgrid (R2.3)', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    const other = new DeckStore('B', () => defaultSettings);
    deck.state = 'stopped';
    other.state = 'stopped';
    deck.duration = 120;
    other.duration = 120;
    deck.fileBpm = 120;
    other.fileBpm = 120;
    deck.beatGridOffsetSec = 0;
    other.beatGridOffsetSec = 0;
    other.pitchPos = 0.5;
    // 120 BPM → 0.5 s period; phases 0.1 vs 0.3 → snap +0.2
    deck.position = 10.1;
    other.position = 4.3;
    deck.toggleSync(other);
    expect(deck.syncMode).toBe('bpm');
    expect(deck.syncHasGrid).toBe(true);
    expect(deck.position).toBeCloseTo(10.3, 5);
  });

  it('toggleSync skips phase snap when beatgrid missing', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    const other = new DeckStore('B', () => defaultSettings);
    deck.state = 'stopped';
    other.state = 'stopped';
    deck.duration = 120;
    other.duration = 120;
    deck.fileBpm = 120;
    other.fileBpm = 120;
    deck.beatGridOffsetSec = null;
    other.beatGridOffsetSec = 0.1;
    other.pitchPos = 0.5;
    deck.position = 10.1;
    other.position = 4.3;
    deck.toggleSync(other);
    expect(deck.syncArmed).toBe(true);
    expect(deck.syncHasGrid).toBe(false);
    expect(deck.position).toBeCloseTo(10.1, 5);
    expect(deck.syncStatusLine).toMatch(/no beatgrid/i);
  });

  it('toggleSync aligns phases across different grid offsets', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    const other = new DeckStore('B', () => defaultSettings);
    deck.state = 'stopped';
    other.state = 'stopped';
    deck.duration = 120;
    other.duration = 120;
    deck.fileBpm = 120;
    other.fileBpm = 120;
    deck.beatGridOffsetSec = 1.0;
    other.beatGridOffsetSec = 0.2;
    other.pitchPos = 0.5;
    // Both on beat 0 of their grids → no seek
    deck.position = 1.0;
    other.position = 0.2;
    deck.toggleSync(other);
    expect(deck.syncHasGrid).toBe(true);
    expect(deck.position).toBeCloseTo(1.0, 5);
  });

  it('toggleSync off starts phase glue holding current offset', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    const other = new DeckStore('B', () => defaultSettings);
    deck.state = 'playing';
    other.state = 'playing';
    deck.duration = 120;
    other.duration = 120;
    deck.fileBpm = 120;
    other.fileBpm = 120;
    deck.beatGridOffsetSec = 0;
    other.beatGridOffsetSec = 0;
    other.pitchPos = 0.5;
    deck.position = 10.0;
    other.position = 4.0;
    deck.toggleSync(other);
    expect(deck.syncArmed).toBe(true);
    deck.position = 10.05; // slight musical offset while still "synced"
    other.position = 4.0;
    deck.toggleSync(other); // release → glue
    expect(deck.syncArmed).toBe(false);
    expect(deck.phaseGluePartner).toBe('B');
    expect(deck.phaseGlueTargetSec).not.toBeNull();
    expect(deck.syncStatusLine).toMatch(/phase glue/i);
  });

  it('nudge while playing micro-seeks and mutes assist (fine zone)', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    deck.state = 'playing';
    deck.duration = 120;
    deck.position = 10;
    deck.phaseGluePartner = 'B';
    deck.phaseGlueTargetSec = 0;
    deck.nudge(1);
    expect(deck.position).toBeGreaterThan(10);
    expect(deck.position).toBeLessThan(10.001); // cold EMA → fine ~0.15 ms
    expect(deck.nudgeFactor).toBeCloseTo(1.0003, 5);
    expect(deck.phaseGlueRetarget).toBe(true);
    expect(deck.phaseAssistMuteUntil).toBeGreaterThan(0);
  });

  it('nudge with high tick-rate EMA opens spin zone', () => {
    const deck = new DeckStore('A', () => defaultSettings);
    deck.state = 'playing';
    deck.duration = 120;
    deck.position = 10;
    // Pretend the wheel is already spinning hard (dual-zone open).
    (deck as unknown as { jogActivity: { lastTickMs: number; ticksPerSec: number } }).jogActivity = {
      lastTickMs: 1000,
      ticksPerSec: 320,
    };
    deck.nudge(-1);
    expect(deck.position).toBeLessThan(10 - 0.008); // spin seek ~12 ms
    expect(deck.nudgeFactor).toBeLessThan(0.97); // ~−4 % temp rate
  });

  it('toggleSync is mutually exclusive — Sync A clears Sync B', () => {
    const a = new DeckStore('A', () => defaultSettings);
    const b = new DeckStore('B', () => defaultSettings);
    a.state = 'stopped';
    b.state = 'stopped';
    a.fileBpm = 128;
    b.fileBpm = 128;
    a.toggleSync(b);
    expect(a.syncArmed).toBe(true);
    expect(b.syncArmed).toBe(false);
    b.toggleSync(a);
    expect(b.syncArmed).toBe(true);
    expect(a.syncArmed).toBe(false);
  });

  it('applySyncTo follows pitch-only BPM (ignores partner nudge)', () => {
    const slave = new DeckStore('A', () => defaultSettings);
    const master = new DeckStore('B', () => defaultSettings);
    slave.state = 'stopped';
    master.state = 'stopped';
    slave.fileBpm = 128;
    master.fileBpm = 128;
    master.pitchPos = 0.5;
    master.nudgeFactor = 1.02;
    slave.toggleSync(master);
    expect(slave.syncArmed).toBe(true);
    // Slave matches pitch fader (~128), not nudged effective (~130.6)
    expect(slave.pitchOnlyBpm).toBeCloseTo(128, 1);
    expect(slave.effectiveBpm).toBeCloseTo(128, 1);
  });

  it('manual trim sticks until next applyAutoGain/load reset cycle', () => {
    const settings: Settings = {
      ...defaultSettings,
      audio: { ...defaultSettings.audio, autoGain: true, autoGainTargetLufs: -14 },
    };
    const deck = new DeckStore('A', () => settings);
    deck.loudnessLufs = -20;
    deck.applyAutoGain();
    const auto = deck.trimDb;
    deck.setTrimDb(auto + 2);
    expect(deck.trimDb).toBeCloseTo(auto + 2, 5);
    // Next load path: reset then auto-gain again
    deck.resetOnLoad({ loudnessLufs: -20 });
    deck.loudnessLufs = -20;
    deck.applyAutoGain();
    expect(deck.trimDb).toBeCloseTo(autoGainTrimDb(-20, -14), 5);
  });
});
