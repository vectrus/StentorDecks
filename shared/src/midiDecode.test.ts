import { describe, expect, it } from 'vitest';
import {
  createMidiDecodeState,
  decodeCcRelDelta,
  decodeMidiMessage,
  normalizeMidiBytes,
  norm14,
} from './midiDecode.js';
import { factoryCc14Pairs, factoryRelativeCcs } from './midiFactoryMap.js';

const opts = {
  cc14Pairs: factoryCc14Pairs(),
  relativeCcs: factoryRelativeCcs(),
};

describe('midiDecode', () => {
  it('decodes note on/off', () => {
    let state = createMidiDecodeState();
    const on = normalizeMidiBytes([0x90, 0x21, 0x7f], 0)!;
    let r = decodeMidiMessage(state, on, opts);
    expect(r.events[0]).toEqual({
      kind: 'noteOn',
      channel: 0,
      note: 0x21,
      velocity: 0x7f,
    });
    state = r.state;
    const off = normalizeMidiBytes([0x80, 0x21, 0x00], 1)!;
    r = decodeMidiMessage(state, off, opts);
    expect(r.events[0]).toEqual({ kind: 'noteOff', channel: 0, note: 0x21 });
  });

  it('assembles cc14 within 30 ms (pitch A 36/37)', () => {
    let state = createMidiDecodeState();
    const msb = normalizeMidiBytes([0xb0, 0x36, 0x40], 100)!;
    let r = decodeMidiMessage(state, msb, opts);
    expect(r.events).toHaveLength(0);
    state = r.state;
    const lsb = normalizeMidiBytes([0xb0, 0x37, 0x20], 110)!;
    r = decodeMidiMessage(state, lsb, opts);
    expect(r.events[0]).toMatchObject({
      kind: 'cc14',
      msb: 0x36,
      lsb: 0x37,
      value14: (0x40 << 7) | 0x20,
    });
    expect(norm14((0x40 << 7) | 0x20)).toBeGreaterThan(0.5);
  });

  it('flushes MSB as cc7 after pairing window', () => {
    let state = createMidiDecodeState();
    const msb = normalizeMidiBytes([0xb0, 0x36, 0x10], 0)!;
    let r = decodeMidiMessage(state, msb, opts);
    state = r.state;
    const later = normalizeMidiBytes([0xb0, 0x42, 0x40], 40)!; // gain, after 30ms
    r = decodeMidiMessage(state, later, opts);
    expect(r.events.some((e) => e.kind === 'cc7' && e.cc === 0x36)).toBe(true);
    expect(r.events.some((e) => e.kind === 'cc7' && e.cc === 0x42)).toBe(true);
  });

  it('decodes relative jog two\'s complement', () => {
    expect(decodeCcRelDelta(1)).toBe(1);
    expect(decodeCcRelDelta(63)).toBe(63);
    expect(decodeCcRelDelta(64)).toBe(-64);
    expect(decodeCcRelDelta(127)).toBe(-1);

    const state = createMidiDecodeState();
    const jog = normalizeMidiBytes([0xb0, 0x30, 127], 0)!;
    const r = decodeMidiMessage(state, jog, opts);
    expect(r.events[0]).toEqual({ kind: 'ccRel', channel: 0, cc: 0x30, delta: -1 });
  });

  it('counts unknown status as unknown', () => {
    const state = createMidiDecodeState();
    const raw = normalizeMidiBytes([0xf0, 0x00, 0x00], 0)!;
    const r = decodeMidiMessage(state, raw, opts);
    expect(r.events[0]?.kind).toBe('unknown');
  });
});
