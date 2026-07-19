import { describe, expect, it } from 'vitest';
import { RMX2_FACTORY_MAP } from '../midiFactoryMap.js';
import {
  CONTROLLER_PROFILES,
  getControllerProfile,
  parseControllerProfile,
  profileMatchesPort,
  suggestControllerProfile,
} from './index.js';

const CORE_IDS = [
  'deckA.play',
  'deckA.cue',
  'deckA.sync',
  'deckA.load',
  'deckB.play',
  'deckB.cue',
  'deckB.sync',
  'deckB.load',
  'mixer.faderA',
  'mixer.faderB',
] as const;

describe('controller profiles (RMX2 locked)', () => {
  it('ships rmx2 first as factory', () => {
    expect(CONTROLLER_PROFILES[0]?.id).toBe('rmx2');
    expect(CONTROLLER_PROFILES[0]?.status).toBe('factory');
    expect(CONTROLLER_PROFILES[0]?.ledStyle).toBe('hercules-note');
  });

  it('keeps RMX2 factory mapping byte-identical to RMX2_FACTORY_MAP', () => {
    const rmx2 = getControllerProfile('rmx2');
    expect(rmx2).toBeDefined();
    expect(rmx2!.mapping).toEqual(RMX2_FACTORY_MAP);
  });

  it('validates every shipped profile', () => {
    for (const p of CONTROLLER_PROFILES) {
      expect(() => parseControllerProfile(p)).not.toThrow();
      for (const id of CORE_IDS) {
        expect(p.mapping[id], `${p.id} missing ${id}`).toBeDefined();
      }
      // No cc14 with identical MSB/LSB
      for (const [id, b] of Object.entries(p.mapping)) {
        if (b?.kind === 'cc14') {
          expect(b.msb, `${p.id} ${id}`).not.toBe(b.lsb);
        }
      }
    }
  });

  it('community profiles never use hercules-note LEDs', () => {
    for (const p of CONTROLLER_PROFILES) {
      if (p.status === 'community') {
        expect(p.ledStyle).toBe('none');
      }
    }
  });

  it('rejects second factory profile', () => {
    expect(() =>
      parseControllerProfile({
        id: 'fake-factory',
        name: 'Fake',
        matchPort: 'FAKE',
        status: 'factory',
        ledStyle: 'hercules-note',
        mapping: { 'deckA.play': { kind: 'button', ch: 0, note: 1 } },
        notes: '',
      }),
    ).toThrow(/Only profile id “rmx2”/);
  });

  it('matchPort helper does not imply auto-apply', () => {
    expect(profileMatchesPort(getControllerProfile('rmx2')!, 'Hercules DJConsole RMX2')).toBe(
      true,
    );
    expect(profileMatchesPort(getControllerProfile('pioneer-ddj-flx4')!, 'DDJ-FLX4')).toBe(true);
    expect(profileMatchesPort(getControllerProfile('hercules-inpulse-500')!, 'Inpulse 500')).toBe(
      true,
    );
    // Suggest is opt-in UI only — still returns a match without applying.
    expect(suggestControllerProfile('Pioneer DDJ-FLX4')?.id).toBe('pioneer-ddj-flx4');
    expect(suggestControllerProfile(null)).toBeUndefined();
  });

  it('does not auto-mutate factory when suggesting non-RMX ports', () => {
    const before = structuredClone(RMX2_FACTORY_MAP);
    suggestControllerProfile('DDJ-FLX4');
    suggestControllerProfile('Inpulse 500');
    expect(RMX2_FACTORY_MAP).toEqual(before);
    expect(getControllerProfile('rmx2')!.mapping).toEqual(before);
  });
});
