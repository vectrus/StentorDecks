import { makeAutoObservable, runInAction } from 'mobx';
import {
  averageTapBpm,
  camelotDisplayName,
  isCamelotKey,
  type AnalysisProgress,
  type FolderNode,
  type LibraryProgress,
  type TrackRow,
} from '@stentordeck/shared';
import { invoke, onIpc } from '../ipc/client';
import { settingsStore } from './SettingsStore';

/**
 * Library browser + RMX2 browse cluster target (E4 / R5.3).
 * MIDI and mouse drive the same cursor / enter / parent / load actions.
 */

export type LibraryBrowseEntry =
  | { kind: 'folder'; path: string; name: string }
  | { kind: 'track'; track: TrackRow; name: string };

export class LibraryStore {
  folders: FolderNode[] = [];
  tracks: TrackRow[] = [];
  /** Absolute folder path currently listed; null = roots list (browse top). */
  openFolder: string | null = null;
  search = '';
  /** Row cursor into `entries` (folders + tracks). */
  cursor = 0;
  progress: LibraryProgress | null = null;
  scanning = false;
  ready = false;
  error: string | null = null;
  /** Last MIDI/UI load failure (playing interlock etc.). */
  loadError: string | null = null;
  /** Tap-tempo timestamps for selected track (R6.6). */
  tapTimes: number[] = [];
  tapPreviewBpm: number | null = null;
  /** Last analysis:enqueue / progress hint for Prep Detect (E5 fills this in). */
  detectStatus: string | null = null;
  analysisProgress: AnalysisProgress | null = null;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get entries(): LibraryBrowseEntry[] {
    if (this.search.trim()) {
      return this.tracks.map((t) => ({
        kind: 'track' as const,
        track: t,
        name: displayName(t),
      }));
    }
    if (this.openFolder == null) {
      return this.folders.map((f) => ({
        kind: 'folder' as const,
        path: f.path,
        name: f.name,
      }));
    }
    const node = findFolderNode(this.folders, this.openFolder);
    const childFolders: LibraryBrowseEntry[] = (node?.children ?? []).map((c) => ({
      kind: 'folder' as const,
      path: c.path,
      name: c.name,
    }));
    const trackEntries: LibraryBrowseEntry[] = this.tracks.map((t) => ({
      kind: 'track' as const,
      track: t,
      name: displayName(t),
    }));
    return [...childFolders, ...trackEntries];
  }

  get selected(): LibraryBrowseEntry | null {
    return this.entries[this.cursor] ?? null;
  }

  get selectedTrack(): TrackRow | null {
    const sel = this.selected;
    return sel?.kind === 'track' ? sel.track : null;
  }

  get breadcrumb(): string {
    if (this.search.trim()) return `Search: ${this.search.trim()}`;
    if (this.openFolder == null) return 'Library';
    const parts = [this.openFolder];
    // Prefer root-relative labels when possible
    for (const root of this.folders) {
      const r = normPath(root.path);
      const cur = normPath(this.openFolder);
      if (cur === r || cur.startsWith(r + '\\') || cur.startsWith(r + '/')) {
        const rel = cur.slice(r.length).replace(/^[/\\]/, '');
        return rel ? `${root.name} / ${rel.replace(/[/\\]/g, ' / ')}` : root.name;
      }
    }
    return parts[0]!;
  }

  async hydrate(): Promise<void> {
    onIpc('library:progress', (p) => {
      runInAction(() => {
        this.progress = p;
        const total = p.total ?? 0;
        this.scanning = p.phase === 'scan' && (total === 0 ? p.scanned === 0 : p.scanned < total);
      });
      if (p.phase === 'watch' && p.total != null && p.scanned >= p.total) {
        void this.refresh();
        return;
      }
      if (p.scanned > 0 && p.scanned % 50 === 0) {
        void this.refresh();
      }
      if (p.total != null && p.scanned >= p.total) {
        void this.refresh();
      }
    });
    onIpc('analysis:progress', (p) => {
      runInAction(() => {
        this.analysisProgress = p;
        if (p.stage === 'idle') {
          this.detectStatus =
            p.queueDepth > 0 ? `queued (${p.queueDepth})` : this.detectStatus;
        } else {
          this.detectStatus = `${p.stage} · q${p.queueDepth}`;
        }
      });
      // When E5 commits, refresh so BPM/key appear without reload.
      if (p.stage === 'commit' || p.stage === 'idle') {
        void this.refresh();
      }
    });
    await this.refresh();
    runInAction(() => {
      this.ready = true;
    });
  }

