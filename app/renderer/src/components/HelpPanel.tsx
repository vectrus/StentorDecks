import { useEffect, useMemo, useRef, useState } from 'react';
import { HELP_TOPICS } from '../help/catalog';
import { operatorBody, searchHelp } from '../help/searchHelp';
import { RenderMarkdown } from '../help/renderMarkdown';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Searchable end-user Help — docs/guides (E7). */
export function HelpPanel(props: Props) {
  const { open, onClose } = props;
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(HELP_TOPICS[0]?.id ?? '');
  const searchRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => searchHelp(HELP_TOPICS, query), [query]);

  useEffect(() => {
    if (!open) return;
    setActiveId((prev) => (hits.some((h) => h.topic.id === prev) ? prev : (hits[0]?.topic.id ?? prev)));
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, hits]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const active = hits.find((h) => h.topic.id === activeId)?.topic ?? hits[0]?.topic;

  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Help">
      <button type="button" className="help-backdrop" aria-label="Close help" onClick={onClose} />
      <div className="help-panel">
        <header className="help-hd">
          <div className="help-hd-text">
            <h2 className="help-title">Help</h2>
            <p className="help-sub">Search guides · Esc to close · F1 to open</p>
          </div>
          <label className="help-search">
            <span className="sr-only">Search help</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search: sync, BPM, load, takeover…"
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button type="button" className="mode" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="help-body">
          <nav className="help-nav" aria-label="Topics">
            {hits.length === 0 ? (
              <p className="help-empty">No topics match “{query}”.</p>
            ) : (
              <ul>
                {hits.map((hit) => (
                  <li key={hit.topic.id}>
                    <button
                      type="button"
                      className={hit.topic.id === active?.id ? 'help-topic on' : 'help-topic'}
                      onClick={() => setActiveId(hit.topic.id)}
                    >
                      <span className="help-topic-title">{hit.topic.title}</span>
                      {hit.snippet ? <span className="help-topic-snip">{hit.snippet}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          <article className="help-article">
            {active ? (
              <RenderMarkdown source={operatorBody(active.body)} />
            ) : (
              <p className="help-empty">Pick a topic on the left.</p>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
