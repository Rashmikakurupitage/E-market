'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Check,
  X,
  IdCard,
  Sliders,
  Move
} from 'lucide-react';

/**
 * High quality crop to standard ID-1 card format (85.6mm x 53.98mm ~ 1.586 : 1)
 */
export function cropImageToCard(source, {
  targetWidth = 1400,
  viewportW = 440,
  viewportH = 278,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
  rotation = 0
} = {}) {
  const targetHeight = Math.round(targetWidth / (viewportW / viewportH));

  return new Promise((resolve, reject) => {
    const process = (img) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const w0 = img.naturalWidth || img.width;
        const h0 = img.naturalHeight || img.height;
        const isRot = rotation === 90 || rotation === 270;
        const rotW = isRot ? h0 : w0;
        const rotH = isRot ? w0 : h0;

        const baseScale = Math.max(viewportW / rotW, viewportH / rotH);
        const ratio = targetWidth / viewportW;
        const finalScale = baseScale * zoom * ratio;

        ctx.translate(targetWidth / 2, targetHeight / 2);
        ctx.translate(offsetX * ratio, offsetY * ratio);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.drawImage(
          img,
          (-w0 * finalScale) / 2,
          (-h0 * finalScale) / 2,
          w0 * finalScale,
          h0 * finalScale
        );

        resolve(canvas.toDataURL('image/jpeg', 0.90));
      } catch (err) {
        reject(err);
      }
    };

    if (typeof source === 'string') {
      const img = new window.Image();
      img.onload = () => process(img);
      img.onerror = () => reject(new Error('Failed to load image for cropping'));
      img.src = source;
    } else if (source && typeof window !== 'undefined' && source instanceof window.HTMLImageElement) {
      if (source.complete) process(source);
      else {
        source.onload = () => process(source);
        source.onerror = () => reject(new Error('Failed to load image for cropping'));
      }
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Interactive Modal for Cropping and Framing NIC Card Photos
 */
export default function NicCropModal({
  isOpen,
  imageSrc,
  step = 'front', // 'front' | 'back'
  onConfirm,
  onCancel,
  r = {}
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 440, height: 278 });
  const [processing, setProcessing] = useState(false);

  const viewportRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Update viewport dimensions on resize
  useEffect(() => {
    if (!isOpen || !viewportRef.current) return;
    const updateSize = () => {
      if (viewportRef.current) {
        const w = viewportRef.current.clientWidth;
        const h = Math.round(w / 1.586);
        setViewportSize({ width: w, height: h });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  // Load natural image dimensions when imageSrc changes
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });

    const img = new window.Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Clamp pan so image never leaves empty gaps inside the crop frame
  const clampOffset = useCallback(
    (ox, oy, currentZoom = zoom, currentRot = rotation) => {
      if (!naturalSize.width || !naturalSize.height) return { x: 0, y: 0 };
      const isRot = currentRot === 90 || currentRot === 270;
      const rotW = isRot ? naturalSize.height : naturalSize.width;
      const rotH = isRot ? naturalSize.width : naturalSize.height;

      const baseScale = Math.max(viewportSize.width / rotW, viewportSize.height / rotH);
      const scale = baseScale * currentZoom;
      const dispW = rotW * scale;
      const dispH = rotH * scale;

      const maxPanX = Math.max(0, (dispW - viewportSize.width) / 2);
      const maxPanY = Math.max(0, (dispH - viewportSize.height) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, ox)),
        y: Math.min(maxPanY, Math.max(-maxPanY, oy))
      };
    },
    [zoom, rotation, naturalSize, viewportSize]
  );

  // Re-clamp on state change
  useEffect(() => {
    if (!naturalSize.width) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPan((prev) => clampOffset(prev.x, prev.y, zoom, rotation));
  }, [zoom, rotation, naturalSize, viewportSize, clampOffset]);

  // Mouse pan handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan(clampOffset(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy));
  };

  const handleMouseUp = () => setIsDragging(false);

  // Touch pan handlers
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan(clampOffset(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy));
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.min(3, Math.max(1, +(z + delta).toFixed(2))));
  };

  // Rotation handler (90 deg increments)
  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  // Reset handler
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Confirm crop
  const handleApply = async () => {
    if (!imageSrc) return;
    setProcessing(true);
    try {
      const cropped = await cropImageToCard(imageSrc, {
        targetWidth: 1400,
        viewportW: viewportSize.width,
        viewportH: viewportSize.height,
        zoom,
        offsetX: pan.x,
        offsetY: pan.y,
        rotation
      });
      onConfirm(cropped);
    } catch (err) {
      console.error('Failed to crop image:', err);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  const isFront = step === 'front';
  const isRot = rotation === 90 || rotation === 270;
  const rotW = isRot ? naturalSize.height : naturalSize.width;
  const rotH = isRot ? naturalSize.width : naturalSize.height;
  const baseScale = (rotW && rotH) ? Math.max(viewportSize.width / rotW, viewportSize.height / rotH) : 1;

  const title = isFront
    ? r.cropNicTitleFront || 'Crop & Frame Front Side Photo'
    : r.cropNicTitleBack || 'Crop & Frame Back Side Photo';

  const subtitle = r.cropNicDesc || 'Drag to center your card, zoom or rotate so the entire card is clearly visible inside the frame.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none"
    >
      <div className="relative flex flex-col w-full max-w-xl overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 animate-zoom-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-500/30">
              <Crop className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="rounded-full bg-slate-800 border border-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
                  {isFront ? (r.step1Front || 'Front Side') : (r.step2Back || 'Back Side')}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={r.cancelCrop || 'Cancel'}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Crop Viewport Area */}
        <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-950/60 space-y-4">
          <div
            ref={viewportRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{
              height: `${viewportSize.height}px`,
              aspectRatio: '1.586 / 1'
            }}
            className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border-2 border-brand-500/90 shadow-2xl bg-black cursor-grab active:cursor-grabbing group"
          >
            {/* The Image inside crop viewport */}
            {naturalSize.width > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt="NIC Crop Target"
                draggable={false}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: `${naturalSize.width}px`,
                  height: `${naturalSize.height}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                  pointerEvents: 'none'
                }}
              />
            )}

            {/* Corner Viewfinder Guides */}
            <div className="pointer-events-none absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-brand-400 rounded-tl-sm shadow-sm" />
            <div className="pointer-events-none absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-brand-400 rounded-tr-sm shadow-sm" />
            <div className="pointer-events-none absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-brand-400 rounded-bl-sm shadow-sm" />
            <div className="pointer-events-none absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-brand-400 rounded-br-sm shadow-sm" />

            {/* Rule of Thirds Alignment Grid */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20 transition-opacity group-hover:opacity-35">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* Drag hint overlay */}
            <div className="pointer-events-none absolute bottom-2 inset-x-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-slate-200 backdrop-blur-xs border border-white/10">
                <Move className="h-3 w-3 text-brand-300" />
                <span>Drag to reposition</span>
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full max-w-[460px] space-y-3 pt-1">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 px-3.5 shadow-sm">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>

              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-brand-500"
              />

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>

              <span className="font-mono text-xs font-semibold text-slate-300 w-12 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Rotate & Reset Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-3 py-2 text-xs font-semibold transition-colors"
                  title="Rotate 90 degrees clockwise"
                >
                  <RotateCw className="h-3.5 w-3.5 text-brand-400" />
                  <span>{r.rotatePhoto || 'Rotate 90°'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 px-3 py-2 text-xs font-semibold transition-colors"
                  title="Reset zoom and rotation"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  <span>{r.resetCrop || 'Reset'}</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
                <IdCard className="h-3.5 w-3.5 text-slate-500" />
                <span>Card Ratio (1.586 : 1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-5 py-4 bg-slate-900/95 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {r.cancelCrop || 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30 transition-all hover:scale-102 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{processing ? 'Processing...' : (r.cropAndUse || 'Crop & Use Photo')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

