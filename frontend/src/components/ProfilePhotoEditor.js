'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';
import { profilePhotoUrl, squarePhoto } from '../lib/profilePhoto';
import ImageCropDialog from './ImageCropDialog';

// Round profile photo editor with a single pencil edit button housing change & remove actions
export default function ProfilePhotoEditor({ user, name, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const p = t.profilePhoto || {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const photo = profilePhotoUrl(user);

  // Close menu on click outside or escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const fail = (err) => {
    if ([401, 403].includes(err.response?.status)) onAuthError?.();
    const message = err.response?.status === 413 || err.message === 'size' ? p.errors?.big : p.errors?.generic;
    setError(message || 'Failed to update photo.');
    return message;
  };

  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError(p.errors?.type || 'Please select a JPG, PNG, or WebP image.');
      return;
    }
    setCropFile(file);
    setMenuOpen(false);
  };

  const saveCrop = async (blob) => {
    setBusy(true);
    setError('');
    try {
      const image = await squarePhoto(blob);
      const res = await API.put('/profile/photo', { image });
      onChanged({ ...user, photoVersion: res.data.photoVersion });
      setCropFile(null);
      return true;
    } catch (err) {
      if (err.message === 'type') {
        const msg = p.errors?.type || 'Invalid image type.';
        setError(msg);
        return msg;
      }
      return fail(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    setMenuOpen(false);
    try {
      await API.delete('/profile/photo');
      onChanged({ ...user, photoVersion: null });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    if (busy) return;
    if (!photo) {
      fileInputRef.current?.click();
    } else {
      setMenuOpen((prev) => !prev);
    }
  };

  return (
    <div className="shrink-0 relative">
      <div className="relative h-20 w-20">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={choose}
          disabled={busy}
          className="sr-only"
        />

        {/* Round Avatar Picture */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleEditClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleEditClick(e);
            }
          }}
          title={p.edit || (photo ? p.change : p.add)}
          className="group relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white text-2xl font-extrabold text-brand-700 shadow-lg ring-4 ring-white/25 transition-transform hover:scale-[1.02]"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className="h-full w-full object-cover" />
          ) : (
            initials(name) || '?'
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/50">
              <LoaderCircle className="h-6 w-6 animate-spin text-white" />
            </span>
          )}
        </div>

        {/* Single Pencil Edit Button at bottom-right */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleEditClick}
          disabled={busy}
          title={p.edit || (photo ? p.change : p.add)}
          aria-label={p.edit || (photo ? p.change : p.add)}
          className={`absolute -bottom-1 -right-1 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-magenta text-white shadow-lg ring-2 ring-white transition-all hover:scale-110 active:scale-95 ${
            busy ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <Pencil className="h-4 w-4" />
        </button>

        {/* Dropdown Menu when Pencil is clicked (Change / Remove Photo) */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 min-w-[190px] rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-900/10 animate-zoom-in text-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:ring-white/10"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                fileInputRef.current?.click();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Camera className="h-4 w-4 text-magenta shrink-0" />
              <span>{p.change || 'Change photo'}</span>
            </button>
            <button
              type="button"
              onClick={remove}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>{p.remove || 'Remove photo'}</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 max-w-[11rem] text-xs font-medium text-red-200">
          {error}
        </p>
      )}

      {cropFile && (
        <ImageCropDialog
          key={cropFile.name + cropFile.lastModified}
          file={cropFile}
          aspectRatio={1}
          onCancel={() => setCropFile(null)}
          onCrop={saveCrop}
        />
      )}
    </div>
  );
}
