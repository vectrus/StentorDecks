import { makeAutoObservable, runInAction } from 'mobx';
import {
  averageTapBpm,
  camelotDisplayName,
  encodeWavPcm16le,
  expectedMpegDurationSec,
  isCamelotKey,
  isLikelyTruncatedDecode,
  rescaleBeatGridOffsetSec,
  withFixedBySdTitle,
  type AnalysisProgress,
  type FolderNode,
  type LibraryProgress,
  type Mp3InspectResult,
  type TrackRow,
} from '@stentordeck/shared';
import { decodeArrayBufferOffThread } from '../audio/decodeAudio';
import { invoke, onIpc } from '../ipc/client';
import { settingsStore } from './SettingsStore';

/**
 * Library browser + RMX2 browse cluster target (E4 / R5.3).
 * Two panes (Djuced-style): folder tree left, tracks right.
 * MIDI/keyboard up·down navigate the focused pane; left/right switch/expand.
 */

export type LibraryBrowseEntry =
  | { kind: 'folder'; path: string; name: string }
  | { kind: 'track'; track: TrackRow; name: string };

export type BrowsePane = 'tree' | 'files';

export type TreeRow = {
  path: string;
  name: string;
  depth: number;
  hasChildren: boolean;
};

export class LibraryStore {
  folders: FolderNode[] = [];
  tracks: TrackRow[] = [];
  /** Absolute folder path currently listed in the file pane; null = none. */
  openFolder: string | null = null;
  search = '';
  /** Focused pane for browse up/down (R5.3). */
  browsePane: BrowsePane = 'tree';
  /** Expanded folder paths in the tree (MIDI + mouse). */
  treeExpanded = new Set<string>();
  /** Cursor into `visibleTreeRows`. */
  treeCursor = 0;
  /** Row cursor into file-pane `entries` (tracks). */
  cursor = 0;
  progress: LibraryProgress | null = null;
  scanning = false;
  ready = false;
  error: string | null = null;
  /** Last MIDI/UI load failure (playing interlock etc.). */
  loadError: string | null = null;
  private loadErrorTimer: ReturnType<typeof setTimeout> | null = null;
  /** Tap-tempo timestamps for selected track (R6.6). */
  tapTimes: number[] = [];
  tapPreviewBpm: number | null = null;
  /** Last analysis:enqueue / progress hint for Prep Detect (E5 fills this in). */
  detectStatus: string | null = null;
  analysisProgress: AnalysisProgress | null = null;
  /** Prep R5.9 — last MP3 health check for the selected track. */
  mp3Inspect: Mp3InspectResult | null = null;
  mp3FixStatus: string | null = null;
  mp3FixBusy = false;
  /** Live library size for Perf strip summary. */
  trackCount = 0;

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  get analyzingCount(): number {
    const p = this.analysisProgress;
    if (!p) return 0;
    if (p.stage !== 'idle') return Math.max(1, p.queueDepth);
    return p.queueDepth;
  }

  constructor() {
    makeAutoObservable<LibraryStore, 'loadErrorTimer' | 'searchTimer'>(
      this,
      { loadErrorTimer: false, searchTimer: false },
      { autoBind: true },
    );
  }

  /**
   * File pane rows (Djuced-style / mockup 02): tracks only.
   * Folders live exclusively in the left tree — never as `[dir]` rows here.
   */
  get entries(): LibraryBrowseEntry[] {
    if (this.search.trim()) {
      return this.tracks.map((t) => ({
        kind: 'track' as const,
        track: t,
        name: displayName(t),
      }));
    }
    // No folder selected — empty file pane (pick a crate in the tree).
    if (this.openFolder == null) return [];
    return this.tracks.map((t) => ({
      kind: 'track' as const,
      track: t,
      name: displayName(t),
    }));
  }

