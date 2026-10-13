'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

// The home page picture: fades from one wallpaper to the next, or shows a single one
export default function HeroSlideshow({ slides, rotate, seconds }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const current = count > 0 ? index % count : 0;

  useEffect(() => {
    if (!rotate || count < 2) return undefined;
    // Visitors who ask their device for less motion keep a still picture
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) setIndex((value) => (value + 1) % count);
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [rotate, count, seconds, index]);

  return (
    <>
      {slides.map((slide, position) => (
        <Image
          key={slide.id}
          src={slide.src}
          alt=""
          fill
          preload={position === 0 && !slide.custom}
          unoptimized={slide.custom}
          sizes="(min-width: 1024px) 40vw, 90vw"
          aria-hidden={position !== current}
          className={`object-cover object-[50%_40%] transition-opacity duration-1000 ease-in-out ${position === current ? 'opacity-100' : 'opacity-0'}`}
        />
      ))}
      {rotate && count > 1 && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
          {slides.map((slide, position) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`${position + 1} / ${count}`}
              aria-current={position === current}
              className={`h-2 rounded-full bg-white/90 shadow transition-all duration-300 ${position === current ? 'w-6' : 'w-2 opacity-60 hover:opacity-100'}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
