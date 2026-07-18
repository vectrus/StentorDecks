import { z } from 'zod';
import { defaultJogSettings, type JogSettings } from './jogFeel.js';

export type Settings = {
  version: 1;
  audio: {
    masterDevice: string | null;
    masterChannels: [number, number];
    cueDevice: string | null;
    cueChannels: [number, number];
    routingPlan: 'auto' | 'A' | 'B';
    bufferHintMs: number;
    brakeOnStop: boolean;
    brakeMs: number;
    autoGain: boolean;
    autoGainTargetLufs: number;
    inputs: { enabled: boolean };
  };
  mixer: {
    crossfader: { enabled: boolean };
    channelFaders: {
      linked: boolean;
      a: { shape: number };
      b: { shape: number };
    };
    pitchFaders: {
      range: 0.08 | 0.16;
      centerDeadZone: number;
    };
    eq: { maxDb: number };
    /** Dual-zone jog feel (R2.2) — human units for Settings UI. */
    jog: JogSettings;
  };
  fx: {
    flanger: { rateHz: number; depthMs: number; feedback: number };
  };
  library: {
    roots: string[];
    purgeMissingAfterDays: number;
    sort: 'filename' | 'artist' | 'title' | 'bpm' | 'key' | 'duration';
  };
  ui: {
    scale: 100 | 125 | 150;
    deckAColor: string;
    deckBColor: string;
    startInFullscreen: boolean;
    startMode: 'performance' | 'prep';
    showBeatTicks: boolean;
    endOfTrackWarnSec: [number, number, number];
  };
  midi: {
    preferredPort: string | null;
    sendLeds: boolean;
  };
};

/** Defaults per docs/07-settings-schema.md */
export const defaultSettings: Settings = {
  version: 1,
  audio: {
    masterDevice: null,
    masterChannels: [0, 1],
    cueDevice: null,
    cueChannels: [2, 3],
    routingPlan: 'auto',
    bufferHintMs: 23,
    brakeOnStop: false,
    brakeMs: 400,
    autoGain: true,
    autoGainTargetLufs: -14,
    inputs: { enabled: false },
  },
  mixer: {
    crossfader: { enabled: false },
    channelFaders: {
      linked: true,
      // Higher = finer near open; bottom toe (first 20%) is in audioCurves (docs/03).
      a: { shape: 55 },
      b: { shape: 55 },
    },
    pitchFaders: {
      range: 0.08,
      centerDeadZone: 0.04,
    },
    eq: { maxDb: 12 },
    jog: { ...defaultJogSettings },
  },
  fx: {
    flanger: { rateHz: 0.25, depthMs: 1.5, feedback: 0.5 },
  },
  library: {
    roots: [],
    purgeMissingAfterDays: 30,
    sort: 'filename',
  },
  ui: {
    scale: 100,
    deckAColor: '#FFB454',
    deckBColor: '#5BD0FF',
    startInFullscreen: true,
    startMode: 'performance',
    showBeatTicks: true,
    endOfTrackWarnSec: [30, 15, 10],
  },
  midi: {
    preferredPort: null,
    sendLeds: true,
  },
};

const channelPair = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);

export const settingsSchema = z.object({
  version: z.literal(1),
  audio: z.object({
    masterDevice: z.string().nullable(),
    masterChannels: channelPair,
    cueDevice: z.string().nullable(),
    cueChannels: channelPair,
    routingPlan: z.enum(['auto', 'A', 'B']),
    bufferHintMs: z.number().positive(),
    brakeOnStop: z.boolean(),
    brakeMs: z.number().positive(),
    autoGain: z.boolean(),
    autoGainTargetLufs: z.number(),
    inputs: z.object({ enabled: z.boolean() }),
  }),
  mixer: z.object({
    crossfader: z.object({ enabled: z.boolean() }),
    channelFaders: z.object({
      linked: z.boolean(),
      a: z.object({ shape: z.number().min(-100).max(100) }),
      b: z.object({ shape: z.number().min(-100).max(100) }),
    }),
    pitchFaders: z.object({
      range: z.union([z.literal(0.08), z.literal(0.16)]),
      centerDeadZone: z.number().min(0).max(0.1),
    }),
    eq: z.object({ maxDb: z.number().positive() }),
    jog: z
      .object({
        dualZone: z.boolean(),
        fineSeekMs: z.number().min(0.01).max(30),
        spinSeekMs: z.number().min(1).max(100),
        fineRatePercent: z.number().min(0).max(5),
        spinRatePercent: z.number().min(0).max(50),
        rateDecayMs: z.number().min(50).max(1500),
        pausedFineSeekMs: z.number().min(0.5).max(50),
        pausedSpinSeekMs: z.number().min(1).max(150),
        // RMX2 light turns flood ~50–150 t/s — spin floor sits above that.
        spinStartsAtTps: z.number().min(1).max(400),
        spinFullAtTps: z.number().min(10).max(600),
      })
      .refine((j) => j.spinFullAtTps > j.spinStartsAtTps, {
        message: 'spinFullAtTps must be greater than spinStartsAtTps',
      }),
  }),
  fx: z.object({
    flanger: z.object({
      rateHz: z.number().positive(),
      depthMs: z.number().positive(),
      feedback: z.number().min(0).max(1),
    }),
  }),
  library: z.object({
    roots: z.array(z.string()),
    purgeMissingAfterDays: z.number().int().positive(),
    sort: z.enum(['filename', 'artist', 'title', 'bpm', 'key', 'duration']),
  }),
  ui: z.object({
    scale: z.union([z.literal(100), z.literal(125), z.literal(150)]),
    deckAColor: z.string(),
    deckBColor: z.string(),
    startInFullscreen: z.boolean(),
    startMode: z.enum(['performance', 'prep']),
    showBeatTicks: z.boolean(),
    endOfTrackWarnSec: z.tuple([z.number(), z.number(), z.number()]),
  }),
  midi: z.object({
    preferredPort: z.string().nullable(),
    sendLeds: z.boolean(),
  }),
}) satisfies z.ZodType<Settings>;

export function parseSettings(raw: unknown):
  | { ok: true; settings: Settings }
  | { ok: false; error: string } {
  const result = settingsSchema.safeParse(raw);
  if (!result.success) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, settings: result.data };
}

/** Deep-merge a partial patch onto settings (top-level domains + nested keys). */
export function mergeSettings(base: Settings, patch: DeepPartial<Settings>): Settings {
  return deepMerge(base, patch) as Settings;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base;
  if (Array.isArray(patch)) return patch;
  if (patch === null || typeof patch !== 'object') return patch;
  if (base === null || typeof base !== 'object' || Array.isArray(base)) return patch;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    out[key] = deepMerge((base as Record<string, unknown>)[key], value);
  }
  return out;
}