  async refresh(): Promise<void> {
    try {
      const sort = settingsStore.settings.library.sort;
      const searching = Boolean(this.search.trim());
      const [folders, tracks] = await Promise.all([
        invoke('library:folders'),
        searching || this.openFolder != null
          ? invoke('library:query', {
              folder: searching ? null : this.openFolder,
              search: searching ? this.search.trim() : null,
              sort,
            })
          : Promise.resolve([] as TrackRow[]),
      ]);
      runInAction(() => {
        this.folders = folders;
        this.tracks = tracks;
        this.clampCursor();
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    }
  }

  selectIndex(index: number): void {
    const n = this.entries.length;
    if (n === 0) {
      this.cursor = 0;
      return;
    }
    const next = Math.max(0, Math.min(n - 1, index));
    if (next !== this.cursor) this.clearTaps();
    this.cursor = next;
  }

  up(): void {
    this.selectIndex(this.cursor - 1);
  }

  down(): void {
    this.selectIndex(this.cursor + 1);
  }

  /** Right — enter folder (R5.3). */
  enter(): void {
    const sel = this.selected;
    if (!sel || sel.kind !== 'folder') return;
    this.setOpenFolder(sel.path);
  }

  /** Left — parent folder or clear search. */
  parent(): void {
    if (this.search.trim()) {
      this.setSearch('');
      return;
    }
    if (this.openFolder == null) return;
    if (this.isRootPath(this.openFolder)) {
      this.setOpenFolder(null);
      return;
    }
    const parent = parentDir(this.openFolder);
    this.setOpenFolder(parent);
  }

  private clampCursor(): void {
    const n = this.entries.length;
    if (n === 0) {
      this.cursor = 0;
      return;
    }
    if (this.cursor > n - 1) this.cursor = n - 1;
  }

  private isRootPath(folder: string): boolean {
    const n = normPath(folder);
    return this.folders.some((f) => normPath(f.path) === n);
  }

  setOpenFolder(folder: string | null): void {
    this.openFolder = folder;
    this.search = '';
    this.cursor = 0;
    void this.refresh();
  }

  setSearch(q: string): void {
    this.search = q;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.cursor = 0;
      void this.refresh();
    }, 150);
  }

  async rescan(path?: string): Promise<void> {
    runInAction(() => {
      this.scanning = true;
      this.error = null;
    });
    try {
      await invoke('library:rescan', path != null ? { path } : {});
      await this.refresh();
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    } finally {
      runInAction(() => {
        this.scanning = false;
      });
    }
  }

  /**
   * Load button (R4.2 / R5.3) — only when cursor is on a track.
   * Fire-and-forget friendly for MIDI; sets `loadError` on failure.
   */
  requestLoad(deck: {
    load: (
      file: File,
      meta?: { title?: string; artist?: string; fileBpm?: number | null },
    ) => Promise<void>;
  }): void {
    void this.loadSelected(deck).catch((err: unknown) => {
      runInAction(() => {
        this.loadError = err instanceof Error ? err.message : String(err);
      });
      console.warn('[library] load rejected', err);
    });
  }

