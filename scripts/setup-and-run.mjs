/**
 * One-shot: install deps (Electron ABI) → free Vite port → desktop shortcut → start.
 * Invoked by INSTALL.bat / `npm run setup`.
 *
 * Prefers a packaged StentorDeck.exe (installed or release/win-unpacked) so the
 * window stays up without a Vite/dev lifecycle. Falls back to `npm start`.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

let electronTarget = '33.4.11';
try {
  const raw = require(path.join(root, 'package.json')).devDependencies.electron;
  electronTarget = String(raw).replace(/^[\^~>=\s]*/, '');
} catch {
  /* keep default */
}

const env = {
  ...process.env,
  npm_config_runtime: 'electron',
  npm_config_target: electronTarget,
  npm_config_disturl: 'https://electronjs.org/headers',
  npm_config_build_from_source: 'false',
};

function run(cmd, args, opts = {}) {
  console.info(`\n→ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env,
    ...opts,
  });
  if ((r.status ?? 1) !== 0) {
    console.error(`\nFAILED: ${cmd} ${args.join(' ')} (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
}

function findPackagedExe() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'StentorDeck', 'StentorDeck.exe'),
    path.join(root, 'release', 'win-unpacked', 'StentorDeck.exe'),
  ];
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

function createDesktopShortcut() {
  const ps1 = path.join(root, 'scripts', 'Create-DesktopShortcut.ps1');
  if (!fs.existsSync(ps1)) {
    console.warn('Shortcut script missing — skipped.');
    return;
  }
  if (process.platform !== 'win32') {
    console.info('Desktop shortcut: Windows only — skipped.');
    return;
  }
  console.info('Creating Desktop shortcut…');
  const r = spawnSync(
    'powershell',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
    { cwd: root, stdio: 'inherit', shell: true, env },
  );
  if ((r.status ?? 1) !== 0) {
    console.warn('Desktop shortcut could not be created (continuing).');
  }
}

console.info(`
╔══════════════════════════════════════════╗
║  StentorDeck — install & start           ║
╚══════════════════════════════════════════╝
`);

run('node', [path.join(root, 'scripts', 'check-node.mjs')]);

const hasModules = fs.existsSync(path.join(root, 'node_modules'));
console.info(
  hasModules
    ? 'Dependencies present — refreshing install (Electron ABI)…'
    : 'First run — installing dependencies (Electron ABI)…',
);
run(npm, ['install']);

console.info('Matching better-sqlite3 to Electron…');
run(npm, ['run', 'rebuild:native']);

// Ensure Windows .ico exists for Explorer shortcuts.
if (fs.existsSync(path.join(root, 'build', 'icon.png'))) {
  console.info('Refreshing build/icon.ico…');
  const iconR = spawnSync(process.execPath, [path.join(root, 'scripts', 'make-windows-icon.mjs')], {
    cwd: root,
    stdio: 'inherit',
    env,
  });
  if ((iconR.status ?? 1) !== 0) {
    console.warn('icon.ico generation failed — shortcut may use exe default icon.');
  }
}

createDesktopShortcut();

const packaged = findPackagedExe();
if (packaged) {
  console.info(`
Launching packaged app:
  ${packaged}

(Close the app window to quit. This console can be closed.)
`);
  const child = spawn(packaged, [], {
    cwd: path.dirname(packaged),
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });
  child.unref();
  process.exit(0);
}

console.info('Freeing port 5173 if needed…');
run('node', [path.join(root, 'scripts', 'free-port.mjs'), '5173']);

console.info(`
No packaged StentorDeck.exe found — starting from source (dev).
Tip: npm run dist:dir  then double-click the Desktop shortcut for a no-console launch.

Close the app window or press Ctrl+C here to stop.
`);
run(npm, ['start']);
