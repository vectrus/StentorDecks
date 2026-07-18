import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import {
  defaultJogSettings,
  JOG_PRESETS,
  type AppUpdateStatus,
  type JogPresetId,
  type JogSettings,
  type Settings,
} from '@stentordeck/shared';
import { invoke, onIpc } from '../ipc/client';
import { deckA, deckB, libraryStore, settingsStore } from '../stores/root';

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

/** Collapsed by default — opens as a drawer so it doesn’t cover Prep/browser. */
export const TempSettingsPanel = observer(function TempSettingsPanel() {
  const roots = settingsStore.settings.library.roots;
  const [open, setOpen] = useState(() => roots.length === 0);
  const [rootDraft, setRootDraft] = useState('');
  const prog = libraryStore.progress;

  if (!open) {
    return (
      <button
        type="button"
        className="temp-settings-fab"
        onClick={() => setOpen(true)}
        title="Open settings (scale, library roots, sort)"
      >
        Settings
      </button>
    );
  }

  return (
    <aside className="temp-settings">
      <div className="temp-settings-hd">
        <div className="temp-title" style={{ marginBottom: 0 }}>
          Settings (temporary)
        </div>
        <button type="button" className="temp-settings-close" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
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

      <UpdateSection />

      <div className="temp-title" style={{ marginTop: 12 }}>
        Library roots (E4)
      </div>
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

      <JogFeelSection />
    </aside>
  );

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
    <div className="temp-update">
      <div className="temp-title" style={{ marginTop: 12 }}>
        Updates
      </div>
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
    // Keep spin thresholds ordered when dragging either end.
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
    <div className="temp-jog">
      <div className="temp-title" style={{ marginTop: 14 }}>
        Jog feel (live)
      </div>
      <div className="temp-meta" style={{ marginBottom: 8 }}>
        Soft = heavy platter (short nudge = tiny offset). Tweak live on the wheel.
      </div>

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
          Dual zone
          <span className="temp-jog-hint">Off = fine only (no spinback boost)</span>
        </span>
      </label>

      <div className="temp-jog-group">Fine (fingertip)</div>
      <JogSlider
        label="Fine seek"
        hint="Phase step per tick when nudging gently — keep low for SL-1200 feel"
        value={jog.fineSeekMs}
        min={0.05}
        max={8}
        step={0.05}
        unit=" ms"
        format={(v) => `${v.toFixed(2)} ms`}
        onChange={(v) => patchJog({ fineSeekMs: v })}
      />
      <JogSlider
        label="Fine rate bend"
        hint="Temporary speed change while light-nudging"
        value={jog.fineRatePercent}
        min={0}
        max={1}
        step={0.01}
        unit="%"
        format={(v) => `${v.toFixed(2)}%`}
        onChange={(v) => patchJog({ fineRatePercent: v })}
      />

      <div className="temp-jog-group">Spin (fast twist / spinback)</div>
      <JogSlider
        label="Spin seek"
        hint="Phase throw per tick at full spin intensity"
        value={jog.spinSeekMs}
        min={4}
        max={80}
        step={1}
        unit=" ms"
        onChange={(v) => patchJog({ spinSeekMs: v })}
      />
      <JogSlider
        label="Spin rate bend"
        hint="Temp speed drag at full spin (audible platter feel)"
        value={jog.spinRatePercent}
        min={0}
        max={40}
        step={0.5}
        unit="%"
        format={(v) => `${v.toFixed(1)}%`}
        onChange={(v) => patchJog({ spinRatePercent: v })}
      />
      <JogSlider
        label="Spin starts at"
        hint="Tick-rate where spin opens — keep above light RMX2 flood (~80–120)"
        value={jog.spinStartsAtTps}
        min={20}
        max={350}
        step={5}
        unit=" t/s"
        onChange={(v) => patchJog({ spinStartsAtTps: v })}
      />
      <JogSlider
        label="Full spin at"
        hint="Tick-rate for maximum spinback throw"
        value={jog.spinFullAtTps}
        min={60}
        max={500}
        step={5}
        unit=" t/s"
        onChange={(v) => patchJog({ spinFullAtTps: v })}
      />

      <div className="temp-jog-group">Shared</div>
      <JogSlider
        label="Rate decay"
        hint="How long temp rate bend holds after the last tick"
        value={jog.rateDecayMs}
        min={100}
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
