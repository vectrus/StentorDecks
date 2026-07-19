import { defaultSettings, type Settings } from '../../shared/src/settings';
import type { FolderNode, TrackRow } from '../../shared/src/ipc';

export type MockLibraryFixture = {
  folders: FolderNode[];
  tracks: TrackRow[];
  trackCount?: number;
};

export type MockStentorOptions = {
  /** Extra audiooutput / audioinput descriptors for enumerateDevices. */
  devices?: Array<{
    deviceId: string;
    kind: 'audiooutput' | 'audioinput';
    label: string;
    groupId?: string;
  }>;
  library?: MockLibraryFixture;
};

/** Injected before app boot — satisfies preload IPC without Electron. */
export function mockStentorInitScript(
  settings: Settings = structuredClone(defaultSettings),
  options: MockStentorOptions = {},
): string {
  const json = JSON.stringify(settings);
  const libraryJson = JSON.stringify(
    options.library ?? { folders: [], tracks: [], trackCount: 0 },
  );
  const devicesJson = JSON.stringify(
    options.devices ?? [
      {
        deviceId: 'fake-out',
        kind: 'audiooutput',
        label: 'Fake Out',
        groupId: 'g1',
      },
    ],
  );
  return `
(() => {
  let settings = ${json};
  const library = ${libraryJson};
  const listeners = new Map();

  function deepMerge(base, patch) {
    if (!patch || typeof patch !== 'object') return base;
    const out = { ...base };
    for (const key of Object.keys(patch)) {
      const pv = patch[key];
      if (pv && typeof pv === 'object' && !Array.isArray(pv)) {
        out[key] = deepMerge(base[key] || {}, pv);
      } else if (pv !== undefined) {
        out[key] = pv;
      }
    }
    return out;
  }

  function normPath(p) {
    return String(p || '').replace(/\\//g, '\\\\').replace(/\\\\+$/, '').toLowerCase();
  }

  function parentDir(p) {
    const n = String(p || '').replace(/\\//g, '\\\\');
    const i = n.lastIndexOf('\\\\');
    return i <= 0 ? null : n.slice(0, i);
  }

  function queryTracks(req) {
    let rows = library.tracks.slice();
    if (req && req.folder) {
      const f = normPath(req.folder);
      rows = rows.filter((t) => {
        const dir = parentDir(t.path);
        return dir != null && (normPath(dir) === f || normPath(dir).startsWith(f + '\\\\'));
      });
    }
    if (req && req.search) {
      const q = String(req.search).toLowerCase();
      rows = rows.filter((t) => {
        const title = (t.title || '').toLowerCase();
        const artist = (t.artist || '').toLowerCase();
        return title.includes(q) || artist.includes(q);
      });
    }
    if (req && req.limit != null) rows = rows.slice(0, req.limit);
    return rows;
  }

  window.stentor = {
    invoke: async (channel, req) => {
      if (channel === 'settings:get') {
        return { settings, recoveredFromCorruption: false, corruptionNotice: null };
      }
      if (channel === 'settings:set') {
        settings = deepMerge(settings, req || {});
        return settings;
      }
      if (channel === 'app:mode:get') {
        return { fullscreen: false, mode: 'performance' };
      }
      if (channel === 'app:mode:set') {
        return { fullscreen: !!(req && req.fullscreen), mode: (req && req.mode) || 'performance' };
      }
      if (channel === 'app:fullscreen:toggle') {
        return { fullscreen: false };
      }
      if (
        channel === 'app:update:status' ||
        channel === 'app:update:check' ||
        channel === 'app:update:download'
      ) {
        return {
          phase: 'disabled',
          packaged: false,
          currentVersion: '0.0.0-e2e',
          availableVersion: null,
          percent: null,
          error: null,
        };
      }
      if (channel === 'app:update:install') {
        return { ok: false, reason: 'e2e mock — not packaged' };
      }
      if (channel === 'midi:mapping:get') {
        return {
          'deckA.play': { kind: 'button', ch: 0, note: 0x21 },
          'deckB.play': { kind: 'button', ch: 0, note: 0x32 },
        };
      }
      if (channel === 'midi:mapping:set') return { ok: true };
      if (channel === 'midi:mapping:export') {
        return JSON.stringify({ version: 1, mapping: { 'deckA.play': { kind: 'button', ch: 0, note: 0x21 } } });
      }
      if (channel === 'midi:mapping:import') return req && req.json ? JSON.parse(req.json) : {};
      if (channel === 'midi:mapping:reset') {
        return { 'deckA.play': { kind: 'button', ch: 0, note: 0x21 } };
      }
      if (channel === 'library:resolveSdSource') {
        return null;
      }
      if (channel === 'library:deleteSdSibling') {
        return { ok: false, reason: 'e2e mock — no delete' };
      }
      if (channel === 'library:purgeSdSiblings') {
        return { ok: true, deleted: 0, skipped: 0 };
      }
      if (channel === 'library:query') return queryTracks(req);
      if (channel === 'library:folders') return library.folders;
      if (channel === 'library:stats') {
        return { trackCount: library.trackCount ?? library.tracks.length };
      }
      if (channel === 'library:track') return null;
      if (channel === 'library:waveform') return null;
      if (channel === 'library:pickRoot') return { path: 'C:\\\\Music\\\\Booth' };
      if (channel === 'library:rescan') return { ok: true };
      if (channel === 'analysis:enqueue') return { ok: true, queueDepth: 0 };
      return {};
    },
    on: (channel, listener) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set());
      listeners.get(channel).add(listener);
      return () => listeners.get(channel)?.delete(listener);
    },
  };

  const deviceList = ${devicesJson};
  const fakeDevices = deviceList.map((d) => ({
    deviceId: d.deviceId,
    kind: d.kind,
    label: d.label,
    groupId: d.groupId || 'g1',
    toJSON() { return this; },
  }));

  if (!navigator.mediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        enumerateDevices: async () => fakeDevices,
        addEventListener: () => {},
        removeEventListener: () => {},
        getUserMedia: async () => { throw new Error('no mic in e2e'); },
      },
    });
  } else {
    navigator.mediaDevices.enumerateDevices = async () => fakeDevices;
    if (!navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener = () => {};
    }
  }

  if (!navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess = async () => {
      throw new Error('MIDI unavailable in e2e');
    };
  }
})();
`;
}
