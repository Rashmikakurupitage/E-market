'use client';

import { Moon, Sun } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { setTheme, useTheme } from '../lib/theme';
import AppearanceMenu from './AppearanceMenu';

const TEXT = {
  en: { dark: 'Dark', light: 'Light', toDark: 'Switch to dark mode', toLight: 'Switch to light mode', group: 'Colour theme' },
  si: { dark: 'අඳුරු', light: 'ලා', toDark: 'අඳුරු මාදිලියට මාරු වන්න', toLight: 'ලා මාදිලියට මාරු වන්න', group: 'වර්ණ තේමාව' },
  ta: { dark: 'இருண்ட', light: 'வெளிர்', toDark: 'இருண்ட பயன்முறைக்கு மாறு', toLight: 'வெளிர் பயன்முறைக்கு மாறு', group: 'நிறத் தீம்' },
};

// Light / dark switch for the whole website.
//   variant "button": one round icon button (headers)
//   variant "segmented": a Light | Dark pill (menus); iconOnly hides the words
export default function ThemeToggle({ variant = 'button', iconOnly = false, className = '', paletteClassName = '' }) {
  const { lang } = useLanguage();
  const s = TEXT[lang] || TEXT.en;
  const theme = useTheme();
  const dark = theme === 'dark';
  const isDarkVariant = variant === 'dark';

  if (variant === 'segmented') {
    return (
      <div
        role="group"
        aria-label={s.group}
        className={`flex rounded-full bg-sand/80 p-1 dark:bg-slate-800/90 dark:ring-1 dark:ring-white/10 ${
          iconOnly ? 'lg:flex-col' : ''
        } ${className}`}
      >
        {[
          { value: 'light', icon: Sun, label: s.light },
          { value: 'dark', icon: Moon, label: s.dark },
        ].map(({ value, icon: Icon, label }) => {
          const isSelected = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={isSelected}
              title={label}
              onClick={() => setTheme(value)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                isSelected
                  ? 'bg-white text-ink shadow-sm dark:bg-slate-900 dark:text-white dark:shadow-black/40'
                  : 'text-ink/60 hover:text-ink dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isSelected && value === 'dark' ? 'text-amber-400' : ''
                }`}
              />
              <span className={iconOnly ? 'lg:hidden' : ''}>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label={dark ? s.toLight : s.toDark}
        title={dark ? s.toLight : s.toDark}
        className={
          isDarkVariant
            ? `group relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-slate-900/90 text-slate-100 shadow-2xs backdrop-blur-xs transition-all duration-300 hover:border-white/40 hover:bg-slate-800 hover:text-white active:scale-90 ${className}`
            : `group relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-white/90 text-slate-700 shadow-2xs backdrop-blur-xs transition-all duration-300 hover:border-magenta hover:bg-magenta/5 hover:text-magenta active:scale-90 dark:border-white/20 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-white/40 dark:hover:bg-slate-700 dark:hover:text-white dark:shadow-black/40 ${className}`
        }
      >
        {dark ? (
          <Sun className="h-4 w-4 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.45)] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110" />
        ) : (
          <Moon
            className={`h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110 ${
              isDarkVariant
                ? 'text-slate-100 group-hover:text-amber-300'
                : 'text-slate-700 dark:text-slate-200 group-hover:text-magenta dark:group-hover:text-amber-300'
            }`}
          />
        )}
      </button>
      <span className={`inline-flex shrink-0 ${paletteClassName}`}><AppearanceMenu variant={isDarkVariant ? 'dark' : 'light'} className={className} /></span>
    </span>
  );
}
