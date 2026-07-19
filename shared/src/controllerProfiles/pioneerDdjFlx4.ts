import type { MidiMapping } from '../ipc.js';
import type { ControllerProfile } from './types.js';

/**
 * Pioneer / AlphaTheta DDJ-FLX4 — community partial map.
 * Sources: Pioneer MIDI message list + Mixxx Pioneer-DDJ-FLX4.midi.xml /
 * slipmate midi-ddj-flx4.md. No Mixxx JS. READY FOR HW VERIFICATION.
 */
const MAPPING: MidiMapping = {
  'deckA.play': { kind: 'button', ch: 0, note: 0x0b },
  'deckA.cue': { kind: 'button', ch: 0, note: 0x0c },
  'deckA.sync': { kind: 'button', ch: 0, note: 0x58 },
  'deckA.pfl': { kind: 'button', ch: 0, note: 0x54 },
  'deckA.load': { kind: 'button', ch: 6, note: 0x46 },
  'deckA.jog': { kind: 'ccRel', ch: 0, cc: 0x21 },
  'deckA.pitch': { kind: 'cc14', ch: 0, msb: 0x00, lsb: 0x20 },
  'deckA.gain': { kind: 'cc14', ch: 0, msb: 0x04, lsb: 0x24 },
  'deckA.eqHigh': { kind: 'cc14', ch: 0, msb: 0x07, lsb: 0x27 },
  'deckA.eqMid': { kind: 'cc14', ch: 0, msb: 0x0b, lsb: 0x2b },
  'deckA.eqLow': { kind: 'cc14', ch: 0, msb: 0x0f, lsb: 0x2f },
  'mixer.faderA': { kind: 'cc14', ch: 0, msb: 0x13, lsb: 0x33 },
  // SMART CFX → filter amount (absolute). Pad toggles via Learn.
  'deckA.filter': { kind: 'cc14', ch: 6, msb: 0x17, lsb: 0x37 },

  'deckB.play': { kind: 'button', ch: 1, note: 0x0b },
  'deckB.cue': { kind: 'button', ch: 1, note: 0x0c },
  'deckB.sync': { kind: 'button', ch: 1, note: 0x58 },
  'deckB.pfl': { kind: 'button', ch: 1, note: 0x54 },
  'deckB.load': { kind: 'button', ch: 6, note: 0x47 },
  'deckB.jog': { kind: 'ccRel', ch: 1, cc: 0x21 },
  'deckB.pitch': { kind: 'cc14', ch: 1, msb: 0x00, lsb: 0x20 },
  'deckB.gain': { kind: 'cc14', ch: 1, msb: 0x04, lsb: 0x24 },
  'deckB.eqHigh': { kind: 'cc14', ch: 1, msb: 0x07, lsb: 0x27 },
  'deckB.eqMid': { kind: 'cc14', ch: 1, msb: 0x0b, lsb: 0x2b },
  'deckB.eqLow': { kind: 'cc14', ch: 1, msb: 0x0f, lsb: 0x2f },
  'mixer.faderB': { kind: 'cc14', ch: 1, msb: 0x13, lsb: 0x33 },
  'deckB.filter': { kind: 'cc14', ch: 6, msb: 0x18, lsb: 0x38 },

  'mixer.headMix': { kind: 'cc14', ch: 6, msb: 0x0c, lsb: 0x2c },
  // Ignored by default (R2.4) but bound so Learn/steal sees it.
  'mixer.crossfader': { kind: 'cc14', ch: 6, msb: 0x1f, lsb: 0x3f },
};

export const PIONEER_DDJ_FLX4_PROFILE: ControllerProfile = {
  id: 'pioneer-ddj-flx4',
  name: 'Pioneer DDJ-FLX4 (community)',
  matchPort: 'DDJ-FLX4|FLX4',
  status: 'community',
  ledStyle: 'none',
  mapping: MAPPING,
  notes:
    'Partial community map from Pioneer MIDI list + Mixxx FLX4 XML. No pad-mode banks, stems, or Mixxx JS. Browse encoder is relative (not up/down buttons) — use Learn or mouse. READY FOR HW VERIFICATION — never claimed [HW] PASS.',
};
