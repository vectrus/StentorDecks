import { app } from 'electron';
import { closeDatabase } from './db/database';
import { disposeIpc } from './ipcHandlers';
import { stopBoothDisplayStayAwake } from './powerSave';
import { closeSplash } from './splash';

let shuttingDown = false;

/**
 * Idempotent teardown — analysis window, library watcher, SQLite, splash.
 * Safe to call from window-all-closed and before-quit.
 */
export function gracefulShutdown(reason: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[app] shutting down (${reason})`);
  try {
    stopBoothDisplayStayAwake();
  } catch {
    /* ignore */
  }
  try {
    closeSplash();
  } catch {
    /* ignore */
  }
  try {
    disposeIpc();
  } catch (err) {
    console.error('[app] disposeIpc failed', err);
  }
  try {
    closeDatabase();
  } catch (err) {
    console.error('[app] closeDatabase failed', err);
  }
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

/** Wire once after app is ready. */
export function registerLifecycleHandlers(): void {
  app.on('before-quit', () => {
    gracefulShutdown('before-quit');
  });

  app.on('window-all-closed', () => {
    // Windows / Linux: closing the UI ends the app (no tray).
    if (process.platform !== 'darwin') {
      gracefulShutdown('window-all-closed');
      app.quit();
    }
  });
}
