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
        className={`h-9 min-w-[6.25rem] 2xl:h-10 2xl:min-w-[7rem] cursor-pointer appearance-none rounded-full border py-1.5 pl-3 pr-7 text-xs font-semibold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-magenta/30 ${
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
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transition-transform duration-200 group-hover:translate-y-0 ${
          dark ? 'text-white/70' : 'text-ink/50 dark:text-white/70'
        }`}
      />
    </label>
  );
}
