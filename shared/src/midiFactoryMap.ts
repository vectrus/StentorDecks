import type { ControlId } from './controlIds.js';
import type { MidiBinding, MidiMapping } from './ipc.js';

export type { MidiBinding, MidiMapping };

/** Hex note/CC numbers from docs/04 (channel 1 → ch index 0). */
export const RMX2_FACTORY_MAP: MidiMapping = {
  'deckA.play': { kind: 'button', ch: 0, note: 0x21 },
  'deckA.cue': { kind: 'button', ch: 0, note: 0x22 },
  'deckA.sync': { kind: 'button', ch: 0, note: 0x23 },
  'deckA.load': { kind: 'button', ch: 0, note: 0x24 },
  'deckA.pfl': { kind: 'button', ch: 0, note: 0x2e },
  'deckA.rw': { kind: 'button', ch: 0, note: 0x26 },
  'deckA.ff': { kind: 'button', ch: 0, note: 0x27 },
  'deckA.pitchBendMinus': { kind: 'button', ch: 0, note: 0x2c },
  'deckA.pitchBendPlus': { kind: 'button', ch: 0, note: 0x2d },
  'deckA.killHigh': { kind: 'button', ch: 0, note: 0x28 },
  'deckA.killMid': { kind: 'button', ch: 0, note: 0x29 },
  'deckA.killLow': { kind: 'button', ch: 0, note: 0x2a },
  'deckA.jog': { kind: 'ccRel', ch: 0, cc: 0x30 },
  'deckA.pitch': { kind: 'cc14', ch: 0, msb: 0x36, lsb: 0x37 },
  'deckA.gain': { kind: 'cc7', ch: 0, cc: 0x42 },
  'deckA.eqHigh': { kind: 'cc7', ch: 0, cc: 0x3c },
  'deckA.eqMid': { kind: 'cc7', ch: 0, cc: 0x3e },
  'deckA.eqLow': { kind: 'cc7', ch: 0, cc: 0x40 },
  // FX pads — Hercules PDF + owner [HW] PASS 2026-07-18 (FX mode).
  'deckA.filterPad': { kind: 'button', ch: 0, note: 0x01 },
  'deckA.flangerPad': { kind: 'button', ch: 0, note: 0x02 },
  // FX Mode encoder — relative incremental (01…3F CW / 40…7F CCW), not absolute.
  'deckA.filter': { kind: 'ccRel', ch: 0, cc: 0x54 },

  'deckB.play': { kind: 'button', ch: 0, note: 0x32 },
  'deckB.cue': { kind: 'button', ch: 0, note: 0x33 },
  'deckB.sync': { kind: 'button', ch: 0, note: 0x34 },
  'deckB.load': { kind: 'button', ch: 0, note: 0x35 },
  'deckB.pfl': { kind: 'button', ch: 0, note: 0x3f },
  'deckB.rw': { kind: 'button', ch: 0, note: 0x37 },
  'deckB.ff': { kind: 'button', ch: 0, note: 0x38 },
  'deckB.pitchBendMinus': { kind: 'button', ch: 0, note: 0x3d },
  'deckB.pitchBendPlus': { kind: 'button', ch: 0, note: 0x3e },
  'deckB.killHigh': { kind: 'button', ch: 0, note: 0x39 },
  'deckB.killMid': { kind: 'button', ch: 0, note: 0x3a },
  'deckB.killLow': { kind: 'button', ch: 0, note: 0x3b },
  'deckB.jog': { kind: 'ccRel', ch: 0, cc: 0x31 },
  'deckB.pitch': { kind: 'cc14', ch: 0, msb: 0x38, lsb: 0x39 },
  'deckB.gain': { kind: 'cc7', ch: 0, cc: 0x52 },
  'deckB.eqHigh': { kind: 'cc7', ch: 0, cc: 0x4c },
  'deckB.eqMid': { kind: 'cc7', ch: 0, cc: 0x4e },
  'deckB.eqLow': { kind: 'cc7', ch: 0, cc: 0x50 },
  'deckB.filterPad': { kind: 'button', ch: 0, note: 0x11 },
  'deckB.flangerPad': { kind: 'button', ch: 0, note: 0x12 },
  'deckB.filter': { kind: 'ccRel', ch: 0, cc: 0x55 },

  'mixer.faderA': { kind: 'cc14', ch: 0, msb: 0x3a, lsb: 0x3b },
  'mixer.faderB': { kind: 'cc14', ch: 0, msb: 0x4a, lsb: 0x4b },
  'mixer.master': { kind: 'cc14', ch: 0, msb: 0x44, lsb: 0x45 },
  'mixer.headMix': { kind: 'cc14', ch: 0, msb: 0x46, lsb: 0x47 },
  'mixer.crossfader': { kind: 'cc14', ch: 0, msb: 0x48, lsb: 0x49 },

  'browse.up': { kind: 'button', ch: 0, note: 0x45 },
  'browse.down': { kind: 'button', ch: 0, note: 0x46 },
  'browse.left': { kind: 'button', ch: 0, note: 0x44 },
  'browse.right': { kind: 'button', ch: 0, note: 0x43 },
};

