import type { HelpTopic } from './searchHelp';
import getStarted from '../../../../docs/guides/get-started.md?raw';
import prepLibrary from '../../../../docs/guides/prep-library.md?raw';
import performance from '../../../../docs/guides/performance-and-mixer.md?raw';
import syncJog from '../../../../docs/guides/sync-and-jog.md?raw';
import knobs from '../../../../docs/guides/knobs-and-takeover.md?raw';
import audio from '../../../../docs/guides/audio-and-volume.md?raw';

/** Curated end-user topics — same files as `docs/guides/`. */
export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: 'get-started',
    title: 'Getting started',
    tags: ['start', 'first', 'boot', 'mst', 'volume', 'f1', 'help'],
    body: getStarted,
  },
  {
    id: 'prep-library',
    title: 'Prep library',
    tags: ['prep', 'library', 'bpm', 'key', 'camelot', 'detect', 'tap', 'load', 'folder', 'search'],
    body: prepLibrary,
  },
  {
    id: 'performance-mixer',
    title: 'Performance & mixer',
    tags: ['performance', 'mixer', 'eq', 'gain', 'fader', 'vu', 'filter', 'flanger', 'load'],
    body: performance,
  },
  {
    id: 'sync-jog',
    title: 'SYNC & jog',
    tags: ['sync', 'jog', 'beatgrid', 'phase', 'pitch', 'platter', 'spinback'],
    body: syncJog,
  },
  {
    id: 'knobs-takeover',
    title: 'Knobs & soft takeover',
    tags: ['takeover', 'pickup', 'knob', 'fader', 'hardware', 'rmx2'],
    body: knobs,
  },
  {
    id: 'audio-volume',
    title: 'Audio routing & volume',
    tags: ['audio', 'plan', 'a', 'b', 'cue', 'phones', 'pfl', 'routing', 'master'],
    body: audio,
  },
];
