'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Package, Store, Users } from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';
import CountUp from './CountUp';
import Reveal from './Reveal';

const TONES = ['from-magenta to-saffron', 'from-leaf to-emerald-400', 'from-blue-500 to-cyan-400', 'from-amber-500 to-yellow-400', 'from-rose-500 to-orange-400', 'from-violet-500 to-fuchsia-400'];

// Home page: the community in numbers, then a spotlight of sellers
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

  // Nothing to show yet (no approved sellers) or the server is unreachable: leave the section out
  if (!stats || stats.sellers === 0) return null;

  const numbers = [
    { icon: Users, value: stats.sellers, label: h.sellers },
    { icon: Package, value: stats.products, label: h.products },
    { icon: MapPin, value: stats.districts, label: h.districts },
  ];

  return (
    <section className="relative isolate mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <Reveal className="relative overflow-hidden rounded-[36px] bg-linear-to-br from-ink via-[#2a1d3a] to-magenta-dark p-6 text-white shadow-2xl shadow-ink/20 sm:p-10">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-14 h-56 w-56 animate-float rounded-full bg-saffron/30 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 animate-float rounded-full bg-magenta/40 blur-3xl [animation-delay:-4s]" />
        <h2 className="relative text-center text-2xl font-extrabold sm:text-3xl">{h.title}</h2>
        <ul className="relative mt-8 grid grid-cols-3 gap-3 sm:gap-6">
          {numbers.map(({ icon: Icon, value, label }) => (
            <li key={label} className="flex flex-col items-center rounded-[24px] bg-white/10 px-2 py-5 text-center ring-1 ring-white/15 backdrop-blur sm:py-7">
              <Icon className="h-6 w-6 text-turmeric sm:h-7 sm:w-7" />
              <span className="mt-2 text-3xl font-extrabold tabular-nums sm:text-5xl"><CountUp value={value} duration={1400} /></span>
              <span className="mt-1 text-xs font-medium text-white/75 sm:text-sm">{label}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      {stats.featuredSellers.length > 0 && (
        <div className="mt-14">
          <Reveal className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-magenta">{h.spotlightKicker}</p>
              <h2 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">{h.spotlightTitle}</h2>
              <p className="mt-1 text-sm text-ink/60">{h.spotlightSub}</p>
            </div>
            <Link href="/store" className="inline-flex items-center gap-1.5 text-sm font-bold text-magenta hover:underline">
              {h.visitStore}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <ul className="no-scrollbar -mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {stats.featuredSellers.map((seller, index) => (
              <Reveal as="li" key={seller.id} delay={index * 70} className="w-[78%] shrink-0 snap-start sm:w-auto">
                <Link href="/store" className="group flex h-full flex-col rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-lg font-extrabold text-white shadow-md ${TONES[index % TONES.length]}`}>
                      {initials(seller.businessName) || '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{seller.businessName}</p>
                      <p className="flex items-center gap-1 text-xs text-ink/55">
                        <MapPin className="h-3 w-3" />
                        {seller.district}
                      </p>
                    </div>
                  </div>
                  {seller.description && <p className="mt-3 line-clamp-2 text-sm leading-5 text-ink/60">{seller.description}</p>}
                  <p className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-bold text-magenta">
                    <Store className="h-3.5 w-3.5" />
                    {fill(h.productCount, { count: seller.productCount })}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
