import { useEffect, useRef, type RefObject } from 'react';

const STEP = 0.03;

/**
 * Scroll-wheel nudge for 0..1 controls (knobs / faders).
 * Uses a non-passive native listener — React's onWheel is often passive, so
 * preventDefault is ignored and the gesture can be swallowed by a parent scroller.
 */
export function useWheelNudge01(
  ref: RefObject<HTMLElement | null>,
  value: number,
  onChange: (v: number) => void,
  enabled = true,
): void {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const onWheel = (e: WheelEvent) => {
      const dominant =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (dominant === 0) return;
      e.preventDefault();
      e.stopPropagation();
      const next = Math.min(
        1,
        Math.max(0, valueRef.current + (dominant < 0 ? STEP : -STEP)),
      );
      onChangeRef.current(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [enabled]);
}
