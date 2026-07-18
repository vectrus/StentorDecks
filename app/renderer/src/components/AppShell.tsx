import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { audioDeviceStore, settingsStore } from '../stores/root';
import { uiStore } from '../stores/UiStore';
import { TempSettingsPanel } from './TempSettingsPanel';
import { AudioSetupScreen } from './AudioSetupScreen';
import { DevHarness } from './DevHarness';
import { BrandMark } from './BrandMark';
import { MidiMonitor } from './MidiMonitor';
import { midiStore } from '../stores/root';

export const AppShell = observer(function AppShell() {
  const [setupOpen, setSetupOpen] = useState(() => audioDeviceStore.needsSetup);
  const [showHarness, setShowHarness] = useState(true);
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
            onClick={() => void uiStore.setMode('performance')}
          >
            Performance
          </button>
          <button
            type="button"
            className={uiStore.mode === 'prep' ? 'mode on' : 'mode'}
            onClick={() => void uiStore.setMode('prep')}
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

      <main className="stage">
        {showHarness ? (
          <DevHarness />
        ) : uiStore.mode === 'performance' ? (
          <Placeholder
            title="Performance mode"
            body="Waveforms · decks · mixer · browser land in E6. Use E2 Harness for audio now."
          />
        ) : (
          <Placeholder
            title="Prep mode"
            body="Folder tree · large browser · BPM/key corrections (E4/E6)."
          />
        )}
        {showMidi ? <MidiMonitor /> : null}
      </main>

      <TempSettingsPanel />
    </div>
  );
});

function Placeholder(props: { title: string; body: string }) {
  return (
    <section className="placeholder">
      <h1>{props.title}</h1>
      <p>{props.body}</p>
    </section>
  );
}
