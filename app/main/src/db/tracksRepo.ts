/**
 * tracks table access (docs/05 / E4). All writes transactional at call sites.
 */

import fs from 'node:fs';
import path from 'node:path';
import type {
  AnalysisResult,
  FolderNode,
  LibraryQuery,
  LibraryReadResult,
  TrackDetail,
  TrackRow,
} from '@stentordeck/shared';
import type { DbHandle } from './database';

export type TrackInsert = {
  path: string;
  folder: string;
  filename: string;
  size: number;
  mtime: number;
  partialHash: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string | null;
  durationMs: number | null;
  bpm: number | null;
  bpmSource: 'tag' | 'analysis' | 'manual' | null;
  keyCamelot: string | null;
  keyName: string | null;
  keySource: 'tag' | 'analysis' | 'manual' | null;
  lowConfidence?: boolean;
};

type TrackRowDb = {
  id: number;
  path: string;
  title: string | null;
  artist: string | null;
  bpm: number | null;
  key_camelot: string | null;
  duration_ms: number | null;
  bpm_source: 'tag' | 'analysis' | 'manual' | null;
  low_confidence: number;
  album: string | null;
  genre: string | null;
};

function toTrackRow(r: TrackRowDb): TrackRow {
  return {
    id: r.id,
    path: r.path,
    title: r.title,
    artist: r.artist,
    bpm: r.bpm,
    keyCamelot: r.key_camelot,
    durationMs: r.duration_ms,
    bpmSource: r.bpm_source,
    lowConfidence: r.low_confidence !== 0,
  };
}

export function queryTracks(db: DbHandle, q: LibraryQuery): TrackRow[] {
  const params: unknown[] = [];
  const where: string[] = ['missing_since IS NULL'];
  const searching = Boolean(q.search && q.search.trim());

  if (searching) {
    const like = `%${q.search!.trim()}%`;
    where.push(`(artist LIKE ? OR title LIKE ? OR path LIKE ?)`);
    params.push(like, like, like);
  } else if (q.folder != null && q.folder !== '') {
    where.push(`folder = ?`);
    params.push(normalizePath(q.folder));
  }

  // Search results: artist then title (E4 AC). Folder listings use settings sort.
  const order = searching
    ? `(artist IS NULL), artist COLLATE NOCASE ASC, (title IS NULL), title COLLATE NOCASE ASC`
    : orderByClause(q.sort ?? 'filename');

  const sql = `
    SELECT id, path, title, artist, bpm, key_camelot, duration_ms, bpm_source, low_confidence,
           album, genre
    FROM tracks
    WHERE ${where.join(' AND ')}
    ORDER BY ${order}
  `;
  const rows = db.prepare(sql).all(...params) as TrackRowDb[];
  return rows.map(toTrackRow);
}

function orderByClause(sort: LibraryQuery['sort']): string {
  // Nulls last via IS NULL (portable; avoids NULLS LAST dialect quirks).
  switch (sort) {
    case 'artist':
      return `(artist IS NULL), artist COLLATE NOCASE ASC, (title IS NULL), title COLLATE NOCASE ASC`;
    case 'title':
      return `(title IS NULL), title COLLATE NOCASE ASC`;
    case 'bpm':
      return `(bpm IS NULL), bpm ASC`;
    case 'key':
      return `(key_camelot IS NULL), key_camelot COLLATE NOCASE ASC`;
    case 'duration':
      return `(duration_ms IS NULL), duration_ms ASC`;
    case 'filename':
    default:
      return `filename COLLATE NOCASE ASC`;
  }
}

export function getTrackDetail(db: DbHandle, id: number): TrackDetail | null {
  const r = db
    .prepare(
      `SELECT id, path, title, artist, bpm, key_camelot, duration_ms, bpm_source, low_confidence,
              album, genre
       FROM tracks WHERE id = ? AND missing_since IS NULL`,
    )
    .get(id) as TrackRowDb | undefined;
  if (!r) return null;
  const hasWave = db
    .prepare(`SELECT 1 AS ok FROM waveforms WHERE track_id = ?`)
    .get(id) as { ok: number } | undefined;
  return {
    ...toTrackRow(r),
    album: r.album,
    genre: r.genre,
    waveformOverviewRef: hasWave ? `wave:${id}:overview` : null,
    waveformDetailRef: hasWave ? `wave:${id}:detail` : null,
  };
}

