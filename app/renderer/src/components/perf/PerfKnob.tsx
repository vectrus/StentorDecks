/** Vertical-drag rotary control (mouse / touch / keyboard). Double-click resets to `reset`. */

import { useRef } from 'react';

export function PerfKnob(props: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  ariaLabel: string;
  title?: string;
  size?: 'sm' | 'md';
  reset?: number;
  disabled?: boolean;
  pickup?: number | null;
  /** Extra class on the wrap (e.g. fx-active when filter pad is on). */
  className?: string;
}) {
  const {
    value,
    onChange,
    label,
    ariaLabel,
    title,
    size = 'md',
    reset = 0.5,
    disabled,
    pickup,
    className,
  } = props;
  const angle = (Math.min(1, Math.max(0, value)) - 0.5) * 270;
  const showPickup = pickup != null && Number.isFinite(pickup);
  const hwAngle = showPickup ? (pickup! - 0.5) * 270 : 0;
  const drag = useRef<{ startY: number; startVal: number } | null>(null);

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

  return (
    <div className={`perf-knob-wrap size-${size}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`perf-knob size-${size}${showPickup ? ' pickup' : ''}`}
        style={{ ['--knob-angle' as string]: `${angle}deg` }}
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={value}
        role="slider"
        title={title ?? `${ariaLabel} — drag up/down`}
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
          drag.current = { startY: e.clientY, startVal: value };
        }}
        onPointerMove={(e) => {
          if (!drag.current || disabled) return;
          const dy = drag.current.startY - e.clientY;
          // ~80 px full throw — usable on small AMT knobs
          onChange(clamp01(drag.current.startVal + dy / 80));
        }}
        onPointerUp={(e) => {
          drag.current = null;
          try {
            (e.currentTarget as HTMLButtonElement).releasePointerCapture(e.pointerId);
          } catch {
            /* already released */
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onDoubleClick={() => {
          if (!disabled) onChange(reset);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          const step = e.shiftKey ? 0.05 : 0.02;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(clamp01(value + step));
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onChange(clamp01(value - step));
          } else if (e.key === 'Home') {
            e.preventDefault();
            onChange(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            onChange(1);
          } else if (e.key === '0' || e.key === 'Delete') {
            e.preventDefault();
            onChange(reset);
          }
        }}
        onWheel={(e) => {
          if (disabled) return;
          e.preventDefault();
          onChange(clamp01(value + (e.deltaY < 0 ? 0.03 : -0.03)));
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
