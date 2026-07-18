import fs from 'node:fs';
import path from 'node:path';
import {
  defaultSettings,
  mergeSettings,
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
    const parsed = parseSettings(raw);
    if (!parsed.ok) {
      return recoverCorrupt(userDataPath, file, parsed.error);
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
