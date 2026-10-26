'use client';

import { useEffect, useState } from 'react';
import { HeartHandshake, MapPin, Package, Sparkles, Users } from 'lucide-react';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import CountUp from './CountUp';
import Reveal from './Reveal';

// Home page: the community in numbers
export default function HomeImpact() {
  const { t } = useLanguage();
  const h = t.homeImpact;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let ignore = false;
    API.get('/site/stats')
      .then((res) => !ignore && setStats(res.data))
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const sellersCount = stats?.sellers || 28;
  const productsCount = stats?.products || 140;
  const districtsCount = stats?.districts || 25;

  const numbers = [
    { icon: Users, value: sellersCount, label: h.sellers },
    { icon: Package, value: productsCount, label: h.products },
    { icon: MapPin, value: districtsCount, label: h.districts },
    { icon: HeartHandshake, value: 100, suffix: '%', label: t.home?.trustPillars?.[2]?.label || 'Direct Trade' },
  ];

  return (
    <section className="relative isolate mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      {/* Community in numbers hero box */}
      <Reveal className="relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl sm:p-10 border border-slate-800">
        <div className="relative text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-200 ring-1 ring-white/20 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            {h.spotlightKicker}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-4xl text-white">{h.title}</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-300 sm:text-sm">
            {t.home?.trustPillars?.[0]?.sub || 'Direct trade platform connecting Sri Lankan women makers to conscious shoppers'}
          </p>
        </div>

        <ul className="relative mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
          {numbers.map(({ icon: Icon, value, suffix, label }) => (
            <li
              key={label}
              className="flex flex-col items-center rounded-2xl bg-white/5 px-3 py-5 text-center ring-1 ring-white/10 backdrop-blur-md transition-all duration-200 hover:bg-white/10 sm:py-7"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-amber-400 ring-1 ring-white/15">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <span className="mt-3 text-2xl font-extrabold tabular-nums sm:text-4xl text-white">
                <CountUp value={value} duration={1400} />
                {suffix || ''}
              </span>
              <span className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-300 sm:text-xs">{label}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

