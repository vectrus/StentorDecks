/** Vertical-drag rotary control (mouse / touch). Double-click resets to `reset`. */

export function PerfKnob(props: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  ariaLabel: string;
  size?: 'sm' | 'md';
  reset?: number;
  disabled?: boolean;
  pickup?: number | null;
}) {
  const {
    value,
    onChange,
    label,
    ariaLabel,
    size = 'md',
    reset = 0.5,
    disabled,
    pickup,
  } = props;
  const angle = (Math.min(1, Math.max(0, value)) - 0.5) * 270;
  const showPickup = pickup != null && Number.isFinite(pickup);
  const hwAngle = showPickup ? (pickup! - 0.5) * 270 : 0;

  return (
    <div className={`perf-knob-wrap size-${size}`}>
      <button
        type="button"
        className={`perf-knob size-${size}${showPickup ? ' pickup' : ''}`}
        style={{ ['--knob-angle' as string]: `${angle}deg` }}
        aria-label={ariaLabel}
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          const startY = e.clientY;
          const start = value;
          const move = (ev: PointerEvent) => {
            const dy = startY - ev.clientY;
            onChange(Math.min(1, Math.max(0, start + dy / 120)));
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
        onDoubleClick={() => {
          if (!disabled) onChange(reset);
        }}
      >
        {showPickup && (
          <span
            className="perf-knob-hw"
            style={{ ['--hw-angle' as string]: `${hwAngle}deg` }}
            aria-hidden
          />
        )}
      </button>
      {label ? <div className="perf-knob-label">{label}</div> : null}
    </div>
  );
}
