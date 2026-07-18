/**
 * Guide the owner onto a supported Node. Soft-warn on odd majors; hard-fail
 * only when we know install cannot succeed without the Electron native env.
 */
import process from 'node:process';

const major = Number(process.versions.node.split('.')[0]);
const electronNative =
  process.env.npm_config_runtime === 'electron' ||
  process.env.npm_config_target != null;

if (major === 20 || major === 22) {
  process.exit(0);
}

if (major >= 24 && electronNative) {
  console.warn(
    `[stentordeck] Node v${process.versions.node} — installing native modules for Electron (npm_config_runtime=electron). Prefer Node 22 LTS when you can.`,
  );
  process.exit(0);
}

if (major >= 24) {
  console.error(`
[stentordeck] Node.js v${process.versions.node} is a bad default for this repo.

  Cursor’s helper Node and Node 24+ often break \`npm install\` for better-sqlite3
  (no host prebuild → node-gyp → missing/unsupported VS Build Tools).

  Prefer one of:
    1) Install Node 22 LTS from https://nodejs.org and ensure \`where node\` is NOT
       Cursor’s helper (…\\cursor\\…\\helpers\\node.exe).
    2) From the repo root:  npm run bootstrap
       (forces Electron ABI for better-sqlite3 on any recent Node).

  Then:
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    npm run bootstrap
`);
  process.exit(1);
}

console.warn(
  `[stentordeck] Untested Node v${process.versions.node} — recommended: 20 LTS or 22 LTS.`,
);
