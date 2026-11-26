'use client';

import { useCallback, useState } from 'react';

// An <img> that fades in once it has loaded instead of popping in (styles: .img-fade in app/motion.css).
// Takes the same props as <img>.
export default function FadeImage({ className = '', onLoad, alt = '', ...props }) {
  const [loaded, setLoaded] = useState(false);

  // Photos that were already in the browser cache are complete before React attaches onLoad
  const ref = useCallback((node) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt={alt}
      {...props}
      data-loaded={loaded ? 'true' : 'false'}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      className={`img-fade ${className}`}
    />
  );
}
