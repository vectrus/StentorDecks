import { observer } from 'mobx-react-lite';
import { audioDeviceStore, deckA, deckB, midiStore } from '../../stores/root';
import { DetailWaveform } from './DetailWaveform';
import { PerfBrowseStrip } from './PerfBrowseStrip';
import { PerfDeckMini } from './PerfDeckMini';
import { PerfHeaderOuts } from './PerfHeaderOuts';
import { PerfMixerMini } from './PerfMixerMini';

/**
 * Performance shell — v2 handoff: header outs, full decks, slim mixer, flex library.
 */
export const PerformanceMode = observer(function PerformanceMode() {
  return (
    <div className="perf">
      <div className="perf-top">
        <span className="mono hint">
          {midiStore.connected ? (
            <>
              <span className="perf-midi-dot" aria-hidden />
              {midiStore.portName ?? 'RMX2'} · Plan {audioDeviceStore.activePlan}
            </>
          ) : (
            'No MIDI — mouse + Prep still work'
          )}
        </span>
        <PerfHeaderOuts />
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
