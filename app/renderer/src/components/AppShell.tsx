import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { audioDeviceStore, libraryStore, settingsStore } from '../stores/root';
import { invoke } from '../ipc/client';
import { uiStore } from '../stores/UiStore';
import { TempSettingsPanel } from './TempSettingsPanel';
import { AudioSetupScreen } from './AudioSetupScreen';
import { DevHarness } from './DevHarness';
import { PrepMode } from './prep/PrepMode';
import { PerformanceMode } from './perf/PerformanceMode';
import { BrandMark } from './BrandMark';
import { MidiMonitor } from './MidiMonitor';
import { midiStore } from '../stores/root';

export const AppShell = observer(function AppShell() {
  const [setupOpen, setSetupOpen] = useState(() => audioDeviceStore.needsSetup);
  const [showHarness, setShowHarness] = useState(false);
  const [showMidi, setShowMidi] = useState(false);

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
          <button type="button" className="mode" onClick={() => setSetupOpen(true)}>
            Audio
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

      <TempSettingsPanel />
    </div>
  );
});
