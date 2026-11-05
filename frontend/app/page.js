'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, Megaphone, HandCoins, Laptop, PackageSearch, ShieldCheck, HandHeart, MapPin,
  Scissors, Shirt, Sprout, Soup, Sparkles, PackageCheck, Store, BookOpen, Tag, Plus, CircleHelp,
} from 'lucide-react';
import API from '../src/lib/api';
import { useLanguage } from '../src/lib/i18n';
import { CATEGORIES, SAMPLE_PRODUCTS, getSeller, withSampleProducts } from '../src/lib/catalog';
import ProductCard from '../src/components/ProductCard';
import { useWallpapers } from '../src/lib/siteImage';
import HeroSlideshow from '../src/components/HeroSlideshow';
import HomeImpact from '../src/components/HomeImpact';
import WhatsAppIcon from '../src/components/WhatsAppIcon';
import Reveal from '../src/components/Reveal';
import { Lotus, Sparkle, DotGrid, Squiggle } from '../src/components/Art';

// Icon and logo colour for each category tile
const CATEGORY_LOOK = {
  Handicrafts: { icon: Scissors, tile: 'bg-magenta text-white shadow-magenta/30' },
  Textiles: { icon: Shirt, tile: 'bg-saffron text-white shadow-saffron/30' },
  'Agri-Products': { icon: Sprout, tile: 'bg-leaf text-white shadow-leaf/30' },
  'Food & Spices': { icon: Soup, tile: 'bg-turmeric text-ink shadow-turmeric/40' },
  'Beauty & Personal Care': { icon: Sparkles, tile: 'bg-ink text-white shadow-ink/30' },
};
const DEFAULT_LOOK = { icon: Tag, tile: 'bg-ink text-white shadow-ink/30' };

const BENEFIT_LOOK = [
  { icon: ShieldCheck, tile: 'bg-magenta/10 text-magenta' },
  { icon: WhatsAppIcon, tile: 'bg-leaf/15 text-leaf' },
  { icon: HandHeart, tile: 'bg-saffron/15 text-saffron' },
  { icon: MapPin, tile: 'bg-turmeric/25 text-ink' },
];

const STEP_LOOK = [
  { icon: Search, tile: 'bg-magenta text-white shadow-magenta/30' },
  { icon: WhatsAppIcon, tile: 'bg-leaf text-white shadow-leaf/30' },
  { icon: PackageCheck, tile: 'bg-saffron text-white shadow-saffron/30' },
];

