/**
 * Pure MIDI decoding: note / cc7 / cc14 pairing / ccRel (docs/04).
 * Fixture-tested — CI never needs hardware.
 */

export type MidiRaw = {
  /** status byte without channel, e.g. 0x90 */
  status: number;
  channel: number; // 0..15
  data1: number;
  data2: number;
  timeMs: number;
};

export type DecodedMidi =
  | { kind: 'noteOn'; channel: number; note: number; velocity: number }
  | { kind: 'noteOff'; channel: number; note: number }
  | { kind: 'cc7'; channel: number; cc: number; value: number }
  | { kind: 'cc14'; channel: number; msb: number; lsb: number; value14: number }
  | { kind: 'ccRel'; channel: number; cc: number; delta: number }
  | { kind: 'unknown'; status: number; channel: number; data1: number; data2: number };

const CC14_PAIR_MS = 30;

export type Cc14Pending = {
  channel: number;
  msb: number;
  valueMsb: number;
  timeMs: number;
};

export type MidiDecodeState = {
  pendingCc14: Cc14Pending | null;
};

export function createMidiDecodeState(): MidiDecodeState {
  return { pendingCc14: null };
}

/** Two's-complement relative (RMX2 jogs): v<64 → +v, else v−128. */
export function decodeCcRelDelta(value: number): number {
  return value < 64 ? value : value - 128;
}

export function normalizeMidiBytes(
  data: Uint8Array | number[],
  timeMs: number,
): MidiRaw | null {
  if (data.length < 1) return null;
  const statusFull = data[0]!;
  const status = statusFull & 0xf0;
  const channel = statusFull & 0x0f;
  if (status === 0x80 || status === 0x90 || status === 0xb0) {
    if (data.length < 3) return null;
    return {
      status,
      channel,
      data1: data[1]!,
      data2: data[2]!,
      timeMs,
    };
  }
  return {
    status: statusFull,
    channel: 0,
    data1: data[1] ?? 0,
    data2: data[2] ?? 0,
    timeMs,
  };
}

/**
 * Decode one message. For cc14, pass known LSB CC numbers (factory map).
 * If an MSB arrives, it is held ≤30 ms waiting for its LSB.
 */
export function decodeMidiMessage(
  state: MidiDecodeState,
  raw: MidiRaw,
  opts: {
    cc14Pairs: ReadonlyArray<{ msb: number; lsb: number }>;
    relativeCcs: ReadonlySet<number>;
  },
): { state: MidiDecodeState; events: DecodedMidi[] } {
  const events: DecodedMidi[] = [];
  let pending = state.pendingCc14;

  // Flush stale pending MSB as cc7
  if (pending && raw.timeMs - pending.timeMs > CC14_PAIR_MS) {
    events.push({
      kind: 'cc7',
      channel: pending.channel,
      cc: pending.msb,
      value: pending.valueMsb,
    });
    pending = null;
  }

  if (raw.status === 0x90) {
    if (raw.data2 === 0) {
      events.push({ kind: 'noteOff', channel: raw.channel, note: raw.data1 });
    } else {
      events.push({
        kind: 'noteOn',
        channel: raw.channel,
        note: raw.data1,
        velocity: raw.data2,
      });
    }
    return { state: { pendingCc14: pending }, events };
  }

  if (raw.status === 0x80) {
    events.push({ kind: 'noteOff', channel: raw.channel, note: raw.data1 });
    return { state: { pendingCc14: pending }, events };
  }

  if (raw.status === 0xb0) {
    const cc = raw.data1;
    const value = raw.data2;

    if (opts.relativeCcs.has(cc)) {
      events.push({
        kind: 'ccRel',
        channel: raw.channel,
        cc,
        delta: decodeCcRelDelta(value),
      });
      return { state: { pendingCc14: pending }, events };
    }

    const asLsb = opts.cc14Pairs.find((p) => p.lsb === cc);
    if (
      asLsb &&
      pending &&
      pending.channel === raw.channel &&
      pending.msb === asLsb.msb &&
      raw.timeMs - pending.timeMs <= CC14_PAIR_MS
    ) {
      const value14 = (pending.valueMsb << 7) | value;
      events.push({
        kind: 'cc14',
        channel: raw.channel,
        msb: asLsb.msb,
        lsb: asLsb.lsb,
        value14,
      });
      return { state: { pendingCc14: null }, events };
    }

    const asMsb = opts.cc14Pairs.find((p) => p.msb === cc);
    if (asMsb) {
      // Previous pending MSB without LSB → emit as cc7
      if (pending) {
        events.push({
          kind: 'cc7',
          channel: pending.channel,
          cc: pending.msb,
          value: pending.valueMsb,
        });
      }
      return {
        state: {
          pendingCc14: {
            channel: raw.channel,
            msb: cc,
            valueMsb: value,
            timeMs: raw.timeMs,
          },
        },
        events,
      };
    }

    events.push({ kind: 'cc7', channel: raw.channel, cc, value });
    return { state: { pendingCc14: pending }, events };
  }

  events.push({
    kind: 'unknown',
    status: raw.status,
    channel: raw.channel,
    data1: raw.data1,
    data2: raw.data2,
  });
  return { state: { pendingCc14: pending }, events };
}

/** Normalize 14-bit 0..16383 → 0..1 */
export function norm14(value14: number): number {
  return Math.min(1, Math.max(0, value14 / 16383));
}

/** Normalize 7-bit 0..127 → 0..1 */
export function norm7(value: number): number {
  return Math.min(1, Math.max(0, value / 127));
}
