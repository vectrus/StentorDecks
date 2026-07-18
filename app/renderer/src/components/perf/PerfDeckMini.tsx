import { observer } from 'mobx-react-lite';
import type { DeckStore } from '../../stores/DeckStore';
import { formatUserError } from '../../util/formatUserError';
import { fmtRemaining } from '../prep/fmt';
import { OverviewWaveform } from './OverviewWaveform';

export const PerfDeckMini = observer(function PerfDeckMini(props: {
  deck: DeckStore;
  other: DeckStore;
  accent: 'a' | 'b';
}) {
  const { deck, other, accent } = props;
  const playing = deck.state === 'playing';
  const title = deck.title || (deck.state === 'empty' ? 'Empty' : 'Untitled');
  const artist = deck.artist || '—';
  const bpm =
    deck.effectiveBpm != null
      ? deck.effectiveBpm.toFixed(1)
      : deck.fileBpm != null
        ? deck.fileBpm.toFixed(1)
        : '—';

  return (
    <div className={`perf-deck perf-deck-${accent}`}>
      <div className="perf-deck-hd">
        <div className="perf-deck-meta">
          <div className="perf-deck-title">{title}</div>
          <div className="perf-deck-artist">{artist}</div>
        </div>
      </div>
      <div className="perf-deck-big">
        <span className={`perf-deck-bpm mono accent-${accent}`}>{bpm}</span>
        <span className="perf-deck-rem mono">
          {deck.state === 'empty' ? '—' : fmtRemaining(deck.position, deck.duration)}
        </span>
      </div>
      <OverviewWaveform deck={deck} accent={accent} />
      <div className="perf-deck-row">
        <button
          type="button"
          className={`perf-play${playing ? ' on' : ''}`}
          disabled={deck.state === 'empty'}
          onClick={() => {
            try {
              if (playing) deck.pause();
              else deck.play();
            } catch (err) {
              alert(formatUserError(err, `Deck ${deck.id} transport`));
            }
          }}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <button
          type="button"
          className="perf-btn"
          disabled={deck.state === 'empty'}
          onClick={() => deck.cuePress()}
        >
          CUE
        </button>
        <button
          type="button"
          className={`perf-btn${deck.syncArmed ? ' sync' : ''}`}
          disabled={deck.state === 'empty'}
          onClick={() => deck.toggleSync(other)}
        >
          SYNC
        </button>
      </div>
    </div>
  );
});
