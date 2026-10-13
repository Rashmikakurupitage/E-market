'use client';

import { useSyncExternalStore } from 'react';

// Light or dark for the whole website. The choice is kept in the browser (localStorage) and applied as
// <html data-theme="dark"> (the colours are in app/dark-theme.css). The small script in app/layout.tsx
// sets it before the page paints, so there is no flash of the wrong colours.
const KEY = 'lw-theme';
const listeners = new Set();

export function getTheme() {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme) {
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // private window or blocked storage: the choice lasts until the page is closed
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => 'light');
}
