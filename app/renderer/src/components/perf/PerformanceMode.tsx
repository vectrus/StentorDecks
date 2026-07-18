import { observer } from 'mobx-react-lite';
import { deckA, deckB, libraryStore } from '../../stores/root';
import { DetailWaveform } from './DetailWaveform';
import { PerfBrowseStrip } from './PerfBrowseStrip';
import { PerfDeckMini } from './PerfDeckMini';
import { PerfMixerMini } from './PerfMixerMini';

/**
 * Performance shell — v2 handoff: full decks, slim mixer, flex library.
 * MST/CUE/PHN live in the app topbar (left of Audio).
 */
export const PerformanceMode = observer(function PerformanceMode() {
  return (
    <div className="perf">
      {libraryStore.loadError ? (
        <div className="perf-toast" role="alert">
          <span>{libraryStore.loadError}</span>
          <button type="button" onClick={() => libraryStore.clearLoadError()}>
            Dismiss
          </button>
        </div>
      ) : null}

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
