import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
  CHANNEL_FADER_SHAPE_PRESETS,
  defaultJogSettings,
  JOG_PRESETS,
  type AppUpdateStatus,
  type JogPresetId,
  type JogSettings,
  type Settings,
} from '@stentordeck/shared';
import { invoke, onIpc } from '../ipc/client';
import { deckA, deckB, libraryStore, mixerStore, settingsStore } from '../stores/root';
import { FaderCurveEditor } from './settings/FaderCurveEditor';

const SCALES: Settings['ui']['scale'][] = [100, 125, 150];
const SORTS: Settings['library']['sort'][] = [
  'filename',
  'artist',
  'title',
  'bpm',
  'key',
  'duration',
];

const JOG_PRESET_IDS = Object.keys(JOG_PRESETS) as JogPresetId[];

type SectionId = 'faders' | 'jog' | 'library' | 'display' | 'updates';

const SECTIONS: { id: SectionId; label: string; hint: string }[] = [
  { id: 'faders', label: 'Faders & mixer', hint: 'Channel curve, pitch, EQ' },
  { id: 'jog', label: 'Jog feel', hint: 'Vinyl / CDJ nudge' },
  { id: 'library', label: 'Library', hint: 'Roots & sort' },
  { id: 'display', label: 'Display', hint: 'Scale & ticks' },
  { id: 'updates', label: 'Updates', hint: 'GitHub Releases' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  /** Prefer this section when opening (e.g. empty library → library). */
  initialSection?: SectionId;
};

export const SettingsModal = observer(function SettingsModal(props: Props) {
  const { open, onClose, initialSection } = props;
  const [section, setSection] = useState<SectionId>(initialSection ?? 'faders');

  useEffect(() => {
    if (!open) return;
    if (initialSection) setSection(initialSection);
  }, [open, initialSection]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <button
        type="button"
        className="settings-backdrop"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div className="settings-panel">
        <header className="settings-hd">
          <div className="settings-hd-text">
            <h2 className="settings-title">Settings</h2>
            <p className="settings-sub">Live changes · Esc to close</p>
          </div>
          <button type="button" className="mode" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="settings-body">
          <nav className="settings-nav" aria-label="Settings sections">
            <ul>
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={s.id === section ? 'settings-topic on' : 'settings-topic'}
                    onClick={() => setSection(s.id)}
                  >
                    <span className="settings-topic-title">{s.label}</span>
                    <span className="settings-topic-snip">{s.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="settings-article">
            {section === 'faders' ? <FadersSection /> : null}
            {section === 'jog' ? <JogFeelSection /> : null}
            {section === 'library' ? <LibrarySection /> : null}
            {section === 'display' ? <DisplaySection /> : null}
            {section === 'updates' ? <UpdateSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
});

function JogSlider(props: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, format, onChange } = props;
  const shown = format ? format(value) : `${value}${unit}`;
  return (
    <label className="temp-jog-slider" title={hint}>
      <span className="temp-jog-slider-hd">
        <span>{label}</span>
        <span className="mono">{shown}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

const FadersSection = observer(function FadersSection() {
  const cf = settingsStore.settings.mixer.channelFaders;
  const pitch = settingsStore.settings.mixer.pitchFaders;
  const eq = settingsStore.settings.mixer.eq;
  const xf = settingsStore.settings.mixer.crossfader;
  const audio = settingsStore.settings.audio;
  const [probe, setProbe] = useState(0.7);
  const [followHw, setFollowHw] = useState(true);

  const shape = cf.a.shape;
  const livePos = (mixerStore.faderA + mixerStore.faderB) / 2;
  const probePos = followHw ? livePos : probe;

  const setShape = (next: number) => {
    const s = Math.min(100, Math.max(-100, next));
    if (cf.linked) {
      void settingsStore.set({
        mixer: { channelFaders: { linked: true, a: { shape: s }, b: { shape: s } } },
      });
    } else {
      void settingsStore.set({
        mixer: {
          channelFaders: {
            linked: false,
            a: { shape: s },
            b: { shape: cf.b.shape },
          },
        },
      });
    }
  };

  const presetOn = (id: keyof typeof CHANNEL_FADER_SHAPE_PRESETS) =>
    shape === CHANNEL_FADER_SHAPE_PRESETS[id];

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Channel faders</h3>
      <p className="settings-section-lead">
        Soft cut-in on the first 20% of throw, then the power curve (docs/03). Changes apply live —
        blend on the RMX2 while you tune.
      </p>

      <div className="temp-jog-presets">
        {(
          [
            ['linear', 'Linear'],
            ['smooth', 'Smooth'],
            ['sharp', 'Sharp'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={presetOn(id) ? 'on' : undefined}
            onClick={() => setShape(CHANNEL_FADER_SHAPE_PRESETS[id])}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="settings-fader-grid">
        <FaderCurveEditor shape={shape} probePos={probePos} />
        <div className="settings-fader-controls">
          <label className="temp-jog-switch">
            <input
              type="checkbox"
              checked={followHw}
              onChange={(e) => setFollowHw(e.target.checked)}
            />
            <span>
              Probe follows hardware
              <span className="temp-jog-hint">Average of A/B fader position</span>
            </span>
          </label>
          {!followHw ? (
            <JogSlider
              label="Probe position"
              hint="Scrub to read dB at a fader %"
              value={Math.round(probe * 100)}
              min={0}
              max={100}
              step={1}
              unit="%"
              format={(v) => `${v}%`}
              onChange={(v) => setProbe(v / 100)}
            />
          ) : null}
          <JogSlider
            label="Curve shape (s)"
            hint="← sharp cut-in · fine control near open →"
            value={shape}
            min={-100}
            max={100}
            step={1}
            unit=""
            format={(v) => String(Math.round(v))}
            onChange={setShape}
          />
          <label className="temp-jog-switch">
            <input
              type="checkbox"
              checked={cf.linked}
              onChange={(e) => {
                const linked = e.target.checked;
                void settingsStore.set({
                  mixer: {
                    channelFaders: {
                      linked,
                      a: { shape },
                      b: { shape: linked ? shape : cf.b.shape },
                    },
                  },
                });
              }}
            />
            <span>
              Link A &amp; B
              <span className="temp-jog-hint">Same curve on both channel faders</span>
            </span>
          </label>
          {!cf.linked ? (
            <JogSlider
              label="Deck B shape"
              hint="Independent B curve when unlinked"
              value={cf.b.shape}
              min={-100}
              max={100}
              step={1}
              unit=""
              format={(v) => String(Math.round(v))}
              onChange={(v) =>
                void settingsStore.set({
                  mixer: {
                    channelFaders: {
                      linked: false,
                      a: { shape: cf.a.shape },
                      b: { shape: v },
                    },
                  },
                })
              }
            />
          ) : null}
        </div>
      </div>

      <h3 className="settings-section-title" style={{ marginTop: '1.25rem' }}>
        Pitch faders
      </h3>
      <label>
        Range
        <select
          value={pitch.range}
          onChange={(e) => {
            const range = Number(e.target.value) as 0.08 | 0.16;
            void settingsStore.set({ mixer: { pitchFaders: { ...pitch, range } } });
          }}
        >
          <option value={0.08}>±8 %</option>
          <option value={0.16}>±16 %</option>
        </select>
      </label>
      <JogSlider
        label="Center dead-zone"
        hint="Width around 0.00 % with no pitch change"
        value={Math.round(pitch.centerDeadZone * 1000) / 10}
        min={0}
        max={10}
        step={0.5}
        unit="%"
        format={(v) => `${v.toFixed(1)}%`}
        onChange={(v) =>
          void settingsStore.set({
            mixer: { pitchFaders: { ...pitch, centerDeadZone: v / 100 } },
          })
        }
      />

      <h3 className="settings-section-title" style={{ marginTop: '1.25rem' }}>
        EQ &amp; gain
      </h3>
      <JogSlider
        label="EQ max"
        hint="Shelf extremes ±dB (R2.12)"
        value={eq.maxDb}
        min={6}
        max={18}
        step={1}
        unit=" dB"
        format={(v) => `±${v} dB`}
        onChange={(v) => void settingsStore.set({ mixer: { eq: { maxDb: v } } })}
      />
      <label className="temp-jog-switch">
        <input
          type="checkbox"
          checked={audio.autoGain}
          onChange={(e) =>
            void settingsStore.set({ audio: { autoGain: e.target.checked } })
          }
        />
        <span>
          Auto-gain on load
          <span className="temp-jog-hint">Off keeps GAIN sticky across tracks</span>
        </span>
      </label>
      <label className="temp-jog-switch">
        <input
          type="checkbox"
          checked={xf.enabled}
          onChange={(e) =>
            void settingsStore.set({
              mixer: { crossfader: { enabled: e.target.checked } },
            })
          }
        />
        <span>
          Enable crossfader
          <span className="temp-jog-hint">Off by default (R2.4) — guest mixes only</span>
        </span>
      </label>
    </div>
  );
});

const DisplaySection = observer(function DisplaySection() {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Display</h3>
      <label>
        UI scale
        <select
          value={settingsStore.scale}
          onChange={(e) => {
            const scale = Number(e.target.value) as Settings['ui']['scale'];
            void settingsStore.setScale(scale);
          }}
        >
          {SCALES.map((s) => (
            <option key={s} value={s}>
              {s}%
            </option>
          ))}
        </select>
      </label>
      <div className="temp-meta mono">
        rem {settingsStore.remPx}px · startMode {settingsStore.settings.ui.startMode}
      </div>
      <label className="temp-jog-switch" style={{ marginTop: 12 }}>
        <input
          type="checkbox"
          checked={settingsStore.settings.ui.showBeatTicks}
          onChange={(e) =>
            void settingsStore.set({
              ui: { showBeatTicks: e.target.checked },
            })
          }
        />
        <span>
          Beat ticks on detail waveform
          <span className="temp-jog-hint">R7.5 grid marks</span>
        </span>
      </label>
    </div>
  );
});

const LibrarySection = observer(function LibrarySection() {
  const roots = settingsStore.settings.library.roots;
  const [rootDraft, setRootDraft] = useState('');
  const prog = libraryStore.progress;

  async function pickRoot(): Promise<void> {
    const picked = await invoke('library:pickRoot');
    if (!picked) return;
    await addRootPath(picked.path);
    if (settingsStore.settings.library.roots.length > 0) {
      void libraryStore.rescan();
    }
  }

  async function addRootPath(raw: string): Promise<void> {
    const p = raw.trim();
    if (!p) return;
    const current = settingsStore.settings.library.roots;
    if (current.includes(p)) {
      setRootDraft('');
      return;
    }
    await settingsStore.set({ library: { roots: [...current, p] } });
    setRootDraft('');
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Library roots</h3>
      {roots.length === 0 && (
        <div className="temp-meta" style={{ marginBottom: 8 }}>
          First run: pick a music folder, then Rescan.
        </div>
      )}
      <ul className="temp-roots">
        {roots.length === 0 && <li className="mono hint">No roots yet</li>}
        {roots.map((r) => (
          <li key={r} className="mono">
            <span title={r}>{r}</span>
            <button
              type="button"
              onClick={() => {
                void settingsStore.set({
                  library: { roots: roots.filter((x) => x !== r) },
                });
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <label>
        Add root path
        <input
          type="text"
          value={rootDraft}
          placeholder="C:\Music\Techno"
          onChange={(e) => setRootDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void addRootPath(rootDraft);
            }
          }}
        />
      </label>
      <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void pickRoot()}>
          Browse…
        </button>
        <button type="button" onClick={() => void addRootPath(rootDraft)}>
          Add path
        </button>
        <button
          type="button"
          disabled={libraryStore.scanning || roots.length === 0}
          onClick={() => void libraryStore.rescan()}
        >
          {libraryStore.scanning ? 'Scanning…' : 'Rescan'}
        </button>
      </div>
      <label style={{ marginTop: 8 }}>
        Sort
        <select
          value={settingsStore.settings.library.sort}
          onChange={(e) => {
            const sort = e.target.value as Settings['library']['sort'];
            void settingsStore.set({ library: { sort } }).then(() => libraryStore.refresh());
          }}
        >
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      {prog && (
        <div className="temp-meta mono">
          {prog.phase} {prog.scanned}
          {prog.total != null ? ` / ${prog.total}` : ''}
        </div>
      )}
      {libraryStore.error && <div className="temp-meta">{libraryStore.error}</div>}
      <div className="temp-meta mono">
        {libraryStore.entries.length} browse entries · {libraryStore.tracks.length} tracks
      </div>
    </div>
  );
});

function updateStatusLine(s: AppUpdateStatus): string {
  switch (s.phase) {
    case 'disabled':
      return 'Dev / source build — use UPDATE.bat for git sync. Auto-update needs the installed app.';
    case 'idle':
      return 'Idle — will check shortly after launch.';
    case 'checking':
      return 'Checking GitHub Releases…';
    case 'available':
      return `Update ${s.availableVersion ?? ''} available — downloading…`;
    case 'not-available':
      return 'You are on the latest release.';
    case 'downloading':
      return `Downloading… ${s.percent != null ? `${s.percent}%` : ''}`.trim();
    case 'downloaded':
      return `Ready to install ${s.availableVersion ?? 'update'}. Restart when decks are stopped.`;
    case 'error':
      return s.error ? `Update error: ${s.error}` : 'Update error.';
    default:
      return s.phase;
  }
}

const UpdateSection = observer(function UpdateSection() {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void invoke('app:update:status').then(setStatus);
    return onIpc('app:update:changed', setStatus);
  }, []);

  const playing = deckA.state === 'playing' || deckB.state === 'playing';

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Updates</h3>
      <div className="temp-meta mono">
        v{status?.currentVersion ?? '…'}
        {status?.packaged ? ' · installed' : ' · source'}
      </div>
      <div className="temp-meta">{status ? updateStatusLine(status) : '…'}</div>
      <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy || status?.phase === 'disabled'}
          onClick={() => {
            setBusy(true);
            void invoke('app:update:check')
              .then(setStatus)
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'Checking…' : 'Check for updates'}
        </button>
        <button
          type="button"
          disabled={busy || status?.phase !== 'downloaded'}
          onClick={() => {
            if (playing) {
              const ok = window.confirm(
                'A deck is playing. Restart to install the update anyway? Playback will stop.',
              );
              if (!ok) return;
            } else {
              const ok = window.confirm('Restart StentorDeck to install the update now?');
              if (!ok) return;
            }
            setBusy(true);
            void invoke('app:update:install')
              .then((res) => {
                if (!res.ok) {
                  window.alert(res.reason);
                }
              })
              .finally(() => setBusy(false));
          }}
        >
          Restart &amp; update
        </button>
      </div>
      <div className="temp-meta" style={{ marginTop: 6 }}>
        Booth: GitHub Releases auto-update. Source tree: UPDATE.bat (not GitHub Desktop).
      </div>
    </div>
  );
});

const JogFeelSection = observer(function JogFeelSection() {
  const jog = settingsStore.settings.mixer.jog;

  const patchJog = (partial: Partial<JogSettings>) => {
    let next: JogSettings = { ...jog, ...partial };
    if (next.spinFullAtTps <= next.spinStartsAtTps) {
      if (partial.spinStartsAtTps != null) {
        next = { ...next, spinFullAtTps: next.spinStartsAtTps + 5 };
      } else {
        next = { ...next, spinStartsAtTps: Math.max(1, next.spinFullAtTps - 5) };
      }
    }
    void settingsStore.set({ mixer: { jog: next } });
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Jog feel</h3>
      <p className="settings-section-lead">
        Soft: slow rim rides (speeds up / slows down); faster rim pushes a sticky chunk. Vinyl ON =
        dual-zone fine + spinback. Vinyl button toggles dual-zone. Thresholds are message-rate
        proxies for ~1 cm/s on the RMX2 outer rim — tune if your wheel feels early/late.
      </p>

      <div className="temp-jog-presets">
        {JOG_PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => void settingsStore.set({ mixer: { jog: { ...JOG_PRESETS[id].jog } } })}
          >
            {JOG_PRESETS[id].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void settingsStore.set({ mixer: { jog: { ...defaultJogSettings } } })}
        >
          Reset
        </button>
      </div>

      <label className="temp-jog-switch">
        <input
          type="checkbox"
          checked={jog.dualZone}
          onChange={(e) => patchJog({ dualZone: e.target.checked })}
        />
        <span>
          Dual zone (Vinyl)
          <span className="temp-jog-hint">
            Off = Soft ride + chunk · On = Vinyl fine seek + spin
          </span>
        </span>
      </label>

      <div className="temp-jog-group">
        {jog.dualZone ? 'Fine (Vinyl fingertip)' : 'Ride (slow rim)'}
      </div>
      <JogSlider
        label={jog.dualZone ? 'Fine seek' : 'Nudge chunk'}
        hint={
          jog.dualZone
            ? 'Sticky phase per tick when gentle'
            : 'Sticky phase push when rim is faster (~chunk size)'
        }
        value={jog.fineSeekMs}
        min={jog.dualZone ? 0.01 : 0.5}
        max={jog.dualZone ? 8 : 20}
        step={jog.dualZone ? 0.005 : 0.25}
        unit=" ms"
        format={(v) => `${v.toFixed(jog.dualZone ? 3 : 2)} ms`}
        onChange={(v) => patchJog({ fineSeekMs: v })}
      />
      <JogSlider
        label={jog.dualZone ? 'Fine rate bend' : 'Ride bend'}
        hint={
          jog.dualZone
            ? 'Usually 0 on Vinyl — seek-primary'
            : 'Temporary pitch % while riding slowly (forward = faster)'
        }
        value={jog.fineRatePercent}
        min={0}
        max={jog.dualZone ? 1 : 2}
        step={0.01}
        unit="%"
        format={(v) => `${v.toFixed(2)}%`}
        onChange={(v) => patchJog({ fineRatePercent: v })}
      />

      <div className="temp-jog-group">
        {jog.dualZone ? 'Spin (fast twist)' : 'Nudge threshold (rim speed)'}
      </div>
      {jog.dualZone ? (
        <>
          <JogSlider
            label="Spin seek"
            hint="Phase throw per tick at full spin"
            value={jog.spinSeekMs}
            min={4}
            max={80}
            step={1}
            unit=" ms"
            onChange={(v) => patchJog({ spinSeekMs: v })}
          />
          <JogSlider
            label="Spin rate bend"
            hint="Temp speed drag at full spin"
            value={jog.spinRatePercent}
            min={0}
            max={40}
            step={0.5}
            unit="%"
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => patchJog({ spinRatePercent: v })}
          />
        </>
      ) : null}
      <JogSlider
        label={jog.dualZone ? 'Spin starts at' : 'Chunk starts at'}
        hint={
          jog.dualZone
            ? 'Tick-rate where spin opens'
            : 'Msg/s proxy for ~1 cm/s outer rim — lower = chunks sooner'
        }
        value={jog.spinStartsAtTps}
        min={15}
        max={350}
        step={1}
        unit=" t/s"
        onChange={(v) => patchJog({ spinStartsAtTps: v })}
      />
      <JogSlider
        label={jog.dualZone ? 'Full spin at' : 'Full chunk at'}
        hint={
          jog.dualZone
            ? 'Tick-rate for maximum spinback'
            : 'Msg/s for full nudge chunk size'
        }
        value={jog.spinFullAtTps}
        min={40}
        max={500}
        step={1}
        unit=" t/s"
        onChange={(v) => patchJog({ spinFullAtTps: v })}
      />

      <div className="temp-jog-group">Shared</div>
      <JogSlider
        label="Rate decay"
        hint="How long ride bend holds after the last tick"
        value={jog.rateDecayMs}
        min={60}
        max={800}
        step={10}
        unit=" ms"
        onChange={(v) => patchJog({ rateDecayMs: v })}
      />
      <JogSlider
        label="Paused fine scrub"
        hint="Seek per tick while stopped (gentle)"
        value={jog.pausedFineSeekMs}
        min={1}
        max={30}
        step={0.5}
        unit=" ms"
        onChange={(v) => patchJog({ pausedFineSeekMs: v })}
      />
      <JogSlider
        label="Paused spin scrub"
        hint="Seek per tick while stopped (fast twist)"
        value={jog.pausedSpinSeekMs}
        min={5}
        max={100}
        step={1}
        unit=" ms"
        onChange={(v) => patchJog({ pausedSpinSeekMs: v })}
      />
    </div>
  );
});
