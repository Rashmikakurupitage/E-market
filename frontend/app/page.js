'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, Megaphone, HandCoins, Laptop, PackageSearch, ChevronDown, ShieldCheck, HandHeart, MapPin,
  Palette, Layers, Wheat, CookingPot, Flower2, Sparkles, PackageCheck, Store, BookOpen, Tag, Plus, CircleHelp,
  GraduationCap, Flame, SlidersHorizontal, ChevronUp,
  X, History
} from 'lucide-react';
import API from '../src/lib/api';
import { useLanguage, fill } from '../src/lib/i18n';
import { CATEGORIES, SAMPLE_PRODUCTS, getSeller, withSampleProducts } from '../src/lib/catalog';
import ProductCard from '../src/components/ProductCard';
import SearchAutocomplete from '../src/components/SearchAutocomplete';
import HomeImpact from '../src/components/HomeImpact';
import HeroCategoryVideo from '../src/components/HeroCategoryVideo';
import WhatsAppIcon from '../src/components/WhatsAppIcon';
import Reveal from '../src/components/Reveal';
import { Lotus, Sparkle, DotGrid, Squiggle } from '../src/components/Art';
import { useRecentProducts } from '../src/lib/recentProducts';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
  'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];


// Advance standard category styling with rich dual-tone gradients & professional iconography
const CATEGORY_LOOK = {
  Handicrafts: {
    icon: Palette,
    tile: 'bg-gradient-to-br from-rose-50 to-pink-100/70 text-rose-600 ring-1 ring-rose-200/80 shadow-2xs',
    hoverTile: 'group-hover:bg-gradient-to-br group-hover:from-rose-500 group-hover:to-rose-600 group-hover:text-white group-hover:ring-rose-400 group-hover:shadow-md group-hover:shadow-rose-500/25',
    activeTile: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white ring-2 ring-rose-300 shadow-md shadow-rose-500/25',
    hoverCard: 'hover:border-rose-300/80 hover:shadow-xl hover:shadow-rose-500/10',
    activeCard: 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20 shadow-md',
    hoverText: 'group-hover:text-rose-700',
    badge: 'bg-rose-50 text-rose-700',
  },
  Textiles: {
    icon: Layers,
    tile: 'bg-gradient-to-br from-indigo-50 to-blue-100/70 text-indigo-600 ring-1 ring-indigo-200/80 shadow-2xs',
    hoverTile: 'group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-indigo-600 group-hover:text-white group-hover:ring-indigo-400 group-hover:shadow-md group-hover:shadow-indigo-500/25',
    activeTile: 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-2 ring-indigo-300 shadow-md shadow-indigo-500/25',
    hoverCard: 'hover:border-indigo-300/80 hover:shadow-xl hover:shadow-indigo-500/10',
    activeCard: 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-md',
    hoverText: 'group-hover:text-indigo-700',
    badge: 'bg-indigo-50 text-indigo-700',
  },
  'Agri-Products': {
    icon: Wheat,
    tile: 'bg-gradient-to-br from-emerald-50 to-teal-100/70 text-emerald-700 ring-1 ring-emerald-200/80 shadow-2xs',
    hoverTile: 'group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-emerald-600 group-hover:text-white group-hover:ring-emerald-400 group-hover:shadow-md group-hover:shadow-emerald-500/25',
    activeTile: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-2 ring-emerald-300 shadow-md shadow-emerald-500/25',
    hoverCard: 'hover:border-emerald-300/80 hover:shadow-xl hover:shadow-emerald-500/10',
    activeCard: 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-md',
    hoverText: 'group-hover:text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700',
  },
  'Food & Spices': {
    icon: CookingPot,
    tile: 'bg-gradient-to-br from-amber-50 to-orange-100/70 text-amber-700 ring-1 ring-amber-200/80 shadow-2xs',
    hoverTile: 'group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-amber-600 group-hover:text-white group-hover:ring-amber-400 group-hover:shadow-md group-hover:shadow-amber-500/25',
    activeTile: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white ring-2 ring-amber-300 shadow-md shadow-amber-500/25',
    hoverCard: 'hover:border-amber-300/80 hover:shadow-xl hover:shadow-amber-500/10',
    activeCard: 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20 shadow-md',
    hoverText: 'group-hover:text-amber-800',
    badge: 'bg-amber-50 text-amber-800',
  },
  'Beauty & Personal Care': {
    icon: Flower2,
    tile: 'bg-gradient-to-br from-purple-50 to-fuchsia-100/70 text-purple-700 ring-1 ring-purple-200/80 shadow-2xs',
    hoverTile: 'group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-purple-600 group-hover:text-white group-hover:ring-purple-400 group-hover:shadow-md group-hover:shadow-purple-500/25',
    activeTile: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white ring-2 ring-purple-300 shadow-md shadow-purple-500/25',
    hoverCard: 'hover:border-purple-300/80 hover:shadow-xl hover:shadow-purple-500/10',
    activeCard: 'border-purple-500 bg-purple-50/40 ring-2 ring-purple-500/20 shadow-md',
    hoverText: 'group-hover:text-purple-800',
    badge: 'bg-purple-50 text-purple-700',
  },
};
const DEFAULT_LOOK = {
  icon: Tag,
  tile: 'bg-slate-50 text-slate-700 ring-1 ring-slate-200',
  hoverTile: 'group-hover:bg-slate-700 group-hover:text-white group-hover:ring-slate-700',
  activeTile: 'bg-slate-700 text-white ring-1 ring-slate-700',
  hoverCard: 'hover:border-slate-300 hover:shadow-slate-100/60',
  activeCard: 'border-slate-600 bg-slate-50/50 ring-2 ring-slate-500/25 shadow-xs',
  hoverText: 'group-hover:text-slate-900',
  badge: 'bg-slate-50 text-slate-700',
};

