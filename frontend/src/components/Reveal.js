'use client';

import { useEffect, useRef, useState } from 'react';

// Animates its content in the first time it scrolls into view (styles: .reveal in globals.css).
// `animation`: 'fade-up' (default), 'fade-down', 'fade-left', 'fade-right' or 'zoom-in'.
// `delay` (ms) staggers items in a row or grid.
export default function Reveal({ as: Tag = 'div', animation = 'fade-up', delay = 0, className = '', style, children, ...rest }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-animation={animation}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ ...style, '--reveal-delay': `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