  async loadSelected(deck: {
    load: (
      file: File,
      meta?: { title?: string; artist?: string; fileBpm?: number | null },
    ) => Promise<void>;
  }): Promise<void> {
    const row = this.selectedTrack;
    if (!row) {
      runInAction(() => {
        this.loadError = 'Select a track (not a folder)';
      });
      throw new Error('Select a track (not a folder)');
    }
    const payload = await invoke('library:read', { id: row.id });
    if (!payload) throw new Error('Track file missing or unreadable');
    const name = payload.path.split(/[/\\]/).pop() ?? 'track';
    const copy = new Uint8Array(payload.bytes.byteLength);
    copy.set(payload.bytes);
    const file = new File([copy], name);
    await deck.load(file, {
      title: payload.title ?? name,
      artist: payload.artist ?? '',
      fileBpm: payload.bpm,
    });
    runInAction(() => {
      this.loadError = null;
    });
  }

  clearTaps(): void {
    this.tapTimes = [];
    this.tapPreviewBpm = null;
  }

  /** Record a tap; when ≥4, preview BPM updates (commit via applyTapBpm). */
  tap(): void {
    const now = performance.now();
    this.tapTimes = [...this.tapTimes, now].slice(-12);
    this.tapPreviewBpm = averageTapBpm(this.tapTimes);
  }

  async applyTapBpm(): Promise<void> {
    const bpm = this.tapPreviewBpm ?? averageTapBpm(this.tapTimes);
    if (bpm == null) return;
    await this.setManualBpm(bpm);
    this.clearTaps();
  }

  async setManualBpm(bpm: number | null): Promise<void> {
    const row = this.selectedTrack;
    if (!row) return;
    const next = await invoke('library:updateManual', { id: row.id, bpm });
    this.patchLocalTrack(next);
  }

  async halfBpm(): Promise<void> {
    const row = this.selectedTrack;
    if (!row || row.bpm == null) return;
    await this.setManualBpm(Math.round((row.bpm / 2) * 10) / 10);
  }

  async doubleBpm(): Promise<void> {
    const row = this.selectedTrack;
    if (!row || row.bpm == null) return;
    await this.setManualBpm(Math.round(row.bpm * 2 * 10) / 10);
  }

  async setManualKey(camelot: string | null): Promise<void> {
    const row = this.selectedTrack;
    if (!row) return;
    const keyName =
      camelot != null && isCamelotKey(camelot) ? camelotDisplayName(camelot) : null;
    const next = await invoke('library:updateManual', {
      id: row.id,
      keyCamelot: camelot,
      keyName,
    });
    this.patchLocalTrack(next);
  }

  /**
   * Queue BPM/key/waveform analysis for the selected track (E5).
   * Until the analysis worker lands, this only enqueues + shows stub progress.
   */
  async detectSelected(): Promise<void> {
    const row = this.selectedTrack;
    if (!row) return;
    runInAction(() => {
      this.detectStatus = 'queueing…';
    });
    try {
      const res = await invoke('analysis:enqueue', {
        trackIds: [row.id],
        priority: 'deck',
      });
      runInAction(() => {
        this.detectStatus = `queued · depth ${res.queueDepth}`;
      });
    } catch (err) {
      runInAction(() => {
        this.detectStatus = err instanceof Error ? err.message : String(err);
      });
    }
  }

  private patchLocalTrack(next: TrackRow | null): void {
    if (!next) return;
    runInAction(() => {
      const i = this.tracks.findIndex((t) => t.id === next.id);
      if (i >= 0) this.tracks[i] = next;
    });
  }
}

export const libraryStore = new LibraryStore();

function displayName(t: TrackRow): string {
  if (t.artist && t.title) return `${t.artist} — ${t.title}`;
  return t.title ?? t.path.split(/[/\\]/).pop() ?? t.path;
}

function normPath(p: string): string {
  return p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
}

function parentDir(p: string): string | null {
  const n = p.replace(/\//g, '\\').replace(/\\+$/, '');
  const i = n.lastIndexOf('\\');
  if (i <= 0) return null;
  // Keep drive root like "C:"
  if (i === 2 && n[1] === ':') return null;
  return n.slice(0, i);
}

function findFolderNode(nodes: FolderNode[], path: string): FolderNode | null {
  const target = normPath(path);
  for (const n of nodes) {
    if (normPath(n.path) === target) return n;
    const hit = findFolderNode(n.children, path);
    if (hit) return hit;
  }
  return null;
}
