import { BrowserWindow, dialog, ipcMain } from 'electron';
import type {
  AppModeState,
  DeepPartial,
  IpcEventMap,
  IpcInvokeMap,
  Settings,
} from '@stentordeck/shared';
import { createAnalysisSupervisor } from './analysisSupervisor';
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
  getTrackDetail,
  queryTracks,
  readTrackFile,
  updateManualMeta,
} from './db/tracksRepo';
import { createLibraryWatcher, type LibraryWatcher } from './scanner/libraryWatcher';
import { scanLibraryRoots } from './scanner/scanLibrary';
import { applySettingsPatch, type SettingsFileState } from './settingsFile';
import { getMainWindow, toggleFullscreen } from './windows';

type Ctx = {
  userDataPath: string;
  getSettingsState: () => SettingsFileState;
  setSettings: (s: Settings) => void;
  getMode: () => AppModeState;
  setMode: (m: AppModeState) => void;
};

const analysis = createAnalysisSupervisor();
let libraryWatcher: LibraryWatcher | null = null;

export function broadcast<K extends keyof IpcEventMap>(channel: K, payload: IpcEventMap[K]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}

function handle<K extends keyof IpcInvokeMap>(
  channel: K,
  fn: (
    req: IpcInvokeMap[K]['req'],
  ) => IpcInvokeMap[K]['res'] | Promise<IpcInvokeMap[K]['res']>,
): void {
  ipcMain.handle(channel, async (_event, req: IpcInvokeMap[K]['req']) => fn(req));
}

export function registerIpcHandlers(ctx: Ctx): void {
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
  handle('library:track', (req) => getTrackDetail(getDb(), req.id));
  handle('library:read', (req) => {
    const roots = ctx.getSettingsState().settings.library.roots;
    return readTrackFile(getDb(), req.id, roots);
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
    }),
  );
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
    return { ok: true as const };
  });

  handle('analysis:enqueue', (req) => {
    analysis.ensureAnalysisWindow();
    broadcast('analysis:progress', {
      trackId: req.trackIds[0] ?? 0,
      stage: 'idle',
      queueDepth: req.trackIds.length,
    });
    return { ok: true as const, queueDepth: req.trackIds.length };
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
}

export function disposeIpc(): void {
  void libraryWatcher?.close();
  libraryWatcher = null;
  analysis.destroy();
}
