/**
 * Prep R5.9 — write Fixed-by-SD sibling WAV. Never mutates the source file.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  uniqueFixedSiblingWavPath,
  withFixedBySdTitle,
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

export async function writeFixedMp3Sibling(
  db: DbHandle,
  roots: string[],
  req: {
    sourceTrackId: number;
    wavBytes: Uint8Array;
    title: string;
    artist: string | null;
  },
): Promise<Mp3FixWriteResult> {
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
  if (!/\.mp3$/i.test(sourcePath)) {
    return { ok: false, reason: 'Only MP3 sources can be fixed (output is always WAV)' };
  }
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, reason: 'Source file missing on disk' };
  }
  if (req.wavBytes.byteLength < 44) {
    return { ok: false, reason: 'WAV payload too small' };
  }

  let dest: string;
  try {
    dest = uniqueFixedSiblingWavPath(sourcePath, (p) => fs.existsSync(p));
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
  if (fs.existsSync(destNorm)) {
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

  // Belt: never allow a bug to replace the source after write.
  if (!fs.existsSync(sourcePath)) {
    return { ok: false, reason: 'Source vanished after write — aborting index' };
  }

  const indexed = await indexAudioFile(db, destNorm);
  if (indexed.id == null) {
    return { ok: false, reason: 'Wrote WAV but failed to index it' };
  }

  const stem = path.parse(sourcePath).name;
  const fixedTitle = withFixedBySdTitle(req.title || row.title, stem);

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
    fixedTitle,
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
