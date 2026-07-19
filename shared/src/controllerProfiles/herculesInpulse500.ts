import type { MidiMapping } from '../ipc.js';
import type { ControllerProfile } from './types.js';

/**
 * Hercules DJControl Inpulse 500 — community partial map.
 * Source: Mixxx community herimp-500map XML. No Mixxx JS. READY FOR HW VERIFICATION.
 *
 * Note: Mixxx uses MIDI channel 2/3 (status 0x91/0x92) for decks A/B — ch index 1/2.
 */
const MAPPING: MidiMapping = {
  'deckA.play': { kind: 'button', ch: 1, note: 0x07 },
  'deckA.cue': { kind: 'button', ch: 1, note: 0x06 },
  'deckA.sync': { kind: 'button', ch: 1, note: 0x05 },
  'deckA.pfl': { kind: 'button', ch: 1, note: 0x0c },
  'deckA.load': { kind: 'button', ch: 1, note: 0x0d },
  'mixer.vinyl': { kind: 'button', ch: 1, note: 0x03 },
  'deckA.jog': { kind: 'ccRel', ch: 1, cc: 0x09 },
  'deckA.pitch': { kind: 'cc14', ch: 1, msb: 0x08, lsb: 0x28 },
  'deckA.gain': { kind: 'cc7', ch: 1, cc: 0x05 },
  'deckA.eqHigh': { kind: 'cc7', ch: 1, cc: 0x04 },
  'deckA.eqMid': { kind: 'cc7', ch: 1, cc: 0x03 },
  'deckA.eqLow': { kind: 'cc7', ch: 1, cc: 0x02 },
  'mixer.faderA': { kind: 'cc7', ch: 1, cc: 0x00 },
  'deckA.filter': { kind: 'cc7', ch: 1, cc: 0x01 },

  'deckB.play': { kind: 'button', ch: 2, note: 0x07 },
  'deckB.cue': { kind: 'button', ch: 2, note: 0x06 },
  'deckB.sync': { kind: 'button', ch: 2, note: 0x05 },
  'deckB.pfl': { kind: 'button', ch: 2, note: 0x0c },
  'deckB.load': { kind: 'button', ch: 2, note: 0x0d },
  'deckB.jog': { kind: 'ccRel', ch: 2, cc: 0x09 },
  'deckB.pitch': { kind: 'cc14', ch: 2, msb: 0x08, lsb: 0x28 },
  'deckB.gain': { kind: 'cc7', ch: 2, cc: 0x05 },
  'deckB.eqHigh': { kind: 'cc7', ch: 2, cc: 0x04 },
  'deckB.eqMid': { kind: 'cc7', ch: 2, cc: 0x03 },
  'deckB.eqLow': { kind: 'cc7', ch: 2, cc: 0x02 },
  'mixer.faderB': { kind: 'cc7', ch: 2, cc: 0x00 },
  'deckB.filter': { kind: 'cc7', ch: 2, cc: 0x01 },
};

export const HERCULES_INPULSE_500_PROFILE: ControllerProfile = {
  id: 'hercules-inpulse-500',
  name: 'Hercules DJControl Inpulse 500 (community)',
  matchPort: 'Inpulse 500|INPULSE 500|DJControl Inpulse',
  status: 'community',
  ledStyle: 'none',
  mapping: MAPPING,
  notes:
    'Partial community map from Mixxx herimp-500map. Browse is a relative encoder (not RMX2 up/down notes) — use Learn or mouse. Pads/loops/scripts unmapped. READY FOR HW VERIFICATION — never claimed [HW] PASS.',
};
