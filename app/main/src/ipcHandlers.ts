import { BrowserWindow, ipcMain } from 'electron';
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
  FIXTURE_FOLDERS,
  FIXTURE_TRACKS,
  fixtureTrackDetail,
} from './fixtures';
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
  handle('library:query', () => FIXTURE_TRACKS);
  handle('library:folders', () => FIXTURE_FOLDERS);
  handle('library:track', (req) => fixtureTrackDetail(req.id));
  handle('library:rescan', () => {
    broadcast('library:progress', { phase: 'scan', scanned: 0, total: 3 });
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
  analysis.destroy();
}
