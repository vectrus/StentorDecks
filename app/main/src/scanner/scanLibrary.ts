/**
 * Library scan + single-file index (docs/05 / E4).
 */

import fs from 'node:fs';
import path from 'node:path';
import type { LibraryProgress } from '@stentordeck/shared';
import type { DbHandle } from '../db/database';
import {
  filenameOf,
  folderOf,
  markMissingExcept,
  normalizePath,
  upsertTrack,
} from '../db/tracksRepo';
import { computePartialHashSync } from './partialHash';
import { parseTagKey, validateTagBpm } from './tagValidate';

const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav']);

export type ScanProgressFn = (p: LibraryProgress) => void;

export type ScanResult = {
  scanned: number;
  inserted: number;
  updated: number;
  moved: number;
  missing: number;
};

export type ScanOptions = {
  /** When false, skip missing-mark (partial/single-root rescan). Default true. */
  markMissing?: boolean;
};

export function isAudioPath(filePath: string): boolean {
  return AUDIO_EXT.has(path.extname(filePath).toLowerCase());
}

export type IndexAudioResult = {
  kind: 'insert' | 'update' | 'move' | 'skip';
  id: number | null;
};

/** Index one audio file (scan + watcher path). */
export async function indexAudioFile(
  db: DbHandle,
  filePath: string,
): Promise<IndexAudioResult> {
  const abs = normalizePath(filePath);
  if (!isAudioPath(abs) || !fs.existsSync(abs)) return { kind: 'skip', id: null };
  let st: fs.Stats;
  try {
    st = fs.statSync(abs);
    if (!st.isFile()) return { kind: 'skip', id: null };
  } catch {
    return { kind: 'skip', id: null };
  }

  const partialHash = computePartialHashSync(abs);
  let title: string | null = null;
  let artist: string | null = null;
  let album: string | null = null;
  let genre: string | null = null;
  let durationMs: number | null = null;
  let bpm: number | null = null;
  let bpmSource: 'tag' | null = null;
  let keyCamelot: string | null = null;
  let keyName: string | null = null;
  let keySource: 'tag' | null = null;

  try {
    const { parseFile } = await import('music-metadata');
    const meta = await parseFile(abs, { duration: true });
    const c = meta.common;
    title = c.title?.trim() || null;
    artist = c.artist?.trim() || c.artists?.[0]?.trim() || null;
    album = c.album?.trim() || null;
    genre = c.genre?.[0]?.trim() || null;
    if (meta.format.duration != null && Number.isFinite(meta.format.duration)) {
      durationMs = Math.round(meta.format.duration * 1000);
    }
    const tagBpm = validateTagBpm(c.bpm);
    if (tagBpm != null) {
      bpm = tagBpm;
      bpmSource = 'tag';
    }
    const keyRaw = extractKeyTag(meta);
    const parsedKey = parseTagKey(keyRaw);
    if (parsedKey) {
      keyCamelot = parsedKey.camelot;
      keyName = parsedKey.name;
      keySource = 'tag';
    }
  } catch {
    /* tag read failed — still index the file */
  }

  if (!title) title = path.parse(abs).name;

  const result = upsertTrack(db, {
    path: abs,
    folder: folderOf(abs),
    filename: filenameOf(abs),
    size: st.size,
    mtime: Math.floor(st.mtimeMs),
    partialHash,
    title,
    artist,
    album,
    genre,
    durationMs,
    bpm,
    bpmSource,
    keyCamelot,
    keyName,
    keySource,
  });
  return { kind: result.kind, id: result.id };
}

export async function scanLibraryRoots(
  db: DbHandle,
  roots: string[],
  onProgress?: ScanProgressFn,
  options?: ScanOptions,
): Promise<ScanResult> {
  const markMissing = options?.markMissing !== false;
  const live = new Set<string>();
  let scanned = 0;
  let inserted = 0;
  let updated = 0;
  let moved = 0;

  const files: string[] = [];
  for (const root of roots) {
    const abs = normalizePath(root);
    if (!fs.existsSync(abs)) continue;
    walkAudioFiles(abs, files);
  }

  const total = files.length;
  onProgress?.({ phase: 'scan', scanned: 0, total });

  for (const filePath of files) {
    live.add(normalizePath(filePath));
    scanned += 1;
    try {
      const { kind } = await indexAudioFile(db, filePath);
      if (kind === 'insert') inserted += 1;
      else if (kind === 'move') moved += 1;
      else if (kind === 'update') updated += 1;
    } catch (err) {
      console.warn('[scanner] skip', filePath, err);
    }

    if (scanned % 10 === 0 || scanned === total) {
      onProgress?.({ phase: 'scan', current: filePath, scanned, total });
    }
  }

  let missing = 0;
  if (markMissing) {
    missing = markMissingExcept(db, live);
  }
  onProgress?.({ phase: 'scan', scanned, total });
  return { scanned, inserted, updated, moved, missing };
}

function extractKeyTag(meta: {
  common: { key?: string };
  native?: Record<string, Array<{ id?: string; value?: unknown }>>;
}): string | null {
  if (meta.common.key) return String(meta.common.key);
  for (const frames of Object.values(meta.native ?? {})) {
    for (const f of frames) {
      const id = (f.id ?? '').toUpperCase();
      if (id === 'TKEY' || id === 'INITIALKEY' || id.endsWith('KEY')) {
        if (f.value != null) return String(f.value);
      }
    }
  }
  return null;
}

function walkAudioFiles(dir: string, out: string[]): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith('.')) continue;
      walkAudioFiles(full, out);
    } else if (ent.isFile()) {
      if (isAudioPath(full)) out.push(full);
    }
  }
}
