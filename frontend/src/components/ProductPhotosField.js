'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Link2, Star, X } from 'lucide-react';
import { fill, useLanguage } from '../lib/i18n';
import { inputClass } from './form';
import ImageCropDialog from './ImageCropDialog';

export const MAX_PHOTOS = 5;
const MAX_UPLOAD_BYTES = 550 * 1024;

// Keeps each JPEG below the backend's 600 KB per-photo limit.
function shrink(file, max = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      let scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      const encode = (quality) => new Promise((done, fail) => {
        canvas.toBlob((blob) => blob ? done(blob) : fail(new Error('type')), 'image/jpeg', quality);
      });
      const readDataUrl = (blob) => new Promise((done, fail) => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result);
        reader.onerror = () => fail(new Error('type'));
        reader.readAsDataURL(blob);
      });

      const compress = async () => {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('type');
          context.drawImage(img, 0, 0, canvas.width, canvas.height);

          for (const quality of [0.82, 0.72, 0.62, 0.52]) {
            const blob = await encode(quality);
            if (blob.size <= MAX_UPLOAD_BYTES) return readDataUrl(blob);
          }
          scale *= 0.8;
          if (Math.max(canvas.width, canvas.height) < 320) break;
        }
        throw new Error('size');
      };

      compress()
        .then(resolve, reject)
        .finally(() => URL.revokeObjectURL(url));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('type')); };
    img.src = url;
  });
}

// Sellers explicitly choose the customer-facing preview; it is moved to the first position for storefronts.
// value: array of picture sources (data URLs or links); onChange gets the new array.
export default function ProductPhotosField({ value, onChange, onPreviewChange }) {
  const { t } = useLanguage();
  const p = t.productPhotos;
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cropFiles, setCropFiles] = useState([]);
  const [cropIndex, setCropIndex] = useState(0);
  const [hasPreview, setHasPreview] = useState(false);
  const croppedPhotos = useRef([]);
  const full = value.length >= MAX_PHOTOS;

  const addFiles = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (files.length === 0) return;
    setError('');
    const room = MAX_PHOTOS - value.length;
    const picked = files.slice(0, room);
    if (files.length > room) setError(fill(p.onlyRoom, { count: room }));
    const valid = [];
    for (const file of picked) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        setError(p.errors.type);
        continue;
      }
      valid.push(file);
    }
    if (valid.length) {
      croppedPhotos.current = [];
      setCropIndex(0);
      setCropFiles(valid);
    }
  };

  const saveCrop = async (blob) => {
    setBusy(true);
    try {
      croppedPhotos.current.push(await shrink(blob));
    } catch (cropError) {
      setError(cropError.message === 'size' ? p.errors.big : p.errors.type);
    } finally {
      setBusy(false);
    }
    if (cropIndex + 1 < cropFiles.length) {
      setCropIndex((current) => current + 1);
    } else {
      if (croppedPhotos.current.length) onChange([...value, ...croppedPhotos.current]);
      croppedPhotos.current = [];
      setCropFiles([]);
      setCropIndex(0);
    }
    return true;
  };

  const cancelCropping = () => {
    croppedPhotos.current = [];
    setCropFiles([]);
    setCropIndex(0);
  };

  const addLink = () => {
    const text = link.trim();
    if (!text) return;
    try {
      const url = new URL(text);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    } catch {
      setError(p.errors.link);
      return;
    }
    if (value.includes(text)) {
      setError(p.errors.duplicate);
      return;
    }
    setError('');
    setLink('');
    onChange([...value, text]);
  };

  const choosePreview = (index) => {
    setHasPreview(true);
    onPreviewChange?.(true);
    onChange([value[index], ...value.filter((_, i) => i !== index)]);
  };
  const remove = (index) => {
    if (index === 0 && hasPreview) {
      setHasPreview(false);
      onPreviewChange?.(false);
    }
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{p.title} <span className="text-red-600">*</span></span>
        <span className="text-xs font-semibold text-slate-500">{fill(p.count, { count: value.length, max: MAX_PHOTOS })}</span>
      </div>

      <div className="mt-2 rounded-2xl border border-ink/10 bg-sand/25 p-3">
        <p className="mb-2 text-xs font-bold text-ink/70">{p.previewLabel}</p>
        {hasPreview && value[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value[0]} alt={p.previewLabel} className="mx-auto aspect-square w-full max-w-xs rounded-xl bg-white object-cover ring-1 ring-ink/10" />
        ) : (
          <div className="mx-auto flex aspect-square w-full max-w-xs items-center justify-center rounded-xl border border-dashed border-ink/20 bg-white/70 px-4 text-center text-xs font-medium text-ink/55">
            {p.errors.previewRequired}
          </div>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-2 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {value.map((src, index) => (
            <li key={src.slice(-40) + index} className="min-w-0">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="aspect-square w-full rounded-xl object-cover ring-1 ring-ink/10" />
                {index === 0 && hasPreview && (
                  <span className="absolute bottom-1 left-1 inline-flex max-w-[calc(100%-0.5rem)] items-center gap-0.5 rounded-full bg-magenta px-1.5 py-1 text-[9px] font-bold leading-tight text-white">
                    <Star className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{p.previewSelected}</span>
                  </span>
                )}
                <button type="button" onClick={() => remove(index)} aria-label={p.remove} title={p.remove} className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white shadow ring-2 ring-white hover:bg-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {!(index === 0 && hasPreview) && (
                <button type="button" onClick={() => choosePreview(index)} title={p.selectPreview} className="mt-1.5 flex min-h-8 w-full items-center justify-center rounded-lg bg-white px-1.5 py-1 text-center text-[10px] font-bold leading-tight text-ink ring-1 ring-ink/10 transition hover:bg-magenta hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta">
                  {p.selectPreview}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:bg-sand/60         ${full || busy || cropFiles.length > 0 ? 'pointer-events-none opacity-50' : ''}`}>
          <ImagePlus className="h-4 w-4" />
          {busy ? p.working : p.upload}
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={addFiles} disabled={full || busy || cropFiles.length > 0} className="sr-only" />
        </label>

        <div className="flex gap-2">
          <input
            type="url"
            value={link}
            disabled={full}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addLink();
              }
            }}
            className={inputClass(false)}
            placeholder={p.linkPlaceholder}
            aria-label={p.linkLabel}
          />
          <button type="button" onClick={addLink} disabled={full || !link.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-magenta disabled:opacity-50">
            <Link2 className="h-4 w-4" />
            {p.addLink}
          </button>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-slate-500">{full ? p.full : p.hint}</p>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {cropFiles[cropIndex] && (
        <ImageCropDialog
          key={`${cropIndex}-${cropFiles[cropIndex].name}-${cropFiles[cropIndex].lastModified}`}
          file={cropFiles[cropIndex]}
          aspectRatio={1}
          onCancel={cancelCropping}
          onCrop={saveCrop}
        />
      )}
    </div>
  );
}
