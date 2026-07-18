/**
 * Reliable Windows / Cursor-terminal install:
 * forces better-sqlite3 to fetch the Electron prebuild (skips host Node ABI /
 * VS Build Tools), then runs a normal npm install (postinstall rebuilds again).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

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

function run(cmd, args) {
  console.info(`[bootstrap] ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true, env });
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
run('node', [path.join(root, 'scripts', 'check-node.mjs')]);
run(npm, ['install']);
console.info('[bootstrap] ok — better-sqlite3 should match Electron', electronTarget);
