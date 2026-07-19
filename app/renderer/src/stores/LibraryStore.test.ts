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

function musicTree(): FolderNode[] {
  return [
    {
      path: 'C:\\Music\\mp3',
      name: 'mp3',
      children: [
        { path: 'C:\\Music\\mp3\\House', name: 'House', children: [] },
        { path: 'C:\\Music\\mp3\\Techno', name: 'Techno', children: [] },
      ],
    },
  ];
}

describe('LibraryStore browse (R5.3 / Djuced two-pane)', () => {
  it('file pane is tracks-only; folders stay in the tree', () => {
    const lib = new LibraryStore();
    const folders: FolderNode[] = musicTree();
    lib.folders = folders;
    lib.openFolder = null;
    lib.tracks = [];
    expect(lib.entries).toHaveLength(0);

    lib.openFolder = 'C:\\Music\\mp3';
    lib.tracks = [
      track({ id: 1, path: 'C:\\Music\\mp3\\a.mp3', title: 'Alpha', artist: 'A' }),
      track({ id: 2, path: 'C:\\Music\\mp3\\b.mp3', title: 'Beta', artist: 'B' }),
    ];
    lib.browsePane = 'files';
    lib.cursor = 0;
    expect(lib.entries.every((e) => e.kind === 'track')).toBe(true);
    expect(lib.entries.map((e) => e.name)).toEqual(['A — Alpha', 'B — Beta']);
    lib.down();
    expect(lib.selectedTrack?.title).toBe('Beta');
  });

  it('tree up/down walks visible folders without jumping into a child via enter', () => {
    const lib = new LibraryStore();
    lib.folders = musicTree();
    lib.treeExpanded.add('C:\\Music\\mp3');
    lib.browsePane = 'tree';
    lib.openFolder = 'C:\\Music\\mp3';
    lib.treeCursor = 0;
    expect(lib.visibleTreeRows.map((r) => r.name)).toEqual(['mp3', 'House', 'Techno']);

    lib.down();
    expect(lib.openFolder).toBe('C:\\Music\\mp3\\House');
    expect(lib.browsePane).toBe('tree');
    lib.down();
    expect(lib.openFolder).toBe('C:\\Music\\mp3\\Techno');
    lib.up();
    expect(lib.openFolder).toBe('C:\\Music\\mp3\\House');
  });

  it('browse-right expands collapsed folder, then focuses file pane', () => {
    const lib = new LibraryStore();
    lib.folders = musicTree();
    lib.browsePane = 'tree';
    lib.openFolder = 'C:\\Music\\mp3';
    lib.treeCursor = 0;
    lib.treeExpanded.clear();
    expect(lib.treeExpanded.has('C:\\Music\\mp3')).toBe(false);

    lib.enter();
    expect(lib.treeExpanded.has('C:\\Music\\mp3')).toBe(true);
    expect(lib.browsePane).toBe('tree');
    expect(lib.openFolder).toBe('C:\\Music\\mp3');

    lib.enter();
    expect(lib.browsePane).toBe('files');
    expect(lib.openFolder).toBe('C:\\Music\\mp3');
  });

  it('browse-left from files focuses tree; from tree collapses then stays on root', () => {
    const lib = new LibraryStore();
    lib.folders = musicTree();
    lib.treeExpanded.add('C:\\Music\\mp3');
    lib.openFolder = 'C:\\Music\\mp3';
    lib.browsePane = 'files';
    lib.parent();
    expect(lib.browsePane).toBe('tree');
    expect(lib.openFolder).toBe('C:\\Music\\mp3');

    lib.parent();
    expect(lib.treeExpanded.has('C:\\Music\\mp3')).toBe(false);
    expect(lib.openFolder).toBe('C:\\Music\\mp3');

    lib.parent();
    // Root with no parent — do not clear to blank Library.
    expect(lib.openFolder).toBe('C:\\Music\\mp3');
  });

  it('browse-left from nested folder moves to parent in the tree', () => {
    const lib = new LibraryStore();
    lib.folders = musicTree();
    lib.treeExpanded.add('C:\\Music\\mp3');
    lib.browsePane = 'tree';
    lib.openFolder = 'C:\\Music\\mp3\\Techno';
    lib.treeCursor = 2; // mp3, House, Techno
    lib.parent();
    expect(lib.openFolder).toBe('C:\\Music\\mp3');
  });

  it('selectIndex clamps and focuses files', () => {
    const lib = new LibraryStore();
    lib.folders = [{ path: 'C:\\x', name: 'x', children: [] }];
    lib.selectIndex(99);
    expect(lib.cursor).toBe(0);
    expect(lib.browsePane).toBe('files');
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
