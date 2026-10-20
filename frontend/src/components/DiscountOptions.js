'use client';

import { CalendarDays, Flame, Heart, Sparkles } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

const PRESETS = [
  { percent: 10, days: 0, icon: Sparkles, key: 'littleTreat', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { percent: 20, days: 3, icon: Heart, key: 'crowdFavorite', tone: 'bg-pink-50 text-pink-700 ring-pink-200' },
  { percent: 30, days: 7, icon: CalendarDays, key: 'weekSpotlight', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  { percent: 50, days: 14, icon: Flame, key: 'bigClearout', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
];

function dayFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DiscountOptions({ percent, endsAt, onSelect, disabled = false }) {
  const { t } = useLanguage();

  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-semibold text-ink">{t.discount.quickIdeas}</legend>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map(({ percent: value, days, icon: Icon, key, tone }) => {
          const selected = String(value) === String(percent) && endsAt === dayFromToday(days);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect({ percent: value, endsAt: dayFromToday(days) })}
              className={`group flex min-h-20 items-center gap-2.5 rounded-2xl p-3 text-left ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta disabled:pointer-events-none disabled:opacity-50 ${selected ? 'bg-red-50 text-red-800 ring-red-300 shadow-sm' : 'bg-white text-ink ring-ink/10 hover:ring-ink/20'}`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold tabular-nums">-{value}%</span>
                <span className="block truncate text-xs font-semibold">{t.discount.presets[key].name}</span>
                <span className="block truncate text-[10px] text-ink/55">{t.discount.presets[key].duration}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
