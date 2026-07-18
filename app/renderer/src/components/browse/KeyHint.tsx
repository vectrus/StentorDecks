import { camelotRelation, type CamelotRelation } from '@stentordeck/shared';

/** Subtle Camelot “fits next” mark beside a library key cell. */
export function KeyHint(props: {
  trackKey: string | null | undefined;
  referenceKey: string | null;
  className?: string;
}) {
  const { trackKey, referenceKey, className } = props;
  const keyLabel = trackKey ?? '…';
  const rel =
    trackKey && referenceKey ? camelotRelation(referenceKey, trackKey) : null;
  if (!rel) {
    return <span className={className}>{keyLabel}</span>;
  }
  return (
    <span
      className={`${className ?? ''} key-fit key-fit-${rel}`.trim()}
      title={titleFor(rel, referenceKey)}
    >
      <span className="key-fit-mark" aria-hidden>
        ~
      </span>
      {keyLabel}
    </span>
  );
}

function titleFor(rel: CamelotRelation, ref: string | null): string {
  const r = ref ?? '?';
  if (rel === 'same') return `Same key as ${r} — safe mix`;
  if (rel === 'adjacent') return `Adjacent Camelot to ${r} — energy step`;
  return `Relative major/minor of ${r} — mood flip`;
}