  /** Visible folder rows in the left tree (respects expand/collapse). */
  get visibleTreeRows(): TreeRow[] {
    const rows: TreeRow[] = [];
    const walk = (nodes: FolderNode[], depth: number): void => {
      const sorted = [...nodes].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      for (const n of sorted) {
        const hasChildren = n.children.length > 0;
        rows.push({
          path: n.path,
          name: n.name,
          depth,
          hasChildren,
        });
        if (hasChildren && this.treeExpanded.has(n.path)) {
          walk(n.children, depth + 1);
        }
      }
    };
    walk(this.folders, 0);
    return rows;
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
    if (this.openFolder == null) return 'All';
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
      const [folders, tracks, stats] = await Promise.all([
        invoke('library:folders'),
        searching || this.openFolder != null
          ? invoke('library:query', {
              folder: searching ? null : this.openFolder,
              search: searching ? this.search.trim() : null,
              sort,
            })
          : Promise.resolve([] as TrackRow[]),
        invoke('library:stats'),
      ]);
      runInAction(() => {
        this.folders = folders;
        this.tracks = tracks;
        this.trackCount = stats.trackCount;
        this.ensureRootFoldersExpanded();
        this.syncTreeCursorToOpenFolder();
        this.clampCursor();
        this.clampTreeCursor();
        this.error = null;
      });
    } catch (err) {
      runInAction(() => {
        this.error = err instanceof Error ? err.message : String(err);
      });
    }
  }

  focusBrowsePane(pane: BrowsePane): void {
    this.browsePane = pane;
  }

  selectIndex(index: number): void {
    this.browsePane = 'files';
    const n = this.entries.length;
    if (n === 0) {
      this.cursor = 0;
      return;
    }
    const next = Math.max(0, Math.min(n - 1, index));
    if (next !== this.cursor) this.clearTaps();
    this.cursor = next;
  }

  /** Mouse / tree click — select folder and show its tracks (stay on tree pane). */
  selectTreePath(path: string): void {
    this.browsePane = 'tree';
    this.applyTreeSelection(path);
  }

  toggleTreeExpanded(path: string): void {
    if (this.treeExpanded.has(path)) this.treeExpanded.delete(path);
    else this.treeExpanded.add(path);
    this.clampTreeCursor();
  }

  /** Up — move selection in the focused pane (R5.3). */
  up(): void {
    if (this.search.trim() || this.browsePane === 'files') {
      this.browsePane = 'files';
      this.selectIndex(this.cursor - 1);
      return;
    }
    this.moveTreeCursor(-1);
  }

  /** Down — move selection in the focused pane (R5.3). */
  down(): void {
    if (this.search.trim() || this.browsePane === 'files') {
      this.browsePane = 'files';
      this.selectIndex(this.cursor + 1);
      return;
    }
    this.moveTreeCursor(1);
  }

  /**
   * Right — tree: expand (if collapsed) or focus file pane; files: no-op (R5.3).
   */
  enter(): void {
    if (this.search.trim()) return;
    if (this.browsePane === 'files') return;

    const row = this.visibleTreeRows[this.treeCursor];
    if (!row) {
      if (this.openFolder != null && this.entries.length > 0) {
        this.browsePane = 'files';
        this.cursor = 0;
      }
      return;
    }
    this.applyTreeSelection(row.path);
    if (row.hasChildren && !this.treeExpanded.has(row.path)) {
      this.treeExpanded.add(row.path);
      return;
    }
    // Leaf or already expanded → move focus to the track list.
    this.browsePane = 'files';
    this.cursor = 0;
  }

  /**
   * Left — files: focus tree; tree: collapse (if expanded) or parent folder (R5.3).
   * Never jumps to a blank “Library” root via browse.
   */
  parent(): void {
    if (this.search.trim()) {
      this.setSearch('');
      return;
    }
    if (this.browsePane === 'files') {
      this.browsePane = 'tree';
      this.syncTreeCursorToOpenFolder();
      return;
    }
    const row = this.visibleTreeRows[this.treeCursor];
    if (!row) return;
    if (row.hasChildren && this.treeExpanded.has(row.path)) {
      this.treeExpanded.delete(row.path);
      return;
    }
    const parent = parentDir(row.path);
    if (parent != null && this.findTreeRowIndex(parent) >= 0) {
      this.applyTreeSelection(parent);
      return;
    }
    // Already at a library root — stay put (do not clear openFolder).
  }

  private moveTreeCursor(delta: number): void {
    const rows = this.visibleTreeRows;
    if (rows.length === 0) return;
    this.treeCursor = Math.max(0, Math.min(rows.length - 1, this.treeCursor + delta));
    const row = rows[this.treeCursor];
    if (row) this.applyTreeSelection(row.path);
  }

  private applyTreeSelection(path: string): void {
    const changed =
      this.openFolder == null || normPath(this.openFolder) !== normPath(path);
    this.openFolder = path;
    this.search = '';
    this.ensureAncestorsExpanded(path);
    this.syncTreeCursorToOpenFolder();
    if (changed) {
      this.cursor = 0;
      void this.refresh();
    }
  }

  private ensureRootFoldersExpanded(): void {
    for (const r of this.folders) {
      this.treeExpanded.add(r.path);
    }
  }

  /** Expand parents so `path` is visible in `visibleTreeRows`. */
  private ensureAncestorsExpanded(path: string): void {
    let cur = parentDir(path);
    while (cur != null) {
      this.treeExpanded.add(cur);
      if (this.isRootPath(cur)) break;
      cur = parentDir(cur);
    }
  }

  private syncTreeCursorToOpenFolder(): void {
    if (this.openFolder == null) {
      this.treeCursor = 0;
      return;
    }
    this.ensureAncestorsExpanded(this.openFolder);
    const idx = this.findTreeRowIndex(this.openFolder);
    if (idx >= 0) this.treeCursor = idx;
  }

  private findTreeRowIndex(path: string): number {
    const target = normPath(path);
    return this.visibleTreeRows.findIndex((r) => normPath(r.path) === target);
  }

  private clampCursor(): void {
    const n = this.entries.length;
    if (n === 0) {
      this.cursor = 0;
      return;
    }
    if (this.cursor > n - 1) this.cursor = n - 1;
  }

  private clampTreeCursor(): void {
    const n = this.visibleTreeRows.length;
    if (n === 0) {
      this.treeCursor = 0;
      return;
    }
    if (this.treeCursor > n - 1) this.treeCursor = n - 1;
  }

  private isRootPath(folder: string): boolean {
    const n = normPath(folder);
    return this.folders.some((f) => normPath(f.path) === n);
  }

  setOpenFolder(folder: string | null): void {
    this.browsePane = 'tree';
    if (folder == null) {
      this.openFolder = null;
      this.search = '';
      this.cursor = 0;
      this.treeCursor = 0;
      void this.refresh();
      return;
    }
    this.applyTreeSelection(folder);
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

  /** Surface load interlock / reject (toast + strip); auto-clears. */
  rejectLoad(message: string): void {
    this.setLoadError(message);
  }

  clearLoadError(): void {
    if (this.loadErrorTimer != null) {
      clearTimeout(this.loadErrorTimer);
      this.loadErrorTimer = null;
    }
    this.loadError = null;
  }

  private setLoadError(message: string): void {
    if (this.loadErrorTimer != null) clearTimeout(this.loadErrorTimer);
    this.loadError = message;
    this.loadErrorTimer = setTimeout(() => {
      runInAction(() => {
        this.loadError = null;
        this.loadErrorTimer = null;
      });
    }, 3500);
  }

  /**
   * Load button (R4.2 / R5.3) — only when cursor is on a track.
   * Fire-and-forget friendly for MIDI; sets `loadError` on failure.
   */
  requestLoad(deck: {
    load: (
      file: File,
      meta?: {
        title?: string;
        artist?: string;
        fileBpm?: number | null;
        keyCamelot?: string | null;
        loudnessLufs?: number | null;
        beatGridOffsetSec?: number | null;
        libraryTrackId?: number | null;
        durationMs?: number | null;
      },
    ) => Promise<void>;
  }): void {
    void this.loadSelected(deck).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      runInAction(() => {
        this.setLoadError(msg);
      });
      console.warn('[library] load rejected', err);
    });
  }

  async loadSelected(deck: {
    load: (
      file: File,
      meta?: {
        title?: string;
        artist?: string;
        fileBpm?: number | null;
        keyCamelot?: string | null;
        loudnessLufs?: number | null;
        beatGridOffsetSec?: number | null;
        libraryTrackId?: number | null;
        durationMs?: number | null;
      },
    ) => Promise<void>;
  }): Promise<void> {
    const row = this.selectedTrack;
    if (!row) {
      this.setLoadError('Select a track (not a folder)');
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
      keyCamelot: payload.keyCamelot,
      loudnessLufs: payload.loudnessLufs,
      beatGridOffsetSec: payload.beatGridOffsetSec,
      libraryTrackId: payload.id,
      durationMs: payload.durationMs,
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
    // Numeric / tap replace clears beatgrid until Detect (docs/05).
    const next = await invoke('library:updateManual', {
      id: row.id,
      bpm,
      beatGridOffsetSec: null,
    });
    this.patchLocalTrack(next);
  }

  async halfBpm(): Promise<void> {
    const row = this.selectedTrack;
    if (!row || row.bpm == null) return;
    const nextBpm = Math.round((row.bpm / 2) * 10) / 10;
    const offset = rescaleBeatGridOffsetSec(row.beatGridOffsetSec, nextBpm);
    const next = await invoke('library:updateManual', {
      id: row.id,
      bpm: nextBpm,
      beatGridOffsetSec: offset,
    });
    this.patchLocalTrack(next);
  }

  async doubleBpm(): Promise<void> {
    const row = this.selectedTrack;
    if (!row || row.bpm == null) return;
    const nextBpm = Math.round(row.bpm * 2 * 10) / 10;
    const offset = rescaleBeatGridOffsetSec(row.beatGridOffsetSec, nextBpm);
    const next = await invoke('library:updateManual', {
      id: row.id,
      bpm: nextBpm,
      beatGridOffsetSec: offset,
    });
    this.patchLocalTrack(next);
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

  /**
   * Prep R5.9 — quick Chromium decode vs Xing/tag duration (does not write files).
   */
  async checkSelectedMp3(): Promise<void> {
    const row = this.selectedTrack;
    if (!row) return;
    const isMp3 = /\.mp3$/i.test(row.path);
    runInAction(() => {
      this.mp3FixStatus = isMp3 ? 'Checking MP3…' : null;
      this.mp3Inspect = null;
    });
    if (!isMp3) {
      runInAction(() => {
        this.mp3Inspect = {
          trackId: row.id,
          path: row.path,
          isMp3: false,
          expectedSec: null,
          decodedSec: 0,
          needsFix: false,
          detail: 'Not an MP3 — fix is only for damaged MP3s (writes a sibling WAV).',
        };
        this.mp3FixStatus = null;
      });
      return;
    }

    try {
      const payload = await invoke('library:read', { id: row.id });
      if (!payload) throw new Error('Could not read track file');
      const u8 = payload.bytes;
      const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const expected =
        expectedMpegDurationSec(u8, (payload.durationMs ?? row.durationMs ?? 0) / 1000) ??
        null;
      const probe = new OfflineAudioContext(2, 128, 44100);
      const naive = await probe.decodeAudioData(ab.slice(0));
      const needsFix = isLikelyTruncatedDecode(naive.duration, expected);
      const detail = needsFix
        ? `Chromium hears ${naive.duration.toFixed(1)}s but file looks like ~${(expected ?? 0).toFixed(1)}s — write a Fixed-by-SD WAV.`
        : `Decode looks complete (${naive.duration.toFixed(1)}s). You can still write a Fixed WAV if you hear clicks.`;
      runInAction(() => {
        this.mp3Inspect = {
          trackId: row.id,
          path: payload.path,
          isMp3: true,
          expectedSec: expected,
          decodedSec: naive.duration,
          needsFix,
          detail,
        };
        this.mp3FixStatus = needsFix ? 'Needs fix' : 'OK';
      });
    } catch (err) {
      runInAction(() => {
        this.mp3FixStatus = err instanceof Error ? err.message : String(err);
      });
    }
  }

  /**
   * Prep R5.9 — resilient decode → sibling `* (Fixed by SD).wav`. Never touches the MP3.
   */
  async fixSelectedMp3(): Promise<void> {
    const row = this.selectedTrack;
    if (!row || this.mp3FixBusy) return;
    if (!/\.mp3$/i.test(row.path)) {
      runInAction(() => {
        this.mp3FixStatus = 'Select an MP3 first';
      });
      return;
    }

    runInAction(() => {
      this.mp3FixBusy = true;
      this.mp3FixStatus = 'Decoding (resilient)…';
    });

    try {
      const payload = await invoke('library:read', { id: row.id });
      if (!payload) throw new Error('Could not read track file');
      const u8 = payload.bytes;
      const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
      const expected =
        expectedMpegDurationSec(u8, (payload.durationMs ?? row.durationMs ?? 0) / 1000) ??
        null;
      const probe = new OfflineAudioContext(2, 128, 44100);
      const buf = await decodeArrayBufferOffThread(probe, ab, {
        expectedDurationSec: expected,
      });

      runInAction(() => {
        this.mp3FixStatus = 'Writing sibling WAV…';
      });

      const channels: Float32Array[] = [];
      for (let c = 0; c < buf.numberOfChannels; c++) {
        channels.push(buf.getChannelData(c));
      }
      const wavBytes = encodeWavPcm16le({
        sampleRate: buf.sampleRate,
        numberOfChannels: buf.numberOfChannels,
        channelData: channels,
      });

      const title = withFixedBySdTitle(payload.title ?? row.title, 'Track');
      const result = await invoke('library:mp3FixWrite', {
        sourceTrackId: row.id,
        wavBytes,
        title,
        artist: payload.artist ?? row.artist,
      });

      if (!result.ok) throw new Error(result.reason);

      await this.refresh();
      runInAction(() => {
        const idx = this.entries.findIndex(
          (e) => e.kind === 'track' && e.track.id === result.trackId,
        );
        if (idx >= 0) this.cursor = idx;
        this.mp3FixStatus = `Wrote ${result.path.split(/[/\\]/).pop()} — original untouched`;
        this.mp3Inspect = null;
        this.mp3FixBusy = false;
      });
    } catch (err) {
      runInAction(() => {
        this.mp3FixBusy = false;
        this.mp3FixStatus = err instanceof Error ? err.message : String(err);
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
