/**
 * StentorDeck brand — dual-deck faders + lowercase j (for julius).
 * SVG so it stays sharp at any UI scale (R7.2).
 */
export function BrandMark(props: { compact?: boolean; className?: string }) {
  return (
    <div className={`brand-mark ${props.compact ? 'compact' : ''} ${props.className ?? ''}`}>
      <svg
        className="brand-mark-icon"
        viewBox="0 0 40 40"
        width="28"
        height="28"
        aria-hidden
      >
        <rect x="0" y="0" width="40" height="40" rx="8" fill="#0E1115" />
        <rect x="9" y="10" width="7" height="22" rx="2.5" fill="var(--deck-a, #FFB454)" />
        <rect x="18" y="6" width="7" height="26" rx="2.5" fill="var(--deck-b, #5BD0FF)" />
        <text
          x="31"
          y="30"
          textAnchor="middle"
          fill="#F4F7FB"
          fontFamily="Bahnschrift, 'Segoe UI', sans-serif"
          fontSize="14"
          fontWeight="600"
        >
          j
        </text>
      </svg>
      {!props.compact ? (
        <div className="brand-mark-text">
          <span className="brand-name">StentorDeck</span>
          <span className="brand-for">for julius</span>
        </div>
      ) : null}
    </div>
  );
}
