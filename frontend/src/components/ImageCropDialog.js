'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import Portal from './Portal';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function ImageCropDialog({ file, aspectRatio = 1, onCancel, onCrop }) {
  const { t } = useLanguage();
  const copy = t.imageCrop;
  const viewportRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [imageSize, setImageSize] = useState(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => {
      if (imageRef.current) imageRef.current.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return undefined;
    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fitScale = imageSize && viewport.width && viewport.height
    ? Math.max(viewport.width / imageSize.width, viewport.height / imageSize.height)
    : 0;
  const renderedWidth = viewport.width * zoom;
  const renderedHeight = viewport.height * zoom;

  const clampOffset = (next, scale = zoom) => ({
    x: clamp(next.x, -(viewport.width * scale - viewport.width) / 2, (viewport.width * scale - viewport.width) / 2),
    y: clamp(next.y, -(viewport.height * scale - viewport.height) / 2, (viewport.height * scale - viewport.height) / 2),
  });

  const cropImage = async () => {
    if (!imageSize || !fitScale) return;
    setSaving(true);
    setError('');
    try {
      const scale = fitScale * zoom;
      const cropWidth = Math.min(imageSize.width, viewport.width / scale);
      const cropHeight = Math.min(imageSize.height, viewport.height / scale);
      const centerX = imageSize.width / 2 - offset.x / scale;
      const centerY = imageSize.height / 2 - offset.y / scale;
      const sourceX = clamp(centerX - cropWidth / 2, 0, imageSize.width - cropWidth);
      const sourceY = clamp(centerY - cropHeight / 2, 0, imageSize.height - cropHeight);
      const outputScale = Math.min(1, 1600 / Math.max(cropWidth, cropHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(cropWidth * outputScale));
      canvas.height = Math.max(1, Math.round(cropHeight * outputScale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('crop');
      if (!imageRef.current) throw new Error('crop');
      context.drawImage(imageRef.current, sourceX, sourceY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('crop')), 'image/jpeg', 0.9);
      });
      const completed = await onCrop(blob);
      if (completed !== true) {
        setError(typeof completed === 'string' ? completed : copy.error);
        setSaving(false);
      }
    } catch {
      setError(copy.error);
      setSaving(false);
    }
  };

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, offset };
  };
  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    setOffset(clampOffset({
      x: drag.offset.x + event.clientX - drag.x,
      y: drag.offset.y + event.clientY - drag.y,
    }));
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm sm:p-6" onClick={() => { if (!saving) onCancel(); }}>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-crop-title"
          onClick={(event) => event.stopPropagation()}
          className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white p-5 text-ink shadow-2xl sm:p-7"
        >
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 id="image-crop-title" className="text-xl font-extrabold">{copy.title}</h2>
              <p className="mt-1 text-sm text-ink/60">{copy.hint}</p>
            </div>
            <button type="button" onClick={onCancel} disabled={saving} aria-label={copy.cancel} className="rounded-full p-2 text-ink/60 transition hover:bg-sand/70 hover:text-ink disabled:opacity-50">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div
            ref={viewportRef}
            className="relative mx-auto mt-5 w-full max-w-[420px] touch-none cursor-grab overflow-hidden rounded-2xl bg-slate-950 active:cursor-grabbing"
            style={{ aspectRatio }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={() => { dragRef.current = null; }}
            onPointerCancel={() => { dragRef.current = null; }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              alt=""
              draggable="false"
              onLoad={(event) => {
                imageRef.current = event.currentTarget;
                setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
              }}
              onError={() => setError(copy.error)}
              className="pointer-events-none absolute h-full w-full select-none object-cover"
              style={{ left: `calc(50% + ${offset.x}px)`, top: `calc(50% + ${offset.y}px)`, transform: `translate(-50%, -50%) scale(${zoom})` }}
            />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/10" />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <ImagePlus className="h-4 w-4 shrink-0 text-ink/55" />
            <label htmlFor="image-crop-zoom" className="sr-only">{copy.zoom}</label>
            <input
              id="image-crop-zoom"
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setZoom(nextZoom);
                setOffset((current) => clampOffset(current, nextZoom));
              }}
              className="h-2 flex-1 cursor-pointer accent-brand-600"
            />
            <span className="w-12 text-right text-xs font-semibold tabular-nums text-ink/60">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}
              title={copy.reset}
              aria-label={copy.reset}
              className="rounded-full p-2 text-ink/60 transition hover:bg-sand/70 hover:text-ink"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <footer className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 rounded-full px-5 text-sm font-semibold text-ink/70 ring-1 ring-ink/15 transition hover:bg-sand/60 disabled:opacity-50">
              {copy.cancel}
            </button>
            <button type="button" onClick={cropImage} disabled={saving || !imageSize || !renderedWidth || !renderedHeight} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-700 px-5 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-50">
              {copy.apply}
            </button>
          </footer>
        </section>
      </div>
    </Portal>
  );
}
