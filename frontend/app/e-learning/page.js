'use client';

import { BookOpen, Video, FileText, Award, Megaphone, Calculator, Camera, ArrowRight, GraduationCap, Lightbulb } from 'lucide-react';
import Reveal from '../../src/components/Reveal';
import { Lotus, PageArt } from '../../src/components/Art';
import { useLanguage } from '../../src/lib/i18n';

// Picture for each course category (all in the brand green)
const THEMES = {
  'Digital Marketing': {
    icon: Megaphone,
    header: 'from-brand-500 via-brand-600 to-brand-800',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
  },
  'Financial Management': {
    icon: Calculator,
    header: 'from-brand-500 via-brand-600 to-brand-800',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
  },
  Branding: {
    icon: Camera,
    header: 'from-brand-500 via-brand-600 to-brand-800',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
  },
};
const DEFAULT_THEME = {
  icon: BookOpen,
  header: 'from-brand-500 to-brand-700',
  chip: 'bg-brand-50 text-brand-800 ring-brand-200',
  button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
};

// Icons floating in the banner
const BANNER_ICONS = [
  { icon: GraduationCap, className: 'right-[30%] top-8', delay: '0s' },
  { icon: Lightbulb, className: 'right-[14%] top-14', delay: '-2s' },
  { icon: BookOpen, className: 'right-[24%] bottom-8', delay: '-4s' },
];

export default function ELearning() {
  const { t } = useLanguage();
  const hub = t.elearningHub;
  const courses = hub.courses;

  return (
    <div className="relative isolate flex-1 px-4 py-10 font-sans">
      <PageArt />
      <div className="mx-auto max-w-6xl space-y-10">

        {/* Banner */}
        <Reveal as="section" animation="fade-down" className="relative isolate overflow-hidden rounded-[32px] bg-ink p-8 text-white shadow-2xl sm:p-10">
          <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 -z-10 h-64 w-64 animate-float rounded-full bg-magenta/50 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-10 -z-10 h-56 w-56 animate-float rounded-full bg-saffron/35 blur-3xl [animation-delay:-4s]" />
          <Lotus color="white" className="pointer-events-none absolute -bottom-3 right-4 -z-10 hidden w-52 opacity-90 md:block" />
          {BANNER_ICONS.map(({ icon: Icon, className, delay }) => (
            <span
              key={className}
              aria-hidden="true"
              className={`pointer-events-none absolute -z-10 hidden h-14 w-14 animate-float items-center justify-center rounded-2xl bg-white/10 text-amber-200 ring-1 ring-white/20 backdrop-blur-sm lg:flex ${className}`}
              style={{ animationDelay: delay }}
            >
              <Icon className="h-7 w-7" />
            </span>
          ))}

          <div className="max-w-2xl">
            <span className="inline-flex animate-fade-up items-center gap-1.5 rounded-full bg-turmeric px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-lg">
              <Award className="h-3.5 w-3.5" /> {hub.badge}
            </span>
            <h1 className="mt-4 animate-fade-up text-2xl font-extrabold leading-snug [animation-delay:120ms] sm:text-4xl">
              {hub.title}
            </h1>
            <span aria-hidden="true" className="mt-4 block h-1 w-16 animate-fade-up rounded-full bg-turmeric [animation-delay:180ms]" />
            <p className="mt-4 animate-fade-up text-sm leading-relaxed text-white/80 [animation-delay:240ms] sm:text-base">
              {hub.description}
            </p>
          </div>
        </Reveal>

        {/* Course Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {courses.map((course, index) => {
            const theme = THEMES[course.themeKey] || DEFAULT_THEME;
            const Icon = theme.icon;
            return (
              <Reveal key={course.id} animation="zoom-in" delay={index * 120} className="grid">
                <article className="group flex flex-col overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                  {/* Coloured picture area */}
                  <div className={`relative isolate flex h-40 items-center justify-center overflow-hidden bg-linear-to-br ${theme.header}`}>
                    <div aria-hidden="true" className="pattern-dots absolute inset-0 -z-10" />
                    <div aria-hidden="true" className="absolute -right-8 -top-8 -z-10 h-28 w-28 rounded-full bg-white/15 transition-transform duration-700 group-hover:scale-150" />
                    <div aria-hidden="true" className="absolute -bottom-10 -left-6 -z-10 h-24 w-24 rounded-full bg-white/10 transition-transform duration-700 group-hover:scale-150" />
                    <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-white shadow-xl ring-1 ring-white/40 backdrop-blur-sm transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                      <Icon className="h-10 w-10" />
                    </span>
                    <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-800 shadow">
                      {hub.levels[course.levelKey]}
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 p-6">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${theme.chip}`}>
                      {hub.categories[course.categoryKey]}
                    </span>
                    <h3 className="text-base font-extrabold leading-snug text-slate-800">{course.title}</h3>
                    <p className="text-xs leading-relaxed text-slate-500">{course.description}</p>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 bg-cream/70 p-6">
                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                      <span className="flex items-center gap-1.5"><Video className="h-4 w-4 text-slate-400" /> {course.duration}</span>
                      <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-slate-400" /> {hub.modules.replace('{count}', String(course.modules))}</span>
                    </div>

                    <button
                      className={`group/btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] ${theme.button}`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>{hub.startCourse}</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>

      </div>
    </div>
  );
}
