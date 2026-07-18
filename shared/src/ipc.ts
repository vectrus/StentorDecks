import type { DeepPartial, Settings } from './settings.js';

/** Library track row (docs/05 / E4). */
export type TrackRow = {
  id: number;
  path: string;
  title: string | null;
  artist: string | null;
  bpm: number | null;
  keyCamelot: string | null;
  durationMs: number | null;
  bpmSource: 'tag' | 'analysis' | 'manual' | null;
  lowConfidence: boolean;
  /** Analyzed first-beat offset (sec); null if unknown. */
  beatGridOffsetSec: number | null;
};

export type TrackDetail = TrackRow & {
  album: string | null;
  genre: string | null;
  waveformOverviewRef: string | null;
  waveformDetailRef: string | null;
};

export type FolderNode = {
  path: string;
  name: string;
  children: FolderNode[];
};

export type LibraryQuery = {
  folder?: string | null;
  search?: string | null;
  sort?: Settings['library']['sort'];
  /** Optional row cap (Perf strip / previews). */
  limit?: number;
};

export type LibraryStats = {
  trackCount: number;
};

export type AnalysisProgress = {
  trackId: number;
  stage: 'decode' | 'waveform' | 'bpm' | 'key' | 'loudness' | 'commit' | 'idle';
  queueDepth: number;
};

export type LibraryProgress = {
  phase: 'scan' | 'watch';
  current?: string;
  scanned: number;
  total?: number;
};

/** Bytes for deck load from library id (E4 load pathway; only paths under configured roots). */
export type LibraryReadResult = {
  id: number;
  path: string;
  title: string | null;
  artist: string | null;
  bpm: number | null;
  keyCamelot: string | null;
  loudnessLufs: number | null;
  durationMs: number | null;
  beatGridOffsetSec: number | null;
  bytes: Uint8Array;
};

/** Waveform blob for Perf well (E6) — overview 800×(min,max,rms) u8; detail 50 pps. */
export type LibraryWaveformResult = {
  trackId: number;
  kind: 'overview' | 'detail';
  bytes: Uint8Array;
  /** Detail peaks-per-second (null for overview). */
  detailPps: number | null;
};

export type AppModeState = {
  fullscreen: boolean;
  mode: 'performance' | 'prep';
};

export type MidiBinding =
  | { kind: 'button'; ch: number; note: number }
  | { kind: 'cc7'; ch: number; cc: number }
  | { kind: 'cc14'; ch: number; msb: number; lsb: number }
  | { kind: 'ccRel'; ch: number; cc: number };

export type MidiMapping = Record<string, MidiBinding>;

export type SettingsLoadResult = {
  settings: Settings;
  /** True when settings.json was corrupt and defaults were used. */
  recoveredFromCorruption: boolean;
  corruptionNotice: string | null;
};

/** Request/response IPC (invoke). docs/02 */
export type IpcInvokeMap = {
  'library:query': { req: LibraryQuery; res: TrackRow[] };
  'library:folders': { req: void; res: FolderNode[] };
  'library:stats': { req: void; res: LibraryStats };
  'library:track': { req: { id: number }; res: TrackDetail | null };
  'library:rescan': { req: { path?: string }; res: { ok: true } };
  'library:read': { req: { id: number }; res: LibraryReadResult | null };
  /** Overview/detail waveform blobs for Perf well (E6 / docs/05). */
  'library:waveform': {
    req: { id: number; kind: 'overview' | 'detail' };
    res: LibraryWaveformResult | null;
  };
  /** Native folder dialog for library roots (E4 first-run / settings). */
  'library:pickRoot': { req: void; res: { path: string } | null };
  /** Prep manual BPM/key (R6.6) — source becomes `manual`. */
  'library:updateManual': {
    req: {
      id: number;
      bpm?: number | null;
      keyCamelot?: string | null;
      keyName?: string | null;
      /** Set/clear grid offset; omit to leave unchanged. Numeric BPM clear uses null. */
      beatGridOffsetSec?: number | null;
    };
    res: TrackRow | null;
  };
  'analysis:enqueue': {
    req: { trackIds: number[]; priority: 'deck' | 'new' | 'backfill' };
    res: { ok: true; queueDepth: number };
  };
  'settings:get': { req: void; res: SettingsLoadResult };
  'settings:set': { req: DeepPartial<Settings>; res: Settings };
  'midi:mapping:get': { req: void; res: MidiMapping };
  'midi:mapping:set': { req: MidiMapping; res: { ok: true } };
  'midi:mapping:export': { req: void; res: string };
  'midi:mapping:import': { req: { json: string }; res: MidiMapping };
  'midi:mapping:reset': { req: void; res: MidiMapping };
  'app:mode:get': { req: void; res: AppModeState };
  'app:mode:set': { req: Partial<AppModeState>; res: AppModeState };
  'app:fullscreen:toggle': { req: void; res: { fullscreen: boolean } };
};

/** Event channels (main → renderer). */
export type IpcEventMap = {
  'settings:changed': Settings;
  'analysis:progress': AnalysisProgress;
  'library:progress': LibraryProgress;
  'app:mode:changed': AppModeState;
};

export type IpcChannel = keyof IpcInvokeMap;
export type IpcEventChannel = keyof IpcEventMap;

export const IPC_INVOKE_CHANNELS = [
  'library:query',
  'library:folders',
  'library:stats',
  'library:track',
  'library:rescan',
  'library:read',
  'library:waveform',
  'library:pickRoot',
  'library:updateManual',
  'analysis:enqueue',
  'settings:get',
  'settings:set',
  'midi:mapping:get',
  'midi:mapping:set',
  'midi:mapping:export',
  'midi:mapping:import',
  'midi:mapping:reset',
  'app:mode:get',
  'app:mode:set',
  'app:fullscreen:toggle',
] as const satisfies readonly IpcChannel[];

export const IPC_EVENT_CHANNELS = [
  'settings:changed',
  'analysis:progress',
  'library:progress',
  'app:mode:changed',
] as const satisfies readonly IpcEventChannel[];

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}

/** Preload → renderer bridge (implemented in app/main preload). */
export type StentorApi = {
  invoke<K extends keyof IpcInvokeMap>(
    channel: K,
    ...args: IpcInvokeMap[K]['req'] extends void ? [] : [IpcInvokeMap[K]['req']]
  ): Promise<IpcInvokeMap[K]['res']>;
  on<K extends IpcEventChannel>(
    channel: K,
    listener: (payload: IpcEventMap[K]) => void,
  ): () => void;
};
