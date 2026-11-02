'use client';

import { ChevronDown } from 'lucide-react';
import { LANGUAGES, useLanguage } from '../lib/i18n';

const LANGUAGE_LABELS = {
  en: 'Language',
  si: 'භාෂාව',
  ta: 'மொழி',
};

const COMPACT_LANGUAGE_LABELS = {
  en: 'EN',
  si: 'සිං',
  ta: 'தமி',
};

export default function LanguageSelect({ variant = 'light', className = '', compact = false }) {
  const { lang, setLang } = useLanguage();
  const dark = variant === 'dark';

  return (
    <label className={`group relative inline-flex shrink-0 ${compact ? 'rounded-lg focus-within:ring-2 focus-within:ring-brand-600/40 focus-within:ring-offset-2' : ''} ${className}`}>
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value)}
        aria-label={LANGUAGE_LABELS[lang] || LANGUAGE_LABELS.en}
        className={compact
          ? `absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 focus-visible:outline-none ${dark ? '[&>option]:bg-white [&>option]:text-slate-900' : ''}`
          : `h-11 min-w-[8.5rem] cursor-pointer appearance-none rounded-lg border py-2 pl-3 pr-10 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
            dark
              ? 'border-white/20 !bg-slate-900 text-white hover:!bg-slate-800 focus-visible:ring-brand-300/50 focus-visible:ring-offset-slate-950 [&>option]:bg-white [&>option]:text-slate-900'
              : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus-visible:ring-brand-600/30 focus-visible:ring-offset-white [&>option]:bg-white [&>option]:text-slate-900'
          }`}
      >
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code} lang={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      {compact && (
        <span aria-hidden="true" className={`inline-flex h-9 min-w-[4.25rem] items-center justify-center gap-1 rounded-lg border py-2 pl-2 pr-5 text-xs font-bold ${
          dark ? 'border-white/20 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-800'
        }`}>
          {COMPACT_LANGUAGE_LABELS[lang] || COMPACT_LANGUAGE_LABELS.en}
        </span>
      )}
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-current transition-transform group-hover:translate-y-0.5 ${
          compact ? 'right-1.5' : 'right-3'
        } ${dark ? 'text-white/70' : 'text-slate-500'
        }`}
      />
    </label>
  );
}
