'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause } from 'lucide-react';

// Slideshow component with individual per-slide timings, progress bar, pause on hover, and slide controls
export default function HeroSlideshow({
  slides = [],
  rotate = true,
  seconds = 6,
  timings = {},
  controlsPosition = 'bottom',
  showProgressBar = true,
  showArrows = true,
}) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const count = slides.length;
  const current = count > 0 ? index % count : 0;
  const currentSlide = slides[current];

  // Specific hold duration for current slide, or global default seconds (minimum 2s)
  const currentDuration = Math.max(
    2,
    timings?.[currentSlide?.id] || Number(currentSlide?.duration) || Number(seconds) || 6
  );

  const nextSlide = useCallback(() => {
    if (count > 0) {
      setProgress(0);
      setIndex((prev) => (prev + 1) % count);
    }
  }, [count]);

  const prevSlide = useCallback(() => {
    if (count > 0) {
      setProgress(0);
      setIndex((prev) => (prev - 1 + count) % count);
    }
  }, [count]);

  // Slideshow timer using setTimeout so each wallpaper holds for its own individual duration
  useEffect(() => {
    if (!rotate || count < 2 || isPaused) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const startTime = Date.now();
    const durationMs = currentDuration * 1000;

    // Smooth progress bar update
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(100, (elapsed / durationMs) * 100));
    }, 50);

    const timer = setTimeout(() => {
      if (!document.hidden) {
        setProgress(0);
        nextSlide();
      }
    }, durationMs);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [rotate, count, currentDuration, isPaused, index, nextSlide]);

  return (
    <div
      className="group/slideshow relative h-full w-full overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Slides images */}
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
          className={`object-cover object-[50%_40%] transition-opacity duration-1000 ease-in-out ${
            position === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
          }`}
        />
      ))}

      {/* Progress countdown line at the top */}
      {rotate && count > 1 && showProgressBar && (
        <div className="absolute top-0 inset-x-0 z-30 h-1 bg-black/20">
          <div
            className="h-full bg-linear-to-r from-magenta to-saffron transition-all ease-linear"
            style={{
              width: `${progress}%`,
              transitionDuration: isPaused ? '0ms' : '50ms',
            }}
          />
        </div>
      )}

      {/* Slideshow Pause badge on hover */}
      {rotate && count > 1 && isPaused && (
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white shadow animate-fade-in">
          <Pause className="h-3 w-3 text-saffron" />
          <span>Paused</span>
        </div>
      )}

      {/* Prev / Next navigation arrows (visible on hover or desktop) */}
      {rotate && count > 1 && showArrows && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            aria-label="Previous slide"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 backdrop-blur-md text-slate-800 shadow-md ring-1 ring-black/5 opacity-0 group-hover/slideshow:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            aria-label="Next slide"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 backdrop-blur-md text-slate-800 shadow-md ring-1 ring-black/5 opacity-0 group-hover/slideshow:opacity-100 transition-all hover:bg-white hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Slides indicator dots at bottom */}
      {rotate && count > 1 && (
        <div
          className={`absolute z-30 flex items-center gap-1.5 ${
            controlsPosition === 'top-right'
              ? 'right-4 top-4 justify-end sm:right-6 sm:top-6'
              : 'inset-x-0 bottom-4 justify-center'
          }`}
        >
          {slides.map((slide, position) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => {
                setIndex(position);
                setProgress(0);
              }}
              aria-label={`Slide ${position + 1} of ${count}`}
              aria-current={position === current}
              className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-white ${
                position === current
                  ? 'w-7 bg-white shadow-md'
                  : 'w-2 bg-white/60 hover:bg-white/90 hover:w-3 shadow-xs'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
