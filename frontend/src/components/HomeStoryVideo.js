'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, VolumeX } from 'lucide-react';

export default function HomeStoryVideo({ src, poster, playLabel, pauseLabel, children }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduceMotion(preference.matches);
    const frame = window.requestAnimationFrame(updatePreference);
    preference.addEventListener('change', updatePreference);
    return () => {
      window.cancelAnimationFrame(frame);
      preference.removeEventListener('change', updatePreference);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    if (!('IntersectionObserver' in window)) {
      const frame = window.requestAnimationFrame(() => setInView(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px', threshold: 0.15 });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduceMotion || !inView) {
      video.pause();
      return;
    }
    video.play().catch(() => setPlaying(false));
  }, [inView, reduceMotion]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setPlaying(false);
      }
    } else {
      video.pause();
    }
  };

  return (
    <div ref={containerRef} className="group relative h-full min-h-[250px] w-full overflow-hidden bg-slate-950 sm:min-h-[360px] lg:min-h-[440px]">
      {failed ? (
        <img src={poster} alt="Close-up of handloom weaving" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
          aria-label="Close-up of hands weaving colorful threads on a loom"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.025]"
        />
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/55 via-transparent to-slate-950/70" />
      {children}
      {!failed && (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-2 sm:right-5 sm:top-5">
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? pauseLabel : playLabel}
            aria-pressed={playing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/55 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:scale-105 hover:bg-slate-950/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            <span className="sr-only">{playing ? pauseLabel : playLabel}</span>
          </button>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-950/45 text-white/90 backdrop-blur-md" aria-label="Muted video">
            <VolumeX className="h-4 w-4" />
          </span>
        </div>
      )}
    </div>
  );
}
