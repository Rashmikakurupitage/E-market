'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search, ArrowRight, Megaphone, HandCoins, Laptop, PackageSearch, ChevronDown, ShieldCheck, HandHeart, MapPin,
  Scissors, Shirt, Sprout, Soup, Sparkles, PackageCheck, Store, BookOpen, Tag,
} from 'lucide-react';
import API from '../src/lib/api';
import { useLanguage } from '../src/lib/i18n';
import { CATEGORIES, SAMPLE_PRODUCTS, getSeller } from '../src/lib/catalog';
import ProductCard from '../src/components/ProductCard';
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
        if (!ignore && Array.isArray(fetched) && fetched.length > 0) {
          setProducts(fetched);
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
      <section className="relative isolate">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-12">
          {/* Text and search */}
          <div className="relative lg:col-span-7">
            <Sparkle className="pointer-events-none absolute -top-2 right-[18%] hidden h-7 w-7 animate-twinkle text-turmeric sm:block" />
            <Sparkle className="pointer-events-none absolute right-[6%] top-40 hidden h-4 w-4 animate-twinkle text-magenta/70 [animation-delay:-1.2s] sm:block" />
            <p className="glass inline-flex animate-fade-up items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-ink/80 sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-saffron opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-saffron" />
              </span>
              {h.badge}
            </p>

            <HeroTitle />

            <p className="mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-ink/70 [animation-delay:240ms] sm:text-lg">
              {t.heroSub}
            </p>

            <form
              onSubmit={handleSearch}
              role="search"
              className="glass mt-8 flex max-w-xl animate-fade-up items-center gap-2 rounded-full p-1.5 transition-shadow duration-300 [animation-delay:360ms] focus-within:ring-4 focus-within:ring-turmeric/40"
            >
              <label htmlFor="product-search" className="sr-only">
                {t.searchBtn}
              </label>
              <Search className="ml-3 hidden h-5 w-5 shrink-0 text-ink/45 sm:block" aria-hidden="true" />
              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-ink placeholder:text-ink/45 focus:outline-none sm:text-base"
              />
              <button
                type="submit"
                aria-label={t.searchBtn}
                className="btn-shine flex h-11 shrink-0 items-center gap-2 rounded-full bg-magenta px-5 text-white shadow-lg shadow-magenta/30 transition-colors duration-200 hover:bg-magenta-dark active:scale-95"
              >
                <Search className="h-5 w-5 sm:hidden" />
                <span className="hidden text-sm font-semibold sm:inline">{t.searchBtn}</span>
              </button>
            </form>

            {/* Quick category buttons */}
            <div className="mt-5 flex animate-fade-up flex-wrap items-center gap-2 [animation-delay:480ms]">
              <span className="text-xs font-semibold text-ink/60">{h.popular}</span>
              {CATEGORIES.slice(0, 3).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => chooseCategory(value)}
                  className="glass rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink/80 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-ink"
                >
                  {t.categories[value]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={scrollToProducts}
              className="btn-shine group mt-8 hidden animate-fade-up items-center gap-2 rounded-full bg-ink py-2 pl-6 pr-2 text-sm font-semibold text-white shadow-xl shadow-ink/20 transition-colors duration-200 [animation-delay:600ms] hover:bg-magenta sm:inline-flex"
            >
              {h.seeProducts}
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <ChevronDown className="h-4 w-4 animate-bounce-soft" />
              </span>
            </button>
          </div>

          {/* Photo */}
          <div className="relative mx-auto w-full max-w-md animate-zoom-in [animation-delay:200ms] lg:col-span-5 lg:max-w-none">
            <div aria-hidden="true" className="absolute -right-6 -top-6 -z-10 h-[88%] w-[88%] animate-morph bg-linear-to-br from-magenta/25 via-saffron/20 to-turmeric/35" />
            <DotGrid className="absolute -left-10 top-16 -z-10 hidden w-24 text-magenta/35 sm:block" />
            <div aria-hidden="true" className="absolute -bottom-10 right-4 -z-10 h-28 w-28 animate-spin-slow rounded-full border-2 border-dashed border-saffron/60" />
            <Sparkle className="absolute -right-4 top-8 h-8 w-8 animate-twinkle text-turmeric [animation-delay:-0.6s] sm:-right-8" />
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[48px_160px_48px_160px] shadow-2xl shadow-magenta/20 ring-8 ring-white/60 sm:rounded-[48px_200px_48px_200px]">
              <Image
                src="/hero_main.jpg"
                alt=""
                fill
                preload
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover object-[50%_40%]"
              />
            </div>
            <div className="absolute -bottom-8 -left-2 h-28 w-28 animate-bob overflow-hidden rounded-full border-[6px] border-cream shadow-xl sm:-left-12 sm:h-40 sm:w-40">
              <Image src="/artisan_carver.jpg" alt="" fill sizes="160px" className="scale-125 object-cover object-[56%_38%]" />
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
                className="glass group flex animate-fade-up items-start gap-3 rounded-[28px] p-5"
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

      {/* Categories */}
      <section className="relative isolate mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6">
        <DotGrid className="absolute left-4 top-10 -z-10 hidden w-24 text-saffron/40 md:block" rows={4} cols={6} />
        <DotGrid className="absolute bottom-8 right-4 -z-10 hidden w-24 text-magenta/30 md:block" />
        <Sparkle className="pointer-events-none absolute right-[22%] top-14 hidden h-5 w-5 animate-twinkle text-turmeric md:block" />
        <SectionTitle title={h.categoriesTitle} sub={h.categoriesSub} />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
                  className={`glass group flex flex-col items-center rounded-[28px] p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/90 ${
                    active ? 'ring-2 ring-ink' : ''
                  }`}
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${tile}`}
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
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
