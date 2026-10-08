'use client';

import { useEffect, useRef, useState } from 'react';

// Counts up to `value` (from 0 the first time, then from the previous number).
// Visitors who ask their device for less motion just see the number.
export default function CountUp({ value, duration = 1000 }) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);

  useEffect(() => {
    const from = shownRef.current;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const progress = reduceMotion ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(from + (target - from) * eased);
      shownRef.current = next;
      setShown(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return <span className="tabular-nums">{shown}</span>;
}
