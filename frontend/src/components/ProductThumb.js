'use client';

import { useState } from 'react';
import { Package } from 'lucide-react';

// Small square product photo, with a box icon when there is no photo or it fails to load
export default function ProductThumb({ src, alt = '', size = 'h-14 w-14' }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className={`flex ${size} shrink-0 items-center justify-center rounded-xl bg-sand/60 text-slate-300`}>
        <Package className="h-6 w-6" />
      </span>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`${size} shrink-0 rounded-xl object-cover ring-1 ring-ink/5`} />;
}
