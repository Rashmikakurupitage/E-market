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
export default function ThemeToggle({ variant = 'button', iconOnly = false, className = '' }) {
  const { lang } = useLanguage();
  const s = TEXT[lang] || TEXT.en;
  const theme = useTheme();
  const dark = theme === 'dark';

  if (variant === 'segmented') {
    return (
      <div role="group" aria-label={s.group} className={`flex rounded-full bg-sand/80 p-1 ${iconOnly ? 'lg:flex-col' : ''} ${className}`}>
        {[
          { value: 'light', icon: Sun, label: s.light },
          { value: 'dark', icon: Moon, label: s.dark },
        ].map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            title={label}
            onClick={() => setTheme(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              theme === value ? 'bg-white text-ink shadow' : 'text-ink/50 hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className={iconOnly ? 'lg:hidden' : ''}>{label}</span>
          </button>
        ))}
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
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-ink/10 transition-all duration-200 hover:bg-white hover:text-magenta ${className}`}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
    <AppearanceMenu className={className} />
    </span>
  );
}
