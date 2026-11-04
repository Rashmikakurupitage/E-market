'use client';

import { ChevronDown } from 'lucide-react';
import { LANGUAGES, useLanguage } from '../lib/i18n';

const LANGUAGE_LABELS = {
  en: 'Language',
  si: 'භාෂාව',
  ta: 'மொழி',
};

export default function LanguageSelect({ variant = 'light', className = '' }) {
  const { lang, setLang } = useLanguage();
  const dark = variant === 'dark';

  return (
    <label className={`group relative inline-flex shrink-0 ${className}`}>
      <select
        value={lang}
        onChange={(event) => setLang(event.target.value)}
        aria-label={LANGUAGE_LABELS[lang] || LANGUAGE_LABELS.en}
        className={`h-7.5 2xl:h-8 min-w-[4.75rem] 2xl:min-w-[5.25rem] cursor-pointer appearance-none rounded-full border py-0.5 pl-2.5 pr-6 2xl:pl-3 2xl:pr-6.5 text-[11px] 2xl:text-xs font-semibold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-magenta/30 shadow-2xs ${
          dark
            ? 'border-white/20 bg-slate-900/90 text-slate-100 hover:border-white/40 hover:bg-slate-800 [&>option]:bg-slate-900 [&>option]:text-white'
            : 'border-ink/15 bg-white/90 text-ink/85 hover:border-ink/30 hover:bg-white dark:border-white/20 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-white/40 [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white'
        }`}
      >
        {LANGUAGES.map((option) => (
          <option key={option.code} value={option.code} lang={option.code}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-2 2xl:right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 transition-transform duration-200 group-hover:translate-y-0 ${
          dark ? 'text-white/70' : 'text-ink/50 dark:text-white/70'
        }`}
      />
    </label>
  );
}
