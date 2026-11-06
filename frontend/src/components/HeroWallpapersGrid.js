'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Sparkles, ZoomIn, Eye } from 'lucide-react';

// Dynamic responsive Photo Grid Collage for Hero Section when Admin chooses 'Grid View'
export default function HeroWallpapersGrid({ slides = [] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const count = slides.length;

  if (count === 0) {
    return <div className="h-full w-full bg-slate-900" />;
  }

  // 1 Wallpaper: Full Hero Card
  if (count === 1) {
    const slide = slides[0];
    return (
      <div className="relative h-full w-full overflow-hidden group">
        <Image
          src={slide.src}
          alt=""
          fill
          unoptimized={slide.custom}
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-cover object-[50%_40%] transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-saffron" />
            Authentic Sri Lankan Creations
          </span>
        </div>
      </div>
    );
  }

  // 2 Wallpapers: Split Layout
  if (count === 2) {
    return (
      <div className="relative h-full w-full grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            onClick={() => setSelectedIdx(i)}
            className={`relative h-full w-full overflow-hidden rounded-2xl group cursor-pointer transition-all ${
              selectedIdx === i ? 'ring-2 ring-magenta' : 'opacity-90 hover:opacity-100'
            }`}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              unoptimized={slide.custom}
              sizes="(min-width: 1024px) 20vw, 45vw"
              className="object-cover transition-transform duration-500 group-hover:scale-108"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
              #{i + 1}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // 3 or more Wallpapers: 1 Main Featured Card + Mini Thumbnails Grid
  const featuredSlide = slides[selectedIdx] || slides[0];
  const otherSlides = slides.slice(0, 5);

  return (
    <div className="relative h-full w-full flex flex-col gap-1.5 p-1.5 bg-slate-950 overflow-hidden">
      {/* Main Featured Photo (takes upper 68% of frame) */}
      <div className="relative flex-1 overflow-hidden rounded-3xl group">
        <Image
          src={featuredSlide.src}
          alt=""
          fill
          unoptimized={featuredSlide.custom}
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-cover object-[50%_40%] transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Featured Tag */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-md">
          <Sparkles className="h-3.5 w-3.5 text-saffron" />
          <span>Artisan Showcase</span>
        </div>

        {/* Bottom indicator with slide count */}
        <div className="absolute bottom-3 inset-x-3 flex items-center justify-between text-white text-xs">
          <span className="font-semibold drop-shadow">
            Photo {selectedIdx + 1} of {count}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold">
            <Eye className="h-3 w-3" /> Click below to view
          </span>
        </div>
      </div>

      {/* Grid Thumbnail Strip (takes bottom 32% of frame) */}
      <div className="grid grid-cols-4 gap-1.5 h-20 sm:h-24 shrink-0">
        {otherSlides.map((slide, i) => {
          const isSelected = selectedIdx === i;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setSelectedIdx(i)}
              className={`relative overflow-hidden rounded-xl group transition-all cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-magenta scale-[0.98] shadow-md'
                  : 'opacity-75 hover:opacity-100 hover:scale-[1.02]'
              }`}
              title={`View wallpaper ${i + 1}`}
            >
              <Image
                src={slide.src}
                alt=""
                fill
                unoptimized={slide.custom}
                sizes="(min-width: 1024px) 10vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div
                className={`absolute inset-0 transition-colors ${
                  isSelected ? 'bg-magenta/20' : 'bg-black/20 group-hover:bg-transparent'
                }`}
              />
              <span className="absolute bottom-1 left-1 rounded-md bg-black/70 px-1.5 py-0.2 text-[9px] font-bold text-white">
                #{i + 1}
              </span>
              {isSelected && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-magenta text-white shadow">
                  <ZoomIn className="h-2.5 w-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

