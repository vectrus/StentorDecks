import { dialog, ipcMain } from 'electron';
import type {
  AppModeState,
  DeepPartial,
  IpcInvokeMap,
  Settings,
} from '@stentordeck/shared';
import {
  createAnalysisSupervisor,
  setAnalysisProgressBroadcast,
  type AnalysisSupervisor,
} from './analysisSupervisor';
import {
  checkForAppUpdates,
  getUpdateStatus,
  installAppUpdate,
} from './autoUpdate';
import { getDb } from './db/database';
import {
  exportMidiMappingJson,
  importMidiMappingJson,
  loadMidiMapping,
  resetMidiMapping,
  saveMidiMapping,
} from './db/midiMapRepo';
import {
  buildFolderTree,
  countLiveTracks,
  getTrackDetail,
  getWaveformBlob,
  queryTracks,
  readTrackFile,
  updateManualMeta,
} from './db/tracksRepo';
import { writeFixedMp3Sibling } from './library/mp3FixWrite';
import { broadcast } from './ipcBroadcast';
import { createLibraryWatcher, type LibraryWatcher } from './scanner/libraryWatcher';
import { scanLibraryRoots } from './scanner/scanLibrary';
import { applySettingsPatch, type SettingsFileState } from './settingsFile';
import { getMainWindow, toggleFullscreen } from './windows';

export { broadcast };

type Ctx = {
  userDataPath: string;
  getSettingsState: () => SettingsFileState;
  setSettings: (s: Settings) => void;
  getMode: () => AppModeState;
  setMode: (m: AppModeState) => void;
};

// Single supervisor instance — created in registerIpcHandlers (a second
// createAnalysisSupervisor() would steal the ipcMain result listeners and
// stall this one's queue after its first job).
let analysis: AnalysisSupervisor | null = null;
let libraryWatcher: LibraryWatcher | null = null;

function handle<K extends keyof IpcInvokeMap>(
  channel: K,
  fn: (
    req: IpcInvokeMap[K]['req'],
  ) => IpcInvokeMap[K]['res'] | Promise<IpcInvokeMap[K]['res']>,
): void {
  ipcMain.handle(channel, async (_event, req: IpcInvokeMap[K]['req']) => fn(req));
}

export function registerIpcHandlers(ctx: Ctx): void {
  const supervisor = createAnalysisSupervisor();
  analysis = supervisor;
  setAnalysisProgressBroadcast((p) => broadcast('analysis:progress', p));
  libraryWatcher = createLibraryWatcher(getDb, (p) => broadcast('library:progress', p));
  libraryWatcher.setRoots(ctx.getSettingsState().settings.library.roots);

  handle('library:query', (req) => {
    const sort = req?.sort ?? ctx.getSettingsState().settings.library.sort;
    return queryTracks(getDb(), { ...req, sort });
  });
  handle('library:folders', () => {
    const roots = ctx.getSettingsState().settings.library.roots;
    return buildFolderTree(getDb(), roots);
  });
  handle('library:stats', () => ({ trackCount: countLiveTracks(getDb()) }));
  handle('library:track', (req) => getTrackDetail(getDb(), req.id));
  handle('library:read', (req) => {
    const roots = ctx.getSettingsState().settings.library.roots;
    return readTrackFile(getDb(), req.id, roots);
  });
  handle('library:waveform', (req) => {
    const bytes = getWaveformBlob(getDb(), req.id, req.kind);
    if (!bytes) return null;
    return {
      trackId: req.id,
      kind: req.kind,
      bytes,
      detailPps: req.kind === 'detail' ? 50 : null,
    };
  });
  handle('library:pickRoot', async () => {
    const win = getMainWindow();
    const opts = {
      title: 'Choose music folder',
      properties: ['openDirectory' as const],
    };
    const result = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts);
    if (result.canceled || result.filePaths.length === 0) return null;
    return { path: result.filePaths[0]! };
  });
  handle('library:updateManual', (req) =>
    updateManualMeta(getDb(), req.id, {
      bpm: req.bpm,
      keyCamelot: req.keyCamelot,
      keyName: req.keyName,
      beatGridOffsetSec: req.beatGridOffsetSec,
    }),
  );
  handle('library:mp3FixWrite', async (req) => {
    const roots = ctx.getSettingsState().settings.library.roots;
    const result = await writeFixedMp3Sibling(getDb(), roots, req);
    if (result.ok) {
      supervisor.enqueue([result.trackId], 'new');
      broadcast('library:progress', {
        phase: 'watch',
        scanned: 1,
        current: result.path,
      });
    }
    return result;
  });
  handle('library:rescan', async (req) => {
    const settings = ctx.getSettingsState().settings;
    const partial = req.path != null && req.path !== '';
    const roots = partial ? [req.path!] : settings.library.roots;
    if (roots.length === 0) {
      broadcast('library:progress', { phase: 'scan', scanned: 0, total: 0 });
      return { ok: true as const };
    }
    // Partial path rescan must not mark tracks outside that tree as missing.
    await scanLibraryRoots(getDb(), roots, (p) => broadcast('library:progress', p), {
      markMissing: !partial,
    });
    libraryWatcher?.setRoots(settings.library.roots);
    supervisor.kickBackfill();
    return { ok: true as const };
  });

  handle('analysis:enqueue', (req) => {
    const queueDepth = supervisor.enqueue(req.trackIds, req.priority);
    return { ok: true as const, queueDepth };
  });

  handle('settings:get', () => {
    const state = ctx.getSettingsState();
    return {
      settings: state.settings,
      recoveredFromCorruption: state.recoveredFromCorruption,
      corruptionNotice: state.corruptionNotice,
    };
  });

  handle('settings:set', (patch) => {
    const current = ctx.getSettingsState().settings;
    const next = applySettingsPatch(ctx.userDataPath, current, patch as DeepPartial<Settings>);
    ctx.setSettings(next);
    libraryWatcher?.setRoots(next.library.roots);
    broadcast('settings:changed', next);
    return next;
  });

  handle('midi:mapping:get', () => loadMidiMapping(getDb()));
  handle('midi:mapping:set', (mapping) => {
    saveMidiMapping(getDb(), mapping);
    return { ok: true as const };
  });
  handle('midi:mapping:export', () => exportMidiMappingJson(getDb()));
  handle('midi:mapping:import', (req) => importMidiMappingJson(getDb(), req.json));
  handle('midi:mapping:reset', () => resetMidiMapping(getDb()));

  handle('app:mode:get', () => ctx.getMode());
  handle('app:mode:set', (partial) => {
    const next = { ...ctx.getMode(), ...partial };
    ctx.setMode(next);
    const win = getMainWindow();
    if (partial.fullscreen !== undefined && win) {
      win.setFullScreen(partial.fullscreen);
    }
    broadcast('app:mode:changed', next);
    return next;
  });

  handle('app:fullscreen:toggle', () => {
    const fullscreen = toggleFullscreen();
    const next = { ...ctx.getMode(), fullscreen };
    ctx.setMode(next);
    broadcast('app:mode:changed', next);
    return { fullscreen };
  });

  handle('app:update:status', () => getUpdateStatus());
  handle('app:update:check', () => checkForAppUpdates());
  handle('app:update:install', () => installAppUpdate());
}

export function disposeIpc(): void {
  void libraryWatcher?.close();
  libraryWatcher = null;
  analysis?.destroy();
  analysis = null;
}
