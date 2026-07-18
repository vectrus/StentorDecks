import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createAnalysisSupervisor } from './analysisSupervisor';
import { closeDatabase, getSchemaVersion, openDatabase } from './db/database';
import { disposeIpc, registerIpcHandlers } from './ipcHandlers';
import { loadSettings, type SettingsFileState } from './settingsFile';
import { createMainWindow, preloadPathFromDist } from './windows';
import type { AppModeState, Settings } from '@stentordeck/shared';

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.info('[app] another instance is running — focusing it and exiting');
  app.quit();
} else {
  void boot().catch((err) => {
    console.error('[app] boot failed', err);
    app.exit(1);
  });
}

async function boot(): Promise<void> {
  let settingsState: SettingsFileState;
  let mode: AppModeState;

  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  await app.whenReady();

  const userDataPath = app.getPath('userData');
  settingsState = loadSettings(userDataPath);
  try {
    openDatabase(userDataPath);
    console.info(`[db] schema_version=${getSchemaVersion()}`);
  } catch (err) {
    console.error('[db] fatal open failure — run npm run rebuild:native', err);
    throw err;
  }

  mode = {
    fullscreen: settingsState.settings.ui.startInFullscreen,
    mode: settingsState.settings.ui.startMode,
  };

  registerIpcHandlers({
    userDataPath,
    getSettingsState: () => settingsState,
    setSettings: (s: Settings) => {
      settingsState = {
        ...settingsState,
        settings: s,
        // clear one-shot corruption notice after first successful set
        recoveredFromCorruption: false,
        corruptionNotice: null,
      };
    },
    getMode: () => mode,
    setMode: (m) => {
      mode = m;
    },
  });

  // Keep supervisor constructible; E5 creates the window.
  createAnalysisSupervisor();

  const startWindowedDev = process.env.STENTOR_WINDOWED === '1' || !app.isPackaged;
  const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? null;
  const rendererFile = rendererUrl
    ? null
    : path.join(app.getAppPath(), 'app/renderer/dist/index.html');

  createMainWindow({
    preloadPath: preloadPathFromDist(),
    rendererUrl,
    rendererFile,
    startFullscreen: settingsState.settings.ui.startInFullscreen,
    startWindowedDev,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow({
        preloadPath: preloadPathFromDist(),
        rendererUrl,
        rendererFile,
        startFullscreen: settingsState.settings.ui.startInFullscreen,
        startWindowedDev,
      });
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      disposeIpc();
      closeDatabase();
      app.quit();
    }
  });
}
