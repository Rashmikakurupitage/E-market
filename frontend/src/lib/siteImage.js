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

// Every wallpaper in use: built-in + uploaded, with per-wallpaper durations and selection state
export function allWallpapers(state) {
  const builtin = state?.builtin ? BUILTIN_WALLPAPERS.filter((item) => state.builtin.includes(item.id)) : BUILTIN_WALLPAPERS;
  const custom = (state?.custom || []).map((item) => ({
    id: item.id,
    src: `${API.defaults.baseURL}/site/wallpaper/${item.id}?v=${item.version}`,
    custom: true
  }));
  const defaultSeconds = state?.seconds || 6;
  const activeId = state?.active || null;
  const selectedList = Array.isArray(state?.selected) && state.selected.length > 0 ? state.selected : null;

  const all = [...builtin, ...custom].map((item) => {
    const customTime = state?.timings?.[item.id];
    const duration = (typeof customTime === 'number' && customTime >= 2) ? customTime : defaultSeconds;
    const isSelected = selectedList ? selectedList.includes(item.id) : true;
    const isActive = activeId ? item.id === activeId : false;
    return {
      ...item,
      duration,
      hasCustomDuration: typeof customTime === 'number' && customTime >= 2,
      isSelected,
      isActive
    };
  });
  return all.length > 0 ? all : [{ ...BUILTIN_WALLPAPERS[0], duration: defaultSeconds, hasCustomDuration: false, isSelected: true, isActive: true }];
}

// What the home page shows: all selected wallpapers in turn, or the single one the admin chose to keep
export function shownWallpapers(state) {
  const all = allWallpapers(state);
  const selectedOnly = all.filter((item) => item.isSelected);
  const pool = selectedOnly.length > 0 ? selectedOnly : all;

  // If rotation is turned off, show the single wallpaper the admin chose
  if (state?.rotate === false) {
    return [pool.find((item) => item.id === state?.active) || all.find((item) => item.id === state?.active) || pool[0]];
  }

  // If an active wallpaper is chosen, ensure it is the first slide / primary featured card
  if (state?.active) {
    const activeIndex = pool.findIndex((item) => item.id === state.active);
    if (activeIndex > 0) {
      return [pool[activeIndex], ...pool.slice(0, activeIndex), ...pool.slice(activeIndex + 1)];
    }
  }

  return pool;
}

// Home page wallpapers: { slides, rotate, seconds, timings, transition, displayMode, active }
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
  if (!state) {
    return {
      slides: [BUILTIN_WALLPAPERS[0]],
      rotate: false,
      seconds: 6,
      timings: {},
      transition: 'fade',
      displayMode: 'slideshow',
      active: null,
      selected: null
    };
  }

  const slides = shownWallpapers(state);
  return {
    slides,
    rotate: state.rotate !== false && slides.length > 1,
    seconds: state.seconds || 6,
    timings: state.timings || {},
    transition: state.transition || 'fade',
    displayMode: state.displayMode || 'slideshow',
    active: state.active || null,
    selected: state.selected || null
  };
}
