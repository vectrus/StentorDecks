import type { FolderNode, MidiMapping, TrackDetail, TrackRow } from '@stentordeck/shared';

export const FIXTURE_TRACKS: TrackRow[] = [
  {
    id: 1,
    path: 'C:/Music/Techno/Speedy J - Pullover.flac',
    title: 'Pullover',
    artist: 'Speedy J',
    bpm: 128,
    keyCamelot: '9A',
    durationMs: 344_000,
    bpmSource: 'tag',
    lowConfidence: false,
  },
  {
    id: 2,
    path: 'C:/Music/Techno/De Sluwe Vos - Amsterdam Nights.mp3',
    title: 'Amsterdam Nights',
    artist: 'De Sluwe Vos',
    bpm: 126.4,
    keyCamelot: '8A',
    durationMs: 372_000,
    bpmSource: 'analysis',
    lowConfidence: false,
  },
  {
    id: 3,
    path: 'C:/Music/House/Pending Analysis.wav',
    title: 'Pending Analysis',
    artist: 'Unknown',
    bpm: null,
    keyCamelot: null,
    durationMs: 381_000,
    bpmSource: null,
    lowConfidence: false,
  },
];

export const FIXTURE_FOLDERS: FolderNode[] = [
  {
    path: 'C:/Music',
    name: 'Music',
    children: [
      { path: 'C:/Music/Techno', name: 'Techno', children: [] },
      { path: 'C:/Music/House', name: 'House', children: [] },
    ],
  },
];

export function fixtureTrackDetail(id: number): TrackDetail | null {
  const row = FIXTURE_TRACKS.find((t) => t.id === id);
  if (!row) return null;
  return {
    ...row,
    album: null,
    genre: 'Techno',
    waveformOverviewRef: null,
    waveformDetailRef: null,
  };
}

export const FIXTURE_MIDI_MAP: MidiMapping = {
  'deckA.play': { kind: 'button', ch: 1, note: 0x21 },
  'deckB.play': { kind: 'button', ch: 1, note: 0x32 },
};