/** Read file bytes for deck load — only if path is under a configured library root. */
export function readTrackFile(
  db: DbHandle,
  id: number,
  roots: string[],
): LibraryReadResult | null {
  const r = db
    .prepare(
      `SELECT id, path, title, artist, bpm FROM tracks WHERE id = ? AND missing_since IS NULL`,
    )
    .get(id) as
    | { id: number; path: string; title: string | null; artist: string | null; bpm: number | null }
    | undefined;
  if (!r) return null;
  const filePath = normalizePath(r.path);
  if (!isUnderRoots(filePath, roots)) return null;
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return {
    id: r.id,
    path: filePath,
    title: r.title,
    artist: r.artist,
    bpm: r.bpm,
    bytes: new Uint8Array(buf),
  };
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

export function buildFolderTree(db: DbHandle, roots: string[]): FolderNode[] {
  const liveFolders = db
    .prepare(
      `SELECT DISTINCT folder FROM tracks WHERE missing_since IS NULL ORDER BY folder COLLATE NOCASE`,
    )
    .all() as Array<{ folder: string }>;

  const folderSet = new Set(liveFolders.map((f) => normalizePath(f.folder)));
  for (const root of roots) {
    folderSet.add(normalizePath(root));
  }

  return roots.map((root) => buildNode(normalizePath(root), folderSet));
}

function buildNode(folderPath: string, allFolders: Set<string>): FolderNode {
  const name = path.basename(folderPath) || folderPath;
  const prefix = folderPath.endsWith(path.sep) ? folderPath : folderPath + path.sep;
  const childrenPaths = [...allFolders]
    .filter((f) => {
      if (f === folderPath) return false;
      if (!f.startsWith(prefix)) return false;
      const rest = f.slice(prefix.length);
      return rest.length > 0 && !rest.includes(path.sep) && !rest.includes('/');
    })
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  return {
    path: folderPath,
    name,
    children: childrenPaths.map((p) => buildNode(p, allFolders)),
  };
}

export function findByPath(db: DbHandle, filePath: string): { id: number; partial_hash: string; size: number; mtime: number } | undefined {
  return db
    .prepare(`SELECT id, partial_hash, size, mtime FROM tracks WHERE path = ?`)
    .get(normalizePath(filePath)) as
    | { id: number; partial_hash: string; size: number; mtime: number }
    | undefined;
}

/** Orphan = missing_since set, matching hash (move detection). */
export function findOrphanByHash(
  db: DbHandle,
  partialHash: string,
): { id: number; path: string } | undefined {
  return db
    .prepare(
      `SELECT id, path FROM tracks
       WHERE partial_hash = ? AND missing_since IS NOT NULL
       ORDER BY missing_since DESC LIMIT 1`,
    )
    .get(partialHash) as { id: number; path: string } | undefined;
}

export function upsertTrack(db: DbHandle, row: TrackInsert): { id: number; kind: 'insert' | 'update' | 'move' } {
  const filePath = normalizePath(row.path);
  const existing = findByPath(db, filePath);

  if (existing) {
    const contentChanged = existing.partial_hash !== row.partialHash;
    db.prepare(
      `UPDATE tracks SET
        folder = ?, filename = ?, size = ?, mtime = ?, partial_hash = ?,
        title = ?, artist = ?, album = ?, genre = ?, duration_ms = ?,
        bpm = COALESCE(?, bpm), bpm_source = CASE WHEN ? IS NOT NULL THEN ? ELSE bpm_source END,
        key_camelot = COALESCE(?, key_camelot),
        key_name = COALESCE(?, key_name),
        key_source = CASE WHEN ? IS NOT NULL THEN ? ELSE key_source END,
        low_confidence = ?,
        missing_since = NULL,
        analyzed_at = CASE WHEN ? THEN NULL ELSE analyzed_at END,
        analysis_version = CASE WHEN ? THEN NULL ELSE analysis_version END
       WHERE id = ?`,
    ).run(
      row.folder,
      row.filename,
      row.size,
      row.mtime,
      row.partialHash,
      row.title,
      row.artist,
      row.album,
      row.genre,
      row.durationMs,
      row.bpm,
      row.bpmSource,
      row.bpmSource,
      row.keyCamelot,
      row.keyName,
      row.keySource,
      row.keySource,
      row.lowConfidence ? 1 : 0,
      contentChanged ? 1 : 0,
      contentChanged ? 1 : 0,
      existing.id,
    );
    if (contentChanged) {
      db.prepare(`DELETE FROM waveforms WHERE track_id = ?`).run(existing.id);
    }
    return { id: existing.id, kind: 'update' };
  }

  const orphan = findOrphanByHash(db, row.partialHash);
  if (orphan) {
    db.prepare(
      `UPDATE tracks SET
        path = ?, folder = ?, filename = ?, size = ?, mtime = ?,
        title = COALESCE(?, title), artist = COALESCE(?, artist),
        album = COALESCE(?, album), genre = COALESCE(?, genre),
        duration_ms = COALESCE(?, duration_ms),
        missing_since = NULL
       WHERE id = ?`,
    ).run(
      filePath,
      row.folder,
      row.filename,
      row.size,
      row.mtime,
      row.title,
      row.artist,
      row.album,
      row.genre,
      row.durationMs,
      orphan.id,
    );
    return { id: orphan.id, kind: 'move' };
  }

  const info = db
    .prepare(
      `INSERT INTO tracks (
        path, folder, filename, size, mtime, partial_hash,
        title, artist, album, genre, duration_ms,
        bpm, bpm_source, key_camelot, key_name, key_source, low_confidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      filePath,
      row.folder,
      row.filename,
      row.size,
      row.mtime,
      row.partialHash,
      row.title,
      row.artist,
      row.album,
      row.genre,
      row.durationMs,
      row.bpm,
      row.bpmSource,
      row.keyCamelot,
      row.keyName,
      row.keySource,
      row.lowConfidence ? 1 : 0,
    );
  return { id: Number(info.lastInsertRowid), kind: 'insert' };
}

export function markMissingExcept(db: DbHandle, livePaths: Set<string>): number {
  const rows = db
    .prepare(`SELECT id, path FROM tracks WHERE missing_since IS NULL`)
    .all() as Array<{ id: number; path: string }>;
  const now = Date.now();
  const stmt = db.prepare(`UPDATE tracks SET missing_since = ? WHERE id = ?`);
  let n = 0;
  for (const r of rows) {
    if (!livePaths.has(normalizePath(r.path))) {
      stmt.run(now, r.id);
      n += 1;
    }
  }
  return n;
}

export type TrackAnalysisHints = {
  path: string;
  bpm_source: 'tag' | 'analysis' | 'manual' | null;
  key_source: 'tag' | 'analysis' | 'manual' | null;
  analyzed_at: number | null;
  analysis_version: number | null;
};

export function getTrackAnalysisHints(db: DbHandle, id: number): TrackAnalysisHints | null {
  const r = db
    .prepare(
      `SELECT path, bpm_source, key_source, analyzed_at, analysis_version
       FROM tracks WHERE id = ? AND missing_since IS NULL`,
    )
    .get(id) as TrackAnalysisHints | undefined;
  return r ?? null;
}

/** Commit analysis blobs + fields in one transaction (E5). */
export function commitAnalysis(db: DbHandle, result: AnalysisResult): void {
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE tracks SET
        duration_ms = COALESCE(?, duration_ms),
        bpm = CASE WHEN ? IS NOT NULL THEN ? ELSE bpm END,
        bpm_source = CASE WHEN ? IS NOT NULL THEN ? ELSE bpm_source END,
        key_camelot = CASE WHEN ? IS NOT NULL THEN ? ELSE key_camelot END,
        key_name = CASE WHEN ? IS NOT NULL THEN ? ELSE key_name END,
        key_source = CASE WHEN ? IS NOT NULL THEN ? ELSE key_source END,
        loudness_lufs = ?,
        peak_db = ?,
        low_confidence = ?,
        analyzed_at = ?,
        analysis_version = ?
       WHERE id = ?`,
    ).run(
      result.durationMs,
      result.bpm,
      result.bpm,
      result.bpmSource,
      result.bpmSource,
      result.keyCamelot,
      result.keyCamelot,
      result.keyName,
      result.keyName,
      result.keySource,
      result.keySource,
      result.loudnessLufs,
      result.peakDb,
      result.lowConfidence ? 1 : 0,
      Date.now(),
      result.analysisVersion,
      result.trackId,
    );

    db.prepare(
      `INSERT INTO waveforms (track_id, overview, detail, detail_pps)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(track_id) DO UPDATE SET
         overview = excluded.overview,
         detail = excluded.detail,
         detail_pps = excluded.detail_pps`,
    ).run(
      result.trackId,
      Buffer.from(result.overview),
      Buffer.from(result.detail),
      result.detailPps,
    );
  });
  tx();
}

