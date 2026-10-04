'use client';

import { useState } from 'react';
import { Search, ChevronDown, ShoppingBag, Store, KeyRound, MessageCircleQuestion, Mail, X } from 'lucide-react';
import { useLanguage, fill } from '../../src/lib/i18n';
import { HERO_IMAGE } from '../../src/lib/catalog';

const CATEGORIES = ['buying', 'selling', 'account'];
const CATEGORY_ICONS = { buying: ShoppingBag, selling: Store, account: KeyRound };

function CategoryChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-brand-700 hover:ring-brand-200'
      }`}
    >
      {children}
    </button>
  );
}

export default function FAQ() {
  const { t } = useLanguage();
  const f = t.faq;
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  // Answers mention buttons by the names shown on the site, in the chosen language
  const labels = {
    order: t.orderWhatsapp,
    priceOnRequest: t.priceOnRequest,
    register: t.registerBtn,
    login: t.login,
    seller: t.customer.seller,
    customer: t.customer.customer,
    addProduct: t.dash.addProduct,
    remove: t.dash.remove,
    pending: t.dash.status.PENDING,
    approved: t.dash.status.APPROVED,
    rejected: t.dash.status.REJECTED,
    elearn: t.navElearn,
    dashboard: t.dashboardBtn,
    myAccount: t.myAccount,
    contactTitle: t.contactEdit.title,
    change: t.contactEdit.change,
  };
  const items = f.items.map((item, index) => ({ ...item, id: index, q: fill(item.q, labels), a: fill(item.a, labels) }));

  const search = query.trim().toLowerCase();
  const matchesSearch = (item) => !search || `${item.q} ${item.a}`.toLowerCase().includes(search);
  const visible = items.filter((item) => (category === 'all' || item.cat === category) && matchesSearch(item));
  const groups = CATEGORIES.map((cat) => ({ cat, items: visible.filter((item) => item.cat === cat) })).filter(
    (group) => group.items.length > 0
  );

  // Lets search engines show these questions directly in their results
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }).replace(/</g, '\\u003c');

  return (
    <main className="flex-1 bg-slate-100">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />

      {/* Title + search */}
      <section className="relative isolate overflow-hidden px-4 py-12 text-white sm:py-16">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-brand-800/95 via-brand-800/90 to-brand-900/95" />
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <MessageCircleQuestion className="h-7 w-7 text-amber-300" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{f.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">{f.subtitle}</p>

          <div className="relative mx-auto mt-7 max-w-xl">
            <label htmlFor="faq-search" className="sr-only">
              {f.search}
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={f.search}
              className="w-full rounded-xl border-0 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-lg placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-300/60"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Category filter */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <CategoryChip active={category === 'all'} onClick={() => setCategory('all')}>
            {f.categories.all}
          </CategoryChip>
          {CATEGORIES.map((cat) => (
            <CategoryChip key={cat} active={category === cat} onClick={() => setCategory(cat)}>
              {f.categories[cat]}
            </CategoryChip>
          ))}
        </div>

        {/* Questions */}
        {groups.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-slate-200">
            <Search className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 font-semibold text-slate-800">{f.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <X className="h-4 w-4" />
              {f.clearSearch}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {groups.map(({ cat, items: groupItems }) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <section key={cat} aria-labelledby={`faq-${cat}`}>
                  <h2 id={`faq-${cat}`} className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-800">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                      <Icon className="h-4 w-4" />
                    </span>
                    {f.categories[cat]}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {groupItems.map((item) => (
                      <details
                        key={item.id}
                        className="group rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-shadow open:shadow-md open:ring-brand-200"
                      >
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-5 py-4 font-semibold text-slate-900 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 [&::-webkit-details-marker]:hidden">
                          <span>{item.q}</span>
                          <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-brand-600" />
                        </summary>
                        <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600">{item.a}</p>
                      </details>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Still have questions */}
        <section className="mt-12 flex flex-col items-center gap-5 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:flex-row sm:p-8 sm:text-left">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
            <MessageCircleQuestion className="h-7 w-7 text-amber-600" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900">{f.stillTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{f.stillText}</p>
          </div>
          <a
            href="#contact"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
          >
            <Mail className="h-4 w-4" />
            {f.contactBtn}
          </a>
        </section>
      </div>
    </main>
  );
}
