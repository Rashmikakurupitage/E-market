'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, ArrowRight, Megaphone, HandCoins, Laptop, PackageSearch, ChevronDown, ShieldCheck, HandHeart, MapPin,
  Palette, Layers, Wheat, CookingPot, Flower2, Sparkles, PackageCheck, Store, BookOpen, Tag, Plus, CircleHelp,
  HeartHandshake, Star, Quote, GraduationCap, Flame, SlidersHorizontal, ChevronUp, Check,
  Award, BadgeCheck, X, Users, Truck, MessageCircle, ExternalLink
} from 'lucide-react';
import API from '../src/lib/api';
import { useLanguage, fill } from '../src/lib/i18n';
import { CATEGORIES, SAMPLE_PRODUCTS, getSeller, withSampleProducts, initials } from '../src/lib/catalog';
import ProductCard from '../src/components/ProductCard';
import PriceTag from '../src/components/DiscountBadge';
import { useWallpapers } from '../src/lib/siteImage';
import HeroSlideshow from '../src/components/HeroSlideshow';
import HomeImpact from '../src/components/HomeImpact';
import WhatsAppIcon from '../src/components/WhatsAppIcon';
import Reveal from '../src/components/Reveal';
import { Lotus, Sparkle, DotGrid, Squiggle } from '../src/components/Art';

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

