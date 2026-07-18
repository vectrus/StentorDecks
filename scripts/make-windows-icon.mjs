/**
 * Build multi-size Windows .ico from build/icon.png (brand source).
 * Uses app-builder-bin already shipped with electron-builder — no extra dep.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const png = path.join(root, 'build', 'icon.png');
const dest = path.join(root, 'build', 'icon.ico');

if (!fs.existsSync(png)) {
  console.error(`Missing ${png} — copy from brand/stentordeck-icon.png first.`);
  process.exit(1);
}

const { appBuilderPath } = require('app-builder-bin');
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stentordeck-ico-'));

const r = spawnSync(
  appBuilderPath,
  ['icon', '--format', 'ico', '--root', path.join(root, 'build'), '--out', outDir, '--input', 'icon.png'],
  { encoding: 'utf8' },
);

if (r.status !== 0) {
  console.error(r.stdout || '');
  console.error(r.stderr || '');
  console.error('FAILED: app-builder icon conversion');
  process.exit(r.status ?? 1);
}

const generated = path.join(outDir, 'icon.ico');
if (!fs.existsSync(generated)) {
  console.error('FAILED: icon.ico not produced');
  process.exit(1);
}

fs.copyFileSync(generated, dest);
fs.rmSync(outDir, { recursive: true, force: true });
console.info(`Wrote ${dest} (${fs.statSync(dest).size} bytes)`);
