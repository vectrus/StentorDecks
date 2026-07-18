/**
 * Debounced chokidar watcher for library roots (docs/05: 2 s debounce).
 */

import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import type { LibraryProgress } from '@stentordeck/shared';
import type { DbHandle } from '../db/database';
import { markMissingPath, normalizePath } from '../db/tracksRepo';
import { indexAudioFile, isAudioPath } from './scanLibrary';

const DEBOUNCE_MS = 2000;

export type WatcherProgressFn = (p: LibraryProgress) => void;

export type LibraryWatcher = {
  setRoots: (roots: string[]) => void;
  close: () => Promise<void>;
};

type PendingKind = 'upsert' | 'unlink';

export function createLibraryWatcher(
  getDb: () => DbHandle,
  onProgress?: WatcherProgressFn,
): LibraryWatcher {
  let watcher: FSWatcher | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const pending = new Map<string, PendingKind>();
  let rootsKey = '';
  let flushing = false;

  function queue(filePath: string, kind: PendingKind): void {
    if (!isAudioPath(filePath)) return;
    const abs = normalizePath(filePath);
    // unlink wins over earlier upsert for the same path in the window
    if (kind === 'unlink') pending.set(abs, 'unlink');
    else if (pending.get(abs) !== 'unlink') pending.set(abs, 'upsert');

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, DEBOUNCE_MS);
  }

  async function flush(): Promise<void> {
    if (flushing) {
      timer = setTimeout(() => {
        void flush();
      }, DEBOUNCE_MS);
      return;
    }
    flushing = true;
    const batch = [...pending.entries()];
    pending.clear();
    timer = null;
    try {
      const db = getDb();
      let scanned = 0;
      const total = batch.length;
      for (const [filePath, kind] of batch) {
        scanned += 1;
        try {
          if (kind === 'unlink') {
            markMissingPath(db, filePath);
          } else {
            await indexAudioFile(db, filePath);
          }
        } catch (err) {
          console.warn('[watcher] path failed', filePath, err);
        }
        onProgress?.({
          phase: 'watch',
          current: filePath,
          scanned,
          total,
        });
      }
      if (total > 0) {
        onProgress?.({ phase: 'watch', scanned: total, total });
      }
    } finally {
      flushing = false;
    }
  }

  function setRoots(roots: string[]): void {
    const nextKey = roots.map((r) => normalizePath(r)).sort().join('\0');
    if (nextKey === rootsKey && watcher) return;
    rootsKey = nextKey;

    if (watcher) {
      void watcher.close();
      watcher = null;
    }
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending.clear();

    const existing = roots.map((r) => normalizePath(r)).filter(Boolean);
    if (existing.length === 0) return;

    watcher = chokidar.watch(existing, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
      depth: 99,
      ignored: (p) => {
        const base = path.basename(p);
        if (base.startsWith('.')) return true;
        // Allow directories through; filter non-audio files
        try {
          // chokidar may pass dirs — only ignore non-audio files
          if (!path.extname(base)) return false;
          return !isAudioPath(p);
        } catch {
          return false;
        }
      },
    });

    watcher.on('add', (p) => queue(p, 'upsert'));
    watcher.on('change', (p) => queue(p, 'upsert'));
    watcher.on('unlink', (p) => queue(p, 'unlink'));
    watcher.on('error', (err) => console.warn('[watcher]', err));
    console.info('[watcher] watching', existing.length, 'root(s)');
  }

  async function close(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    pending.clear();
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    rootsKey = '';
  }

  return { setRoots, close };
}
