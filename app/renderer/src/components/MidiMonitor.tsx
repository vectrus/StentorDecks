import { observer } from 'mobx-react-lite';
import { midiStore } from '../stores/root';

/** Minimal E3 MIDI monitor — live decode annotations + unknown counter. */
export const MidiMonitor = observer(function MidiMonitor() {
  return (
    <section className="midi-monitor" aria-label="MIDI monitor">
      <header className="midi-monitor-head">
        <strong>MIDI monitor</strong>
        <span className="mono">
          {midiStore.connected
            ? midiStore.portName ?? 'connected'
            : 'no port'}{' '}
          · unknown {midiStore.unknownCount}
        </span>
      </header>
      <ul className="midi-monitor-list">
        {midiStore.monitor.length === 0 ? (
          <li className="hint">Move a control on the RMX2…</li>
        ) : (
          midiStore.monitor.slice(0, 40).map((e, i) => (
            <li key={`${e.t}-${i}`} className={e.unknown ? 'unknown' : ''}>
              <span className="mono">{e.annotation}</span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
});
