'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipForward, VolumeX } from 'lucide-react';

export default function HeroCategoryVideo({ clips, playLabel, pauseLabel, nextLabel, mutedLabel, className, children }) {
  const videoRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const activeClip = clips[activeIndex];

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    video.play().catch(() => setPlaying(false));
  }, [activeClip.src, playing]);

  const nextClip = () => setActiveIndex((index) => (index + 1) % clips.length);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
      return;
    }
    video.pause();
    setPlaying(false);
  };

  return (
    <div className={`group relative w-full overflow-hidden bg-slate-950 ${className || 'aspect-[4/5] rounded-[2rem] shadow-2xl shadow-slate-900/15 ring-8 ring-white'}`}>
      <video
        ref={videoRef}
        key={activeClip.src}
        src={activeClip.src}
        muted
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={(event) => {
          if (!event.currentTarget.ended) setPlaying(false);
        }}
        onEnded={nextClip}
        onError={nextClip}
        aria-label={activeClip.label}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-slate-950/20" />
      {children}

      <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
        <span className="rounded-full border border-white/25 bg-slate-950/45 px-3 py-2 text-[10px] font-bold tabular-nums text-white shadow-md backdrop-blur-md sm:text-xs">
          {String(activeIndex + 1).padStart(2, '0')} / {String(clips.length).padStart(2, '0')}
        </span>
        <span role="img" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white/90 backdrop-blur-md" aria-label={mutedLabel}>
          <VolumeX className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? pauseLabel : playLabel}
          aria-pressed={playing}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/55 text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-slate-950/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          <span className="sr-only">{playing ? pauseLabel : playLabel}</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-5 text-white sm:p-7">
        <div className="min-w-0">
          <p aria-live="polite" className="truncate font-display text-lg font-bold drop-shadow sm:text-2xl">{activeClip.label}</p>
          <div aria-hidden="true" className="mt-3 flex gap-1.5">
            {clips.map((clip, index) => (
              <span key={clip.src} className={`h-1 rounded-full transition-all ${index === activeIndex ? 'w-7 bg-white' : 'w-2 bg-white/45'}`} />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={nextClip}
          aria-label={nextLabel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-slate-950/40 text-white shadow-md backdrop-blur-md transition hover:scale-105 hover:bg-slate-950/65 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <SkipForward className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}
