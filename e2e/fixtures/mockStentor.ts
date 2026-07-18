import { defaultSettings, type Settings } from '../../shared/src/settings';

/** Injected before app boot — satisfies preload IPC without Electron. */
export function mockStentorInitScript(
  settings: Settings = structuredClone(defaultSettings),
): string {
  const json = JSON.stringify(settings);
  return `
(() => {
  let settings = ${json};
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
      if (channel === 'app:update:status' || channel === 'app:update:check') {
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
      if (channel === 'library:query') return [];
      if (channel === 'library:folders') return [];
      if (channel === 'library:track') return null;
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

  const fakeDevices = [
    { deviceId: 'fake-out', kind: 'audiooutput', label: 'Fake Out', groupId: 'g1', toJSON() { return this; } },
  ];

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

  // requestMIDIAccess optional — app tolerates absence
  if (!navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess = async () => {
      throw new Error('MIDI unavailable in e2e');
    };
  }
})();
`;
}
