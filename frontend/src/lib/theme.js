'use client';

import { useSyncExternalStore } from 'react';

// Light or dark for the whole website. The choice is kept in the browser (localStorage) and applied as
// <html data-theme="dark" class="dark"> (the colours are in app/dark-theme.css and Tailwind dark: variants).
// The script in public/theme-init.js sets it before the page paints, so there is no flash of wrong colours.
const KEY = 'lw-theme';
const listeners = new Set();

export function getTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' || document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'light';
}

export function setTheme(theme, persist = true) {
  if (typeof document !== 'undefined') {
    // Add temporary transitioning class for smooth color morphing without layout jump
    document.documentElement.classList.add('theme-transitioning');
    if (window.__themeTransitionTimer) clearTimeout(window.__themeTransitionTimer);
    window.__themeTransitionTimer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 320);

    if (theme === 'dark') {
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.classList.add('dark');
    } else {
      delete document.documentElement.dataset.theme;
      document.documentElement.classList.remove('dark');
    }
  }

  if (persist) {
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      // private window or blocked storage
    }
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

// System color scheme change listener (applies automatically if user hasn't explicitly set a preference)
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      try {
        if (!localStorage.getItem(KEY)) {
          setTheme(e.matches ? 'dark' : 'light', false);
        }
      } catch {}
    };
    if (media.addEventListener) {
      media.addEventListener('change', onChange);
    } else if (media.addListener) {
      media.addListener(onChange);
    }
  } catch {}
}
