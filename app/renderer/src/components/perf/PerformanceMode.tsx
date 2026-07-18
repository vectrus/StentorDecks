import { observer } from 'mobx-react-lite';
import { deckA, deckB, midiStore } from '../../stores/root';
import { DetailWaveform } from './DetailWaveform';
import { PerfBrowseStrip } from './PerfBrowseStrip';
import { PerfDeckMini } from './PerfDeckMini';
import { PerfMixerMini } from './PerfMixerMini';

/**
 * Performance shell — scrolling detail well + per-deck overview (E6 / docs/05–06).
 */
export const PerformanceMode = observer(function PerformanceMode() {
  return (
    <div className="perf">
      <div className="perf-top">
        <span className="mono hint">
          {midiStore.connected
            ? `${midiStore.portName ?? 'RMX2'} connected`
            : 'No MIDI — mouse + Prep still work'}
        </span>
      </div>

      <div className="perf-well">
        <DetailWaveform deck={deckA} accent="a" />
        <DetailWaveform deck={deckB} accent="b" />
        <div className="perf-ph" aria-hidden />
      </div>

      <div className="perf-mid">
        <PerfDeckMini deck={deckA} other={deckB} accent="a" />
        <PerfMixerMini />
        <PerfDeckMini deck={deckB} other={deckA} accent="b" />
      </div>

      <PerfBrowseStrip />
    </div>
  );
});
