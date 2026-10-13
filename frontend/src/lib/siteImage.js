'use client';

import { useEffect, useState } from 'react';
import API from './api';

// The pictures that ship with the website (used until an admin uploads their own)
export const BUILTIN_WALLPAPERS = [
  { id: 'builtin-collage-gold', src: '/wallpapers/collage-gold.jpg', custom: false },
  { id: 'builtin-hero', src: '/hero_main.jpg', custom: false },
  { id: 'builtin-collage-teal', src: '/wallpapers/collage-teal.jpg', custom: false },
  { id: 'builtin-tea-pickers', src: '/wallpapers/tea-pickers.jpg', custom: false },
  { id: 'builtin-collage-pink', src: '/wallpapers/collage-pink.jpg', custom: false },
  { id: 'builtin-collage-violet', src: '/wallpapers/collage-violet.jpg', custom: false },
  { id: 'builtin-artisan', src: '/artisan_carver.jpg', custom: false },
  { id: 'builtin-collage-green', src: '/wallpapers/collage-green.jpg', custom: false },
  { id: 'builtin-kitchen', src: '/wallpapers/kitchen.jpg', custom: false },
  { id: 'builtin-collage-indigo', src: '/wallpapers/collage-indigo.jpg', custom: false },
  { id: 'builtin-basketry', src: '/wallpapers/basketry.jpg', custom: false },
  { id: 'builtin-collage-earth', src: '/wallpapers/collage-earth.jpg', custom: false },
  { id: 'builtin-tea-woman', src: '/wallpapers/tea-woman.jpg', custom: false },
  { id: 'builtin-masks', src: '/wallpapers/masks.jpg', custom: false },
  { id: 'builtin-cane-market', src: '/wallpapers/cane-market.jpg', custom: false },
  { id: 'builtin-spices', src: '/wallpapers/spices.jpg', custom: false },
];

// Every wallpaper in use: the built-in pictures an admin has not removed, then the uploaded ones
export function allWallpapers(state) {
  const builtin = state?.builtin ? BUILTIN_WALLPAPERS.filter((item) => state.builtin.includes(item.id)) : BUILTIN_WALLPAPERS;
  const custom = (state?.custom || []).map((item) => ({ id: item.id, src: `${API.defaults.baseURL}/site/wallpaper/${item.id}?v=${item.version}`, custom: true }));
  const all = [...builtin, ...custom];
  return all.length > 0 ? all : [BUILTIN_WALLPAPERS[0]];
}

// What the home page shows: all of them in turn, or the single one the admin chose to keep
export function shownWallpapers(state) {
  const all = allWallpapers(state);
  if (state?.rotate !== false) return all;
  return [all.find((item) => item.id === state?.active) || all[0]];
}

// Home page wallpapers: { slides, rotate, seconds }
export function useWallpapers() {
  const [state, setState] = useState(null);

  useEffect(() => {
    let ignore = false;
    API.get('/site/settings')
      .then((res) => !ignore && setState(res.data))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  // Until the settings arrive, show the first built-in picture so the page never flashes empty
  if (!state) return { slides: [BUILTIN_WALLPAPERS[0]], rotate: false, seconds: 6 };
  const slides = shownWallpapers(state);
  return { slides, rotate: state.rotate !== false && slides.length > 1, seconds: state.seconds || 6 };
}
