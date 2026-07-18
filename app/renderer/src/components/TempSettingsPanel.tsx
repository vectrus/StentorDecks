import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import type { Settings } from '@stentordeck/shared';
import { invoke } from '../ipc/client';
import { libraryStore, settingsStore } from '../stores/root';

const SCALES: Settings['ui']['scale'][] = [100, 125, 150];
const SORTS: Settings['library']['sort'][] = [
  'filename',
  'artist',
  'title',
  'bpm',
  'key',
  'duration',
];

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
