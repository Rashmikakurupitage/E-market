'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpRight, BadgeCheck, BookOpen, Eye, Gift, Info, LayoutDashboard, MapPin, Package, PackageSearch, PackagePlus,
  Scissors, Search, Shirt, SlidersHorizontal, Soup, Sparkles, Sprout, Store, Tag, X, ArrowRight,
} from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated } from '../../src/lib/auth';
import { CATEGORIES, SAMPLE_PRODUCTS, formatPrice, getSeller, initials, messengerLink, whatsappOrderLink, withSampleProducts } from '../../src/lib/catalog';
import { trackContactClick } from '../../src/components/ProductCard';
import PriceTag, { DiscountBurst } from '../../src/components/DiscountBadge';
import SellerStatusBadge from '../../src/components/SellerStatusBadge';
import { useCanContact } from '../../src/components/ContactGate';
import WhatsAppIcon from '../../src/components/WhatsAppIcon';
import MessengerIcon from '../../src/components/MessengerIcon';
import CountUp from '../../src/components/CountUp';
import Reveal from '../../src/components/Reveal';
import { DotGrid, PageArt, Sparkle, Squiggle } from '../../src/components/Art';
import { inputClass } from '../../src/components/form';
import Portal from '../../src/components/Portal';
import ProductReviews from '../../src/components/ProductReviews';

const FLAG_URL = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg';

// Icon and logo colour for each category
const CATEGORY_LOOK = {
  Handicrafts: { icon: Scissors, tile: 'bg-magenta text-white' },
  Textiles: { icon: Shirt, tile: 'bg-saffron text-white' },
  'Agri-Products': { icon: Sprout, tile: 'bg-leaf text-white' },
  'Food & Spices': { icon: Soup, tile: 'bg-turmeric text-ink' },
  'Beauty & Personal Care': { icon: Sparkles, tile: 'bg-ink text-white' },
};
const DEFAULT_LOOK = { icon: Tag, tile: 'bg-ink text-white' };

