import { describe, expect, it } from 'vitest';
import type { FolderNode, TrackRow } from '@stentordeck/shared';
import { LibraryStore } from './LibraryStore';

function track(partial: Partial<TrackRow> & { id: number; path: string }): TrackRow {
  return {
    title: null,
    artist: null,
    bpm: null,
    keyCamelot: null,
    durationMs: null,
    bpmSource: null,
    lowConfidence: false,
    beatGridOffsetSec: null,
    ...partial,
  };
}

describe('LibraryStore browse (R5.3 / Djuced two-pane)', () => {
  it('file pane is tracks-only; folders stay in the tree', () => {
    const lib = new LibraryStore();
    const folders: FolderNode[] = [
      {
        path: 'C:\\Music\\mp3',
        name: 'mp3',
        children: [{ path: 'C:\\Music\\mp3\\Techno', name: 'Techno', children: [] }],
      },
    ];
    lib.folders = folders;
    lib.openFolder = null;
    lib.tracks = [];
    expect(lib.entries).toHaveLength(0);

    lib.openFolder = 'C:\\Music\\mp3';
    lib.tracks = [
      track({ id: 1, path: 'C:\\Music\\mp3\\a.mp3', title: 'Alpha', artist: 'A' }),
      track({ id: 2, path: 'C:\\Music\\mp3\\b.mp3', title: 'Beta', artist: 'B' }),
    ];
    lib.cursor = 0;
    expect(lib.entries.every((e) => e.kind === 'track')).toBe(true);
    expect(lib.entries.map((e) => e.name)).toEqual(['A — Alpha', 'B — Beta']);
    lib.down();
    expect(lib.selectedTrack?.title).toBe('Beta');
  });

  it('browse-right drills into first child folder when file pane has no dirs', () => {
    const lib = new LibraryStore();
    lib.folders = [
      {
        path: 'C:\\Music\\mp3',
        name: 'mp3',
        children: [
          { path: 'C:\\Music\\mp3\\Techno', name: 'Techno', children: [] },
          { path: 'C:\\Music\\mp3\\House', name: 'House', children: [] },
        ],
      },
    ];
    lib.openFolder = 'C:\\Music\\mp3';
    lib.tracks = [track({ id: 1, path: 'C:\\Music\\mp3\\a.mp3', title: 'A' })];
    lib.enter();
    // House before Techno (A→Z)
    expect(lib.openFolder).toBe('C:\\Music\\mp3\\House');
  });

  it('browse-right from library root opens first root', () => {
    const lib = new LibraryStore();
    lib.folders = [
      { path: 'C:\\Music\\a', name: 'a', children: [] },
      { path: 'C:\\Music\\b', name: 'b', children: [] },
    ];
    lib.openFolder = null;
    lib.enter();
    expect(lib.openFolder).toBe('C:\\Music\\a');
  });

  it('selectIndex clamps', () => {
    const lib = new LibraryStore();
    lib.folders = [{ path: 'C:\\x', name: 'x', children: [] }];
    lib.selectIndex(99);
    expect(lib.cursor).toBe(0);
  });

  it('search mode lists tracks only', () => {
    const lib = new LibraryStore();
    lib.search = 'alpha';
    lib.tracks = [
      track({ id: 1, path: 'C:\\Music\\a.mp3', title: 'Alpha', artist: 'Z' }),
    ];
    expect(lib.entries).toHaveLength(1);
    expect(lib.entries[0]?.kind).toBe('track');
    expect(lib.breadcrumb).toContain('Search');
  });
});
