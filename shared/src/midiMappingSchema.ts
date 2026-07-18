import { z } from 'zod';
import { isControlId, type ControlId } from './controlIds.js';
import type { MidiBinding, MidiMapping } from './ipc.js';
import { RMX2_FACTORY_MAP } from './midiFactoryMap.js';

const chSchema = z.number().int().min(0).max(15);
const data7Schema = z.number().int().min(0).max(127);

export const midiBindingSchema: z.ZodType<MidiBinding> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('button'), ch: chSchema, note: data7Schema }),
  z.object({ kind: z.literal('cc7'), ch: chSchema, cc: data7Schema }),
  z.object({
    kind: z.literal('cc14'),
    ch: chSchema,
    msb: data7Schema,
    lsb: data7Schema,
  }),
  z.object({ kind: z.literal('ccRel'), ch: chSchema, cc: data7Schema }),
]);

const midiMappingObjectSchema = z.record(z.string(), midiBindingSchema);

const midiMappingExportSchema = z.union([
  midiMappingObjectSchema,
  z.object({
    version: z.literal(1),
    mapping: midiMappingObjectSchema,
  }),
]);

export class MidiMappingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MidiMappingParseError';
  }
}

/** Validate and normalize a mapping object (unknown ControlIds rejected). */
export function parseMidiMapping(raw: unknown): MidiMapping {
  const parsed = midiMappingObjectSchema.safeParse(raw);
  if (!parsed.success) {
    throw new MidiMappingParseError(
      `MIDI map invalid: ${parsed.error.issues[0]?.message ?? 'schema error'}`,
    );
  }
  const out: MidiMapping = {};
  for (const [id, binding] of Object.entries(parsed.data)) {
    if (!isControlId(id)) {
      throw new MidiMappingParseError(
        `MIDI map has unknown control “${id}”. Use a ControlId from the app map.`,
      );
    }
    if (binding.kind === 'cc14' && binding.msb === binding.lsb) {
      throw new MidiMappingParseError(
        `MIDI map: ${id} cc14 MSB and LSB must differ (got both ${binding.msb}).`,
      );
    }
    out[id] = binding;
  }
  return out;
}

/**
 * Parse export JSON — bare mapping or `{ version: 1, mapping }`.
 * Empty object is allowed (caller may merge with factory).
 */
export function parseMidiMappingJson(json: string): MidiMapping {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    throw new MidiMappingParseError(
      'That MIDI map file isn’t valid JSON. Export again from StentorDeck and retry.',
    );
  }
  const wrapped = midiMappingExportSchema.safeParse(raw);
  if (!wrapped.success) {
    throw new MidiMappingParseError(
      `MIDI map JSON invalid: ${wrapped.error.issues[0]?.message ?? 'schema error'}`,
    );
  }
  const data = wrapped.data;
  if (
    typeof data === 'object' &&
    data !== null &&
    'version' in data &&
    'mapping' in data
  ) {
    return parseMidiMapping(data.mapping);
  }
  return parseMidiMapping(data);
}

export function serializeMidiMapping(mapping: MidiMapping): string {
  return JSON.stringify({ version: 1 as const, mapping }, null, 2);
}

/** Full factory defaults (docs/04). */
export function factoryMidiMapping(): MidiMapping {
  return structuredClone(RMX2_FACTORY_MAP);
}

/**
 * Replace entire map. Empty import is rejected — use reset for factory.
 * Partial maps are accepted (learn may only bind a few controls).
 */
export function assertNonEmptyMapping(mapping: MidiMapping): void {
  if (Object.keys(mapping).length === 0) {
    throw new MidiMappingParseError(
      'MIDI map is empty. Import a saved map, or use Reset to RMX2 defaults.',
    );
  }
}

export function cc14PairsFromMapping(
  mapping: MidiMapping,
): Array<{ msb: number; lsb: number }> {
  const pairs: Array<{ msb: number; lsb: number }> = [];
  for (const b of Object.values(mapping)) {
    if (b?.kind === 'cc14') pairs.push({ msb: b.msb, lsb: b.lsb });
  }
  return pairs;
}

export function relativeCcsFromMapping(mapping: MidiMapping): Set<number> {
  const set = new Set<number>();
  for (const b of Object.values(mapping)) {
    if (b?.kind === 'ccRel') set.add(b.cc);
  }
  // Scratch-mode jogs treated same as turn (docs/04)
  set.add(0x32);
  set.add(0x33);
  return set;
}

/** Find ControlId that already owns this binding (steal-flow helper). */
export function findBindingConflict(
  mapping: MidiMapping,
  binding: MidiBinding,
  except?: ControlId,
): ControlId | null {
  for (const [id, existing] of Object.entries(mapping) as [ControlId, MidiBinding][]) {
    if (except && id === except) continue;
    if (!existing) continue;
    if (bindingsEqual(existing, binding)) return id;
  }
  return null;
}

function bindingsEqual(a: MidiBinding, b: MidiBinding): boolean {
  if (a.kind !== b.kind || a.ch !== b.ch) return false;
  switch (a.kind) {
    case 'button':
      return b.kind === 'button' && a.note === b.note;
    case 'cc7':
      return b.kind === 'cc7' && a.cc === b.cc;
    case 'ccRel':
      return b.kind === 'ccRel' && a.cc === b.cc;
    case 'cc14':
      return b.kind === 'cc14' && a.msb === b.msb && a.lsb === b.lsb;
    default:
      return false;
  }
}
