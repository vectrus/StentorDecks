import { app, BrowserWindow, dialog } from 'electron';
import path from 'node:path';
import { startAutoUpdater } from './autoUpdate';
import { getSchemaVersion, openDatabase } from './db/database';
import { registerIpcHandlers } from './ipcHandlers';
import { gracefulShutdown, registerLifecycleHandlers } from './lifecycle';
import { startBoothDisplayStayAwake } from './powerSave';
import { loadSettings, type SettingsFileState } from './settingsFile';
import { closeSplash, showSplash } from './splash';
import { waitForUrl } from './waitForUrl';
import { createMainWindow, preloadPathFromDist } from './windows';
import type { AppModeState, Settings } from '@stentordeck/shared';

// Windows taskbar / jump-list identity (must match electron-builder appId).
if (process.platform === 'win32') {
  app.setAppUserModelId('com.stentordeck.app');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  console.info('[app] another instance is running — focusing it and exiting');
  app.quit();
} else {
  void boot().catch(async (err) => {
    console.error('[app] boot failed', err);
    closeSplash();
    const detail = err instanceof Error ? err.stack ?? err.message : String(err);
    try {
      await app.whenReady();
      dialog.showErrorBox(
        'StentorDeck failed to start',
        `${detail}\n\nIf this mentions better-sqlite3, run: npm run rebuild:native\nThen try again (or reinstall from StentorDeck-Setup).`,
      );
    } catch {
      /* dialog unavailable */
    }
    gracefulShutdown('boot-failed');
    app.exit(1);
  });
}

async function boot(): Promise<void> {
  let settingsState: SettingsFileState;
  let mode: AppModeState;

  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed() && w.isVisible());
    const main = BrowserWindow.getAllWindows()[0];
    const focus = win ?? main;
    if (focus) {
      if (focus.isMinimized()) focus.restore();
      focus.focus();
    }
  });

  await app.whenReady();
  registerLifecycleHandlers();
  // Splash first — covers DB/IPC setup and (in dev) waiting for Vite.
  showSplash();

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
        recoveredFromCorruption: false,
        corruptionNotice: null,
      };
    },
    getMode: () => mode,
    setMode: (m) => {
      mode = m;
    },
  });
  startAutoUpdater();

  const startWindowedDev = process.env.STENTOR_WINDOWED === '1' || !app.isPackaged;
  const rendererUrl = process.env.VITE_DEV_SERVER_URL ?? null;
  const rendererFile = rendererUrl
    ? null
    : path.join(app.getAppPath(), 'app/renderer/dist/index.html');

  if (rendererUrl) {
    const waitMs = Number(process.env.STENTOR_WAIT_VITE_MS ?? 60_000);
    console.info(`[app] waiting for Vite at ${rendererUrl} (up to ${waitMs}ms)…`);
    const ok = await waitForUrl(rendererUrl, waitMs);
    if (!ok) {
      console.warn('[app] Vite not ready — loading URL anyway');
    }
  }

  createMainWindow({
    preloadPath: preloadPathFromDist(),
    rendererUrl,
    rendererFile,
    startFullscreen: settingsState.settings.ui.startInFullscreen,
    startWindowedDev,
  });
  // E7 booth: Windows must not dim/blank the screen mid-set (or during Prep).
  startBoothDisplayStayAwake();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showSplash();
      createMainWindow({
        preloadPath: preloadPathFromDist(),
        rendererUrl,
        rendererFile,
        startFullscreen: settingsState.settings.ui.startInFullscreen,
        startWindowedDev,
      });
    }
  });
}
