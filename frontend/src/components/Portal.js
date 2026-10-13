'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};

// Draws its children straight into <body>, on top of the whole page (header and footer included),
// and keeps the page behind from scrolling while the pop-up is open.
// Pop-ups inside a page are otherwise trapped under the sticky header and the footer.
export default function Portal({ children }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return mounted ? createPortal(children, document.body) : null;
}
