import { useEffect, useRef } from 'react';

const STEP = 0.03;

/**
 * Scroll-wheel nudge for 0..1 controls (knobs / faders).
 * Pass the DOM node (callback-ref state), not only a RefObject — so the
 * listener attaches after mount. Non-passive so preventDefault works.
 */
export function useWheelNudge01(
  element: HTMLElement | null,
  value: number,
  onChange: (v: number) => void,
  enabled = true,
): void {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!element || !enabled) return;

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

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [element, enabled]);
}
