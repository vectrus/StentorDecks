/**
 * Persist MIDI bindings in SQLite `midi_map` (docs/04 / E3).
 * Seed factory map when the table is empty.
 */

import {
  assertNonEmptyMapping,
  factoryMidiMapping,
  parseMidiMapping,
  parseMidiMappingJson,
  serializeMidiMapping,
  type MidiMapping,
} from '@stentordeck/shared';
import type { DbHandle } from './database';

export function loadMidiMapping(db: DbHandle): MidiMapping {
  const rows = db
    .prepare(`SELECT control_id, binding FROM midi_map`)
    .all() as Array<{ control_id: string; binding: string }>;

  if (rows.length === 0) {
    const factory = factoryMidiMapping();
    saveMidiMapping(db, factory);
    return factory;
  }

  const raw: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      raw[row.control_id] = JSON.parse(row.binding) as unknown;
    } catch {
      throw new Error(
        `Stored MIDI binding for ${row.control_id} is corrupt JSON — reset to RMX2 defaults.`,
      );
    }
  }
  // Fill any new factory ControlIds (e.g. FX pads) without wiping learned bindings.
  const stored = parseMidiMapping(raw);
  const merged = { ...factoryMidiMapping(), ...stored };
  if (Object.keys(merged).length > Object.keys(stored).length) {
    saveMidiMapping(db, merged);
  }
  return merged;
}

export function saveMidiMapping(db: DbHandle, mapping: MidiMapping): void {
  assertNonEmptyMapping(mapping);
  const parsed = parseMidiMapping(mapping);
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM midi_map`).run();
    const insert = db.prepare(
      `INSERT INTO midi_map (control_id, binding) VALUES (?, ?)`,
    );
    for (const [id, binding] of Object.entries(parsed)) {
      if (!binding) continue;
      insert.run(id, JSON.stringify(binding));
    }
  });
  tx();
}

export function resetMidiMapping(db: DbHandle): MidiMapping {
  const factory = factoryMidiMapping();
  saveMidiMapping(db, factory);
  return factory;
}

export function exportMidiMappingJson(db: DbHandle): string {
  return serializeMidiMapping(loadMidiMapping(db));
}

export function importMidiMappingJson(db: DbHandle, json: string): MidiMapping {
  const mapping = parseMidiMappingJson(json);
  assertNonEmptyMapping(mapping);
  saveMidiMapping(db, mapping);
  return mapping;
}
