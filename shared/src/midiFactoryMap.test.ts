import { describe, expect, it } from 'vitest';
import {
  RMX2_FACTORY_MAP,
  factoryRelativeCcs,
  migrateFxEncoderBindings,
} from './midiFactoryMap.js';

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

  it('migrates mistaken absolute cc7 learns on FX Mode CCs', () => {
    const next = migrateFxEncoderBindings({
      'deckA.filter': { kind: 'cc7', ch: 0, cc: 0x54 },
      'deckB.filter': { kind: 'cc7', ch: 0, cc: 0x55 },
    });
    expect(next['deckA.filter']).toEqual({ kind: 'ccRel', ch: 0, cc: 0x54 });
    expect(next['deckB.filter']).toEqual({ kind: 'ccRel', ch: 0, cc: 0x55 });
  });
});
