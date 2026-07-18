import { BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { closeSplash, resolveAppIcon } from './splash';

export type WindowHandles = {
  main: BrowserWindow | null;
};

const handles: WindowHandles = { main: null };

export function getMainWindow(): BrowserWindow | null {
  return handles.main;
}

export function createMainWindow(opts: {
  preloadPath: string;
  rendererUrl: string | null;
  rendererFile: string | null;
  startFullscreen: boolean;
  startWindowedDev: boolean;
}): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const icon = resolveAppIcon();

  const win = new BrowserWindow({
    width: Math.min(1440, width),
    height: Math.min(900, height),
    backgroundColor: '#0E1115',
    show: false,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: opts.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  handles.main = win;

  win.on('ready-to-show', () => {
    closeSplash();
    win.show();
    const wantFullscreen = opts.startFullscreen && !opts.startWindowedDev;
    if (wantFullscreen) {
      win.setFullScreen(true);
    }
  });

  win.on('closed', () => {
    handles.main = null;
  });

  if (opts.rendererUrl) {
    void win.loadURL(opts.rendererUrl);
  } else if (opts.rendererFile) {
    void win.loadFile(opts.rendererFile);
  } else {
    throw new Error('No renderer URL or file');
  }

  return win;
}

export function toggleFullscreen(): boolean {
  const win = handles.main;
  if (!win) return false;
  const next = !win.isFullScreen();
  win.setFullScreen(next);
  return next;
}

export function preloadPathFromDist(): string {
  return path.join(__dirname, 'preload.js');
}
