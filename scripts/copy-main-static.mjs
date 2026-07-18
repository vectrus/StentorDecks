import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const from = path.join(src, name);
    const to = path.join(dest, name);
    if (fs.statSync(from).isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

// SQL migrations
const migSrc = path.join(root, 'app/main/src/db/migrations');
const migDest = path.join(root, 'app/main/dist/migrations');
fs.mkdirSync(migDest, { recursive: true });
for (const file of fs.readdirSync(migSrc)) {
  if (file.endsWith('.sql')) {
    fs.copyFileSync(path.join(migSrc, file), path.join(migDest, file));
  }
}

// Splash HTML (branded loader)
const splashSrc = path.join(root, 'app/main/splash');
const splashDest = path.join(root, 'app/main/dist/splash');
if (fs.existsSync(splashSrc)) {
  copyDir(splashSrc, splashDest);
}

console.info('[copy-main-static] migrations + splash → app/main/dist');