const BENEFIT_LOOK = [
  { icon: ShieldCheck, tile: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200' },
  { icon: WhatsAppIcon, tile: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  { icon: HandHeart, tile: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
  { icon: MapPin, tile: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
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
    <h1 className={`mt-6 animate-fade-up font-extrabold tracking-tight text-slate-900 [animation-delay:120ms] ${size}`}>
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
  const wallpapers = useWallpapers();
  const h = t.home;
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [category, setCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [sortBy, setSortBy] = useState('featured');
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Filtered and sorted products
  const visibleProducts = useMemo(() => {
    let list = products.filter((product) => {
      if (category !== 'all' && product.category !== category) return false;
      if (selectedDistrict !== 'all') {
        const s = getSeller(product);
        if (s.district?.toLowerCase() !== selectedDistrict.toLowerCase()) return false;
      }
      if (!query) return true;
      const seller = getSeller(product);
      return [product.title, product.description, product.category, seller.businessName, seller.district].some(
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
  }, [products, category, selectedDistrict, query, sortBy]);

  // Products with active discounts for Flash Deals section
  const dealsProducts = useMemo(() => {
    return products.filter((p) => (p.discountPercent || p.discount?.percent || 0) > 0).slice(0, 4);
  }, [products]);


  const scrollToProducts = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCategory !== 'all') {
      setCategory(searchCategory);
    }
    scrollToProducts();
  };

  const chooseCategory = (value) => {
    setCategory(value);
    scrollToProducts();
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setSelectedDistrict('all');
    setSortBy('featured');
  };

  const learnTopics = [
    { icon: Megaphone, label: t.marketing },
    { icon: HandCoins, label: t.finance },
    { icon: Laptop, label: t.digitalLiteracy },
  ];

  return (
    <>
      {/* 1. Official National Announcement Bar */}
      <aside aria-label="National Announcement" className="relative z-30 border-b border-slate-800 bg-slate-900 py-2.5 text-xs font-medium text-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="truncate tracking-wide text-slate-100 font-semibold">{h.announcement}</span>
          </div>
          <div className="hidden shrink-0 items-center gap-5 text-slate-400 text-[11px] md:flex">
            <span className="inline-flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-emerald-400" /> 25 Districts Islandwide</span>
            <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> Direct Maker Contact</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-400"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> 4.9★ Rated</span>
          </div>
        </div>
      </aside>

      {/* 2. Enhanced Hero Section */}
      <section className="relative isolate">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-10">
          {/* Text and search */}
          <div className="relative lg:col-span-7">
            <Sparkle className="pointer-events-none absolute -top-2 right-[18%] hidden h-7 w-7 animate-twinkle text-magenta/40 sm:block" />
            <Sparkle className="pointer-events-none absolute right-[6%] top-40 hidden h-4 w-4 animate-twinkle text-slate-300 [animation-delay:-1.2s] sm:block" />
            
            <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-magenta opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-magenta" />
              </span>
              {h.badge}
            </p>

            <HeroTitle />

            <p className="mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-slate-600 [animation-delay:240ms] sm:text-lg">
              {t.heroSub}
            </p>

            {/* Standard Combined Search Bar */}
            <form
              onSubmit={handleSearch}
              role="search"
              className="mt-7 flex max-w-2xl animate-fade-up flex-wrap items-center gap-1.5 rounded-full border border-slate-300/80 bg-white p-2 shadow-md shadow-slate-900/5 transition-all duration-300 [animation-delay:360ms] focus-within:border-magenta focus-within:ring-4 focus-within:ring-magenta/15 sm:flex-nowrap"
            >
              {/* Category Dropdown */}
              <div className="relative shrink-0 border-r border-slate-200 pr-2 pl-3 hidden sm:block">
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-4 hover:text-slate-900"
                  aria-label={h.searchAllCategories}
                >
                  <option value="all">{h.searchAllCategories}</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t.categories[cat] || cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-1 items-center gap-2 min-w-[200px]">
                <Search className="ml-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <input
                  id="product-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-transparent py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="submit"
                aria-label={t.searchBtn}
                className="btn-shine flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-magenta px-6 text-sm font-bold text-white shadow-md shadow-magenta/25 transition-all duration-200 hover:bg-magenta-dark active:scale-95"
              >
                <Search className="h-4 w-4" />
                <span>{t.searchBtn}</span>
              </button>
            </form>


            {/* Twin Action CTAs */}
            <div className="mt-7 flex animate-fade-up flex-wrap items-center gap-3 [animation-delay:550ms]">
              <button
                type="button"
                onClick={scrollToProducts}
                className="btn-shine inline-flex items-center gap-2 rounded-full bg-magenta px-6 py-3 text-sm font-bold text-white shadow-md shadow-magenta/20 transition-all hover:bg-magenta-dark active:scale-95"
              >
                <span>{h.heroCtaShop}</span>
                <ChevronDown className="h-4 w-4 animate-bounce-soft" />
              </button>

              <Link
                href="/register"
                className="group inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-400"
              >
                <Store className="h-4 w-4 text-magenta" />
                <span>{h.heroCtaSell}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Hero Trust Counter Strip */}
            <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-6 sm:grid-cols-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">500+ Makers</p>
                  <p className="text-[11px] text-slate-500">Registered women</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">25 Districts</p>
                  <p className="text-[11px] text-slate-500">Islandwide reach</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <HeartHandshake className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">100% Direct</p>
                  <p className="text-[11px] text-slate-500">Zero middleman cut</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 shadow-2xs">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">4.9★ Rated</p>
                  <p className="text-[11px] text-slate-500">Buyer satisfaction</p>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Showcase */}
          <div className="relative mx-auto w-full max-w-md animate-zoom-in [animation-delay:200ms] lg:col-span-5 lg:max-w-none">
            <div aria-hidden="true" className="absolute -right-6 -top-6 -z-10 h-[88%] w-[88%] animate-morph bg-slate-200/50" />
            <DotGrid className="absolute -left-10 top-16 -z-10 hidden w-24 text-slate-300 sm:block" />
            <div aria-hidden="true" className="absolute -bottom-10 right-4 -z-10 h-28 w-28 animate-spin-slow rounded-full border-2 border-dashed border-slate-300" />
            <Sparkle className="absolute -right-4 top-8 h-8 w-8 animate-twinkle text-magenta/40 [animation-delay:-0.6s] sm:-right-8" />

            {/* Floating Trust Badge 1 (Top-Left) */}
            <div className="absolute -left-6 top-10 z-20 hidden items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl backdrop-blur-md sm:flex animate-float">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-2xs">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">{h.heroBadge1Title || '100% Fair Trade'}</p>
                <p className="text-[10px] font-medium text-slate-500">{h.heroBadge1Sub || 'Direct from rural makers'}</p>
              </div>
            </div>

            {/* Floating Trust Badge 2 (Bottom-Right) */}
            <div className="absolute -bottom-5 -right-4 z-20 hidden items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xl backdrop-blur-md sm:flex animate-float [animation-delay:-2.5s]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 shadow-2xs">
                <ShieldCheck className="h-5 w-5 text-slate-800" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900">{h.heroBadge2Title || 'Ministry Verified'}</p>
                <p className="text-[10px] font-medium text-slate-500">{h.heroBadge2Sub || '25 Districts covered'}</p>
              </div>
            </div>

            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[48px_160px_48px_160px] shadow-2xl shadow-slate-900/10 ring-8 ring-white sm:rounded-[48px_200px_48px_200px]">
              <HeroSlideshow {...wallpapers} />
            </div>
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
            const config = CATEGORY_LOOK[value] || DEFAULT_LOOK;
            const Icon = config.icon;
            const active = category === value;
            const count = products.filter((product) => product.category === value).length;
            return (
              <Reveal key={value} animation="zoom-in" delay={index * 80} className="grid">
                <button
                  type="button"
                  onClick={() => chooseCategory(value)}
                  aria-pressed={active}
                  className={`group relative flex flex-col items-center rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg ${
                    active
                      ? config.activeCard
                      : `border-slate-200/90 bg-white ${config.hoverCard}`
                  }`}
                >
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                      active
                        ? config.activeTile
                        : `${config.tile} ${config.hoverTile}`
                    }`}
                  >
                    <Icon className="h-8 w-8 transition-transform duration-300" strokeWidth={2} />
                  </span>
                  <span className={`mt-3.5 text-sm font-bold text-slate-900 transition-colors ${config.hoverText}`}>
                    {t.categories[value]}
                  </span>
                  {!loading && (
                    <span className="mt-1.5 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 transition-colors group-hover:bg-slate-200/70">
                      {count} {t.productsCount}
                    </span>
                  )}
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
          <div className="mt-8 rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Category Pills */}
              <div className="no-scrollbar flex flex-wrap gap-2">
                {['all', ...CATEGORIES].map((value) => {
                  const active = category === value;
                  const Icon = value === 'all' ? Sparkles : (CATEGORY_LOOK[value] || DEFAULT_LOOK).icon;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      aria-pressed={active}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
                        active
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 shadow-2xs'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-amber-300' : 'text-slate-500'}`} />
                      {value === 'all' ? t.allCategories : t.categories[value]}
                    </button>
                  );
                })}
              </div>

              {/* District & Sort Dropdowns */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* District Filter */}
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs">
                  <MapPin className="h-3.5 w-3.5 text-magenta" />
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
                <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs">
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

            {/* Results Count & Active Filters Indicator */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <p>
                <span className="font-bold text-slate-800">{fill(h.productsFound, { count: visibleProducts.length })}</span>
                {category !== 'all' ? ` in ${t.categories[category] || category}` : ''}
                {selectedDistrict !== 'all' ? ` from ${selectedDistrict}` : ''}
              </p>
              {(category !== 'all' || selectedDistrict !== 'all' || search) && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-bold text-magenta hover:text-magenta-dark hover:underline"
                >
                  {t.clearFilters || 'Clear all filters'}
                </button>
              )}
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
            <div className="mt-8 animate-fade-up rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-xs">
              <PackageSearch className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 font-bold text-slate-900">{t.noResults}</p>
              <p className="mt-1 text-sm text-slate-500">{t.noResultsSub}</p>
              <button
                type="button"
                onClick={clearFilters}
                className="btn-shine mt-5 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta"
              >
                {t.clearFilters}
              </button>
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

        {/* 11. Customer Testimonials & Social Proof */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-4 sm:px-6">
          <SectionTitle title={h.testimonialsTitle} sub={h.testimonialsSub} />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {h.testimonials?.map((item, index) => (
              <Reveal key={item.author} delay={index * 120} className="grid">
                <div className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <Quote className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-700 italic">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.author}</p>
                      <p className="text-xs text-slate-500 font-medium">{item.location}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {item.verified}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 12. Invite Women Entrepreneurs */}
        <section className="mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6">
          <Reveal
            animation="zoom-in"
            className="relative isolate overflow-hidden rounded-3xl bg-linear-to-r from-magenta-dark via-magenta to-[#751642] px-6 py-10 text-white shadow-xl sm:px-12 sm:py-14"
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

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-all duration-300 hover:bg-magenta hover:scale-105 active:scale-95"
          aria-label={h.backToTop || 'Back to top'}
        >
          <ChevronUp className="h-5 w-5" />
        </button>
      )}


    </>
  );
}
