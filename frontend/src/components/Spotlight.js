'use client';

import { useEffect } from 'react';

// On computers with a mouse, glass cards get a soft light that follows the pointer.
// It only sets two CSS variables (--mx, --my) on the card under the mouse; the light
// itself is drawn in app/premium.css. Phones and "reduce motion" users skip it.
export default function Spotlight() {
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || calm.matches) return undefined;

    let card = null;
    let frame = 0;
    let lastEvent = null;

    const clear = () => {
      if (card) {
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      }
      card = null;
    };

    const update = () => {
      frame = 0;
      const event = lastEvent;
      const target = event?.target instanceof Element ? event.target.closest('[class*="bg-white"][class*="rounded"]') : null;
      if (target !== card) clear();
      if (!target) return;
      card = target;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      target.style.setProperty('--my', `${event.clientY - rect.top}px`);
    };

    const onMove = (event) => {
      lastEvent = event;
      if (!frame) frame = requestAnimationFrame(update);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', clear);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', clear);
      cancelAnimationFrame(frame);
      clear();
    };
  }, []);

  return null;
}
