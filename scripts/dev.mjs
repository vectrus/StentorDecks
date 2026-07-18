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

// Clear leftover Vite from a previous session
spawnSync(process.execPath, [path.join(root, 'scripts/free-port.mjs'), VITE_PORT], {
  cwd: root,
  stdio: 'inherit',
});

// Build shared + main once so preload exists
await new Promise((resolve, reject) => {
  const p = run('npm', ['run', 'build', '-w', '@stentordeck/shared']);
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('shared build failed'))));
});
await new Promise((resolve, reject) => {
  const p = run('npm', ['run', 'build', '-w', '@stentordeck/main']);
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('main build failed'))));
});
await new Promise((resolve, reject) => {
  const p = run('npm', ['run', 'build', '-w', '@stentordeck/analysis']);
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('analysis build failed'))));
});

const vite = run('npm', ['run', 'dev', '-w', '@stentordeck/renderer'], {
  env: { ...process.env, VITE_PORT },
});

// Wait until Vite answers (or timeout)
await waitForUrl(VITE_URL, 20_000);

const electron = run(electronPath, ['.'], {
  env: {
    ...process.env,
    VITE_DEV_SERVER_URL: VITE_URL,
    STENTOR_WINDOWED: process.env.STENTOR_WINDOWED ?? '1',
  },
});

async function waitForUrl(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.warn(`[dev] Vite not ready at ${url} after ${timeoutMs}ms — launching Electron anyway`);
}

function shutdown() {
  vite.kill();
  electron.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

electron.on('exit', () => {
  vite.kill();
  process.exit(0);
});
