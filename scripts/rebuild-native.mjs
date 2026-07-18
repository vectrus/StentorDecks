/**
 * Install better-sqlite3 prebuild matching the local Electron ABI.
 * Avoids node-gyp / VS Build Tools on Windows when a prebuild exists.
 *
 * Project .npmrc already targets Electron during `npm install`; this script
 * re-fetches the matching binary after Electron itself is available (postinstall)
 * and is the recovery path for NODE_MODULE_VERSION mismatches.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

function findBetterSqlite3Root() {
  const candidates = [
    path.join(root, 'node_modules', 'better-sqlite3'),
    path.join(root, 'app', 'main', 'node_modules', 'better-sqlite3'),
  ];
  return candidates.find((p) => fs.existsSync(path.join(p, 'package.json'))) ?? null;
}

let electronVersion;
try {
  electronVersion = require('electron/package.json').version;
} catch {
  console.warn('[rebuild-native] electron not installed yet — skip (re-run after npm install)');
  process.exit(0);
}

const modRoot = findBetterSqlite3Root();
if (!modRoot) {
  console.warn('[rebuild-native] better-sqlite3 not installed — skip');
  process.exit(0);
}

console.info(`[rebuild-native] better-sqlite3 → electron ${electronVersion}`);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const prebuild = spawnSync(
  npx,
  [
    'prebuild-install',
    '--runtime',
    'electron',
    '--target',
    electronVersion,
    '--verbose',
  ],
  { cwd: modRoot, stdio: 'inherit', shell: true },
);

if (prebuild.status === 0) {
  process.exit(0);
}

console.error('[rebuild-native] prebuild-install failed; trying @electron/rebuild');
const rebuild = spawnSync(
  npx,
  ['electron-rebuild', '-f', '-w', 'better-sqlite3', '-v', electronVersion],
  { cwd: root, stdio: 'inherit', shell: true },
);

if (rebuild.status !== 0) {
  console.error(`
[rebuild-native] Could not install an Electron-matched better-sqlite3 binary.

  • Confirm Node is 20 or 22 (node -v), not 24+
  • Confirm .npmrc still has runtime=electron and target matching Electron
  • Close apps locking node_modules (IDE, antivirus), then:
      Remove-Item -Recurse -Force node_modules
      npm install
  • Only if a prebuild is missing: install VS Build Tools "Desktop development with C++"
`);
}

process.exit(rebuild.status ?? 1);
