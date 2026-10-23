'use client';

import Link from 'next/link';
import {
  HeartHandshake, ShieldCheck, Sparkles, MapPin, MessageCircle, GraduationCap, Globe, Star,
  ArrowRight, Store, BookOpen, CircleHelp, Users, CheckCircle2, Target, Compass, Award, Building2
} from 'lucide-react';
import { useLanguage } from '../../src/lib/i18n';
import { HERO_IMAGE } from '../../src/lib/catalog';
import Reveal from '../../src/components/Reveal';
import { PageArt, DotGrid, Squiggle, Sparkle as ArtSparkle } from '../../src/components/Art';
import CountUp from '../../src/components/CountUp';

const EMBLEM_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Emblem_of_Sri_Lanka.svg';
const FLAG_URL = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg';

export default function AboutPage() {
  const { t } = useLanguage();
  const a = t?.about || {};

  const VALUE_ICONS = [HeartHandshake, Sparkles, ShieldCheck, MessageCircle];
  const VALUE_COLORS = [
    { tile: 'bg-rose-50 text-rose-600 ring-rose-200/80', border: 'hover:border-rose-300 hover:shadow-rose-500/10' },
    { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-200/80', border: 'hover:border-indigo-300 hover:shadow-indigo-500/10' },
    { tile: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80', border: 'hover:border-emerald-300 hover:shadow-emerald-500/10' },
    { tile: 'bg-amber-50 text-amber-700 ring-amber-200/80', border: 'hover:border-amber-300 hover:shadow-amber-500/10' },
  ];

  const PILLAR_ICONS = [GraduationCap, MapPin, Globe, Star];

  const stats = [
    { value: 25, label: t.home?.districtsTitle || 'Districts Islandwide', suffix: '' },
    { value: 100, label: 'Direct to Maker', suffix: '%' },
    { value: 0, label: 'Middleman Commission', suffix: '%' },
    { value: 3, label: 'National Languages', suffix: '' },
  ];

  return (
    <main className="relative isolate flex-1 overflow-hidden pb-20">
      <PageArt />

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden bg-linear-to-b from-brand-50/70 via-sand/20 to-transparent py-14 sm:py-20">
        <DotGrid className="absolute left-6 top-8 -z-10 hidden w-28 text-slate-300/70 lg:block" rows={5} cols={6} />
        <DotGrid className="absolute right-8 top-12 -z-10 hidden w-28 text-slate-300/70 lg:block" rows={5} cols={6} />
        <ArtSparkle className="pointer-events-none absolute right-[15%] top-16 h-6 w-6 animate-twinkle text-magenta/40" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            {/* National Initiative Badge */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/90 bg-white/95 px-4 py-1.5 shadow-2xs backdrop-blur-xs">
              <img src={EMBLEM_URL} alt="Sri Lanka National Emblem" className="h-5 w-5 object-contain" />
              <span className="text-xs font-bold text-slate-700 sm:text-sm">{a.badge}</span>
            </div>

            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl sm:leading-tight">
              {a.title}
            </h1>
            <Squiggle className="mx-auto mt-2 h-3.5 w-48 text-magenta/50" />

            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              {a.subtitle}
            </p>

            {/* Quick Impact Stats Strip */}
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {stats.map(({ value, label, suffix }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-center shadow-2xs backdrop-blur-xs transition hover:shadow-md"
                >
                  <p className="font-display text-2xl font-black text-slate-900 sm:text-3xl">
                    <CountUp end={value} />
                    {suffix}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Story & Middlemen Elimination Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal delay={100}>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-magenta">
              <Sparkles className="h-3.5 w-3.5" />
              {a.storyBadge}
            </div>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-4xl sm:leading-tight">
              {a.storyTitle}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.storyP1}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.storyP2}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200/70">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Ministry Verified</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Zero Seller Fees</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Direct WhatsApp Contact</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={200} className="relative">
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200/90 bg-white p-3 shadow-xl">
              <div className="relative aspect-4/3 overflow-hidden rounded-[24px]">
                <img
                  src={HERO_IMAGE}
                  alt="Sri Lankan women artisans crafting traditional handlooms and pottery"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2">
                    <img src={FLAG_URL} alt="Sri Lanka Flag" className="h-4 w-6 rounded-xs object-cover shadow-xs" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Proudly Sri Lankan</span>
                  </div>
                  <p className="mt-1 text-sm font-bold sm:text-base">
                    Uplifting grassroots women creators and cultural heritage.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Mission */}
          <Reveal delay={100} className="rounded-3xl border border-rose-200/70 bg-linear-to-br from-rose-50/60 via-white to-white p-7 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/25">
                <Target className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Action & Purpose</span>
                <h3 className="text-xl font-extrabold text-slate-900">{a.missionTitle}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.missionText}
            </p>
          </Reveal>

          {/* Vision */}
          <Reveal delay={200} className="rounded-3xl border border-indigo-200/70 bg-linear-to-br from-indigo-50/60 via-white to-white p-7 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
                <Compass className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">The Future</span>
                <h3 className="text-xl font-extrabold text-slate-900">{a.visionTitle}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.visionText}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Award className="h-3.5 w-3.5 text-magenta" />
            Guiding Philosophy
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
            {a.valuesTitle}
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {a.values?.map((val, idx) => {
            const Icon = VALUE_ICONS[idx % VALUE_ICONS.length];
            const colors = VALUE_COLORS[idx % VALUE_COLORS.length];
            return (
              <Reveal key={val.title} delay={idx * 80} className="grid">
                <div
                  className={`group rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${colors.border}`}
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-110 ${colors.tile}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <h4 className="mt-4 text-base font-bold text-slate-900">{val.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{val.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Pillars of the Platform */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-[36px] border border-slate-200/90 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 p-8 text-white shadow-xl sm:p-12">
          <Reveal className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-turmeric ring-1 ring-white/15">
              <Building2 className="h-3.5 w-3.5" />
              National Infrastructure
            </span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-4xl">
              {a.pillarsTitle}
            </h2>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {a.pillars?.map((pillar, idx) => {
              const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xs transition hover:bg-white/10"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-magenta text-white shadow-md shadow-magenta/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-4 text-sm font-bold text-white sm:text-base">{pillar.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
        <Reveal className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-md sm:p-12">
          <div className="mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-magenta">
              <Users className="h-3.5 w-3.5" />
              {a.ctaTitle}
            </span>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.ctaText}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/store"
                className="btn-shine inline-flex items-center gap-2 rounded-full bg-magenta px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-magenta/25 transition-all hover:bg-magenta-dark"
              >
                <Store className="h-4 w-4" />
                <span>{a.exploreStore}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold text-slate-800 shadow-2xs transition hover:border-slate-400 hover:bg-slate-50"
              >
                <span>{a.registerSeller}</span>
              </Link>

              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:text-magenta hover:underline"
              >
                <BookOpen className="h-4 w-4" />
                <span>{a.supportGuide}</span>
              </Link>

              <Link
                href="/faq"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:text-magenta hover:underline"
              >
                <CircleHelp className="h-4 w-4" />
                <span>FAQ</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
