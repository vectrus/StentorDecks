import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { audioDeviceStore, libraryStore, settingsStore } from '../stores/root';
import { invoke } from '../ipc/client';
import { uiStore } from '../stores/UiStore';
import { SettingsModal } from './SettingsModal';
import { AudioSetupScreen } from './AudioSetupScreen';
import { DevHarness } from './DevHarness';
import { PrepMode } from './prep/PrepMode';
import { PerformanceMode } from './perf/PerformanceMode';
import { PerfHeaderOuts } from './perf/PerfHeaderOuts';
import { BrandMark } from './BrandMark';
import { MidiMonitor } from './MidiMonitor';
import { HelpPanel } from './HelpPanel';
import { midiStore } from '../stores/root';

function SettingsCogIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
      />
    </svg>
  );
}

export const AppShell = observer(function AppShell() {
  const [setupOpen, setSetupOpen] = useState(() => audioDeviceStore.needsSetup);
  const [showHarness, setShowHarness] = useState(false);
  const [showMidi, setShowMidi] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(
    () => settingsStore.settings.library.roots.length === 0,
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      if (e.key === ',' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowSettings((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (setupOpen) {
    return (
      <div className="shell">
        <header className="topbar">
          <BrandMark />
          <span className="hint">First-run / audio routing</span>
        </header>
        <main className="stage setup-stage">
          <AudioSetupScreen
            allowSkip={!audioDeviceStore.needsSetup}
            onContinue={() => setSetupOpen(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <BrandMark />
        <div className="modes">
          <button
            type="button"
            className={uiStore.mode === 'performance' ? 'mode on' : 'mode'}
            onClick={() => {
              setShowHarness(false);
              void uiStore.setMode('performance');
            }}
          >
            Performance
          </button>
          <button
            type="button"
            className={uiStore.mode === 'prep' ? 'mode on' : 'mode'}
            onClick={() => {
              setShowHarness(false);
              void uiStore.setMode('prep');
            }}
          >
            Prep
          </button>
        </div>
        <div className="top-actions">
          <PerfHeaderOuts />
          <button type="button" className="mode" onClick={() => setSetupOpen(true)}>
            Audio
          </button>
          <button
            type="button"
            className={showSettings ? 'mode on settings-cog' : 'mode settings-cog'}
            title="Settings (Ctrl+,)"
            aria-label="Settings"
            aria-pressed={showSettings}
            onClick={() => setShowSettings(true)}
          >
            <SettingsCogIcon />
          </button>
          <button
            type="button"
            className={showHelp ? 'mode on' : 'mode'}
            title="Help (F1)"
            onClick={() => setShowHelp(true)}
          >
            Help
          </button>
          <button
            type="button"
            className={showHarness ? 'mode on' : 'mode'}
            onClick={() => setShowHarness((v) => !v)}
          >
            E2 Harness
          </button>
          <button
            type="button"
            className={showMidi ? 'mode on' : 'mode'}
            onClick={() => setShowMidi((v) => !v)}
          >
            MIDI {midiStore.connected ? '·' : ''}
          </button>
          <span className="hint mono">
            Plan {audioDeviceStore.activePlan} ·{' '}
            {midiStore.connected ? midiStore.portName ?? 'MIDI' : 'no MIDI'} ·{' '}
            {uiStore.fullscreen ? 'Fullscreen' : 'Windowed'}
          </span>
          <button
            type="button"
            className="corner"
            title="Exit fullscreen"
            onClick={() => void uiStore.toggleFullscreen()}
          >
            □
          </button>
        </div>
      </header>

      {settingsStore.corruptionNotice ? (
        <div className="banner" role="status">
          <span>{settingsStore.corruptionNotice}</span>
          <button type="button" onClick={() => settingsStore.dismissCorruptionNotice()}>
            Dismiss
          </button>
        </div>
      ) : null}

      {audioDeviceStore.banner ? (
        <div className="banner" role="alert">
          <span>{audioDeviceStore.banner}</span>
        </div>
      ) : null}

      {settingsStore.settings.library.roots.length === 0 ? (
        <div className="banner" role="status">
          <span>Choose a music folder to build your library.</span>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                const picked = await invoke('library:pickRoot');
                if (!picked) return;
                await settingsStore.set({
                  library: { roots: [picked.path] },
                });
                void libraryStore.rescan();
              })();
            }}
          >
            Browse…
          </button>
        </div>
      ) : null}

      <main className="stage">
        {showHarness ? (
          <DevHarness />
        ) : uiStore.mode === 'prep' ? (
          <PrepMode />
        ) : (
          <PerformanceMode />
        )}
        {showMidi ? <MidiMonitor /> : null}
      </main>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        initialSection={
          settingsStore.settings.library.roots.length === 0 ? 'library' : undefined
        }
      />
      <HelpPanel open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
});
