'use client';

import { useSyncExternalStore } from 'react';

// Accent colour theme and background pattern. Both are kept in the browser (localStorage) and applied as
// <html data-accent="ocean" data-pattern="lattice">.
export const ACCENTS = [
  {
    value: 'lotus',
    swatch: '#c8336f',
    swatch2: '#ee7d2b',
    vars: {
      '--color-magenta': '#c8336f',
      '--color-magenta-dark': '#a3245a',
      '--color-magenta-light': '#f3b8d0',
      '--color-saffron': '#ee7d2b',
      '--color-brand-50': '#fdf1f6',
      '--color-brand-100': '#fadce8',
      '--color-brand-200': '#f3b8d0',
      '--color-brand-300': '#e98bb1',
      '--color-brand-500': '#d6487f',
      '--color-brand-600': '#c8336f',
      '--color-brand-700': '#a3245a',
      '--color-brand-800': '#4a1d3a',
      '--color-brand-900': '#1e2029',
      '--accent-rgb': '200 51 111',
      '--accent2-rgb': '238 125 43',
      '--theme-bg': '#fdf7ee',
      '--theme-bg-glow1': 'rgb(244 185 62 / 0.32)',
      '--theme-bg-glow2': 'rgb(79 154 82 / 0.18)',
    }
  },
  {
    value: 'ocean',
    swatch: '#1f6fb2',
    swatch2: '#14a3b8',
    vars: {
      '--color-magenta': '#1f6fb2',
      '--color-magenta-dark': '#174f80',
      '--color-magenta-light': '#b0d0ec',
      '--color-saffron': '#14a3b8',
      '--color-brand-50': '#eff6fc',
      '--color-brand-100': '#d8e8f6',
      '--color-brand-200': '#b0d0ec',
      '--color-brand-300': '#78afdd',
      '--color-brand-500': '#2b84cc',
      '--color-brand-600': '#1f6fb2',
      '--color-brand-700': '#174f80',
      '--color-brand-800': '#12324f',
      '--color-brand-900': '#0a1b2d',
      '--accent-rgb': '31 111 178',
      '--accent2-rgb': '20 163 184',
      '--theme-bg': '#f2f7fc',
      '--theme-bg-glow1': 'rgb(20 163 184 / 0.28)',
      '--theme-bg-glow2': 'rgb(31 111 178 / 0.22)',
    }
  },
  {
    value: 'forest',
    swatch: '#2f855a',
    swatch2: '#d69e2e',
    vars: {
      '--color-magenta': '#2f855a',
      '--color-magenta-dark': '#22633f',
      '--color-magenta-light': '#a9d9bf',
      '--color-saffron': '#d69e2e',
      '--color-brand-50': '#eff8f3',
      '--color-brand-100': '#d5eddf',
      '--color-brand-200': '#a9d9bf',
      '--color-brand-300': '#72bd96',
      '--color-brand-500': '#3a9a6a',
      '--color-brand-600': '#2f855a',
      '--color-brand-700': '#22633f',
      '--color-brand-800': '#17402a',
      '--color-brand-900': '#0c2317',
      '--accent-rgb': '47 133 90',
      '--accent2-rgb': '214 158 46',
      '--theme-bg': '#f3f8f4',
      '--theme-bg-glow1': 'rgb(214 158 46 / 0.26)',
      '--theme-bg-glow2': 'rgb(47 133 90 / 0.22)',
    }
  },
  {
    value: 'royal',
    swatch: '#6b46c1',
    swatch2: '#d9467f',
    vars: {
      '--color-magenta': '#6b46c1',
      '--color-magenta-dark': '#4f3399',
      '--color-magenta-light': '#cbb9ea',
      '--color-saffron': '#d9467f',
      '--color-brand-50': '#f4f0fb',
      '--color-brand-100': '#e5dcf5',
      '--color-brand-200': '#cbb9ea',
      '--color-brand-300': '#a88ad8',
      '--color-brand-500': '#7c58cf',
      '--color-brand-600': '#6b46c1',
      '--color-brand-700': '#4f3399',
      '--color-brand-800': '#2e1f5c',
      '--color-brand-900': '#170d32',
      '--accent-rgb': '107 70 193',
      '--accent2-rgb': '217 70 127',
      '--theme-bg': '#f7f3fb',
      '--theme-bg-glow1': 'rgb(217 70 127 / 0.26)',
      '--theme-bg-glow2': 'rgb(107 70 193 / 0.22)',
    }
  },
  {
    value: 'slate',
    swatch: '#334155',
    swatch2: '#64748b',
    vars: {
      '--color-magenta': '#334155',
      '--color-magenta-dark': '#1e293b',
      '--color-magenta-light': '#cbd5e1',
      '--color-saffron': '#64748b',
      '--color-brand-50': '#f1f5f9',
      '--color-brand-100': '#e2e8f0',
      '--color-brand-200': '#cbd5e1',
      '--color-brand-300': '#94a3b8',
      '--color-brand-500': '#475569',
      '--color-brand-600': '#334155',
      '--color-brand-700': '#1e293b',
      '--color-brand-800': '#0f172a',
      '--color-brand-900': '#020617',
      '--accent-rgb': '51 65 85',
      '--accent2-rgb': '100 116 139',
      '--theme-bg': '#f3f5f7',
      '--theme-bg-glow1': 'rgb(100 116 139 / 0.26)',
      '--theme-bg-glow2': 'rgb(51 65 85 / 0.22)',
    }
  },
];

