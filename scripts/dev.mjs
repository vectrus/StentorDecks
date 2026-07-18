/**
 * Dev launcher: build main → show Electron splash ASAP → Vite + analysis in parallel.
 * Splash covers the Vite wait (see app/main boot + waitForRendererUrl).
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import electronPath from 'electron';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VITE_PORT = process.env.VITE_PORT || '5173';
const VITE_URL = `http://localhost:${VITE_PORT}`;

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    ...opts,
  });
}

function runBuild(workspace) {
  return new Promise((resolve, reject) => {
    const p = run('npm', ['run', 'build', '-w', workspace]);
    p.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${workspace} build failed`)),
    );
  });
}

// Clear leftover Vite from a previous session
spawnSync(process.execPath, [path.join(root, 'scripts/free-port.mjs'), VITE_PORT], {
  cwd: root,
  stdio: 'inherit',
});

console.info('[dev] Building shared + main (splash starts after this)…');
await runBuild('@stentordeck/shared');
await runBuild('@stentordeck/main');

// Electron first — branded splash while Vite/analysis finish.
console.info('[dev] Launching Electron (splash)…');
const electron = run(electronPath, ['.'], {
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: VITE_URL,
    STENTOR_WINDOWED: process.env.STENTOR_WINDOWED ?? '1',
    STENTOR_WAIT_VITE_MS: process.env.STENTOR_WAIT_VITE_MS ?? '60000',
  },
});

console.info('[dev] Starting Vite + analysis build…');
const vite = run('npm', ['run', 'dev', '-w', '@stentordeck/renderer'], {
  env: { ...process.env, VITE_PORT },
});

const analysis = run('npm', ['run', 'build', '-w', '@stentordeck/analysis']);
analysis.on('exit', (code) => {
  if (code !== 0) console.warn('[dev] analysis build failed — analysis window may be unavailable');
});

function shutdown() {
  try {
    vite.kill();
  } catch {
    /* ignore */
  }
  try {
    electron.kill();
  } catch {
    /* ignore */
  }
  try {
    analysis.kill();
  } catch {
    /* ignore */
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

electron.on('exit', () => {
  try {
    vite.kill();
  } catch {
    /* ignore */
  }
  try {
    analysis.kill();
  } catch {
    /* ignore */
  }
  process.exit(0);
});
