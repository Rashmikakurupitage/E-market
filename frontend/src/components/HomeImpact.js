'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, HeartHandshake, MapPin, Package, Sparkles, Store, Users } from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';
import CountUp from './CountUp';
import Reveal from './Reveal';

const TONES = [
  'from-magenta to-saffron shadow-magenta/25',
  'from-leaf to-emerald-400 shadow-leaf/25',
  'from-blue-500 to-cyan-400 shadow-blue-500/25',
  'from-amber-500 to-yellow-400 shadow-amber-500/25',
  'from-rose-500 to-orange-400 shadow-rose-500/25',
  'from-violet-500 to-fuchsia-400 shadow-violet-500/25',
];

const DEFAULT_SPOTLIGHT = [
  {
    id: 'spotlight-1',
    businessName: 'Lanka Eco Creations',
    district: 'Kalutara',
    description: 'Traditional handwoven cane, bamboo, and wicker home crafts crafted by village artisans.',
    productCount: 16,
    craft: 'Handicrafts',
  },
  {
    id: 'spotlight-2',
    businessName: "Menaka's Batik Studio",
    district: 'Kurunegala',
    description: 'Authentic handcrafted cotton batik sarees, sarongs, and vibrant wall tapestries.',
    productCount: 24,
    craft: 'Textiles',
  },
  {
    id: 'spotlight-3',
    businessName: "Soma's Herbal & Spices",
    district: 'Matara',
    description: 'Direct-farm organic Ceylon cinnamon, virgin coconut oil, and natural wellness remedies.',
    productCount: 18,
    craft: 'Food & Spices',
  },
];

// Home page: the community in numbers, then an elevated spotlight of sellers
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
  const spotlightSellers = (stats?.featuredSellers && stats.featuredSellers.length > 0)
    ? stats.featuredSellers
    : DEFAULT_SPOTLIGHT;

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

      {/* Featured sellers showcase */}
      <div className="mt-14">
        <Reveal className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-magenta">
              <BadgeCheck className="h-4 w-4" />
              {h.spotlightKicker}
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{h.spotlightTitle}</h2>
            <p className="mt-1 text-sm text-slate-600">{h.spotlightSub}</p>
          </div>
          <Link
            href="/store"
            className="group inline-flex items-center gap-2 rounded-full border border-magenta/30 bg-magenta/5 px-4 py-2 text-sm font-bold text-magenta transition-all hover:bg-magenta hover:text-white"
          >
            <span>{h.visitStore}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Reveal>

        <ul className="no-scrollbar -mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {spotlightSellers.map((seller, index) => (
            <Reveal as="li" key={seller.id || index} delay={index * 80} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <Link
                href={`/store?seller=${encodeURIComponent(seller.businessName)}`}
                className="group flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-magenta/40 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-base font-extrabold text-white shadow-2xs transition-transform duration-200 group-hover:scale-105"
                  >
                    {initials(seller.businessName) || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-bold text-slate-900 transition-colors group-hover:text-magenta">{seller.businessName}</p>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-magenta" />
                    </div>
                    {seller.district && (
                      <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
                        <MapPin className="h-3.5 w-3.5 text-magenta" />
                        {seller.district}
                      </p>
                    )}
                  </div>
                </div>

                {seller.description && (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {seller.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-magenta">
                    <Store className="h-3.5 w-3.5" />
                    {fill(h.productCount, { count: seller.productCount || 12 })}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition-colors group-hover:text-magenta">
                    <span>{t.store?.details || 'Explore'}</span>
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
