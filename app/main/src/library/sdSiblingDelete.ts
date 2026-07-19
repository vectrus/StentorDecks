/**
 * Delete StentorDeck-created sibling WAVs only (R5.1 exception / R5.9).
 * Never deletes source MP3/FLAC/etc.
 */

import fs from 'node:fs';
import path from 'node:path';
import { isSdSiblingWavPath } from '@stentordeck/shared';
import type { DbHandle } from '../db/database';
import { deleteTrackById, listSdSiblingTracks } from '../db/tracksRepo';

function normalizePath(p: string): string {
  return path.normalize(p);
}

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

export function deleteSdSiblingById(
  db: DbHandle,
  roots: string[],
  id: number,
): { ok: true } | { ok: false; reason: string } {
  const row = db
    .prepare(
      `SELECT id, path FROM tracks WHERE id = ? AND missing_since IS NULL`,
    )
    .get(id) as { id: number; path: string } | undefined;
  if (!row) return { ok: false, reason: 'Track not found' };
  if (!isSdSiblingWavPath(row.path)) {
    return { ok: false, reason: 'Only Fixed/Normalized by SD WAVs can be deleted' };
  }
  if (!isUnderRoots(row.path, roots)) {
    return { ok: false, reason: 'Path is outside library roots' };
  }
  try {
    if (fs.existsSync(row.path)) fs.unlinkSync(row.path);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Could not delete file: ${message}` };
  }
  deleteTrackById(db, id);
  return { ok: true };
}

export function purgeSdSiblings(
  db: DbHandle,
  roots: string[],
  opts: {
    scope: 'folder' | 'library';
    folder?: string | null;
    dryRun: boolean;
  },
): { ok: true; deleted: number; skipped: number } | { ok: false; reason: string } {
  if (opts.scope === 'folder' && (opts.folder == null || opts.folder === '')) {
    return { ok: false, reason: 'Folder required for folder purge' };
  }
  const rows = listSdSiblingTracks(db, {
    folder: opts.scope === 'folder' ? opts.folder! : null,
  });
  let deleted = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!isSdSiblingWavPath(row.path) || !isUnderRoots(row.path, roots)) {
      skipped += 1;
      continue;
    }
    if (opts.dryRun) {
      deleted += 1;
      continue;
    }
    const res = deleteSdSiblingById(db, roots, row.id);
    if (res.ok) deleted += 1;
    else skipped += 1;
  }
  return { ok: true, deleted, skipped };
}
