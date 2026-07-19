import { defaultSettings, type Settings } from '../../shared/src/settings';
import type { MockLibraryFixture, MockStentorOptions } from '../../e2e/fixtures/mockStentor';

/** Booth-looking library for README / docs screenshots (no real files). */
export const DOC_LIBRARY: MockLibraryFixture = {
  folders: [
    {
      path: 'C:\\Music\\Booth',
      name: 'Booth',
      children: [
        { path: 'C:\\Music\\Booth\\Techno', name: 'Techno', children: [] },
        { path: 'C:\\Music\\Booth\\House', name: 'House', children: [] },
      ],
    },
  ],
  tracks: [
    {
      id: 1,
      path: 'C:\\Music\\Booth\\Techno\\Night Drive.mp3',
      title: 'Night Drive',
      artist: 'Vector Line',
      bpm: 132,
      keyCamelot: '8A',
      durationMs: 387_000,
      bpmSource: 'analysis',
      lowConfidence: false,
      beatGridOffsetSec: 0.04,
    },
    {
      id: 2,
      path: 'C:\\Music\\Booth\\Techno\\Warehouse Pulse.mp3',
      title: 'Warehouse Pulse',
      artist: 'Concrete Room',
      bpm: 134,
      keyCamelot: '9A',
      durationMs: 412_000,
      bpmSource: 'tag',
      lowConfidence: false,
      beatGridOffsetSec: 0.02,
    },
    {
      id: 3,
      path: 'C:\\Music\\Booth\\House\\Afterhours.mp3',
      title: 'Afterhours',
      artist: 'Late Keys',
      bpm: 124,
      keyCamelot: '5A',
      durationMs: 356_000,
      bpmSource: 'manual',
      lowConfidence: false,
      beatGridOffsetSec: 0.0,
    },
    {
      id: 4,
      path: 'C:\\Music\\Booth\\House\\Sunrise Grid.mp3',
      title: 'Sunrise Grid',
      artist: 'Amber Circuit',
      bpm: 126,
      keyCamelot: '4A',
      durationMs: 401_000,
      bpmSource: 'analysis',
      lowConfidence: true,
      beatGridOffsetSec: 0.08,
    },
  ],
  trackCount: 4,
};

export function docScreenshotSettings(): Settings {
  const settings = structuredClone(defaultSettings);
  settings.audio.masterDevice = 'rmx2-out';
  settings.audio.cueDevice = 'rmx2-out';
  settings.audio.masterChannels = [0, 1];
  settings.audio.cueChannels = [2, 3];
  settings.library.roots = ['C:\\Music\\Booth'];
  return settings;
}

export function docScreenshotMockOptions(): MockStentorOptions {
  return {
    devices: [
      {
        deviceId: 'rmx2-out',
        kind: 'audiooutput',
        label: 'Hercules DJConsole RMX2',
        groupId: 'rmx',
      },
    ],
    library: DOC_LIBRARY,
  };
}
