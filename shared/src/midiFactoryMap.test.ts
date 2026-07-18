import { describe, expect, it } from 'vitest';
import {
  RMX2_FACTORY_MAP,
  factoryRelativeCcs,
  lookupControlId,
  migrateFxEncoderBindings,
} from './midiFactoryMap.js';
import { factoryMidiMapping } from './midiMappingSchema.js';

describe('RMX2 FX Mode encoders', () => {
  it('factory maps filter amount to relative CC 54/55', () => {
    expect(RMX2_FACTORY_MAP['deckA.filter']).toEqual({
      kind: 'ccRel',
      ch: 0,
      cc: 0x54,
    });
    expect(RMX2_FACTORY_MAP['deckB.filter']).toEqual({
      kind: 'ccRel',
      ch: 0,
      cc: 0x55,
    });
    expect(factoryRelativeCcs().has(0x54)).toBe(true);
    expect(factoryRelativeCcs().has(0x55)).toBe(true);
  });

  it('factory maps wet to relative Shift+FX CC 5C/5D', () => {
    expect(RMX2_FACTORY_MAP['deckA.wet']).toEqual({
      kind: 'ccRel',
      ch: 0,
      cc: 0x5c,
    });
    expect(RMX2_FACTORY_MAP['deckB.wet']).toEqual({
      kind: 'ccRel',
      ch: 0,
      cc: 0x5d,
    });
  });

  it('aliases scratch jog CCs 32/33 to turn jogs', () => {
    const map = factoryMidiMapping();
    expect(
      lookupControlId(map, { kind: 'ccRel', channel: 0, cc: 0x32 }),
    ).toBe('deckA.jog');
    expect(
      lookupControlId(map, { kind: 'ccRel', channel: 0, cc: 0x33 }),
    ).toBe('deckB.jog');
    expect(factoryRelativeCcs().has(0x32)).toBe(true);
    expect(factoryRelativeCcs().has(0x33)).toBe(true);
  });

  it('migrates mistaken absolute cc7 learns on FX Mode CCs', () => {
    const next = migrateFxEncoderBindings({
      'deckA.filter': { kind: 'cc7', ch: 0, cc: 0x54 },
      'deckB.filter': { kind: 'cc7', ch: 0, cc: 0x55 },
      'deckA.wet': { kind: 'cc7', ch: 0, cc: 0x5c },
    });
    expect(next['deckA.filter']).toEqual({ kind: 'ccRel', ch: 0, cc: 0x54 });
    expect(next['deckB.filter']).toEqual({ kind: 'ccRel', ch: 0, cc: 0x55 });
    expect(next['deckA.wet']).toEqual({ kind: 'ccRel', ch: 0, cc: 0x5c });
    expect(next['deckB.wet']).toEqual({ kind: 'ccRel', ch: 0, cc: 0x5d });
  });
});
