import { describe, expect, it } from 'vitest';
import {
  assertNonEmptyMapping,
  factoryMidiMapping,
  findBindingConflict,
  MidiMappingParseError,
  parseMidiMappingJson,
  serializeMidiMapping,
} from './midiMappingSchema.js';

describe('midiMappingSchema (E3 persist)', () => {
  it('round-trips factory via serialize → parse', () => {
    const factory = factoryMidiMapping();
    const json = serializeMidiMapping(factory);
    const back = parseMidiMappingJson(json);
    expect(back['deckA.play']).toEqual(factory['deckA.play']);
    expect(back['deckA.pitch']).toEqual(factory['deckA.pitch']);
    expect(Object.keys(back).length).toBe(Object.keys(factory).length);
  });

  it('accepts bare mapping JSON (no version wrapper)', () => {
    const json = JSON.stringify({
      'deckA.play': { kind: 'button', ch: 0, note: 0x21 },
    });
    const map = parseMidiMappingJson(json);
    expect(map['deckA.play']).toEqual({ kind: 'button', ch: 0, note: 0x21 });
  });

  it('rejects unknown ControlId', () => {
    expect(() =>
      parseMidiMappingJson(
        JSON.stringify({ 'deckC.play': { kind: 'button', ch: 0, note: 1 } }),
      ),
    ).toThrow(MidiMappingParseError);
  });

  it('rejects invalid JSON with human message', () => {
    expect(() => parseMidiMappingJson('{')).toThrow(/valid JSON/i);
  });

  it('rejects empty mapping on assertNonEmpty', () => {
    expect(() => assertNonEmptyMapping({})).toThrow(/empty/i);
  });

  it('findBindingConflict detects steal candidate', () => {
    const map = factoryMidiMapping();
    const conflict = findBindingConflict(map, { kind: 'button', ch: 0, note: 0x21 }, 'deckB.play');
    expect(conflict).toBe('deckA.play');
  });

  it('rejects cc14 with identical msb/lsb', () => {
    expect(() =>
      parseMidiMappingJson(
        JSON.stringify({
          'deckA.pitch': { kind: 'cc14', ch: 0, msb: 0x36, lsb: 0x36 },
        }),
      ),
    ).toThrow(/MSB and LSB/i);
  });
});