const CATEGORY_IMAGE = {
  Handicrafts: '/wallpapers/basketry.jpg',
  Textiles: '/wallpapers/collage-violet.jpg',
  'Agri-Products': '/wallpapers/tea-pickers.jpg',
  'Food & Spices': '/wallpapers/spices.jpg',
  'Beauty & Personal Care': '/wallpapers/collage-green.jpg',
};

const HERO_CATEGORY_VIDEO = {
  Handicrafts: '/videos/hero-handicrafts.mp4',
  Textiles: '/videos/hero-textiles.mp4',
  'Agri-Products': '/videos/hero-agri.mp4',
  'Food & Spices': '/videos/hero-food-spices.mp4',
  'Beauty & Personal Care': '/videos/hero-beauty.mp4',
};

const BENEFIT_LOOK = [
  { icon: ShieldCheck, tile: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200' },
  { icon: WhatsAppIcon, tile: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  { icon: HandHeart, tile: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
  { icon: MapPin, tile: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
];

const STEP_LOOK = [
  { icon: Search, tile: 'bg-slate-900 text-white shadow-slate-900/15' },
  { icon: WhatsAppIcon, tile: 'bg-emerald-600 text-white shadow-emerald-600/15' },
  { icon: PackageCheck, tile: 'bg-magenta text-white shadow-magenta/15' },
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
            <li key={item.q} className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:border-slate-300">
              <h3>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold text-slate-900 sm:text-base hover:bg-slate-50/70 transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <CircleHelp className="h-5 w-5 shrink-0 text-magenta" />
                    {item.q}
                  </span>
                  <Plus className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-45 text-magenta' : ''}`} />
                </button>
              </h3>
              <div className={`grid transition-all duration-300 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <p className="overflow-hidden px-5 text-sm leading-relaxed text-slate-600 sm:pl-13">
                  <span className={`block ${open ? 'pb-5' : ''}`}>{item.a}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-6 text-center">
        <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-bold text-magenta hover:text-magenta-dark hover:underline">
          {h.hxFaqMore}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </p>
    </section>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs">
      <div className="skeleton aspect-square rounded-xl" />
      <div className="space-y-3 px-2 pb-1 pt-4">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
        <div className="skeleton h-10 w-full rounded-full" />
      </div>
    </div>
  );
}

function SectionTitle({ title, sub, badge }) {
  return (
    <Reveal className="text-center">
      {badge && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-magenta ring-1 ring-magenta/20 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          {badge}
        </span>
      )}
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
      <Squiggle className="mx-auto mt-2 h-3 w-32 text-magenta/40" />
      {sub && <p className="mt-3 text-sm text-slate-600 sm:text-base max-w-2xl mx-auto">{sub}</p>}
    </Reveal>
  );
}

// The hero title with one word in the signature brand magenta
function HeroTitle({ overVideo = false }) {
  const { t, lang } = useLanguage();
  const title = t.heroTitle;
  const word = t.home.heroHighlight;
  const at = word ? title.indexOf(word) : -1;
  const size =
    lang === 'en'
      ? 'text-[2.6rem] leading-[1.05] sm:text-6xl xl:text-7xl'
      : 'text-[2rem] leading-[1.3] sm:text-5xl sm:leading-[1.25] xl:text-[3.5rem]';

  return (
    <h1 className={`mt-6 animate-fade-up font-extrabold tracking-tight [animation-delay:120ms] ${overVideo ? 'text-white drop-shadow-lg' : 'text-slate-900'} ${size}`}>
      {at < 0 ? (
        title
      ) : (
        <>
          {title.slice(0, at)}
          <span className="draw-now relative inline-block">
            <span className={`text-magenta ${lang === 'en' ? 'pr-2 italic' : ''}`}>{word}</span>
            <Squiggle className="absolute -bottom-1 left-0 h-3 w-full text-magenta/40 sm:h-4" />
          </span>
          {title.slice(at + word.length)}
        </>
      )}
    </h1>
  );
}

export default function Home() {
  const { t, lang } = useLanguage();
  const h = t.home;
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [category, setCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const recentIds = useRecentProducts();

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

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const query = search.trim().toLowerCase();

  // Dynamic category and deals counts for fast user visual discovery
  const categoryCounts = useMemo(() => {
    const counts = { all: products.length };
    CATEGORIES.forEach((cat) => {
      counts[cat] = products.filter((p) => p.category === cat).length;
    });
    counts.deals = products.filter((p) => (p.discountPercent || p.discount?.percent || 0) > 0).length;
    return counts;
  }, [products]);

  // Filtered and sorted products
  const visibleProducts = useMemo(() => {
    let list = products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (onlyDeals) {
        const hasDiscount = (product.discountPercent || product.discount?.percent || 0) > 0;
        if (!hasDiscount) return false;
      }
      if (selectedDistrict !== 'all') {
        const s = getSeller(product);
        if (s.district?.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      }
      if (!query) return true;
      const seller = getSeller(product);
      return [product.title, product.description, product.category, seller.businessName, seller.district, ...(Array.isArray(product.tags) ? product.tags : [])].some(
        (value) => value?.toLowerCase().includes(query)
      );
    });

    if (sortBy === 'rating') {
      list = [...list].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === 'newest') {
      list = [...list].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return list;
  }, [products, category, onlyDeals, selectedDistrict, query, sortBy]);

  // Products with active discounts for Flash Deals section
  const dealsProducts = useMemo(() => {
    return products.filter((p) => (p.discountPercent || p.discount?.percent || 0) > 0).slice(0, 4);
  }, [products]);
  const recentlyViewedProducts = useMemo(
    () => recentIds.map((id) => products.find((product) => String(product.id) === id)).filter(Boolean).slice(0, 4),
    [recentIds, products]
  );

  const scrollToProducts = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });

  const handleSearch = (e) => {
    e.preventDefault();
    setCategory(searchCategory);
    setOnlyDeals(false);
    scrollToProducts();
  };

  const chooseCategory = (value) => {
    setCategory(value);
    setOnlyDeals(false);
    scrollToProducts();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setSelectedDistrict('all');
    setSortBy('featured');
    setOnlyDeals(false);
  };

  const learnTopics = [
    { icon: Megaphone, label: t.marketing },
    { icon: HandCoins, label: t.finance },
    { icon: Laptop, label: t.digitalLiteracy },
  ];
  const heroVideoClips = CATEGORIES.map((category) => ({
    src: HERO_CATEGORY_VIDEO[category],
    label: t.categories[category] || category,
    category,
  }));

  return (
    <>
      {/* Full-bleed category video with the main message layered over it. */}
      <section className="relative z-20 isolate overflow-visible bg-white">
        <HeroCategoryVideo
          className="h-[500px] rounded-none shadow-none ring-0 sm:h-[540px] lg:h-[520px]"
          clips={heroVideoClips}
          playLabel={h.makerVideoPlay}
          pauseLabel={h.makerVideoPause}
          nextLabel={h.makerVideoNext}
          mutedLabel={h.makerVideoMuted}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-slate-950/80 via-slate-950/55 to-slate-950/15" />
          <div className="relative z-[2] mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-12 lg:pt-16">
            <p className="inline-flex max-w-full animate-fade-up items-center gap-2 rounded-full border border-white/25 bg-slate-950/40 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-sm sm:text-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-magenta opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-magenta" />
              </span>
              {h.badge}
            </p>

            <div className="max-w-5xl">
              <HeroTitle overVideo />
              <p className="mt-5 max-w-3xl animate-fade-up text-sm leading-relaxed text-white/90 drop-shadow [animation-delay:240ms] sm:text-lg">
                {t.heroSub}
              </p>
            </div>
          </div>
        </HeroCategoryVideo>

        <div className="relative z-40 mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-6 sm:pt-6">
          {/* Search sits directly beneath the full-width video. */}
          <form
            onSubmit={handleSearch}
            role="search"
            className="relative z-40 mx-auto flex max-w-4xl animate-fade-up flex-col items-stretch gap-1.5 rounded-2xl border border-slate-300/80 bg-white p-2 shadow-md shadow-slate-900/5 transition-all duration-300 sm:flex-row sm:items-center sm:rounded-full [animation-delay:360ms] focus-within:border-magenta focus-within:ring-4 focus-within:ring-magenta/15"
          >
            <div className="relative shrink-0 border-b border-slate-200 px-3 pb-2 sm:border-b-0 sm:border-r sm:pb-0">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="w-full cursor-pointer bg-transparent pr-4 text-xs font-bold text-slate-700 outline-none hover:text-slate-900 sm:w-auto"
                aria-label={h.searchAllCategories}
              >
                <option value="all">{h.searchAllCategories}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{t.categories[cat] || cat}</option>
                ))}
              </select>
            </div>

            <div className="relative flex min-w-0 flex-1 items-center gap-2 px-2 sm:px-0">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <SearchAutocomplete
                id="product-search"
                value={search}
                products={products}
                onChange={setSearch}
                onSelect={() => {
                  if (searchCategory !== 'all') setCategory(searchCategory);
                  else setCategory('all');
                  setOnlyDeals(false);
                  scrollToProducts();
                }}
                placeholder={t.searchPlaceholder}
                ariaLabel={t.searchPlaceholder}
                clearLabel={t.clearSearch}
                className="w-full min-w-0 bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              aria-label={t.searchBtn}
              className="btn-shine flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-magenta px-6 text-sm font-bold text-white shadow-md shadow-magenta/25 transition-all duration-200 hover:bg-magenta-dark active:scale-95 sm:w-auto sm:rounded-full"
            >
              <Search className="h-4 w-4" />
              <span>{t.searchBtn}</span>
            </button>
          </form>

          {h.quickTags?.length > 0 && !search.trim() && (
            <div className="mt-4 flex flex-wrap items-center gap-2 animate-fade-up [animation-delay:440ms]">
              <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{h.quickSearchLabel}</span>
              {h.quickTags.slice(0, 5).map((tag, index) => (
                <button
                  key={tag.label}
                  type="button"
                  onClick={() => {
                    setSearch(tag.query);
                    setSearchCategory('all');
                    setCategory('all');
                    setOnlyDeals(false);
                    scrollToProducts();
                  }}
                  style={{ animationDelay: `${440 + index * 55}ms` }}
                  className="animate-fade-up rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-magenta/40 hover:bg-white hover:text-magenta hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta"
                >
                  {tag.label}
                </button>
              ))}
            </div>
          )}

          <div className="mt-6 flex animate-fade-up flex-col items-stretch gap-3 sm:flex-row sm:items-center [animation-delay:550ms]">
            <button
              type="button"
              onClick={scrollToProducts}
              className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-6 py-3 text-sm font-bold text-white shadow-md shadow-magenta/20 transition-all hover:bg-magenta-dark active:scale-95"
            >
              <span>{h.heroCtaShop}</span>
              <ChevronDown className="h-4 w-4 animate-bounce-soft" />
            </button>

            <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-2xs transition-all hover:border-slate-400 hover:bg-slate-50">
              <Store className="h-4 w-4 text-magenta" />
              <span>{h.heroCtaSell}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Standard Marketplace Benefits / Trust Strip */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-6 sm:px-6">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {h.benefits.map((benefit, index) => {
            const { icon: Icon, tile } = BENEFIT_LOOK[index] || BENEFIT_LOOK[0];
            return (
              <li
                key={benefit.title}
                className="group flex animate-fade-up items-start gap-3.5 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                style={{ animationDelay: `${650 + index * 100}ms` }}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${tile}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{benefit.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{benefit.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4. Deals & Special Offers Spotlight (When products have discounts) */}
      {dealsProducts.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-rose-50/80 via-white to-rose-50/50 p-6 sm:p-8 border border-rose-200 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                  <Flame className="h-3.5 w-3.5 fill-white text-white" />
                  {h.dealsBadge}
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{h.dealsTitle}</h2>
                <p className="mt-1 text-xs font-medium text-slate-600 sm:text-sm">{h.dealsSub}</p>
              </div>
              <Link
                href="/store"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 hover:underline"
              >
                <span>{h.seeProducts}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {dealsProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {recentlyViewedProducts.length > 0 && (
        <section aria-labelledby="recently-viewed-title" className="mx-auto w-full max-w-7xl px-4 pb-12 pt-2 sm:px-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-magenta">
                <History className="h-3.5 w-3.5" /> {h.recentlyViewedEyebrow || 'Your browsing trail'}
              </span>
              <h2 id="recently-viewed-title" className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {h.recentlyViewedTitle || 'Pick up where you left off'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{h.recentlyViewedSub || 'Your recent finds stay close while you explore.'}</p>
            </div>
            <Link href="/store" className="inline-flex items-center gap-2 text-sm font-bold text-magenta transition hover:text-magenta-dark">
              {h.viewStoreCta}<ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {recentlyViewedProducts.map((product) => <ProductCard key={`recent-${product.id}`} product={product} />)}
          </div>
        </section>
      )}

      {/* 5. Community in Numbers and Impact */}
      <HomeImpact />

      {/* 6. Shop by Category */}
      <section className="relative isolate mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6">
        <DotGrid className="absolute left-4 top-10 -z-10 hidden w-24 text-slate-300 md:block" rows={4} cols={6} />
        <DotGrid className="absolute bottom-8 right-4 -z-10 hidden w-24 text-slate-300 md:block" />
        <Sparkle className="pointer-events-none absolute right-[22%] top-14 hidden h-5 w-5 animate-twinkle text-magenta/40 md:block" />
        
        <SectionTitle title={h.categoriesTitle} sub={h.categoriesSub} />
        
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((value, index) => {
            const Icon = (CATEGORY_LOOK[value] || DEFAULT_LOOK).icon;
            const active = category === value;
            const count = products.filter((product) => product.category === value).length;
            return (
              <Reveal key={value} animation="zoom-in" delay={index * 80} className="grid">
                <button
                  type="button"
                  onClick={() => chooseCategory(value)}
                  aria-pressed={active}
                  className={`group relative flex min-h-44 flex-col justify-end overflow-hidden rounded-[1.6rem] border text-left shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta sm:min-h-52 ${active ? 'border-magenta ring-2 ring-magenta/30 shadow-lg shadow-magenta/15' : 'border-white/70 hover:border-white'}`}
                >
                  <img
                    src={CATEGORY_IMAGE[value]}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/5 transition-colors group-hover:from-slate-950/90" />
                  <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/30 bg-white/90 text-magenta shadow-md backdrop-blur-sm">
                    <Icon className="h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
                  </span>
                  <span className="relative flex items-end justify-between gap-2 p-4 sm:p-5">
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold leading-tight text-white sm:text-base">{t.categories[value]}</span>
                      {!loading && <span className="mt-1 block text-[11px] font-medium text-white/75">{count} {t.productsCount}</span>}
                    </span>
                    <ArrowRight className="mb-0.5 h-4 w-4 shrink-0 text-white/90 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 9. Lower Half: Main Product Catalog */}
      <div className="rounded-t-[48px] bg-slate-50/70 border-t border-slate-200">
        <main id="products" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-magenta">
                <Sparkles className="h-3.5 w-3.5" />
                {h.featuredPicks || 'Curated Artisan Creations'}
              </span>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t.productsTitle}</h2>
              <Squiggle className="mt-1 h-3 w-36 text-magenta/40" />
              <p className="mt-2 text-sm text-slate-600 sm:text-base">{t.productsSub}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/store"
                className="btn-shine group inline-flex items-center gap-2 rounded-full border border-magenta/30 bg-magenta/5 px-4 py-2.5 text-xs font-bold text-magenta transition-all hover:bg-magenta hover:text-white sm:text-sm"
              >
                <span>{h.viewStoreCta}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          {/* Standard Product Controls Toolbar */}
          <div className="mt-8 rounded-2xl bg-white border border-slate-200/90 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Category Pills with Dynamic Counts */}
              <div className="no-scrollbar flex flex-wrap items-center gap-2">
                {['all', ...CATEGORIES].map((value) => {
                  const active = category === value && !onlyDeals;
                  const Icon = value === 'all' ? Sparkles : (CATEGORY_LOOK[value] || DEFAULT_LOOK).icon;
                  const count = categoryCounts[value] || 0;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setCategory(value);
                        setOnlyDeals(false);
                      }}
                      aria-pressed={active}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                        active
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 shadow-2xs'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-amber-300' : 'text-slate-500'}`} />
                      <span>{value === 'all' ? t.allCategories : t.categories[value]}</span>
                      <span
                        className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}

                {/* Deals / Discount Filter Pill */}
                {categoryCounts.deals > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOnlyDeals(!onlyDeals);
                      if (!onlyDeals) setCategory('all');
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                      onlyDeals
                        ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/30 ring-2 ring-rose-400'
                        : 'border border-rose-200 bg-rose-50/80 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <Flame className={`h-3.5 w-3.5 ${onlyDeals ? 'text-white' : 'text-rose-600'}`} />
                    <span>{h.dealsBadge || 'Deals'}</span>
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        onlyDeals ? 'bg-white/25 text-white' : 'bg-rose-200 text-rose-800'
                      }`}
                    >
                      {categoryCounts.deals}
                    </span>
                  </button>
                )}
              </div>

              {/* District & Sort Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* District Filter */}
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer text-xs font-medium text-slate-800"
                    aria-label={h.filterDistrict}
                  >
                    <option value="all">{h.allDistricts}</option>
                    {SRI_LANKA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent outline-none cursor-pointer text-xs font-medium text-slate-800"
                    aria-label={h.sortBy}
                  >
                    <option value="featured">{h.sortFeatured}</option>
                    <option value="rating">{h.sortRating}</option>
                    <option value="price-asc">{h.sortPriceLow}</option>
                    <option value="price-desc">{h.sortPriceHigh}</option>
                    <option value="newest">{h.sortNewest}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Active Removable Filter Chips & Clear All */}
            {(category !== 'all' || selectedDistrict !== 'all' || search || onlyDeals) && (
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-500">
                    {lang === 'si' ? 'ක්‍රියාකාරී පෙරහන්:' : lang === 'ta' ? 'செயலில் உள்ள வடிகட்டிகள்:' : 'Active Filters:'}
                  </span>
                  {search && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-magenta/10 px-2.5 py-1 font-semibold text-magenta ring-1 ring-magenta/20">
                      <span>&ldquo;{search}&rdquo;</span>
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        aria-label="Remove search filter"
                        className="rounded-full p-0.5 hover:bg-magenta/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {category !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
                      <span>{t.categories[category] || category}</span>
                      <button
                        type="button"
                        onClick={() => setCategory('all')}
                        aria-label="Remove category filter"
                        className="rounded-full p-0.5 hover:bg-white/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {selectedDistrict !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
                      <MapPin className="h-3 w-3 text-red-500" />
                      <span>{selectedDistrict}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDistrict('all')}
                        aria-label="Remove district filter"
                        className="rounded-full p-0.5 hover:bg-emerald-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {onlyDeals && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 font-semibold text-rose-700">
                      <Flame className="h-3 w-3" />
                      <span>{h.dealsBadge || 'Deals'}</span>
                      <button
                        type="button"
                        onClick={() => setOnlyDeals(false)}
                        aria-label="Remove deals filter"
                        className="rounded-full p-0.5 hover:bg-rose-200"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-magenta hover:text-magenta-dark hover:underline"
                >
                  {t.clearFilters || 'Clear all filters'}
                </button>
              </div>
            )}

            {/* Results Count Summary */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <p>
                <span className="font-bold text-slate-800">{fill(h.productsFound, { count: visibleProducts.length })}</span>
                {category !== 'all' ? ` in ${t.categories[category] || category}` : ''}
                {selectedDistrict !== 'all' ? ` from ${selectedDistrict}` : ''}
                {onlyDeals ? ` (Discounted)` : ''}
              </p>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visibleProducts.length > 0 ? (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product, index) => (
                  <Reveal key={product.id} delay={(index % 4) * 80} className="grid">
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>
              <div className="mt-12 flex justify-center">
                <Link
                  href="/store"
                  className="btn-shine group inline-flex items-center gap-3 rounded-full bg-slate-900 px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-magenta hover:shadow-magenta/25"
                >
                  <span>{h.viewStoreCta}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-8 animate-fade-up rounded-2xl border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center shadow-xs">
              <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-lg font-bold text-slate-900">{t.noResults}</p>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                {t.noResultsSub || 'Try searching with broader terms, switching to All Districts, or clearing active filters.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-shine rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta shadow-md active:scale-95"
                >
                  {t.clearFilters || 'Clear all filters'}
                </button>
                <Link
                  href="/store"
                  className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95"
                >
                  {h.viewStoreCta || 'Browse Full Store'}
                </Link>
              </div>
            </div>
          )}
        </main>

        {/* 10. How to Buy in 3 Simple Steps */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <SectionTitle title={t.customer.howTitle} sub={h.howSub} />
          <div className="relative mt-12">
            <Reveal aria-hidden="true" className="absolute inset-x-[16%] top-16 hidden md:block">
              <span className="grow-line block border-t-[3px] border-dashed border-slate-300" />
            </Reveal>
            <ol className="relative grid gap-6 md:grid-cols-3">
              {t.customer.howSteps.map((step, index) => {
                const { icon: Icon, tile } = STEP_LOOK[index] || STEP_LOOK[0];
                return (
                  <Reveal
                    as="li"
                    key={step}
                    delay={index * 150}
                    className="flex flex-col items-center rounded-2xl border border-slate-200/90 bg-white px-6 py-8 text-center shadow-xs"
                  >
                    <span
                      className={`relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-md transition-transform duration-300 hover:-translate-y-1 ${tile}`}
                    >
                      <Icon className="h-7 w-7" />
                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-extrabold text-white ring-4 ring-white shadow-2xs">
                        {index + 1}
                      </span>
                    </span>
                    <p className="mt-5 max-w-xs text-sm font-semibold text-slate-900 sm:text-base">{step}</p>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>


        {/* 12. Invite Women Entrepreneurs */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
          <Reveal
            animation="zoom-in"
            className="relative isolate overflow-hidden rounded-3xl bg-linear-to-r from-magenta-dark via-magenta to-brand-800 px-6 py-10 text-white shadow-xl sm:px-12 sm:py-14"
          >
            <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10 opacity-15" />
            <Lotus color="white" className="pointer-events-none absolute -bottom-3 left-[48%] -z-10 hidden w-44 opacity-20 lg:block" />
            <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 -z-10 h-40 w-40 animate-spin-slow rounded-full border-2 border-dashed border-white/20" />
            <Sparkle className="pointer-events-none absolute right-[30%] top-6 -z-10 h-5 w-5 animate-twinkle text-white/70" />

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <Reveal animation="fade-right" delay={150} className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25">
                  <Store className="h-3.5 w-3.5" />
                  {t.navSellers}
                </span>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{h.sellerTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base">{h.sellerText}</p>
              </Reveal>
              <Reveal animation="fade-left" delay={250} className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/register"
                  className="btn-shine group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-md transition-all duration-200 hover:bg-slate-100"
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

        {/* 13. FAQ */}
        <HomeFaq h={h} />

        {/* 14. E-Learning Banner */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6">
          <Reveal className="relative isolate overflow-hidden rounded-3xl bg-slate-900 px-6 py-10 text-white shadow-xl sm:px-12 border border-slate-800">
            <DotGrid className="pointer-events-none absolute right-6 top-6 -z-10 hidden w-24 text-white/10 md:block" rows={4} cols={6} />
            <Sparkle className="pointer-events-none absolute left-[45%] top-8 -z-10 h-5 w-5 animate-twinkle text-amber-400" />

            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <Reveal animation="fade-right" delay={150} className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {t.learnTag}
                </span>
                <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{t.learnTitle}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">{t.learnSub}</p>
                <Link
                  href="/e-learning"
                  className="btn-shine group mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-slate-100"
                >
                  {t.exploreElearn}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>

              <Reveal as="ul" animation="fade-left" delay={250} className="flex gap-6 sm:gap-8">
                {learnTopics.map(({ icon: Icon, label }) => (
                  <li key={label} className="group flex w-20 flex-col items-center text-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:scale-105">
                      <Icon className="h-7 w-7 text-amber-400" />
                    </span>
                    <span className="mt-2 text-xs font-semibold leading-tight text-slate-200">{label}</span>
                  </li>
                ))}
              </Reveal>
            </div>
          </Reveal>
        </section>


      </div>

      {/* Floating Action Buttons: Back to Top & Quick Help */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5">
        <Link
          href="/support"
          className="group flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xl shadow-emerald-600/30 transition-all duration-300 hover:bg-emerald-700 hover:scale-105 active:scale-95"
          title="Need Help? Open Guide & FAQs"
        >
          <WhatsAppIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{lang === 'si' ? 'උදව් සහ පැන' : lang === 'ta' ? 'உதவி & கேள்விகள்' : 'Help & FAQs'}</span>
        </Link>
        {showScrollTop && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl shadow-slate-900/25 transition-all duration-300 hover:bg-magenta hover:scale-105 active:scale-95"
            aria-label={h.backToTop || 'Back to top'}
          >
            <ChevronUp className="h-5 w-5" />
          </button>
        )}
      </div>


    </>
  );
}
