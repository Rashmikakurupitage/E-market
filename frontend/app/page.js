'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Megaphone, HandCoins, Laptop, PackageSearch } from 'lucide-react';
import API from '../src/lib/api';
import { useLanguage } from '../src/lib/i18n';
import { CATEGORIES, HERO_IMAGE, SAMPLE_PRODUCTS, getSeller } from '../src/lib/catalog';
import ProductCard from '../src/components/ProductCard';

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="aspect-[5/4] animate-pulse bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function Home() {
  const { t } = useLanguage();
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

  const handleSearch = (e) => {
    e.preventDefault();
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
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
      <section className="relative isolate overflow-hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-slate-950/75 via-slate-950/60 to-slate-950/80" />

        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-5xl">{t.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">{t.heroSub}</p>

          <form
            onSubmit={handleSearch}
            role="search"
            className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-black/5"
          >
            <label htmlFor="product-search" className="sr-only">
              {t.searchBtn}
            </label>
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none sm:text-base"
            />
            <button
              type="submit"
              aria-label={t.searchBtn}
              className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-brand-800 px-4 text-white transition-colors hover:bg-brand-900"
            >
              <Search className="h-5 w-5" />
              <span className="hidden text-sm font-semibold sm:inline">{t.searchBtn}</span>
            </button>
          </form>
          <p className="mt-3 text-xs text-white/70">නිෂ්පාදන සොයන්න... / தயாரிப்புகளைத் தேடுங்கள்... / Search products...</p>
        </div>
      </section>

      {/* Products */}
      <main id="products" className="mx-auto w-full max-w-7xl px-4 py-12">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">{t.productsTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{t.productsSub}</p>
          </div>
          {!loading && (
            <p className="text-sm font-medium text-slate-500">
              {visibleProducts.length} {t.productsCount}
            </p>
          )}
        </div>

        <div id="categories" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1">
          {['all', ...CATEGORIES].map((value) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-brand-700 text-white shadow'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                {value === 'all' ? t.allCategories : t.categories[value]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : visibleProducts.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 font-bold text-slate-800">{t.noResults}</p>
            <p className="mt-1 text-sm text-slate-500">{t.noResultsSub}</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {t.clearFilters}
            </button>
          </div>
        )}
      </main>

      {/* E-Learning banner */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-brand-700 px-6 py-8 text-white shadow-xl sm:px-10 sm:py-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-48 h-56 w-56 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-900">
                {t.learnTag}
              </span>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{t.learnTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">{t.learnSub}</p>
              <Link
                href="/e-learning"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-brand-800 shadow transition-colors hover:bg-brand-50"
              >
                {t.exploreElearn}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ul className="flex gap-6 sm:gap-8">
              {learnTopics.map(({ icon: Icon, label }) => (
                <li key={label} className="flex w-20 flex-col items-center text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-brand-700 shadow-lg">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="mt-2 text-xs font-semibold leading-tight">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
