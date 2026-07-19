/**
 * Prep sibling WAV writers — Fixed by SD (R5.9) and Normalized by SD.
 * Never mutates the source file.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  overwriteSiblingWavPath,
  uniqueFixedSiblingWavPath,
  uniqueNormalizedSiblingWavPath,
  withFixedBySdTitle,
  withNormalizedBySdTitle,
  type SiblingWavKind,
} from '@stentordeck/shared';
import type { DbHandle } from '../db/database';
import { normalizePath } from '../db/tracksRepo';
import { indexAudioFile } from '../scanner/scanLibrary';

export type Mp3FixWriteResult =
  | { ok: true; path: string; trackId: number }
  | { ok: false; reason: string };

function isUnderRoots(filePath: string, roots: string[]): boolean {
  const abs = normalizePath(filePath).toLowerCase();
  for (const root of roots) {
    const r = normalizePath(root).toLowerCase();
    if (abs === r) return true;
    const prefix = r.endsWith(path.sep) ? r : r + path.sep;
    if (abs.startsWith(prefix)) return true;
  }
  return false;
}

export async function writeSiblingWav(
  db: DbHandle,
  roots: string[],
  req: {
    sourceTrackId: number;
    wavBytes: Uint8Array;
    title: string;
    artist: string | null;
    kind?: SiblingWavKind;
    /** Rewrite existing sibling instead of unique ` 2.wav`. */
    overwrite?: boolean;
  },
): Promise<Mp3FixWriteResult> {
  const kind: SiblingWavKind = req.kind ?? 'fixed';
  const overwrite = req.overwrite === true;
  const row = db
    .prepare(
      `SELECT id, path, title, artist, bpm, key_camelot, key_name, bpm_source, key_source
       FROM tracks WHERE id = ? AND missing_since IS NULL`,
    )
    .get(req.sourceTrackId) as
    | {
        id: number;
        path: string;
        title: string | null;
        artist: string | null;
        bpm: number | null;
        key_camelot: string | null;
        key_name: string | null;
        bpm_source: 'tag' | 'analysis' | 'manual' | null;
        key_source: 'tag' | 'analysis' | 'manual' | null;
      }
    | undefined;

  if (!row) return { ok: false, reason: 'Source track not found' };

  const sourcePath = normalizePath(row.path);
  if (!isUnderRoots(sourcePath, roots)) {
    return { ok: false, reason: 'Source is outside library roots' };
  }
  if (kind === 'fixed' && !/\.mp3$/i.test(sourcePath)) {
    return { ok: false, reason: 'Only MP3 sources can be fixed (output is always WAV)' };
  }
  if (kind === 'normalized' && !/\.(mp3|flac|wav)$/i.test(sourcePath)) {
    return { ok: false, reason: 'Normalize supports MP3 / FLAC / WAV sources' };
  }
  // Normalize rewrite must not target an SD sibling as "source" of itself.
  if (kind === 'normalized' && /\(Fixed by SD\)|\(Normalized by SD\)/i.test(sourcePath)) {
    return { ok: false, reason: 'Normalize from the original track, not an SD sibling' };
  }
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, reason: 'Source file missing on disk' };
  }
  if (req.wavBytes.byteLength < 44) {
    return { ok: false, reason: 'WAV payload too small' };
  }

  let dest: string;
  try {
    if (overwrite) {
      dest = overwriteSiblingWavPath(sourcePath, kind, (p) => fs.existsSync(p));
    } else {
      dest =
        kind === 'normalized'
          ? uniqueNormalizedSiblingWavPath(sourcePath, (p) => fs.existsSync(p))
          : uniqueFixedSiblingWavPath(sourcePath, (p) => fs.existsSync(p));
    }
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Could not pick sibling path',
    };
  }

  const destNorm = normalizePath(dest);
  if (destNorm.toLowerCase() === sourcePath.toLowerCase()) {
    return { ok: false, reason: 'Refusing to overwrite the source file' };
  }
  if (!isUnderRoots(destNorm, roots)) {
    return { ok: false, reason: 'Destination would be outside library roots' };
  }
  if (!overwrite && fs.existsSync(destNorm)) {
    return { ok: false, reason: 'Destination already exists' };
  }

  try {
    await fs.promises.writeFile(destNorm, Buffer.from(req.wavBytes));
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : 'Failed to write WAV',
    };
  }

  if (!fs.existsSync(sourcePath)) {
    return { ok: false, reason: 'Source vanished after write — aborting index' };
  }

  const indexed = await indexAudioFile(db, destNorm);
  if (indexed.id == null) {
    return { ok: false, reason: 'Wrote WAV but failed to index it' };
  }

  const stem = path.parse(sourcePath).name;
  const outTitle =
    kind === 'normalized'
      ? withNormalizedBySdTitle(req.title || row.title, stem)
      : withFixedBySdTitle(req.title || row.title, stem);

  db.prepare(
    `UPDATE tracks SET
       title = ?,
       artist = COALESCE(?, artist),
       bpm = COALESCE(?, bpm),
       bpm_source = CASE WHEN ? IS NOT NULL THEN ? ELSE bpm_source END,
       key_camelot = COALESCE(?, key_camelot),
       key_name = COALESCE(?, key_name),
       key_source = CASE WHEN ? IS NOT NULL THEN ? ELSE key_source END
     WHERE id = ?`,
  ).run(
    outTitle,
    req.artist ?? row.artist,
    row.bpm,
    row.bpm,
    row.bpm_source,
    row.key_camelot,
    row.key_name,
    row.key_source,
    row.key_source,
    indexed.id,
  );

  return { ok: true, path: destNorm, trackId: indexed.id };
}

/** @deprecated use writeSiblingWav — kept name for existing call sites */
export async function writeFixedMp3Sibling(
  db: DbHandle,
  roots: string[],
  req: {
    sourceTrackId: number;
    wavBytes: Uint8Array;
    title: string;
    artist: string | null;
    kind?: SiblingWavKind;
  },
): Promise<Mp3FixWriteResult> {
  return writeSiblingWav(db, roots, { ...req, kind: req.kind ?? 'fixed' });
}
