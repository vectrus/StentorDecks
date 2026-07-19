/**
 * Packaged-app updates via electron-updater + GitHub Releases (E7 / R1.1).
 * No-op in dev (`!app.isPackaged`).
 */
import { app } from 'electron';
import type { AppUpdateStatus } from '@stentordeck/shared';
import type { AppUpdater } from 'electron-updater';
import { broadcast } from './ipcBroadcast';

type UpdaterModule = {
  autoUpdater?: AppUpdater;
  default?: { autoUpdater?: AppUpdater };
};

/**
 * Interop-safe access to electron-updater's lazy `autoUpdater` export.
 * The package defines it via an `Object.defineProperty` getter, which Node's
 * CJS named-export detection can't see — so `const { autoUpdater } =
 * await import('electron-updater')` is undefined in the packaged app and only
 * `.default` carries the real module ("reading 'checkForUpdates'" crash).
 */
export function resolveAutoUpdater(mod: UpdaterModule): AppUpdater {
  const updater = mod.autoUpdater ?? mod.default?.autoUpdater;
  if (!updater) throw new Error('electron-updater loaded but autoUpdater export missing');
  return updater;
}

async function loadAutoUpdater(): Promise<AppUpdater> {
  return resolveAutoUpdater((await import('electron-updater')) as UpdaterModule);
}

let status: AppUpdateStatus = {
  phase: 'disabled',
  packaged: false,
  currentVersion: app.getVersion(),
  availableVersion: null,
  percent: null,
  error: null,
};

let started = false;

function publish(partial: Partial<AppUpdateStatus>): AppUpdateStatus {
  status = { ...status, ...partial, currentVersion: app.getVersion(), packaged: app.isPackaged };
  broadcast('app:update:changed', status);
  return status;
}

export function getUpdateStatus(): AppUpdateStatus {
  return {
    ...status,
    currentVersion: app.getVersion(),
    packaged: app.isPackaged,
  };
}

export async function checkForAppUpdates(): Promise<AppUpdateStatus> {
  if (!app.isPackaged) {
    return publish({
      phase: 'disabled',
      error: null,
      availableVersion: null,
      percent: null,
    });
  }
  try {
    const autoUpdater = await loadAutoUpdater();
    publish({ phase: 'checking', error: null });
    await autoUpdater.checkForUpdates();
    return getUpdateStatus();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return publish({ phase: 'error', error: message });
  }
}

export async function installAppUpdate(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!app.isPackaged) {
    return { ok: false, reason: 'Updates only apply to the installed app (not npm start).' };
  }
  if (status.phase !== 'downloaded') {
    return { ok: false, reason: 'No update downloaded yet.' };
  }
  try {
    const autoUpdater = await loadAutoUpdater();
    // Let lifecycle before-quit run gracefulShutdown.
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    publish({ phase: 'error', error: message });
    return { ok: false, reason: message };
  }
}

/** Call once after app.whenReady + IPC registered. */
export function startAutoUpdater(): void {
  if (started) return;
  started = true;

  status = {
    phase: app.isPackaged ? 'idle' : 'disabled',
    packaged: app.isPackaged,
    currentVersion: app.getVersion(),
    availableVersion: null,
    percent: null,
    error: null,
  };

  if (!app.isPackaged) {
    console.info('[update] skipped (not packaged)');
    return;
  }

  void (async () => {
    try {
      const autoUpdater = await loadAutoUpdater();
      autoUpdater.logger = console;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      // Unsigned NSIS builds (no code-signing cert yet).
      // electron-builder writes verifyUpdateCodeSignature:false into app-update.yml.
      autoUpdater.forceDevUpdateConfig = false;

      autoUpdater.on('checking-for-update', () => {
        publish({ phase: 'checking', error: null });
      });
      autoUpdater.on('update-available', (info) => {
        publish({
          phase: 'available',
          availableVersion: info.version,
          error: null,
          percent: 0,
        });
      });
      autoUpdater.on('update-not-available', () => {
        publish({
          phase: 'not-available',
          availableVersion: null,
          percent: null,
          error: null,
        });
      });
      autoUpdater.on('download-progress', (p) => {
        publish({
          phase: 'downloading',
          percent: Math.round(p.percent),
          error: null,
        });
      });
      autoUpdater.on('update-downloaded', (info) => {
        publish({
          phase: 'downloaded',
          availableVersion: info.version,
          percent: 100,
          error: null,
        });
      });
      autoUpdater.on('error', (err) => {
        publish({
          phase: 'error',
          error: err?.message ?? String(err),
        });
      });

      // Quiet startup check — failures stay in status, never crash boot.
      setTimeout(() => {
        void checkForAppUpdates();
      }, 8_000);
    } catch (err) {
      console.error('[update] failed to init', err);
      publish({
        phase: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();
}