const SORTS = {
  newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  priceLow: (a, b) => priceOf(a) - priceOf(b),
  priceHigh: (a, b) => priceOf(b) - priceOf(a),
  name: (a, b) => String(a.title).localeCompare(String(b.title)),
};
// Products without a price go last when sorting by price
function priceOf(product) {
  const value = Number(product.price);
  return product.price === null || product.price === undefined || Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

// Sample products have no seller id; they are shown only while the database has no products to sell
const isExample = (product) => !product.sellerId;

function SellerLine({ product }) {
  const seller = getSeller(product);
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-magenta to-saffron text-xs font-bold text-white shadow-sm ring-2 ring-white">
        {initials(seller.businessName) || '?'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{seller.businessName || '—'}</p>
        {seller.district && (
          <p className="flex items-center gap-1 text-xs text-ink/55">
            <MapPin className="h-3 w-3" />
            {seller.district}
          </p>
        )}
      </div>
      <img src={FLAG_URL} alt="Sri Lanka" className="h-4 w-auto shrink-0 rounded-[3px] shadow-sm ring-1 ring-ink/5" />
    </div>
  );
}

function StoreCard({ product, onOpen }) {
  const { t } = useLanguage();
  const s = t.store;
  const [imageFailed, setImageFailed] = useState(false);
  const example = isExample(product);
  const image = product.images?.[0];
  const { canContact } = useCanContact();
  const whatsapp = canContact && !example ? whatsappOrderLink(product) : null;
  const messenger = canContact && !example ? messengerLink(product) : null;

  return (
    <article className="store-product-card group flex h-full flex-col rounded-[26px] border border-white/90 bg-white p-2.5 shadow-[0_8px_26px_rgba(34,30,26,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(34,30,26,0.14)] sm:rounded-[30px] sm:p-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${s.details}: ${product.title}`}
        className="shine relative block aspect-square overflow-hidden rounded-[22px] bg-linear-to-br from-[#f4ead8] to-[#e5ddd0] text-left ring-1 ring-ink/5 sm:rounded-[24px]"
      >
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-ink/20">
            <Package className="h-12 w-12" />
          </span>
        )}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-ink/20 to-transparent opacity-70" />
        {example ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/35 backdrop-blur-md">{s.exampleBadge}</span>
        ) : product.seller?.status === 'APPROVED' ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-magenta/95 px-3 py-1.5 text-[10px] font-bold text-white shadow-md ring-1 ring-white/50 backdrop-blur">
            <BadgeCheck className="h-3.5 w-3.5" />
            {t.verifiedSeller}
          </span>
        ) : (
          <span className="absolute left-2.5 top-2.5 [&>span]:border [&>span]:border-white/80 [&>span]:shadow-md">
            <SellerStatusBadge status={product.seller?.status} />
          </span>
        )}
        {product.discount && <DiscountBurst percent={product.discount.percent} className="absolute right-3 top-3" />}
        {product.category && (
          <span className="absolute bottom-3 left-3 max-w-[70%] truncate rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-ink shadow-sm ring-1 ring-white/60 backdrop-blur-md">
            {t.categories[product.category] || product.category}
          </span>
        )}
        <span className="absolute bottom-3 right-3 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-white/95 text-ink opacity-0 shadow-lg ring-1 ring-white/80 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <Eye className="h-4 w-4" />
        </span>
      </button>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-4 sm:px-2.5">
        <button type="button" onClick={onOpen} className="text-left">
          <h3 className="line-clamp-1 text-[15px] font-bold tracking-[-0.02em] text-ink transition-colors group-hover:text-magenta sm:text-base">{product.title}</h3>
        </button>
        <p className="mt-1.5 line-clamp-2 min-h-9 text-[11px] leading-[1.15rem] text-ink/55 sm:min-h-10 sm:text-xs sm:leading-5">{product.description}</p>

        <div className={`mt-3 flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 py-2 ${product.discount ? 'bg-red-50/80 ring-1 ring-red-100' : 'bg-sand/35'}`}>
          <PriceTag product={product} />
          {product.discount && <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-orange-400" />}
        </div>

        <div className="mt-3 border-t border-ink/5 pt-3.5">
          <SellerLine product={product} />
        </div>

        <div className="mt-4 flex flex-1 items-end gap-2">
          {example ? (
            <span className="flex flex-1 items-center justify-center rounded-full bg-sand/70 px-3 py-2.5 text-sm font-semibold text-ink/40">
              {s.exampleButton}
            </span>
          ) : !whatsapp && canContact ? (
            <span className="flex-1 text-xs leading-snug text-ink/55">{t.whatsappUnavailable}</span>
          ) : null}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick(product, 'WHATSAPP')}
              aria-label={t.orderWhatsapp}
              title={t.orderWhatsapp}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-leaf/20 bg-leaf/5 text-leaf transition-all duration-200 hover:-translate-y-0.5 hover:border-leaf hover:bg-leaf hover:text-white hover:shadow-md sm:h-11 sm:w-11"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </a>
          )}
          {messenger && (
            <a
              href={messenger}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick(product, 'MESSENGER')}
              aria-label={t.store.chatMessenger}
              title={t.store.chatMessenger}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0084ff]/20 bg-[#0084ff]/5 text-[#0084ff] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0084ff] hover:bg-[#0084ff] hover:text-white hover:shadow-md sm:h-11 sm:w-11"
            >
              <MessengerIcon className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function OfferSpotlight({ product, onOpen }) {
  const { t } = useLanguage();
  const s = t.store;
  const image = product.images?.[0];
  const regular = formatPrice(product.price);
  const offer = formatPrice(product.discount.salePrice);

  return (
    <article className="offer-spotlight group relative isolate flex min-h-[430px] flex-col overflow-hidden rounded-[28px] bg-[#76151b] p-5 text-white shadow-xl shadow-red-950/20 ring-1 ring-amber-200/60 sm:min-h-[470px] sm:p-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_36%,rgba(255,190,75,0.32),transparent_45%),linear-gradient(160deg,#a61d24_0%,#72131c_52%,#111b39_53%,#101832_100%)]" />
      <div aria-hidden="true" className="offer-spark offer-spark-one" />
      <div aria-hidden="true" className="offer-spark offer-spark-two" />
      <div aria-hidden="true" className="offer-spark offer-spark-three" />

      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-100 ring-1 ring-white/20 backdrop-blur">
          <Gift className="h-3.5 w-3.5" />
          {s.offerWeek}
        </span>
        <span className="rounded-full bg-amber-300 px-2.5 py-1 text-xs font-black text-red-950 shadow-md">-{product.discount.percent}%</span>
      </div>

      <div className="relative mt-4 flex flex-1 items-center justify-center">
        <div aria-hidden="true" className="offer-orbit absolute h-52 w-[115%] rounded-[50%] border-[3px] border-amber-200/90 shadow-[0_0_22px_rgba(255,190,75,0.65)] sm:h-60" />
        <div aria-hidden="true" className="absolute h-40 w-40 rounded-full bg-amber-300/20 blur-3xl" />
        {image ? (
          <img src={image} alt={product.title} className="offer-product-image relative z-10 max-h-52 max-w-[82%] object-contain drop-shadow-[0_18px_20px_rgba(0,0,0,0.45)] sm:max-h-60" />
        ) : (
          <Package className="relative z-10 h-28 w-28 text-amber-100/70 drop-shadow-xl" />
        )}
        <div className="absolute bottom-2 right-0 z-20 rotate-6 rounded-md bg-amber-100 px-3 py-2 text-center text-red-950 shadow-lg ring-1 ring-amber-300">
          <span className="block text-[9px] font-bold uppercase tracking-wider">{s.offerPrice}</span>
          <span className="block text-sm font-black tabular-nums">{offer}</span>
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <p className="text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-amber-200">{s.offerOfWeek}</p>
        <h3 className="mt-1 line-clamp-1 text-center text-lg font-extrabold text-white">{product.title}</h3>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          <span className="text-white/65">{s.regularPrice}</span>
          <s className="text-white/65">{regular}</s>
          <strong className="text-lg font-black tabular-nums text-amber-200">{offer}</strong>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="offer-claim mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-linear-to-r from-amber-300 via-yellow-200 to-amber-400 px-4 py-3 text-sm font-black uppercase tracking-wide text-red-950 shadow-[0_4px_0_#9a4c12,0_10px_22px_rgba(0,0,0,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_5px_0_#9a4c12,0_14px_26px_rgba(0,0,0,0.32)] active:translate-y-1 active:shadow-[0_1px_0_#9a4c12]"
        >
          {s.claimOffer}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

// Full details in a pop-up: big picture, description, seller and contact actions
function QuickView({ product, onClose }) {
  const { t } = useLanguage();
  const s = t.store;
  const example = isExample(product);
  const photos = (product.images || []).filter(Boolean);
  const [photoIndex, setPhotoIndex] = useState(0);
  const image = photos[photoIndex] || photos[0];
  const { canContact } = useCanContact();
  const whatsapp = canContact && !example ? whatsappOrderLink(product) : null;
  const messenger = canContact && !example ? messengerLink(product) : null;

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <Portal>
<div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
      <div className="absolute inset-0 animate-page-in bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative grid max-h-[92vh] w-full max-w-4xl animate-zoom-in overflow-y-auto rounded-t-[32px] bg-white shadow-2xl sm:rounded-[32px] md:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          aria-label={s.close}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition-colors hover:bg-ink hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative aspect-square bg-sand md:aspect-auto md:min-h-[460px]">
          {image ? (
            <img src={image} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-ink/20">
              <Package className="h-16 w-16" />
            </span>
          )}
          {photos.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex gap-2 overflow-x-auto bg-linear-to-t from-black/55 to-transparent p-3 pt-8">
              {photos.map((src, index) => (
                <button
                  key={src + index}
                  type="button"
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`${product.title} ${index + 1} / ${photos.length}`}
                  aria-current={index === photoIndex}
                  className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-2 transition-all ${index === photoIndex ? 'ring-white' : 'opacity-70 ring-white/30 hover:opacity-100'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {product.category && (
              <span className="rounded-full bg-sand/70 px-3 py-1 text-xs font-semibold text-ink/80">
                {t.categories[product.category] || product.category}
              </span>
            )}
            {example ? (
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">{s.exampleBadge}</span>
            ) : product.seller?.status === 'APPROVED' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-magenta/10 px-3 py-1 text-xs font-semibold text-magenta">
                <BadgeCheck className="h-3.5 w-3.5" />
                {t.verifiedSeller}
              </span>
            ) : (
              <SellerStatusBadge status={product.seller?.status} />
            )}
          </div>

          <h2 id="quick-view-title" className="mt-4 pr-10 text-3xl font-bold leading-tight text-ink">{product.title}</h2>
          <div className="mt-3">
            <PriceTag product={product} large />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">{product.description}</p>

          <div className="mt-6 rounded-[22px] bg-cream p-4 ring-1 ring-ink/5">
            <p className="mb-3 text-xs font-semibold text-ink/50">{s.soldBy}</p>
            <SellerLine product={product} />
          </div>

          {!example && <ProductReviews productId={product.id} session={session} />}

          <div className="mt-auto pt-6">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {example ? (
                <span className="flex flex-1 items-center justify-center rounded-full bg-sand/70 px-4 py-3 text-sm font-semibold text-ink/40">{s.exampleButton}</span>
              ) : null}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContactClick(product, 'WHATSAPP')}
                  className="flex items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-leaf hover:bg-leaf hover:text-white"
                >
                  <WhatsAppIcon className="h-5 w-5 text-leaf" />
                  {t.orderWhatsapp}
                </a>
              )}
              {messenger && (
                <a
                  href={messenger}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackContactClick(product, 'MESSENGER')}
                  className="flex items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-[#0084ff] hover:bg-[#0084ff] hover:text-white"
                >
                  <MessengerIcon className="h-5 w-5 text-[#0084ff]" />
                  {t.store.chatMessenger}
                </a>
              )}
            </div>
            {!example && product.price !== null && product.price !== undefined && whatsapp && <p className="mt-3 text-center text-xs text-ink/50">{s.payNote}</p>}
          </div>
        </div>
      </div>
    </div>
</Portal>
  );
}

function StoreCardSkeleton() {
  return (
    <div className="rounded-[28px] border border-ink/5 bg-white p-3">
      <div className="skeleton aspect-square rounded-[22px]" />
      <div className="space-y-3 px-2 pb-1 pt-4">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-9 w-full rounded-full" />
        <div className="skeleton h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

export default function StorePage() {
  const { t } = useLanguage();
  const s = t.store;
  const session = useSession();
  const hydrated = useHydrated();
  const router = useRouter();
  const isSeller = session?.user?.role === 'SELLER';

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | examples
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [district, setDistrict] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [selected, setSelected] = useState(null);

  // Products open for registered users. Visitors are sent to the customer sign-up form first,
  // and come back to this product once they have registered (or logged in).
  const openProduct = (product) => {
    if (!session) {
      router.push(`/register?as=customer&next=${encodeURIComponent(`/store?product=${product.id}`)}`);
      return;
    }
    setSelected(product);
  };

  const closeProduct = () => {
    setSelected(null);
    if (new URLSearchParams(window.location.search).has('product')) window.history.replaceState(null, '', window.location.pathname);
  };

  useEffect(() => {
    let ignore = false;
    API.get('/products', { timeout: 8000 })
      .then((res) => {
        const fetched = res.data?.products || res.data;
        if (ignore) return;
        const hasLiveProducts = Array.isArray(fetched) && fetched.length > 0;
        const list = withSampleProducts(fetched);
        setProducts(list);
        setStatus(hasLiveProducts ? 'ready' : 'examples');
      })
      .catch(() => {
        if (ignore) return;
        setProducts(SAMPLE_PRODUCTS);
        setStatus('examples');
      });
    return () => {
      ignore = true;
    };
  }, []);

  // A link like /store?product=<id> (from the home page) opens that product straight away
  useEffect(() => {
    if (!hydrated || status === 'loading') return;
    const id = new URLSearchParams(window.location.search).get('product');
    if (!id) return;
    const found = products.find((item) => String(item.id) === id);
    if (!found) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (session) setSelected(found);
    else router.replace(`/register?as=customer&next=${encodeURIComponent(`/store?product=${id}`)}`);
  }, [hydrated, status, products, session, router]);

  const districts = useMemo(
    () => [...new Set(products.map((p) => getSeller(p).district).filter(Boolean))].sort(),
    [products]
  );
  const sellerCount = useMemo(() => new Set(products.map((p) => p.sellerId || getSeller(p).businessName)).size, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = minPrice === '' ? null : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    return products
      .filter((product) => {
        const seller = getSeller(product);
        if (category !== 'all' && product.category !== category) return false;
        if (district !== 'all' && seller.district !== district) return false;
        const price = Number(product.price);
        const hasPrice = product.price !== null && product.price !== undefined && !Number.isNaN(price);
        if (min !== null && (!hasPrice || price < min)) return false;
        if (max !== null && (!hasPrice || price > max)) return false;
        if (!q) return true;
        return [product.title, product.description, product.category, seller.businessName, seller.district].some((v) =>
          String(v || '').toLowerCase().includes(q)
        );
      })
      .sort(SORTS[sort]);
  }, [products, query, category, district, minPrice, maxPrice, sort]);
  const featuredOffer =
    visible.find((product) => product.discount && !isExample(product)) ||
    visible.find((product) => product.discount);
  const gridProducts = featuredOffer ? visible.filter((product) => product.id !== featuredOffer.id) : visible;

  const filtersUsed = query || category !== 'all' || district !== 'all' || minPrice || maxPrice;
  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setDistrict('all');
    setMinPrice('');
    setMaxPrice('');
  };

  const stats = [
    { value: products.length, label: s.statProducts },
    { value: sellerCount, label: s.statSellers },
    { value: districts.length, label: s.statDistricts },
  ];

  return (
    <main className="relative isolate flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <PageArt />
      <div className="mx-auto max-w-7xl">
        {/* Banner */}
        <section className="relative isolate animate-zoom-in overflow-hidden rounded-[40px] bg-ink px-6 py-10 text-white shadow-2xl shadow-ink/20 sm:px-10 sm:py-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 -z-10 h-72 w-72 rounded-full bg-magenta/50 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-72 w-72 rounded-full bg-saffron/35 blur-3xl" />
          <DotGrid className="pointer-events-none absolute right-8 top-8 -z-10 hidden w-24 text-white/15 md:block" rows={4} cols={6} />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-1/3 -z-10 h-48 w-48 animate-spin-slow rounded-full border-2 border-dashed border-turmeric/30" />
          <Sparkle className="pointer-events-none absolute left-[46%] top-10 -z-10 h-5 w-5 animate-twinkle text-turmeric" />
          <Sparkle className="pointer-events-none absolute bottom-10 right-10 -z-10 h-4 w-4 animate-twinkle text-white/70 [animation-delay:-1.5s]" />

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
            <div className="draw-now min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-turmeric px-3 py-1 text-xs font-bold text-ink">
                <Store className="h-3.5 w-3.5" />
                {s.tag}
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{s.title}</h1>
              <Squiggle className="mt-1 h-3 w-40" />
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{s.subtitle}</p>

              <form
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                  document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="mt-7 flex max-w-xl items-center gap-2 rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 backdrop-blur transition-shadow focus-within:ring-2 focus-within:ring-turmeric/60"
              >
                <label htmlFor="store-search" className="sr-only">{t.searchBtn}</label>
                <Search className="ml-3 h-5 w-5 shrink-0 text-white/50" aria-hidden="true" />
                <input
                  id="store-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-white/45 focus:outline-none sm:text-base"
                />
                <button type="submit" className="btn-shine shrink-0 rounded-full bg-magenta px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-magenta/30 transition-colors hover:bg-magenta-dark">
                  {t.searchBtn}
                </button>
              </form>
            </div>

            <ul className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
              {stats.map((stat, index) => (
                <li
                  key={stat.label}
                  className="min-w-0 animate-fade-up rounded-[24px] bg-white/8 px-2 py-4 text-center sm:px-3 sm:py-5 ring-1 ring-white/10 backdrop-blur"
                  style={{ animationDelay: `${200 + index * 120}ms` }}
                >
                  <p className="font-display text-3xl font-bold text-turmeric sm:text-4xl">
                    {status === 'loading' ? '–' : <CountUp value={stat.value} />}
                  </p>
                  <p className="mt-1 break-words text-[11px] font-medium text-white/70 sm:text-xs">{stat.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Categories */}
        <div className="no-scrollbar -mx-4 mt-8 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {['all', ...CATEGORIES].map((value, index) => {
            const active = category === value;
            const { icon: Icon, tile } = value === 'all' ? { icon: Sparkles, tile: 'bg-linear-to-br from-magenta to-saffron text-white' } : CATEGORY_LOOK[value] || DEFAULT_LOOK;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                aria-pressed={active}
                className={`inline-flex shrink-0 animate-fade-up items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                  active ? 'bg-ink text-white shadow-lg shadow-ink/20' : 'glass text-ink/80 hover:bg-white'
                }`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${tile}`}>
                  <Icon className="h-4 w-4" />
                </span>
                {value === 'all' ? t.allCategories : t.categories[value]}
              </button>
            );
          })}
        </div>

        <div id="results" className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[270px_1fr]">
          {/* Filters */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="glass space-y-5 rounded-[28px] p-5 lg:sticky lg:top-44">
              <h2 className="flex items-center gap-2 font-sans text-base font-bold text-ink">
                <SlidersHorizontal className="h-4 w-4 text-magenta" />
                {s.filters}
              </h2>

              <div>
                <label htmlFor="store-district" className="mb-1.5 block text-sm font-semibold text-ink">{s.district}</label>
                <select id="store-district" value={district} onChange={(e) => setDistrict(e.target.value)} className={inputClass(false)}>
                  <option value="all">{s.allDistricts}</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="mb-1.5 block text-sm font-semibold text-ink">{s.price}</legend>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder={s.min} aria-label={`${s.price} ${s.min}`} className={inputClass(false)} />
                  <input type="number" min="0" inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder={s.max} aria-label={`${s.price} ${s.max}`} className={inputClass(false)} />
                </div>
              </fieldset>

              <div>
                <label htmlFor="store-sort" className="mb-1.5 block text-sm font-semibold text-ink">{s.sort}</label>
                <select id="store-sort" value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass(false)}>
                  <option value="newest">{s.sortNewest}</option>
                  <option value="priceLow">{s.sortPriceLow}</option>
                  <option value="priceHigh">{s.sortPriceHigh}</option>
                  <option value="name">{s.sortName}</option>
                </select>
              </div>

              {filtersUsed && (
                <button type="button" onClick={clearFilters} className="w-full rounded-full border border-ink/15 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white">
                  {t.clearFilters}
                </button>
              )}
            </div>
          </aside>

          {/* Products */}
          <section aria-live="polite" className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink/60">
                {status === 'loading' ? '…' : fill(s.showing, { count: visible.length })}
              </p>
              <button
                type="button"
                onClick={() => setShowFilters((open) => !open)}
                aria-expanded={showFilters}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm ring-1 ring-ink/10 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {s.filters}
              </button>
            </div>

            {status === 'examples' && (
              <p className="mt-4 flex items-start gap-2.5 rounded-[20px] bg-turmeric/20 px-4 py-3 text-sm text-ink ring-1 ring-turmeric/40">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
                {s.examples}
              </p>
            )}

            {status === 'loading' ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => <StoreCardSkeleton key={i} />)}
              </div>
            ) : visible.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
                {featuredOffer && (
                  <Reveal key={`offer-${featuredOffer.id}`} animation="zoom-in" className="grid">
                    <OfferSpotlight product={featuredOffer} onOpen={() => openProduct(featuredOffer)} />
                  </Reveal>
                )}
                {gridProducts.map((product, index) => (
                  <Reveal key={product.id} delay={(index % 3) * 80} className="grid">
                    <StoreCard product={product} onOpen={() => openProduct(product)} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="mt-5 animate-fade-up rounded-[28px] border border-dashed border-ink/15 bg-white/70 px-6 py-16 text-center">
                <PackageSearch className="mx-auto h-12 w-12 text-ink/25" />
                <p className="mt-4 font-bold text-ink">{t.noResults}</p>
                <p className="mt-1 text-sm text-ink/55">{t.noResultsSub}</p>
                <button type="button" onClick={clearFilters} className="btn-shine mt-5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta">
                  {t.clearFilters}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Sell on the Store */}
        <Reveal
          animation="zoom-in"
          className="relative isolate mt-16 overflow-hidden rounded-[40px] bg-linear-to-br from-magenta-dark via-magenta to-saffron px-6 py-10 text-white shadow-2xl shadow-magenta/20 sm:px-12 sm:py-12"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-12 -z-10 h-40 w-40 animate-spin-slow rounded-full border-2 border-dashed border-white/25" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 right-10 -z-10 h-56 w-56 rounded-full bg-turmeric/40 blur-3xl" />
          <Sparkle className="pointer-events-none absolute right-[35%] top-6 -z-10 h-5 w-5 animate-twinkle text-white/80" />

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                <Store className="h-3.5 w-3.5" />
                {t.navSellers}
              </span>
              <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{s.sellTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">{isSeller ? s.sellerText : s.sellText}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              {isSeller ? (
                <>
                  <Link href="/dashboard#add-product" className="btn-shine group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink shadow-lg transition-colors hover:bg-turmeric">
                    <PackagePlus className="h-4 w-4" />
                    {s.addProduct}
                  </Link>
                  <Link href="/dashboard#orders" className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/10">
                    <LayoutDashboard className="h-4 w-4" />
                    {s.myOrders}
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="btn-shine group inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-ink shadow-lg transition-colors hover:bg-turmeric">
                    {t.register.submit}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/support#seller-guide" className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-white/40 transition-colors hover:bg-white/10">
                    <BookOpen className="h-4 w-4" />
                    {t.home.guideBtn}
                  </Link>
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {selected && <QuickView key={selected.id} product={selected} onClose={closeProduct} />}
    </main>
  );
}
