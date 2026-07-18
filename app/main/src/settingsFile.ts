import fs from 'node:fs';
import path from 'node:path';
import {
  defaultSettings,
  mergeSettings,
  migrateItchyJogSettings,
  migrateLegacyChannelFaderShape,
  parseSettings,
  type DeepPartial,
  type Settings,
} from '@stentordeck/shared';

export type SettingsFileState = {
  settings: Settings;
  recoveredFromCorruption: boolean;
  corruptionNotice: string | null;
};

export function settingsPath(userDataPath: string): string {
  return path.join(userDataPath, 'settings.json');
}

function mixerSoftMigrateSame(
  a: Settings['mixer'],
  b: Settings['mixer'],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function migrateChannelFaders(
  faders: Settings['mixer']['channelFaders'],
): Settings['mixer']['channelFaders'] {
  return {
    ...faders,
    a: { shape: migrateLegacyChannelFaderShape(faders.a.shape) },
    b: { shape: migrateLegacyChannelFaderShape(faders.b.shape) },
  };
}

export function loadSettings(userDataPath: string): SettingsFileState {
  const file = settingsPath(userDataPath);
  if (!fs.existsSync(file)) {
    writeSettingsAtomic(userDataPath, defaultSettings);
    return {
      settings: structuredClone(defaultSettings),
      recoveredFromCorruption: false,
      corruptionNotice: null,
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    // Soft-migrate: fill new nested keys (e.g. mixer.jog) from defaults.
    const merged = mergeSettings(
      defaultSettings,
      raw && typeof raw === 'object' ? (raw as DeepPartial<Settings>) : {},
    );
    const withMigrate = {
      ...merged,
      mixer: {
        ...merged.mixer,
        jog: migrateItchyJogSettings(merged.mixer.jog),
        channelFaders: migrateChannelFaders(merged.mixer.channelFaders),
      },
    };
    const parsed = parseSettings(withMigrate);
    if (!parsed.ok) {
      return recoverCorrupt(userDataPath, file, parsed.error);
    }
    // Persist migration so Soft / fader defaults stick across restarts.
    if (!mixerSoftMigrateSame(merged.mixer, parsed.settings.mixer)) {
      writeSettingsAtomic(userDataPath, parsed.settings);
    }
    return {
      settings: parsed.settings,
      recoveredFromCorruption: false,
      corruptionNotice: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return recoverCorrupt(userDataPath, file, message);
  }
}

function recoverCorrupt(
  userDataPath: string,
  file: string,
  reason: string,
): SettingsFileState {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const aside = `${file}.corrupt-${stamp}`;
  try {
    if (fs.existsSync(file)) fs.renameSync(file, aside);
  } catch {
    /* ignore */
  }
  writeSettingsAtomic(userDataPath, defaultSettings);
  return {
    settings: structuredClone(defaultSettings),
    recoveredFromCorruption: true,
    corruptionNotice: `settings.json was invalid (${reason}). Backed up and restored defaults.`,
  };
}

export function writeSettingsAtomic(userDataPath: string, settings: Settings): void {
  fs.mkdirSync(userDataPath, { recursive: true });
  const file = settingsPath(userDataPath);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, file);
}

export function applySettingsPatch(
  userDataPath: string,
  current: Settings,
  patch: DeepPartial<Settings>,
): Settings {
  const merged = mergeSettings(current, patch);
  const parsed = parseSettings(merged);
  if (!parsed.ok) {
    throw new Error(`Invalid settings patch: ${parsed.error}`);
  }
  writeSettingsAtomic(userDataPath, parsed.settings);
  return parsed.settings;
}