export const PATTERNS = ['none', 'dots', 'lattice', 'waves'];

const KEYS = { accent: 'lw-accent', pattern: 'lw-pattern' };
const DEFAULTS = { accent: 'lotus', pattern: 'none' };
const listeners = new Set();

const valid = (kind, value) => (kind === 'accent' ? ACCENTS.some((a) => a.value === value) : PATTERNS.includes(value));

export function applyAppearanceToDOM(accent, pattern) {
  if (typeof document === 'undefined') return;
  const doc = document.documentElement;
  const body = document.body;

  // 1. Accent data attributes & style properties
  if (accent === 'lotus' || !accent) {
    doc.removeAttribute('data-accent');
    if (body) body.removeAttribute('data-accent');
    // Clear custom accent style properties from documentElement
    const lotusVars = ACCENTS[0].vars;
    Object.keys(lotusVars).forEach((prop) => doc.style.removeProperty(prop));
  } else {
    doc.setAttribute('data-accent', accent);
    if (body) body.setAttribute('data-accent', accent);
    const accentObj = ACCENTS.find((a) => a.value === accent);
    if (accentObj?.vars) {
      Object.entries(accentObj.vars).forEach(([prop, val]) => {
        doc.style.setProperty(prop, val);
      });
    }
  }

  // 2. Pattern data attributes (CSS rules in globals.css handle light & dark pattern ink dynamically)
  doc.style.removeProperty('--pattern-image');
  doc.style.removeProperty('--pattern-size');
  if (pattern === 'none' || !pattern) {
    doc.removeAttribute('data-pattern');
    if (body) body.removeAttribute('data-pattern');
  } else {
    doc.setAttribute('data-pattern', pattern);
    if (body) body.setAttribute('data-pattern', pattern);
  }
}

export function getAppearance(kind) {
  if (typeof document === 'undefined') return DEFAULTS[kind];
  const value = document.documentElement.getAttribute(`data-${kind}`);
  if (valid(kind, value)) return value;
  try {
    const saved = localStorage.getItem(KEYS[kind]);
    if (valid(kind, saved)) return saved;
  } catch {}
  return DEFAULTS[kind];
}

export function setAppearance(kind, value) {
  if (!valid(kind, value)) return;
  try {
    localStorage.setItem(KEYS[kind], value);
  } catch {}

  const currentAccent = kind === 'accent' ? value : getAppearance('accent');
  const currentPattern = kind === 'pattern' ? value : getAppearance('pattern');
  applyAppearanceToDOM(currentAccent, currentPattern);

  listeners.forEach((listener) => listener());
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useAccent = () => useSyncExternalStore(subscribe, () => getAppearance('accent'), () => DEFAULTS.accent);
export const usePattern = () => useSyncExternalStore(subscribe, () => getAppearance('pattern'), () => DEFAULTS.pattern);

if (typeof window !== 'undefined') {
  try {
    const a = localStorage.getItem(KEYS.accent) || DEFAULTS.accent;
    const p = localStorage.getItem(KEYS.pattern) || DEFAULTS.pattern;
    applyAppearanceToDOM(a, p);
  } catch {}
}

