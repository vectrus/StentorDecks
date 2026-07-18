import { BrowserWindow } from 'electron';
import type { IpcEventMap } from '@stentordeck/shared';

/** Main → renderer fan-out (shared by IPC handlers + auto-update). */
export function broadcast<K extends keyof IpcEventMap>(channel: K, payload: IpcEventMap[K]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}
