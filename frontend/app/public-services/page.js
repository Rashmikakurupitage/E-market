'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, Building2, ExternalLink, HeartHandshake, Search } from 'lucide-react';
import { useLanguage } from '../../src/lib/i18n';
import { PageArt } from '../../src/components/Art';
import Reveal from '../../src/components/Reveal';

const GROUP_ICONS = {
  citizens: Building2,
  enterprise: BriefcaseBusiness,
  women: HeartHandshake,
};

export default function PublicServicesPage() {
  const { t } = useLanguage();
  const content = t.publicServices;
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const groups = useMemo(() => content.groups.map((group) => ({
    ...group,
    services: group.services.filter((service) => (
      !normalizedQuery || `${service.name} ${service.description}`.toLocaleLowerCase().includes(normalizedQuery)
    )),
  })).filter((group) => group.services.length > 0), [content.groups, normalizedQuery]);

  return (
    <main className="relative isolate flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <PageArt />
      <div className="mx-auto max-w-6xl">
        <Link href="/support" className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-ink/70 ring-1 ring-ink/10 transition-colors hover:bg-white hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          {content.back}
        </Link>

        <header className="mt-6 rounded-[32px] bg-ink px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-turmeric">{content.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-extrabold sm:text-5xl">{content.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/75 sm:text-base">{content.intro}</p>
          <p className="mt-5 text-xs text-white/60">{content.checkedOn}</p>
        </header>

        <div className="mt-6 rounded-2xl bg-turmeric/15 p-4 text-sm leading-relaxed text-ink ring-1 ring-turmeric/30">
          <strong>{content.important}</strong> {content.disclaimer}
        </div>

        <label className="mt-6 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-ink/10 focus-within:ring-2 focus-within:ring-magenta">
          <Search className="h-5 w-5 shrink-0 text-ink/45" />
          <span className="sr-only">{content.searchLabel}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={content.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
          />
        </label>

        {groups.length === 0 ? (
          <p className="mt-8 rounded-2xl bg-white p-6 text-center text-sm text-ink/65 ring-1 ring-ink/5">{content.noResults}</p>
        ) : (
          <div className="mt-10 space-y-10">
            {groups.map((group) => {
              const Icon = GROUP_ICONS[group.id] || Building2;
              return (
                <section key={group.id} aria-labelledby={`services-${group.id}`}>
                  <h2 id={`services-${group.id}`} className="flex items-center gap-3 text-xl font-extrabold text-ink sm:text-2xl">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-magenta/10 text-magenta">
                      <Icon className="h-5 w-5" />
                    </span>
                    {group.title}
                  </h2>
                  <ul className="mt-4 grid gap-4 md:grid-cols-2">
                    {group.services.map((service) => (
                      <li key={service.id}>
                        <Reveal as="article" className="flex h-full flex-col rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-ink/5">
                          <h3 className="text-lg font-bold text-ink">{service.name}</h3>
                          <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/65">{service.description}</p>
                          <a
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta"
                          >
                            {content.openLink}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
