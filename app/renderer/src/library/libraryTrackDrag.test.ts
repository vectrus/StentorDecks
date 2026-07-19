import { afterEach, describe, expect, it } from 'vitest';
import {
  LIBRARY_TRACK_MIME,
  clearLibraryTrackDrag,
  isLibraryTrackDrag,
  parseLibraryTrackId,
  setLibraryTrackDragData,
} from './libraryTrackDrag';

function fakeDt(initial?: Record<string, string>): DataTransfer {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getData: (type: string) => map.get(type) ?? '',
    setData: (type: string, data: string) => {
      map.set(type, data);
    },
    types: [...map.keys()] as unknown as DOMStringList,
    effectAllowed: 'uninitialized' as DataTransfer['effectAllowed'],
  } as unknown as DataTransfer;
}

afterEach(() => {
  clearLibraryTrackDrag();
});

describe('libraryTrackDrag', () => {
  it('round-trips track id via dataTransfer', () => {
    const dt = fakeDt();
    setLibraryTrackDragData(dt, 42);
    expect(dt.getData(LIBRARY_TRACK_MIME)).toBe('42');
    expect(parseLibraryTrackId(dt)).toBe(42);
  });

  it('isLibraryTrackDrag uses in-process session (Electron dragover)', () => {
    expect(isLibraryTrackDrag()).toBe(false);
    setLibraryTrackDragData(fakeDt(), 7);
    // Even with empty types (Chromium dragover), session is active.
    expect(isLibraryTrackDrag(fakeDt())).toBe(true);
    clearLibraryTrackDrag();
    expect(isLibraryTrackDrag()).toBe(false);
  });

  it('parse falls back to session when getData empty', () => {
    setLibraryTrackDragData(fakeDt(), 99);
    expect(parseLibraryTrackId(fakeDt())).toBe(99);
  });

  it('rejects junk when no session', () => {
    expect(parseLibraryTrackId(fakeDt({ 'text/plain': 'hello' }))).toBeNull();
  });
});