/** Prep R6.6 — write manual BPM and/or key; does not touch analysis blobs. */
export function updateManualMeta(
  db: DbHandle,
  id: number,
  patch: {
    bpm?: number | null;
    keyCamelot?: string | null;
    keyName?: string | null;
  },
): TrackRow | null {
  const existing = db
    .prepare(
      `SELECT id FROM tracks WHERE id = ? AND missing_since IS NULL`,
    )
    .get(id) as { id: number } | undefined;
  if (!existing) return null;

  if (patch.bpm !== undefined) {
    if (patch.bpm == null) {
      db.prepare(`UPDATE tracks SET bpm = NULL, bpm_source = NULL WHERE id = ?`).run(id);
    } else {
      db.prepare(`UPDATE tracks SET bpm = ?, bpm_source = 'manual' WHERE id = ?`).run(
        patch.bpm,
        id,
      );
    }
  }
  if (patch.keyCamelot !== undefined || patch.keyName !== undefined) {
    if (patch.keyCamelot == null && patch.keyName == null) {
      db.prepare(
        `UPDATE tracks SET key_camelot = NULL, key_name = NULL, key_source = NULL WHERE id = ?`,
      ).run(id);
    } else {
      db.prepare(
        `UPDATE tracks SET key_camelot = ?, key_name = ?, key_source = 'manual' WHERE id = ?`,
      ).run(patch.keyCamelot ?? null, patch.keyName ?? null, id);
    }
  }
  return getTrackDetail(db, id);
}

/** Mark a single path missing (watcher unlink). */
export function markMissingPath(db: DbHandle, filePath: string): boolean {
  const info = db
    .prepare(
      `UPDATE tracks SET missing_since = ? WHERE path = ? AND missing_since IS NULL`,
    )
    .run(Date.now(), normalizePath(filePath));
  return info.changes > 0;
}

export function normalizePath(p: string): string {
  return path.normalize(p);
}

export function folderOf(filePath: string): string {
  return normalizePath(path.dirname(filePath));
}

export function filenameOf(filePath: string): string {
  return path.basename(filePath);
}
