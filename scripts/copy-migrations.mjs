import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'app/main/src/db/migrations');
const dest = path.join(root, 'app/main/dist/migrations');
fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  if (file.endsWith('.sql')) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}
