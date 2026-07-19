import { describe, expect, it } from 'vitest';
import {
  LIBRARY_TRACK_MIME,
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

describe('libraryTrackDrag', () => {
  it('round-trips track id', () => {
    const dt = fakeDt();
    setLibraryTrackDragData(dt, 42);
    expect(dt.getData(LIBRARY_TRACK_MIME)).toBe('42');
    expect(parseLibraryTrackId(dt)).toBe(42);
  });

  it('rejects junk', () => {
    expect(parseLibraryTrackId(fakeDt({ 'text/plain': 'hello' }))).toBeNull();
    expect(parseLibraryTrackId(fakeDt({ [LIBRARY_TRACK_MIME]: '0' }))).toBeNull();
  });
});
