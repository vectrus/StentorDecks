/**
 * MIDI learn state machine (docs/04 / E3).
 * Pure + fixture-tested — no Web MIDI / hardware in CI.
 */

import type { ControlId } from './controlIds.js';
import type { MidiBinding, MidiMapping } from './ipc.js';
import { decodeCcRelDelta, type MidiRaw } from './midiDecode.js';
import { findBindingConflict } from './midiMappingSchema.js';

const CONTINUOUS_QUALIFY_MS = 500;
const CONTINUOUS_MIN_DISTINCT = 3;
/** Relative encoders (RMX2 FX Mode) often only emit 1 and 127 when turned slowly. */
const RELATIVE_MIN_SAMPLES = 4;

/** Controls that bind from note-on (not CC streams). */
const BUTTON_CONTROL_IDS = new Set<ControlId>([
  'deckA.play',
  'deckA.cue',
  'deckA.sync',
  'deckA.load',
  'deckA.pfl',
  'deckA.ff',
  'deckA.rw',
  'deckA.pitchBendPlus',
  'deckA.pitchBendMinus',
  'deckA.killHigh',
  'deckA.killMid',
  'deckA.killLow',
  'deckA.filterPad',
  'deckA.flangerPad',
  'deckB.play',
  'deckB.cue',
  'deckB.sync',
  'deckB.load',
  'deckB.pfl',
  'deckB.ff',
  'deckB.rw',
  'deckB.pitchBendPlus',
  'deckB.pitchBendMinus',
  'deckB.killHigh',
  'deckB.killMid',
  'deckB.killLow',
  'deckB.filterPad',
  'deckB.flangerPad',
  'mixer.vinyl',
  'browse.up',
  'browse.down',
  'browse.left',
  'browse.right',
]);

export function isButtonControl(id: ControlId): boolean {
  return BUTTON_CONTROL_IDS.has(id);
}

export type CcSample = { cc: number; value: number; timeMs: number };

export type LearnPhase =
  | { phase: 'off' }
  | { phase: 'pickControl' }
  | {
      phase: 'listen';
      controlId: ControlId;
      /** Rolling CC samples while listening for a continuous control. */
      samples: CcSample[];
    }
  | {
      phase: 'confirm';
      controlId: ControlId;
      binding: MidiBinding;
      conflict: ControlId | null;
    }
  | {
      phase: 'steal';
      controlId: ControlId;
      binding: MidiBinding;
      conflict: ControlId;
    };

export type LearnState = {
  phase: LearnPhase;
};

export type LearnCommit = {
  controlId: ControlId;
  binding: MidiBinding;
  /** Previous owner cleared when stealing. */
  stoleFrom: ControlId | null;
};

export function createLearnState(): LearnState {
  return { phase: { phase: 'off' } };
}

export function learnEnable(_state: LearnState): LearnState {
  return { phase: { phase: 'pickControl' } };
}

export function learnCancel(_state: LearnState): LearnState {
  return createLearnState();
}

export function learnSelectControl(state: LearnState, controlId: ControlId): LearnState {
  if (state.phase.phase === 'off' || state.phase.phase === 'steal') return state;
  return {
    phase: {
      phase: 'listen',
      controlId,
      samples: [],
    },
  };
}

/**
 * Feed a raw MIDI message while learning.
 * Returns updated state; may transition to confirm/steal.
 */
export function learnFeedRaw(
  state: LearnState,
  raw: MidiRaw,
  mapping: MidiMapping,
): LearnState {
  const p = state.phase;
  if (p.phase !== 'listen') return state;

  if (isButtonControl(p.controlId)) {
    if (raw.status === 0x90 && raw.data2 > 0) {
      return proposeBinding(p.controlId, {
        kind: 'button',
        ch: raw.channel,
        note: raw.data1,
      }, mapping);
    }
    return state;
  }

  // Continuous: only CC messages
  if (raw.status !== 0xb0) return state;

  const lsbSet = lsbNumbersFromMapping(mapping);
  // LSB CCs are never learned as independent controls (docs/04).
  if (lsbSet.has(raw.data1)) {
    // Still record — may pair as cc14 with MSB−1
  }

  const samples: CcSample[] = [
    ...p.samples,
    { cc: raw.data1, value: raw.data2, timeMs: raw.timeMs },
  ].filter((s) => raw.timeMs - s.timeMs <= CONTINUOUS_QUALIFY_MS);

  const binding = qualifyContinuous(samples, lsbSet, raw.channel);
  if (!binding) {
    return {
      phase: { phase: 'listen', controlId: p.controlId, samples },
    };
  }
  return proposeBinding(p.controlId, binding, mapping);
}

export function learnConfirm(state: LearnState): {
  state: LearnState;
  commit: LearnCommit | null;
} {
  const p = state.phase;
  if (p.phase === 'confirm' && p.conflict == null) {
    return {
      state: createLearnState(),
      commit: {
        controlId: p.controlId,
        binding: p.binding,
        stoleFrom: null,
      },
    };
  }
  if (p.phase === 'steal') {
    return {
      state: createLearnState(),
      commit: {
        controlId: p.controlId,
        binding: p.binding,
        stoleFrom: p.conflict,
      },
    };
  }
  // confirm with conflict → must enter steal explicitly
  if (p.phase === 'confirm' && p.conflict != null) {
    return {
      state: {
        phase: {
          phase: 'steal',
          controlId: p.controlId,
          binding: p.binding,
          conflict: p.conflict,
        },
      },
      commit: null,
    };
  }
  return { state, commit: null };
}