/**
 * FX pad notes — Hercules RMX2 MIDI Commands PDF + owner [HW] PASS 2026-07-18.
 * A pad1=0x01 filter, pad2=0x02 flanger; B pad1=0x11, pad2=0x12 (FX mode).
 */
export const RMX2_PAD_NOTES_STATUS = {
  source: 'Hercules RMX2_MIDI_Commands.pdf + owner HW 2026-07-18',
  status: 'HW VERIFIED',
  deckA: { filterPad: 0x01, flangerPad: 0x02 },
  deckB: { filterPad: 0x11, flangerPad: 0x12 },
} as const;

/** @deprecated use RMX2_PAD_NOTES_STATUS */
export const RMX2_PAD_NOTES_UNVERIFIED = RMX2_PAD_NOTES_STATUS;

export function factoryCc14Pairs(): Array<{ msb: number; lsb: number }> {
  const pairs: Array<{ msb: number; lsb: number }> = [];
  for (const b of Object.values(RMX2_FACTORY_MAP)) {
    if (b?.kind === 'cc14') pairs.push({ msb: b.msb, lsb: b.lsb });
  }
  return pairs;
}

export function factoryRelativeCcs(): Set<number> {
  const set = new Set<number>();
  for (const b of Object.values(RMX2_FACTORY_MAP)) {
    if (b?.kind === 'ccRel') set.add(b.cc);
  }
  // Scratch-mode jogs treated same as turn (docs/04)
  set.add(0x32);
  set.add(0x33);
  return set;
}

/**
 * Soft-migrate maps that learned FX Mode encoders as absolute cc7 (only ever
 * saw 1/127). Also fill missing filter bindings from factory.
 */
export function migrateFxEncoderBindings(mapping: MidiMapping): MidiMapping {
  const next: MidiMapping = { ...mapping };
  const fix = (id: 'deckA.filter' | 'deckB.filter', cc: number) => {
    const b = next[id];
    if (!b) {
      next[id] = { kind: 'ccRel', ch: 0, cc };
      return;
    }
    if (b.kind === 'cc7' && b.cc === cc) {
      next[id] = { kind: 'ccRel', ch: b.ch, cc };
    }
  };
  fix('deckA.filter', 0x54);
  fix('deckB.filter', 0x55);
  return next;
}

/** Step in 0..1 domain per relative delta unit (FX encoder / learned rel). */
export const FX_AMOUNT_REL_STEP = 0.01;

export function lookupControlId(
  mapping: MidiMapping,
  decoded: {
    kind: string;
    channel: number;
    note?: number;
    cc?: number;
    msb?: number;
  },
): ControlId | null {
  for (const [id, binding] of Object.entries(mapping) as [ControlId, MidiBinding][]) {
    if (!binding) continue;
    if (binding.kind === 'button' && decoded.kind.startsWith('note')) {
      if (binding.ch === decoded.channel && binding.note === decoded.note) return id;
    }
    if (binding.kind === 'cc7' && decoded.kind === 'cc7') {
      if (binding.ch === decoded.channel && binding.cc === decoded.cc) return id;
    }
    if (binding.kind === 'cc14' && decoded.kind === 'cc14') {
      if (binding.ch === decoded.channel && binding.msb === decoded.msb) return id;
    }
    if (binding.kind === 'ccRel' && decoded.kind === 'ccRel') {
      if (binding.ch === decoded.channel && binding.cc === decoded.cc) return id;
    }
  }
  return null;
}
