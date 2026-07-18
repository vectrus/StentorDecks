/**
 * Install better-sqlite3 prebuild matching the local Electron ABI.
 * Avoids node-gyp / VS Build Tools on Windows when a prebuild exists.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const electronPkg = require('electron/package.json');
const target = electronPkg.version;
const modRoot = path.join(root, 'node_modules', 'better-sqlite3');

if (!fs.existsSync(modRoot)) {
  console.warn('[rebuild-native] better-sqlite3 not installed — skip');
  process.exit(0);
}

console.info(`[rebuild-native] better-sqlite3 → electron ${target}`);
const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prebuild-install', '--runtime', 'electron', '--target', target, '--verbose'],
  { cwd: modRoot, stdio: 'inherit', shell: true },
);

if (result.status !== 0) {
  console.error('[rebuild-native] prebuild-install failed; trying @electron/rebuild');
  const rebuild = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['electron-rebuild', '-f', '-w', 'better-sqlite3', '-v', target],
    { cwd: root, stdio: 'inherit', shell: true },
  );
  process.exit(rebuild.status ?? 1);
}
