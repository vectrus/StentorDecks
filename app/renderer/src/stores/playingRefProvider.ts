import type { CamelotKey } from '@stentordeck/shared';

/** Avoid LibraryStore ↔ root import cycles — wired once from root.ts. */
let playingRef: () => CamelotKey | null = () => null;

export function setPlayingReferenceProvider(fn: () => CamelotKey | null): void {
  playingRef = fn;
}

export function getPlayingReferenceKey(): CamelotKey | null {
  return playingRef();
}
