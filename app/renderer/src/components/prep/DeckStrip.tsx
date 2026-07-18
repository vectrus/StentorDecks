import { observer } from 'mobx-react-lite';
import type { DeckStore } from '../../stores/DeckStore';
import { fmtRemaining } from './fmt';

export const DeckStrip = observer(function DeckStrip(props: {
  deck: DeckStore;
  accent: 'a' | 'b';
}) {
  const { deck, accent } = props;
  const playing = deck.state === 'playing';
  const title = deck.title || (deck.state === 'empty' ? 'Empty' : 'Untitled');
  const bpm =
    deck.effectiveBpm != null
      ? deck.effectiveBpm.toFixed(1)
      : deck.fileBpm != null
        ? deck.fileBpm.toFixed(1)
        : '—';

  return (
    <div className={`prep-strip prep-strip-${accent}`}>
      <span className="prep-strip-icon" aria-hidden>
        {playing ? '▶' : deck.state === 'stopped' ? '❚❚' : '○'}
      </span>
      <span className="prep-strip-title">{title}</span>
      <span className={`prep-strip-bpm mono accent-${accent}`}>{bpm}</span>
      <span className="prep-strip-rem mono">
        {deck.state === 'empty' ? '—' : fmtRemaining(deck.position, deck.duration)}
      </span>
    </div>
  );
});
