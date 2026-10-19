'use client';

import { useSyncExternalStore } from 'react';

// Accent colour theme and background pattern. Both are kept in the browser (localStorage) and applied as
// <html data-accent="ocean" data-pattern="lattice">. The colours and patterns are in app/globals.css, and the
// small script in app/layout.tsx applies them before the page paints. Light/dark is separate (see theme.js).
export const ACCENTS = [
  { value: 'lotus', swatch: '#c8336f', swatch2: '#ee7d2b' },
  { value: 'ocean', swatch: '#1f6fb2', swatch2: '#14a3b8' },
  { value: 'forest', swatch: '#2f855a', swatch2: '#d69e2e' },
  { value: 'royal', swatch: '#6b46c1', swatch2: '#d9467f' },
  { value: 'slate', swatch: '#334155', swatch2: '#64748b' },
];
export const PATTERNS = ['none', 'dots', 'lattice', 'waves'];

const KEYS = { accent: 'lw-accent', pattern: 'lw-pattern' };
const DEFAULTS = { accent: 'lotus', pattern: 'none' };
const listeners = new Set();

const valid = (kind, value) => (kind === 'accent' ? ACCENTS.some((a) => a.value === value) : PATTERNS.includes(value));

export function getAppearance(kind) {
  if (typeof document === 'undefined') return DEFAULTS[kind];
  const value = document.documentElement.dataset[kind];
  return valid(kind, value) ? value : DEFAULTS[kind];
}

export function setAppearance(kind, value) {
  if (!valid(kind, value)) return;
  if (value === DEFAULTS[kind]) delete document.documentElement.dataset[kind];
  else document.documentElement.dataset[kind] = value;
  try {
    localStorage.setItem(KEYS[kind], value);
  } catch {
    // private window or blocked storage: the choice lasts until the page is closed
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAccent = () => useSyncExternalStore(subscribe, () => getAppearance('accent'), () => DEFAULTS.accent);
export const usePattern = () => useSyncExternalStore(subscribe, () => getAppearance('pattern'), () => DEFAULTS.pattern);
