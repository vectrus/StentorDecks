/**
 * Same PNGs as website / README — bundled from repo `docs/screenshots/` so
 * in-app Help stays in sync when Playwright regenerates the pack.
 */
const shotModules = import.meta.glob('../../../../docs/screenshots/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byFile = new Map<string, string>();
for (const [key, url] of Object.entries(shotModules)) {
  const file = key.replace(/\\/g, '/').split('/').pop();
  if (file) byFile.set(file.toLowerCase(), url);
}

/** Resolve a guide image href (`../screenshots/foo.png` or bare filename) to a Vite asset URL. */
export function resolveHelpImageSrc(href: string): string | null {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  const file = trimmed.replace(/\\/g, '/').split('/').pop();
  if (!file) return null;
  return byFile.get(file.toLowerCase()) ?? null;
}

export function helpScreenshotCount(): number {
  return byFile.size;
}