/** Explicit steal after conflict highlighted. */
export function learnAcceptSteal(state: LearnState): {
  state: LearnState;
  commit: LearnCommit | null;
} {
  const p = state.phase;
  if (p.phase !== 'steal') return { state, commit: null };
  return {
    state: createLearnState(),
    commit: {
      controlId: p.controlId,
      binding: p.binding,
      stoleFrom: p.conflict,
    },
  };
}

export function learnRejectSteal(state: LearnState): LearnState {
  if (state.phase.phase !== 'steal' && state.phase.phase !== 'confirm') {
    return state;
  }
  const controlId =
    state.phase.phase === 'steal' || state.phase.phase === 'confirm'
      ? state.phase.controlId
      : null;
  if (!controlId) return createLearnState();
  return {
    phase: { phase: 'listen', controlId, samples: [] },
  };
}

function proposeBinding(
  controlId: ControlId,
  binding: MidiBinding,
  mapping: MidiMapping,
): LearnState {
  const conflict = findBindingConflict(mapping, binding, controlId);
  if (conflict) {
    return {
      phase: {
        phase: 'confirm',
        controlId,
        binding,
        conflict,
      },
    };
  }
  return {
    phase: {
      phase: 'confirm',
      controlId,
      binding,
      conflict: null,
    },
  };
}

function lsbNumbersFromMapping(mapping: MidiMapping): Set<number> {
  const set = new Set<number>();
  for (const b of Object.values(mapping)) {
    if (b?.kind === 'cc14') set.add(b.lsb);
  }
  return set;
}

/**
 * RMX2 FX Mode / jog-style incremental: two's-complement deltas, no absolute park.
 * Slow turns often only produce values 1 and 127.
 */
export function looksLikeRelativeCc(values: number[]): boolean {
  if (values.length < RELATIVE_MIN_SAMPLES) return false;
  const distinct = [...new Set(values)];
  if (distinct.every((v) => v === 1 || v === 127)) return true;
  // Faster turns: only incremental magnitudes, never absolute 0-park mid-stream
  if (distinct.some((v) => v === 0)) return false;
  const deltas = values.map(decodeCcRelDelta);
  if (!deltas.every((d) => d !== 0 && Math.abs(d) <= 63)) return false;
  return distinct.length <= 20;
}

/**
 * First CC that qualifies in the 500 ms window.
 * Relative incremental (1/127) → ccRel; else ≥3 distinct → cc7 / cc14 pair.
 * Never returns a bare cc7 for a known LSB number.
 */
export function qualifyContinuous(
  samples: CcSample[],
  lsbSet: Set<number>,
  channel: number,
): MidiBinding | null {
  if (samples.length === 0) return null;
  const latest = samples[samples.length - 1]!.timeMs;
  const window = samples.filter((s) => latest - s.timeMs <= CONTINUOUS_QUALIFY_MS);

  // Group by CC
  const byCc = new Map<number, number[]>();
  for (const s of window) {
    const arr = byCc.get(s.cc) ?? [];
    arr.push(s.value);
    byCc.set(s.cc, arr);
  }

  const ccs = [...byCc.keys()].sort((a, b) => a - b);

  // Prefer relative detection (FX Mode encoder) before absolute cc7.
  for (const cc of ccs) {
    if (lsbSet.has(cc)) continue;
    const values = byCc.get(cc) ?? [];
    if (looksLikeRelativeCc(values)) {
      return { kind: 'ccRel', ch: channel, cc };
    }
  }

  // Prefer lower CC numbers (MSB before LSB) among absolute qualifiers
  const qualifiers = [...byCc.entries()]
    .filter(([_cc, values]) => {
      const distinct = new Set(values).size;
      return distinct >= CONTINUOUS_MIN_DISTINCT;
    })
    .map(([cc]) => cc)
    .sort((a, b) => a - b);

  for (const cc of qualifiers) {
    if (lsbSet.has(cc)) {
      // Known LSB alone — skip; wait for MSB or pair
      continue;
    }
    const pairLsb = cc + 1;
    const lsbValues = byCc.get(pairLsb);
    if (lsbValues && new Set(lsbValues).size >= 2) {
      return { kind: 'cc14', ch: channel, msb: cc, lsb: pairLsb };
    }
    // Do not learn a CC that only appears as +1 companion without own qualify —
    // already filtered. Standalone cc7:
    return { kind: 'cc7', ch: channel, cc };
  }

  return null;
}

/** Apply a learn commit onto a mapping (immutable). */
export function applyLearnCommit(
  mapping: MidiMapping,
  commit: LearnCommit,
): MidiMapping {
  const next: MidiMapping = { ...mapping };
  if (commit.stoleFrom) {
    delete next[commit.stoleFrom];
  }
  next[commit.controlId] = commit.binding;
  return next;
}
