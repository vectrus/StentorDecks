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
    // Extra rows so Next up / harmonic soft-rank look populated in screenshots.
    {
      id: 5,
      path: 'C:\\Music\\Booth\\Techno\\Relative Minor.mp3',
      title: 'Relative Minor',
      artist: 'Twin Axis',
      bpm: 131,
      keyCamelot: '8B',
      durationMs: 378_000,
      bpmSource: 'analysis',
      lowConfidence: false,
      beatGridOffsetSec: 0.03,
    },
    {
      id: 6,
      path: 'C:\\Music\\Booth\\Techno\\Wheel Left.mp3',
      title: 'Wheel Left',
      artist: 'Spoke',
      bpm: 130,
      keyCamelot: '7A',
      durationMs: 395_000,
      bpmSource: 'analysis',
      lowConfidence: false,
      beatGridOffsetSec: 0.05,
    },
    {
      id: 7,
      path: 'C:\\Music\\Booth\\Techno\\Two Steps.mp3',
      title: 'Two Steps',
      artist: 'Orbit',
      bpm: 133,
      keyCamelot: '10A',
      durationMs: 404_000,
      bpmSource: 'tag',
      lowConfidence: false,
      beatGridOffsetSec: 0.01,
    },
    {
      id: 8,
      path: 'C:\\Music\\Booth\\House\\Same Key Slow.mp3',
      title: 'Same Key Slow',
      artist: 'Hold Pattern',
      bpm: 128,
      keyCamelot: '8A',
      durationMs: 420_000,
      bpmSource: 'analysis',
      lowConfidence: false,
      beatGridOffsetSec: 0.06,
    },
  ],
  trackCount: 8,
};

/** Settings used for doc screenshots — new Library options on so they appear in crops. */
export function docScreenshotSettings(): Settings {
  const settings = structuredClone(defaultSettings);
  settings.audio.masterDevice = 'rmx2-out';
  settings.audio.cueDevice = 'rmx2-out';
  settings.audio.masterChannels = [0, 1];
  settings.audio.cueChannels = [2, 3];
  settings.library.roots = ['C:\\Music\\Booth'];
  settings.library.harmonicBoost = true;
  settings.ai.mixmatch = 'rules';
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
