'use client';

import { useState } from 'react';
import { Camera, LoaderCircle, Trash2 } from 'lucide-react';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';
import { profilePhotoUrl, squarePhoto } from '../lib/profilePhoto';

// The customer's round profile picture, with buttons to change or remove it
export default function ProfilePhotoEditor({ user, name, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const p = t.profilePhoto;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const photo = profilePhotoUrl(user);

  const fail = (err) => {
    if ([401, 403].includes(err.response?.status) && err.response?.data?.code !== 'NOT_CUSTOMER') return onAuthError?.();
    setError(err.response?.status === 413 ? p.errors.big : p.errors.generic);
  };

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError(p.errors.type);
      return;
    }
    setBusy(true);
    try {
      const image = await squarePhoto(file);
      const res = await API.put('/profile/photo', { image });
      onChanged({ ...user, photoVersion: res.data.photoVersion });
    } catch (err) {
      if (err.message === 'type') setError(p.errors.type);
      else fail(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await API.delete('/profile/photo');
      onChanged({ ...user, photoVersion: null });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0">
      <div className="relative h-20 w-20">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-2xl font-extrabold text-brand-700 shadow-lg ring-4 ring-white/25">
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
        </span>

        <label
          title={photo ? p.change : p.add}
          className={`absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-magenta text-white shadow-lg ring-2 ring-white transition-transform hover:scale-110 ${busy ? 'pointer-events-none opacity-60' : ''}`}
        >
          <Camera className="h-4 w-4" />
          <span className="sr-only">{photo ? p.change : p.add}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy} className="sr-only" />
        </label>

        {photo && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            title={p.remove}
            aria-label={p.remove}
            className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow-lg ring-2 ring-white transition-transform hover:scale-110 hover:bg-red-600 hover:text-white disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 max-w-[11rem] text-xs font-medium text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
