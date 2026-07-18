/**
 * One-shot: install deps (Electron ABI) → free Vite port → start the app.
 * Invoked by INSTALL.bat / `npm run setup`.
 */
import { spawnSync } from 'node:child_process';
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

console.info('Freeing port 5173 if needed…');
run('node', [path.join(root, 'scripts', 'free-port.mjs'), '5173']);

console.info(`
Launching StentorDeck (dev, windowed).
Close the app window or press Ctrl+C here to stop.
`);
run(npm, ['start']);
