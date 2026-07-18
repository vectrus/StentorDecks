import { describe, expect, it } from 'vitest';
import { RMX2_FACTORY_MAP } from './midiFactoryMap.js';
import {
  applyLearnCommit,
  createLearnState,
  learnAcceptSteal,
  learnCancel,
  learnConfirm,
  learnEnable,
  learnFeedRaw,
  learnRejectSteal,
  learnSelectControl,
  qualifyContinuous,
} from './midiLearn.js';
import type { MidiRaw } from './midiDecode.js';

function cc(ch: number, ccNum: number, value: number, timeMs: number): MidiRaw {
  return { status: 0xb0, channel: ch, data1: ccNum, data2: value, timeMs };
}

function noteOn(ch: number, note: number, vel: number, timeMs: number): MidiRaw {
  return { status: 0x90, channel: ch, data1: note, data2: vel, timeMs };
}

describe('midiLearn (E3)', () => {
  it('binds a button from note-on and confirms without conflict on free note', () => {
    let s = learnEnable(createLearnState());
    s = learnSelectControl(s, 'browse.up');
    // 0x50 is unused by factory (pads now own 0x01/0x02)
    s = learnFeedRaw(s, noteOn(0, 0x50, 127, 0), RMX2_FACTORY_MAP);
    expect(s.phase.phase).toBe('confirm');
    if (s.phase.phase !== 'confirm') return;
    expect(s.phase.binding).toEqual({ kind: 'button', ch: 0, note: 0x50 });
    expect(s.phase.conflict).toBeNull();
    const { commit } = learnConfirm(s);
    expect(commit?.controlId).toBe('browse.up');
  });

  it('enters steal flow when binding already owned', () => {
    let s = learnEnable(createLearnState());
    s = learnSelectControl(s, 'deckB.play');
    // Factory deckA.play is note 0x21
    s = learnFeedRaw(s, noteOn(0, 0x21, 127, 0), RMX2_FACTORY_MAP);
    expect(s.phase.phase).toBe('confirm');
    if (s.phase.phase !== 'confirm') return;
    expect(s.phase.conflict).toBe('deckA.play');
    const stepped = learnConfirm(s);
    expect(stepped.commit).toBeNull();
    expect(stepped.state.phase.phase).toBe('steal');
    const stolen = learnAcceptSteal(stepped.state);
    expect(stolen.commit?.stoleFrom).toBe('deckA.play');
    const next = applyLearnCommit(RMX2_FACTORY_MAP, stolen.commit!);
    expect(next['deckB.play']).toEqual({ kind: 'button', ch: 0, note: 0x21 });
    expect(next['deckA.play']).toBeUndefined();
  });

  it('qualifies continuous CC with ≥3 distinct values in 500 ms as cc7', () => {
    const samples = [
      { cc: 0x10, value: 10, timeMs: 0 },
      { cc: 0x10, value: 20, timeMs: 50 },
      { cc: 0x10, value: 30, timeMs: 100 },
    ];
    expect(qualifyContinuous(samples, new Set(), 0)).toEqual({
      kind: 'cc7',
      ch: 0,
      cc: 0x10,
    });
  });

  it('detects cc14 when MSB qualifies and LSB+1 tracks', () => {
    const samples = [
      { cc: 0x36, value: 10, timeMs: 0 },
      { cc: 0x37, value: 1, timeMs: 5 },
      { cc: 0x36, value: 40, timeMs: 40 },
      { cc: 0x37, value: 2, timeMs: 45 },
      { cc: 0x36, value: 80, timeMs: 80 },
      { cc: 0x37, value: 3, timeMs: 85 },
    ];
    expect(qualifyContinuous(samples, new Set([0x37]), 0)).toEqual({
      kind: 'cc14',
      ch: 0,
      msb: 0x36,
      lsb: 0x37,
    });
  });

  it('never learns a known LSB as standalone cc7', () => {
    const samples = [
      { cc: 0x37, value: 10, timeMs: 0 },
      { cc: 0x37, value: 20, timeMs: 50 },
      { cc: 0x37, value: 30, timeMs: 100 },
    ];
    expect(qualifyContinuous(samples, new Set([0x37]), 0)).toBeNull();
  });

  it('learns wet from a spare CC stream via feedRaw', () => {
    let s = learnEnable(createLearnState());
    s = learnSelectControl(s, 'deckA.wet');
    const map = { ...RMX2_FACTORY_MAP };
    s = learnFeedRaw(s, cc(0, 0x11, 10, 0), map);
    s = learnFeedRaw(s, cc(0, 0x11, 40, 100), map);
    s = learnFeedRaw(s, cc(0, 0x11, 90, 200), map);
    expect(s.phase.phase).toBe('confirm');
    if (s.phase.phase !== 'confirm') return;
    expect(s.phase.binding).toEqual({ kind: 'cc7', ch: 0, cc: 0x11 });
  });

  it('Esc cancel returns to off', () => {
    let s = learnEnable(createLearnState());
    s = learnSelectControl(s, 'deckA.filter');
    s = learnCancel(s);
    expect(s.phase.phase).toBe('off');
  });

  it('reject steal returns to listen', () => {
    let s = learnEnable(createLearnState());
    s = learnSelectControl(s, 'deckB.play');
    s = learnFeedRaw(s, noteOn(0, 0x21, 127, 0), RMX2_FACTORY_MAP);
    const stepped = learnConfirm(s);
    s = learnRejectSteal(stepped.state);
    expect(s.phase.phase).toBe('listen');
  });
});
