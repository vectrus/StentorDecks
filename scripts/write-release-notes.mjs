/**
 * Write booth-facing release notes as a plain .txt next to the Setup.exe.
 * Source: docs/CHANGELOG.md entry that mentions the current package version
 * (prefer headings containing "Ship <version>"), else the newest ## section.
 *
 * Usage:
 *   node scripts/write-release-notes.mjs
 *   RELEASE_DIR=release-build node scripts/write-release-notes.mjs
 *
 * Output: <RELEASE_DIR>/StentorDeck-ReleaseNotes-<version>.txt
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const releaseDir = process.env.RELEASE_DIR
  ? join(root, process.env.RELEASE_DIR)
  : join(root, 'release');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const changelogPath = join(root, 'docs', 'CHANGELOG.md');
const outName = `StentorDeck-ReleaseNotes-${version}.txt`;
const outPath = join(releaseDir, outName);

function stripMd(s) {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s*/gm, '')
    .replace(/^---+\s*$/gm, '')
    .replace(/\u2014/g, '-') // em dash
    .replace(/\u2013/g, '-') // en dash
    .replace(/\u2019/g, "'")
    .replace(/\u2192/g, '->')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractNotes(changelog, ver) {
  const sections = changelog.split(/^## /m).slice(1);
  const ship = sections.find((s) => {
    const title = s.split('\n', 1)[0] ?? '';
    return title.includes(`Ship ${ver}`) || title.includes(ver);
  });
  const body = ship ?? sections[0];
  if (!body) return '';
  const lines = body.split('\n');
  const title = (lines[0] ?? '').trim();
  const rest = lines.slice(1).join('\n');
  // Stop at next horizontal rule leftover if present
  const cut = rest.split(/\n---\n/)[0] ?? rest;
  return { title, body: stripMd(cut) };
}

const changelog = existsSync(changelogPath)
  ? readFileSync(changelogPath, 'utf8')
  : '';
const extracted = extractNotes(changelog, version);
const date = new Date().toISOString().slice(0, 10);
const setupName = `StentorDeck-Setup-${version}.exe`;

const text = [
  `StentorDeck ${version}`,
  `Installer: ${setupName}`,
  `Date: ${date}`,
  '',
  'Install over your current build. Library, settings, and MIDI map stay in %APPDATA%.',
  '',
  extracted?.title ? `What's new` : null,
  extracted?.title ? `-----------` : null,
  extracted?.title ? extracted.title.replace(/^—\s*/, '— ') : null,
  extracted?.body || '(See docs/CHANGELOG.md)',
  '',
  'How to update',
  '-------------',
  `- Run ${setupName}, or use Settings > Updates > Check for updates (needs latest.yml on GitHub).`,
  '- Open StentorDeck from the desktop shortcut (not only the source .bat).',
  '',
  'Notes',
  '-----',
  '- Builds are unsigned - Windows SmartScreen may warn once.',
  '- Auto-update requires a full GitHub Release with latest.yml (not Setup.exe alone).',
  '',
]
  .filter((line) => line != null)
  .join('\n');

mkdirSync(releaseDir, { recursive: true });
writeFileSync(outPath, text, 'utf8');
console.log(`Wrote ${outPath}`);