// Questions people ask before they buy or sell. Opens one at a time.
function HomeFaq({ h }) {
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
      <SectionTitle title={h.hxFaqTitle} sub={h.hxFaqSub} />
      <ul className="mt-8 space-y-3">
        {h.hxFaq.map((item, index) => {
          const open = openIndex === index;
          return (
            <li key={item.q} className="glass overflow-hidden rounded-[24px]">
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-ink sm:text-base"
                >
                  <span className="flex items-center gap-3">
                    <CircleHelp className="h-5 w-5 shrink-0 text-magenta" />
                    {item.q}
                  </span>
                  <Plus className={`h-5 w-5 shrink-0 text-ink/50 transition-transform duration-300 ${open ? 'rotate-45' : ''}`} />
                </button>
              </h3>
              <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <p className="overflow-hidden px-5 text-sm leading-relaxed text-ink/70 sm:pl-13">
                  <span className={`block ${open ? 'pb-5' : ''}`}>{item.a}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-center">
        <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-bold text-magenta hover:underline">
          {h.hxFaqMore}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </p>
    </section>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-ink/5 bg-white p-3">
      <div className="skeleton aspect-square rounded-[22px]" />
      <div className="space-y-3 px-2 pb-1 pt-4">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
        <div className="skeleton h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }) {
  return (
    <Reveal className="text-center">
      <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      <Squiggle className="mx-auto mt-2 h-3 w-32" />
      {sub && <p className="mt-3 text-sm text-ink/60 sm:text-base">{sub}</p>}
    </Reveal>
  );
}

// The hero title with one word in the logo gradient (italic in English only)
function HeroTitle() {
  const { t, lang } = useLanguage();
  const title = t.heroTitle;
  const word = t.home.heroHighlight;
  const at = word ? title.indexOf(word) : -1;
  const size =
    lang === 'en'
      ? 'text-[2.6rem] leading-[1.05] sm:text-6xl xl:text-7xl'
      : 'text-[2rem] leading-[1.3] sm:text-5xl sm:leading-[1.25] xl:text-[3.5rem]';

  return (
    <h1 className={`mt-6 animate-fade-up font-semibold tracking-tight text-ink [animation-delay:120ms] ${size}`}>
      {at < 0 ? (
        title
      ) : (
        <>
          {title.slice(0, at)}
          <span className="draw-now relative inline-block">
            <span className={`text-gradient-brand ${lang === 'en' ? 'pr-2 italic' : ''}`}>{word}</span>
            <Squiggle className="absolute -bottom-1 left-0 h-3 w-full sm:h-4" />
          </span>
          {title.slice(at + word.length)}
        </>
      )}
    </h1>
  );
}

export default function Home() {
  const { t } = useLanguage();
  const wallpapers = useWallpapers();
  const h = t.home;
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    let ignore = false;

    API.get('/products', { timeout: 8000 })
      .then((res) => {
        const fetched = res.data?.products || res.data;
        if (!ignore && Array.isArray(fetched)) {
          setProducts(withSampleProducts(fetched));
        }
      })
      .catch(() => console.log('Using sample products'))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const query = search.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    if (category !== 'all' && product.category !== category) return false;
    if (!query) return true;
    const seller = getSeller(product);
    return [product.title, product.description, product.category, seller.businessName, seller.district].some(
      (value) => value?.toLowerCase().includes(query)
    );
  });

  const scrollToProducts = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });

  const handleSearch = (e) => {
    e.preventDefault();
    scrollToProducts();
  };

  const chooseCategory = (value) => {
    setCategory(value);
    scrollToProducts();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
  };

  const learnTopics = [
    { icon: Megaphone, label: t.marketing },
    { icon: HandCoins, label: t.finance },
    { icon: Laptop, label: t.digitalLiteracy },
  ];

  return (
    <>
      {/* Hero */}
      <section className="px-3 pb-10 pt-3 sm:px-6 sm:pb-14 sm:pt-5">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[30px] bg-[#f4ebe2] shadow-[0_24px_70px_-38px_rgba(54,37,34,0.35)] sm:rounded-[38px] lg:min-h-[590px] lg:grid-cols-2">
          {/* The maker's work leads the page, especially on small screens. */}
          <div className="relative order-1 min-h-[270px] overflow-hidden sm:min-h-[390px] lg:order-2 lg:min-h-[590px]">
            <HeroSlideshow {...wallpapers} controlsPosition="top-right" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-linear-to-t from-ink/35 to-transparent" />
          </div>

          {/* Search and clear next steps for customers and women entrepreneurs. */}
          <div className="order-2 flex flex-col justify-center px-5 py-8 sm:px-9 sm:py-10 lg:order-1 lg:px-12 lg:py-14 xl:px-16">
            <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/75 px-3.5 py-2 text-[11px] font-bold leading-tight text-magenta-dark ring-1 ring-magenta/10 sm:text-xs">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" />
              {h.badge}
            </p>

            <HeroTitle />

            <p className="mt-4 max-w-xl text-sm leading-7 text-ink/70 sm:mt-5 sm:text-base sm:leading-8">
              {t.heroSub}
            </p>

            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl border border-ink/10 bg-white p-1.5 shadow-sm transition-shadow focus-within:ring-4 focus-within:ring-magenta/10 sm:mt-8"
            >
              <label htmlFor="product-search" className="sr-only">{t.searchBtn}</label>
              <Search className="ml-3 h-5 w-5 shrink-0 text-ink/40" aria-hidden="true" />
              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent px-1 py-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none sm:text-base"
              />
              <button
                type="submit"
                aria-label={t.searchBtn}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-magenta px-4 text-white transition-colors hover:bg-magenta-dark active:scale-[0.98] sm:px-5"
              >
                <span className="text-sm font-semibold">{t.searchBtn}</span>
                <ArrowRight className="hidden h-4 w-4 sm:block" />
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-ink/50">{h.popular}</span>
              {CATEGORIES.slice(0, 3).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseCategory(value)}
                  className="rounded-full border border-ink/10 bg-white/55 px-3 py-1.5 text-xs font-semibold text-ink/75 transition-colors hover:border-magenta/30 hover:bg-white hover:text-magenta-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
                >
                  {t.categories[value]}
                </button>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 sm:mt-9">
              <button
                type="button"
                onClick={scrollToProducts}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-magenta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
              >
                {h.seeProducts}
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-ink/75 transition-colors hover:bg-white/70 hover:text-magenta-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
              >
                <Store className="h-4 w-4" />
                {t.navSellers}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Why buy here */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {h.benefits.map((benefit, index) => {
            const { icon: Icon, tile } = BENEFIT_LOOK[index] || BENEFIT_LOOK[0];
            return (
              <li
                key={benefit.title}
                className="group flex animate-fade-up items-start gap-3 rounded-2xl border border-ink/5 bg-white/85 p-4 shadow-sm transition-shadow hover:shadow-md sm:rounded-[22px] sm:p-5"
                style={{ animationDelay: `${650 + index * 100}ms` }}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${tile}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{benefit.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{benefit.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Community in numbers and seller spotlight */}
      <HomeImpact />

      {/* Categories */}
      <section className="relative isolate mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6">
        <DotGrid className="absolute left-4 top-10 -z-10 hidden w-24 text-saffron/40 md:block" rows={4} cols={6} />
        <DotGrid className="absolute bottom-8 right-4 -z-10 hidden w-24 text-magenta/30 md:block" />
        <Sparkle className="pointer-events-none absolute right-[22%] top-14 hidden h-5 w-5 animate-twinkle text-turmeric md:block" />
        <SectionTitle title={h.categoriesTitle} sub={h.categoriesSub} />
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {CATEGORIES.map((value, index) => {
            const { icon: Icon, tile } = CATEGORY_LOOK[value] || DEFAULT_LOOK;
            const active = category === value;
            const count = products.filter((product) => product.category === value).length;
            return (
              <Reveal key={value} animation="zoom-in" delay={index * 80} className="grid">
                <button
                  type="button"
                  onClick={() => chooseCategory(value)}
                  aria-pressed={active}
                  className={`group flex h-full flex-col items-center rounded-[22px] border border-ink/5 bg-white/80 p-4 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg sm:rounded-[26px] sm:p-5 ${
                    active ? 'ring-2 ring-ink' : ''
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 sm:h-14 sm:w-14 ${tile}`}
                  >
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="mt-3 text-sm font-bold text-ink">{t.categories[value]}</span>
                  {!loading && (
                    <span className="mt-0.5 text-xs text-ink/55">
                      {count} {t.productsCount}
                    </span>
                  )}
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* White lower half of the page */}
      <div className="rounded-t-[48px] bg-white">
        {/* Products */}
        <main id="products" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{t.productsTitle}</h2>
              <Squiggle className="mt-1 h-3 w-36" />
              <p className="mt-2 text-sm text-ink/60 sm:text-base">{t.productsSub}</p>
            </div>
            {!loading && (
              <p className="text-sm font-medium text-ink/55">
                {visibleProducts.length} {t.productsCount}
              </p>
            )}
          </Reveal>

          <div id="categories" className="no-scrollbar -mx-4 mt-6 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {['all', ...CATEGORIES].map((value) => {
              const active = category === value;
              const Icon = value === 'all' ? Sparkles : (CATEGORY_LOOK[value] || DEFAULT_LOOK).icon;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  aria-pressed={active}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                    active ? 'bg-ink text-white' : 'bg-sand/70 text-ink/80 hover:bg-turmeric/40 hover:text-ink'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {value === 'all' ? t.allCategories : t.categories[value]}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product, index) => (
                <Reveal key={product.id} delay={(index % 4) * 80} className="grid">
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="mt-8 animate-fade-up rounded-[28px] border border-dashed border-ink/15 bg-cream px-6 py-16 text-center">
              <PackageSearch className="mx-auto h-12 w-12 text-ink/25" />
              <p className="mt-4 font-bold text-ink">{t.noResults}</p>
              <p className="mt-1 text-sm text-ink/55">{t.noResultsSub}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="btn-shine mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta"
              >
                {t.clearFilters}
              </button>
            </div>
          )}
        </main>

        {/* How to buy */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <SectionTitle title={t.customer.howTitle} sub={h.howSub} />
          <div className="relative mt-12">
            <Reveal aria-hidden="true" className="absolute inset-x-[16%] top-16 hidden md:block">
              <span className="grow-line block border-t-[3px] border-dashed border-magenta/50" />
            </Reveal>
          <ol className="relative grid gap-6 md:grid-cols-3">
            {t.customer.howSteps.map((step, index) => {
              const { icon: Icon, tile } = STEP_LOOK[index] || STEP_LOOK[0];
              return (
                <Reveal
                  as="li"
                  key={step}
                  delay={index * 150}
                  className="flex flex-col items-center rounded-[28px] bg-cream px-6 py-8 text-center ring-1 ring-ink/5"
                >
                  <span
                    className={`relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 hover:-translate-y-1 hover:rotate-3 ${tile}`}
                  >
                    <Icon className="h-7 w-7" />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-turmeric text-xs font-extrabold text-ink ring-4 ring-cream">
                      {index + 1}
                    </span>
                  </span>
                  <p className="mt-5 max-w-xs text-sm font-semibold text-ink sm:text-base">{step}</p>
                </Reveal>
              );
            })}
          </ol>
          </div>
        </section>

        {/* Invite sellers */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
          <Reveal
            animation="zoom-in"
            className="relative isolate overflow-hidden rounded-[40px] bg-linear-to-br from-magenta-dark via-magenta to-saffron px-6 py-10 text-white shadow-2xl shadow-magenta/20 sm:px-12 sm:py-14"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 -z-10 h-64 w-64 animate-float rounded-full bg-turmeric/40 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 h-56 w-56 animate-float rounded-full bg-ink/25 blur-3xl [animation-delay:-3s]" />
            <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
            <Lotus color="white" className="pointer-events-none absolute -bottom-3 left-[48%] -z-10 hidden w-44 opacity-35 lg:block" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 -z-10 h-40 w-40 animate-spin-slow rounded-full border-2 border-dashed border-white/25" />
            <Sparkle className="pointer-events-none absolute right-[30%] top-6 -z-10 h-5 w-5 animate-twinkle text-white/80" />
            <Sparkle className="pointer-events-none absolute bottom-8 right-10 -z-10 h-4 w-4 animate-twinkle text-turmeric [animation-delay:-1.5s]" />

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <Reveal animation="fade-right" delay={150} className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25">
                  <Store className="h-3.5 w-3.5" />
                  {t.navSellers}
                </span>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{h.sellerTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">{h.sellerText}</p>
              </Reveal>
              <Reveal animation="fade-left" delay={250} className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/register"
                  className="btn-shine group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink shadow-lg transition-colors duration-200 hover:bg-turmeric"
                >
                  {t.register.submit}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/support#seller-guide"
                  className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors duration-200 hover:bg-white/10"
                >
                  <BookOpen className="h-4 w-4" />
                  {h.guideBtn}
                </Link>
              </Reveal>
            </div>
          </Reveal>
        </section>

        <HomeFaq h={h} />

        {/* E-Learning banner */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6">
          <Reveal className="relative isolate overflow-hidden rounded-[40px] bg-ink px-6 py-10 text-white shadow-2xl shadow-ink/20 sm:px-12">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-64 w-64 rounded-full bg-magenta/50 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-10 -z-10 h-64 w-64 rounded-full bg-saffron/40 blur-3xl" />
            <DotGrid className="pointer-events-none absolute right-6 top-6 -z-10 hidden w-24 text-white/15 md:block" rows={4} cols={6} />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-1/3 -z-10 h-44 w-44 animate-spin-slow rounded-full border-2 border-dashed border-turmeric/30" />
            <Sparkle className="pointer-events-none absolute left-[45%] top-8 -z-10 h-5 w-5 animate-twinkle text-turmeric" />

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <Reveal animation="fade-right" delay={150} className="max-w-2xl">
                <span className="inline-block rounded-full bg-turmeric px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink">
                  {t.learnTag}
                </span>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{t.learnTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{t.learnSub}</p>
                <Link
                  href="/e-learning"
                  className="btn-shine group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors duration-200 hover:bg-turmeric"
                >
                  {t.exploreElearn}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>

              <Reveal as="ul" animation="fade-left" delay={250} className="flex gap-6 sm:gap-8">
                {learnTopics.map(({ icon: Icon, label }) => (
                  <li key={label} className="group flex w-20 flex-col items-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-turmeric ring-1 ring-white/15 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-6">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="mt-2 text-xs font-semibold leading-tight">{label}</span>
                  </li>
                ))}
              </Reveal>
            </div>
          </Reveal>
        </section>
      </div>
    </>
  );
}
