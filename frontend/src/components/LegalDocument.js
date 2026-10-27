'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Scale } from 'lucide-react';
import { legalContent } from '../lib/legalContent';
import { useLanguage } from '../lib/i18n';
import { PageArt } from './Art';

export default function LegalDocument({ type }) {
  const { lang } = useLanguage();
  const content = legalContent[lang][type];
  const Icon = type === 'privacy' ? ShieldCheck : Scale;

  return (
    <main className="relative isolate flex-1 px-3 py-6 sm:px-6 sm:py-14 w-full max-w-full overflow-x-hidden">
      <PageArt />
      <article className="mx-auto max-w-4xl overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5">
        <header className="bg-ink px-4 py-6 text-white sm:px-10 sm:py-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {lang === 'si' ? 'මුල් පිටුවට' : lang === 'ta' ? 'முகப்புக்குத் திரும்பு' : 'Back to home'}
          </Link>
          <div className="mt-5 sm:mt-7 flex items-center gap-3">
            <span className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white/10 text-turmeric ring-1 ring-white/15 shrink-0">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold sm:text-4xl break-words">{content.title}</h1>
              <p className="mt-1 text-xs sm:text-sm text-white/60">{legalContent[lang].updated}</p>
            </div>
          </div>
          <p className="mt-5 sm:mt-6 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
            {content.intro}
          </p>
        </header>

        <div className="space-y-6 sm:space-y-8 px-4 py-6 sm:px-10 sm:py-10">
          <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            {legalContent[lang].draftNotice}
          </aside>

          {content.sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`legal-section-${index}`}>
              <h2 id={`legal-section-${index}`} className="text-lg font-bold text-ink">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-sm leading-7 text-ink/75 sm:text-base">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
