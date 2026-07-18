import { BrowserWindow, app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let splash: BrowserWindow | null = null;

/** Signals pre-Electron WinForms splash (Desktop VBS) that Electron UI is up. */
function bootReadyMarkerPath(): string {
  return path.join(os.tmpdir(), 'stentordeck-ui-ready');
}

function signalBootReady(): void {
  try {
    fs.writeFileSync(bootReadyMarkerPath(), String(Date.now()), 'utf8');
  } catch {
    /* ignore */
  }
}

function clearBootReady(): void {
  try {
    fs.unlinkSync(bootReadyMarkerPath());
  } catch {
    /* ignore */
  }
}

function splashHtmlPath(): string {
  // Built: app/main/dist/splash/index.html (copied next to bundle)
  const besideDist = path.join(__dirname, 'splash', 'index.html');
  if (fs.existsSync(besideDist)) return besideDist;
  // Dev fallback: source tree
  const fromSrc = path.join(app.getAppPath(), 'app/main/splash/index.html');
  if (fs.existsSync(fromSrc)) return fromSrc;
  return besideDist;
}

export function resolveAppIcon(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, 'icon.png'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
    path.join(__dirname, '../../../build/icon.png'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

/** Small branded loader — shown until the main window is ready. */
export function showSplash(): BrowserWindow | null {
  if (splash && !splash.isDestroyed()) return splash;
  const icon = resolveAppIcon();
  const html = splashHtmlPath();
  if (!fs.existsSync(html)) {
    console.warn('[splash] missing splash html — skipping', html);
    return null;
  }

  clearBootReady();

  splash = new BrowserWindow({
    width: 420,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    // Visible on the taskbar so a long Vite wait is not "nothing happened"
    skipTaskbar: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    backgroundColor: '#0E1115',
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splash.setMenuBarVisibility(false);
  void splash.loadFile(html);
  splash.once('ready-to-show', () => {
    if (splash && !splash.isDestroyed()) {
      splash.show();
      signalBootReady();
    }
  });
  splash.on('closed', () => {
    splash = null;
  });
  return splash;
}

export function closeSplash(): void {
  clearBootReady();
  if (!splash || splash.isDestroyed()) {
    splash = null;
    return;
  }
  try {
    splash.close();
  } catch {
    try {
      splash.destroy();
    } catch {
      /* ignore */
    }
  }
  splash = null;
}
