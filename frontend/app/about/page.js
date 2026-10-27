'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HeartHandshake, ShieldCheck, Sparkles, MapPin, MessageCircle, GraduationCap, Globe, Star,
  ArrowRight, Store, BookOpen, CircleHelp, Users, CheckCircle2, Target, Compass, Award, Building2,
  ChevronDown, XCircle, ChevronRight, Layers, FileCheck2, Send, ShoppingBag, ShieldAlert,
  HelpCircle, ExternalLink
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

  const [openFaq, setOpenFaq] = useState(0);

  const VALUE_ICONS = [HeartHandshake, Sparkles, ShieldCheck, MessageCircle];
  const VALUE_COLORS = [
    { tile: 'bg-rose-50 text-rose-600 ring-rose-200/80', border: 'hover:border-rose-300 hover:shadow-rose-500/10' },
    { tile: 'bg-indigo-50 text-indigo-600 ring-indigo-200/80', border: 'hover:border-indigo-300 hover:shadow-indigo-500/10' },
    { tile: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80', border: 'hover:border-emerald-300 hover:shadow-emerald-500/10' },
    { tile: 'bg-amber-50 text-amber-700 ring-amber-200/80', border: 'hover:border-amber-300 hover:shadow-amber-500/10' },
  ];

  const PILLAR_ICONS = [GraduationCap, MapPin, Globe, Star];

  const STEP_ICONS = [FileCheck2, GraduationCap, MessageCircle, ShoppingBag];

  const stats = a.stats || [
    { value: 25, suffix: '', label: 'Districts Connected', desc: 'Islandwide reach across all 9 provinces' },
    { value: 100, suffix: '%', label: 'Direct to Maker', desc: 'Proceeds go entirely to women artisans' },
    { value: 0, suffix: '%', label: 'Platform Commission', desc: 'Completely free government service' },
    { value: 3, suffix: '', label: 'National Languages', desc: 'Sinhala, Tamil and English native support' },
  ];

  const STAT_ICONS = [MapPin, HeartHandshake, ShieldCheck, Globe];

  return (
    <main className="relative isolate flex-1 pb-20">
      <PageArt />

      {/* 1. Signature Top Hero Banner */}
      <section className="relative isolate mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-7xl overflow-hidden rounded-[28px] sm:rounded-[40px] px-4 pb-28 pt-10 text-white sm:mt-6 sm:w-[calc(100%-3rem)] sm:pb-36 sm:pt-14">
        <img
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 -z-20 h-full w-full animate-ken-burns object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-ink/95 via-ink/85 to-brand-700/80" />
        <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-6 -z-10 h-64 w-64 animate-float rounded-full bg-turmeric/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-10 -z-10 h-72 w-72 animate-float rounded-full bg-brand-300/20 blur-3xl [animation-delay:-4s]" />

        <div className="mx-auto max-w-3xl text-center">
          {/* Official Emblem & Badge */}
          <div className="animate-fade-up">
            <span className="relative mx-auto flex h-20 w-20 animate-zoom-in items-center justify-center rounded-full bg-white shadow-xl shadow-black/30 ring-4 ring-white/20">
              <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-turmeric/20" />
              <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="relative h-13 w-13 object-contain" />
            </span>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-turmeric/20 px-3.5 py-1 text-xs font-bold text-turmeric ring-1 ring-turmeric/40 backdrop-blur-xs">
              <img src={FLAG_URL} alt="Sri Lanka" className="h-3.5 w-auto rounded-[2px]" />
              <span>{a.badge}</span>
            </div>
          </div>

          <h1 className="mt-5 animate-fade-up text-3xl font-extrabold tracking-tight [animation-delay:120ms] sm:text-5xl sm:leading-tight">
            {a.title}
          </h1>

          <span
            aria-hidden="true"
            className="mx-auto mt-4 block h-1 w-20 origin-center animate-grow-x rounded-full bg-turmeric [animation-delay:220ms]"
          />

          <p className="mx-auto mt-4 max-w-2xl animate-fade-up text-sm leading-relaxed text-white/90 [animation-delay:320ms] sm:text-base">
            {a.subtitle}
          </p>

          {/* Quick Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-white/70">
            <Link href="/" className="transition hover:text-white hover:underline">
              {t.navHome || 'Home'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-white/40" />
            <span className="text-turmeric">{a.title || 'About'}</span>
          </nav>
        </div>
      </section>

      {/* 2. Elevated Impact Stats Strip (Floats over the banner edge) */}
      <div className="mx-auto max-w-6xl px-4">
        <div className="relative z-10 -mt-16 grid gap-4 sm:-mt-20 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ value, suffix, label, desc }, idx) => {
            const Icon = STAT_ICONS[idx % STAT_ICONS.length];
            return (
              <Reveal
                key={label}
                animation="zoom-in"
                delay={200 + idx * 80}
                className="grid"
              >
                <div className="group rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lg shadow-ink/5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Metric 0{idx + 1}
                    </span>
                  </div>

                  <p className="mt-4 font-display text-3xl font-black text-slate-900">
                    <CountUp end={value} />
                    {suffix}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{label}</p>
                  <p className="mt-1 text-xs text-slate-500">{desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* 3. Section: The National Mandate & Middlemen Elimination */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal animation="fade-right">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-magenta">
              <Sparkles className="h-3.5 w-3.5" />
              {a.storyBadge}
            </div>

            <h2 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-4xl sm:leading-tight">
              {a.storyTitle}
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.storyP1}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.storyP2}
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-6">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Ministry Verified Artisans</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Zero Intermediary Fees</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Direct WhatsApp Commerce</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700 sm:text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Islandwide Postal Delivery</span>
              </div>
            </div>
          </Reveal>

          <Reveal animation="zoom-in" delay={150} className="relative">
            <div className="relative overflow-hidden rounded-[36px] border border-slate-200/90 bg-white p-3 shadow-xl">
              <div className="relative aspect-4/3 overflow-hidden rounded-[28px]">
                <img
                  src={HERO_IMAGE}
                  alt="Sri Lankan women artisans crafting traditional handlooms and pottery"
                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                
                {/* Floating Seal in Image */}
                <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
                  100% Non-Profit Initiative
                </div>

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="flex items-center gap-2">
                    <img src={FLAG_URL} alt="Sri Lanka Flag" className="h-4 w-6 rounded-xs object-cover shadow-xs" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Preserving Ceylon Heritage</span>
                  </div>
                  <p className="mt-1 text-sm font-bold sm:text-base">
                    Empowering rural artisans with digital independence and dignified livelihoods.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. Section: The Direct Difference (Comparative Visual Matrix) */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200">
            <Layers className="h-3.5 w-3.5 text-magenta" />
            {a.modelBadge}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-4xl">
            {a.modelTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            {a.modelSubtitle}
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {/* Traditional Middlemen Market (Pain Points) */}
          <Reveal animation="fade-right" delay={100} className="rounded-3xl border border-rose-200/80 bg-rose-50/40 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">The Problem</span>
                <h3 className="text-xl font-extrabold text-slate-900">{a.traditionalLabel}</h3>
              </div>
            </div>

            <ul className="mt-6 space-y-3.5 text-sm">
              {a.traditionalPoints?.map((pt) => (
                <li key={pt} className="flex items-start gap-3 text-slate-700">
                  <XCircle className="h-5 w-5 shrink-0 text-rose-500" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Lanka Women E-Market (The Solution) */}
          <Reveal animation="fade-left" delay={150} className="rounded-3xl border border-emerald-300 bg-emerald-50/40 p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">The Solution</span>
                <h3 className="text-xl font-extrabold text-slate-900">{a.platformLabel}</h3>
              </div>
            </div>

            <ul className="mt-6 space-y-3.5 text-sm">
              {a.platformPoints?.map((pt) => (
                <li key={pt} className="flex items-start gap-3 font-semibold text-slate-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 5. Section: How the Platform Operates (4-Step Standard Framework) */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200">
            <Building2 className="h-3.5 w-3.5" />
            {a.howBadge}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-4xl">
            {a.howTitle}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
            {a.howSubtitle}
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {a.steps?.map((st, idx) => {
            const Icon = STEP_ICONS[idx % STEP_ICONS.length];
            return (
              <Reveal key={st.step} delay={idx * 80} className="grid">
                <div className="group relative rounded-3xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="font-display text-2xl font-black text-slate-300 transition-colors group-hover:text-brand-500">
                      {st.step}
                    </span>
                  </div>

                  <h4 className="mt-5 text-base font-bold text-slate-900">{st.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{st.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 6. Section: Mission & Vision */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Mission */}
          <Reveal animation="fade-right" className="rounded-3xl border border-rose-200/80 bg-linear-to-br from-rose-50/70 via-white to-white p-7 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/25">
                <Target className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">{a.missionBadge || 'Action & Purpose'}</span>
                <h3 className="text-xl font-extrabold text-slate-900">{a.missionTitle}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.missionText}
            </p>
          </Reveal>

          {/* Vision */}
          <Reveal animation="fade-left" delay={100} className="rounded-3xl border border-indigo-200/80 bg-linear-to-br from-indigo-50/70 via-white to-white p-7 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
                <Compass className="h-6 w-6" />
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{a.visionBadge || 'The Future'}</span>
                <h3 className="text-xl font-extrabold text-slate-900">{a.visionTitle}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {a.visionText}
            </p>
          </Reveal>
        </div>
      </section>

      {/* 7. Section: Core Principles (Values Grid) */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200">
            <Award className="h-3.5 w-3.5 text-magenta" />
            {a.valuesBadge}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-4xl">
            {a.valuesTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
            {a.valuesSubtitle}
          </p>
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

      {/* 8. Section: Pillars of the National Ecosystem (Dark Accent Container) */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <div className="relative isolate overflow-hidden rounded-[40px] border border-slate-800 bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 p-8 text-white shadow-2xl sm:p-14">
          <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10 opacity-30" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-0 -z-10 h-72 w-72 rounded-full bg-magenta/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-72 w-72 rounded-full bg-turmeric/20 blur-3xl" />

          <Reveal className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-turmeric ring-1 ring-white/15">
              <Building2 className="h-3.5 w-3.5" />
              {a.pillarsBadge}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold sm:text-4xl">
              {a.pillarsTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              {a.pillarsSubtitle}
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {a.pillars?.map((pillar, idx) => {
              const Icon = PILLAR_ICONS[idx % PILLAR_ICONS.length];
              return (
                <div
                  key={pillar.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs transition hover:border-white/20 hover:bg-white/10"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-magenta text-white shadow-md shadow-magenta/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h4 className="mt-4 text-base font-bold text-white">{pillar.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Section: Official Governance & Ministry Oversight */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="rounded-3xl border border-slate-200/90 bg-white p-7 shadow-sm sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-200">
                <img src={EMBLEM_URL} alt="Emblem" className="h-10 w-10 object-contain" />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  {a.governanceBadge}
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
                  {a.governanceTitle}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  {a.governanceP1} {a.governanceP2}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <MapPin className="h-4 w-4 text-brand-600" />
                  <span>{a.governanceOffice}</span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <BookOpen className="h-4 w-4" />
                <span>{a.supportGuide}</span>
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
              >
                <span>{t.contact || 'Contact Ministry'}</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 10. Section: Initiative FAQs (Interactive Accordion) */}
      <section className="mx-auto max-w-5xl px-4 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 ring-1 ring-slate-200">
            <HelpCircle className="h-3.5 w-3.5 text-magenta" />
            {a.faqBadge}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-4xl">
            {a.faqTitle}
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {a.faqs?.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Reveal key={faq.q} delay={idx * 60}>
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs transition-colors hover:border-slate-300">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50/50"
                  >
                    <span className="text-sm font-bold text-slate-900 sm:text-base">{faq.q}</span>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-brand-50 text-brand-700' : ''}`}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 pb-5 pt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {faq.a}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 11. Call to Action Banner */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
        <Reveal className="rounded-3xl border border-slate-200/90 bg-linear-to-b from-white via-white to-brand-50/30 p-8 text-center shadow-md sm:p-12">
          <div className="mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-magenta">
              <Users className="h-3.5 w-3.5" />
              {a.ctaBadge}
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {a.ctaTitle}
            </h2>
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
                href="/e-learning"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:text-magenta hover:underline"
              >
                <GraduationCap className="h-4 w-4" />
                <span>{a.elearnHub}</span>
              </Link>

              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-slate-600 transition hover:text-magenta hover:underline"
              >
                <BookOpen className="h-4 w-4" />
                <span>{a.supportGuide}</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
