'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Package,
  MessageCircle,
  TrendingUp,
  MapPin,
  LoaderCircle,
  CircleAlert,
  X,
  Tag,
  Hourglass,
  CircleX,
  RefreshCw,
  Trash2,
  CircleCheck,
  LayoutDashboard,
  ClipboardList,
  Settings,
  Search,
  Store,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated, clearSession, updateSessionUser, homePathFor } from '../../src/lib/auth';
import { CATEGORIES, formatPrice, initials, cleanMessengerUrl } from '../../src/lib/catalog';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import ProductThumb from '../../src/components/ProductThumb';
import PriceTag from '../../src/components/DiscountBadge';
import SellerDiscountDialog from '../../src/components/SellerDiscountDialog';
import SellerStatusBadge from '../../src/components/SellerStatusBadge';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import ProductPhotosField from '../../src/components/ProductPhotosField';
import ContactDetails from '../../src/components/ContactDetails';
import Reveal from '../../src/components/Reveal';
import CountUp from '../../src/components/CountUp';
import { SellerOrders } from '../../src/components/Orders';
import ProfilePhotoEditor from '../../src/components/ProfilePhotoEditor';
import { profilePhotoUrl } from '../../src/lib/profilePhoto';
import { Lotus, PageArt } from '../../src/components/Art';
import DashboardSidebar from '../../src/components/DashboardSidebar';
import SellerInsights from '../../src/components/SellerInsights';
import Portal from '../../src/components/Portal';

const isAuthError = (err) => [401, 403].includes(err.response?.status);

// Seller account + their products with WhatsApp click counts
async function fetchDashboard() {
  const [me, products] = await Promise.all([
    API.get('/auth/me', { timeout: 15000 }),
    API.get('/products/my-products', { timeout: 15000 }),
  ]);
  if (!me.data?.user || !Array.isArray(products.data)) {
    throw new Error('Invalid seller dashboard response');
  }
  return { user: me.data.user, products: products.data };
}

const STAT_TONES = {
  green: 'from-brand-500 to-brand-700 shadow-brand-600/30',
  dark: 'from-brand-600 to-brand-800 shadow-brand-700/30',
  gold: 'from-turmeric to-saffron shadow-saffron/30',
  magenta: 'from-magenta to-saffron shadow-magenta/30',
};

function StatCard({ icon: Icon, label, value, sub, tone = 'green', trend, delay = 0, onClick }) {
  const gradient = STAT_TONES[tone] || STAT_TONES.green;
  return (
    <Reveal animation="zoom-in" delay={delay} className="grid">
      <div
        onClick={onClick}
        className={`group relative flex items-center gap-4 overflow-hidden rounded-[26px] border border-ink/5 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-slate-900 ${
          onClick ? 'cursor-pointer hover:border-magenta' : ''
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-linear-to-br opacity-10 transition-transform duration-500 group-hover:scale-125 ${gradient}`}
        />
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-md transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${gradient}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {label}
            </p>
            {trend && (
              <span className="hidden sm:inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                {trend}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
            <CountUp value={value} />
          </p>
          {sub && <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
      </div>
    </Reveal>
  );
}

function AddProductModal({ onClose, onAdded, sellerStatus }) {
  const { t, lang } = useLanguage();
  const f = t.dash.form;
  const isApproved = sellerStatus === 'APPROVED';
  const isRejected = sellerStatus === 'REJECTED';
  const [form, setForm] = useState({
    title: '',
    price: '',
    category: CATEGORIES[0],
    discountPercent: '',
    discountEndsAt: '',
    messengerUrl: '',
    description: '',
  });
  const [photos, setPhotos] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [messengerError, setMessengerError] = useState('');

  useEffect(() => {
    const closeOnEscape = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'messengerUrl') setMessengerError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!isApproved) {
      setError(
        isRejected
          ? (lang === 'si' ? 'ඔබේ අලෙවිකරු ගිණුම ප්‍රතික්ෂේප කර ඇත. ඔබට නව භාණ්ඩ එක් කළ නොහැක.' : 'Your seller account has been rejected. You cannot add products.')
          : (lang === 'si' ? 'ඔබේ අලෙවිකරු ගිණුම තවමත් අනුමත වී නැත.' : 'Your seller account is pending approval.')
      );
      return;
    }
    setError('');
    if (cleanMessengerUrl(form.messengerUrl) === null) {
      setMessengerError(f.messengerInvalid);
      document.getElementById('messengerUrl')?.focus();
      return;
    }
    setMessengerError('');
    setSaving(true);
    try {
      await API.post('/products', {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price: form.price === '' ? null : Number(form.price),
        discountPercent: form.discountPercent === '' ? null : Number(form.discountPercent),
        discountEndsAt: form.discountEndsAt || null,
        images: photos,
        messengerUrl: form.messengerUrl.trim(),
      });
      onAdded();
    } catch (err) {
      const code = err.response?.data?.code;
      setError(
        code === 'TOO_MANY_IMAGES' || code === 'INVALID_IMAGE'
          ? t.productPhotos.errors[code]
          : t.discount.errors[code] ||
            (err.response?.status === 413 ? t.productPhotos.errors.big : f.error)
      );
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-product-title"
          onClick={(e) => e.stopPropagation()}
          className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[22px] sm:rounded-[28px] border border-ink/10 bg-white p-4 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-white"
        >
          <div className="mb-5 flex items-center justify-between border-b border-ink/10 pb-4 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-magenta/10 text-magenta dark:bg-magenta/20 dark:text-magenta-light">
                <Plus className="h-5 w-5" />
              </span>
              <h2 id="add-product-title" className="text-lg font-extrabold">
                {f.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={f.cancel}
              className="rounded-full p-1.5 text-slate-400 hover:bg-ink/5 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isRejected && (
            <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300">
              <CircleX className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>
                {lang === 'si'
                  ? 'ඔබේ අලෙවිකරු ගිණුම ප්‍රතික්ෂේප කර ඇත. ඔබට නව භාණ්ඩ එක් කළ නොහැක.'
                  : lang === 'ta'
                  ? 'உங்கள் கணக்கு நிராகரிக்கப்பட்டது. புதிய தயாரிப்புகளைச் சேர்க்க முடியாது.'
                  : 'Your seller account has been rejected. You cannot add new products.'}
              </span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <Field label={f.name} required>
              <input
                name="title"
                value={form.title}
                onChange={update}
                placeholder={f.namePlaceholder}
                required
                maxLength={120}
                className={inputClass(false)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={f.price}>
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={update}
                  placeholder="0.00"
                  className={inputClass(false)}
                />
              </Field>

              <Field label={f.category} required>
                <select name="category" value={form.category} onChange={update} className={inputClass(false)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t.categories[c] || c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.discount.percent}>
                <input
                  name="discountPercent"
                  type="number"
                  min="1"
                  max="90"
                  value={form.discountPercent}
                  onChange={update}
                  placeholder="e.g. 15"
                  className={inputClass(false)}
                />
              </Field>
              <Field label={t.discount.endsAt}>
                <input
                  name="discountEndsAt"
                  type="date"
                  value={form.discountEndsAt}
                  onChange={update}
                  className={inputClass(false)}
                />
              </Field>
            </div>

            <Field label={f.messenger} hint={f.messengerHint}>
              <input
                id="messengerUrl"
                name="messengerUrl"
                value={form.messengerUrl}
                onChange={update}
                placeholder="https://m.me/yourpage or username"
                className={inputClass(Boolean(messengerError))}
              />
              {messengerError && <p className="mt-1 text-xs text-red-500">{messengerError}</p>}
            </Field>

            <Field label={f.desc}>
              <textarea
                name="description"
                value={form.description}
                onChange={update}
                rows={3}
                placeholder={f.descPlaceholder}
                className={inputClass(false)}
              />
            </Field>

            <ProductPhotosField value={photos} photos={photos} onChange={setPhotos} />

            {error && (
              <p className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-full px-4 py-2 text-xs font-bold text-slate-500 hover:bg-ink/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                {f.cancel}
              </button>
              <button
                type="submit"
                disabled={saving || !isApproved}
                className="btn-shine inline-flex items-center gap-2 rounded-full bg-linear-to-r from-magenta to-saffron px-5 py-2 text-xs font-bold text-white shadow-md shadow-magenta/25 hover:opacity-95 disabled:opacity-50"
              >
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {saving ? f.saving : f.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();
  const { t, lang } = useLanguage();
  const d = t.dash;

  const role = session?.user?.role;
  const loggedIn = Boolean(session?.token);
  const isSeller = role === 'SELLER';
  const otherAccount = loggedIn && !isSeller;

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productToRemove, setProductToRemove] = useState(null);
  const [productToDiscount, setProductToDiscount] = useState(null);
  const [notice, setNotice] = useState('');
  const [section, setSection] = useState('overview'); // 'overview' | 'products' | 'orders' | 'settings'

  // Product inventory search & filter
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const contactUpdated = useCallback((updatedUser) => {
    setUser(updatedUser);
    updateSessionUser(updatedUser);
  }, []);

  const loggedOut = useCallback(() => {
    clearSession();
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Auth gate
  useEffect(() => {
    if (!hydrated) return;
    if (otherAccount) {
      router.replace(homePathFor(role));
      return;
    }
    if (!loggedIn) {
      router.replace('/login');
      return;
    }

    let ignore = false;
    fetchDashboard()
      .then((data) => {
        if (ignore) return;
        setUser(data.user);
        setProducts(data.products);
        setStatus('ready');
      })
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) {
          clearSession();
          router.replace('/login');
        } else {
          setStatus('error');
        }
      });

    return () => {
      ignore = true;
    };
  }, [hydrated, loggedIn, otherAccount, role, router, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const productAdded = () => {
    setShowAddProduct(false);
    setSection('products');
    setReloadKey((key) => key + 1);
  };

  const discountSaved = (updatedProduct) => {
    setProducts((current) =>
      current.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  const removeProduct = async () => {
    const product = productToRemove;
    try {
      await API.delete(`/products/${product.id}`);
    } catch (err) {
      if (isAuthError(err)) {
        clearSession();
        router.replace('/login');
        return;
      }
      if (err.response?.status !== 404) throw err;
    }
    setProducts((current) => current.filter((p) => p.id !== product.id));
    setProductToRemove(null);
    setNotice(fill(d.removed, { title: product.title }));
  };

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchQuery && matchCat;
    });
  }, [products, productSearch, selectedCategory]);

  if (status === 'loading' || !loggedIn) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4 py-20 dark:bg-slate-950">
        <p className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
          <LoaderCircle className="h-5 w-5 animate-spin text-magenta" />
          {d.loading}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4 py-20 dark:bg-slate-950">
        <div className="max-w-sm rounded-[28px] border border-ink/10 bg-white p-8 text-center shadow-lg dark:border-white/10 dark:bg-slate-900">
          <CircleAlert className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 font-bold text-slate-900 dark:text-white">{d.loadError}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.loginPage?.networkError || 'Network error'}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-magenta to-saffron px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {d.retry}
          </button>
        </div>
      </div>
    );
  }

  const totalClicks = products.reduce((sum, p) => sum + (p.clickCount || 0), 0);
  const weekClicks = products.reduce((sum, p) => sum + (p.clicksThisWeek || 0), 0);
  const discountedCount = products.filter((p) => p.discountPercent > 0).length;
  const profile = user?.profile;
  const ownerName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') ||
    profile?.businessName ||
    '';
  const sellerStatus = profile?.status || 'PENDING';

  const menu = [
    { value: 'overview', label: t.admin?.tabOverview || 'Overview', icon: LayoutDashboard },
    { value: 'products', label: d.myProducts, icon: Package, badge: products.length },
    { value: 'orders', label: t.orders?.sellerTitle || 'Orders', icon: ClipboardList },
    { value: 'settings', label: t.contactEdit?.title || 'Settings', icon: Settings },
  ];

  const topActions = sellerStatus === 'APPROVED' ? (
    <button
      type="button"
      onClick={() => setShowAddProduct(true)}
      className="btn-shine inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-magenta to-saffron px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-magenta/20 transition-all hover:opacity-95 active:scale-95"
    >
      <Plus className="h-3.5 w-3.5" />
      <span>{d.addProduct}</span>
    </button>
  ) : null;

  return (
    <div className="relative isolate min-h-screen w-full">
      <PageArt />
      <DashboardSidebar
        items={menu}
        active={section}
        onSelect={setSection}
        name={ownerName}
        photoUrl={profilePhotoUrl(user)}
        subtitle={user?.email}
        roleLabel={d.seller || 'Seller'}
        status={sellerStatus}
        statusLabel={d.status?.[sellerStatus] || sellerStatus}
        onLogout={loggedOut}
        menuLabel={d.title}
        backHref="/store"
        backLabel={lang === 'si' ? 'වෙළඳසැලට ආපසු' : lang === 'ta' ? 'கடைக்குத் திரும்பு' : 'Back to Store'}
        topActions={topActions}
        card={sellerStatus === 'APPROVED' ? {
          icon: Plus,
          title: d.addProduct,
          text: fill(d.statProducts + ': {count}', { count: products.length }),
          label: d.addProduct,
          onClick: () => setShowAddProduct(true),
        } : null}
      >
        {notice && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2.5 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800"
          >
            <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{notice}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: EXECUTIVE OVERVIEW                                */}
        {/* ============================================================ */}
        {section === 'overview' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Executive Welcome Hero Banner */}
            <Reveal
              as="section"
              animation="fade-down"
              className="relative isolate flex flex-col gap-5 sm:gap-6 overflow-hidden rounded-[24px] sm:rounded-[32px] bg-slate-950 p-4 sm:p-8 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div
                aria-hidden="true"
                className="pattern-batik pointer-events-none absolute inset-0 -z-10 opacity-70"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-16 -z-10 h-48 w-48 animate-float rounded-full bg-magenta/45 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-20 right-10 -z-10 h-56 w-56 animate-float rounded-full bg-saffron/30 blur-3xl [animation-delay:-4s]"
              />
              <Lotus
                color="white"
                className="pointer-events-none absolute -bottom-3 right-1/3 -z-10 hidden w-44 opacity-35 md:block"
              />

              <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 sm:gap-5">
                <ProfilePhotoEditor
                  user={user}
                  name={ownerName}
                  onChanged={contactUpdated}
                  onAuthError={loggedOut}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-turmeric ring-1 ring-white/15">
                      <ShieldCheck className="h-3 w-3" />
                      {profile?.businessName || 'Artisan Direct Store'}
                    </span>
                    <SellerStatusBadge status={sellerStatus} />
                  </div>
                  <h1 className="break-words text-lg font-extrabold sm:text-2xl lg:text-3xl">
                    {fill(d.welcome, { name: ownerName })}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-white/70">
                    <span className="truncate max-w-[170px] sm:max-w-none">{user?.email}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <Sparkles className="h-3 w-3" />
                      100% Direct to Artisan
                    </span>
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                {sellerStatus === 'APPROVED' ? (
                  <button
                    id="add-product-hero"
                    type="button"
                    onClick={() => setShowAddProduct(true)}
                    className="btn-shine flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-turmeric px-4 py-2.5 sm:px-5 sm:py-3 text-xs font-extrabold uppercase tracking-wider text-slate-900 shadow-lg shadow-saffron/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-turmeric/90 hover:shadow-xl active:translate-y-0"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{d.addProduct}</span>
                  </button>
                ) : (
                  <div className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 sm:py-3 text-xs font-bold text-white/90 backdrop-blur-xs">
                    {sellerStatus === 'REJECTED' ? (
                      <>
                        <CircleX className="h-4 w-4 text-rose-400 shrink-0" />
                        <span>{lang === 'si' ? 'ගිණුම ප්‍රතික්ෂේප කර ඇත' : lang === 'ta' ? 'கணக்கு நிராகரிக்கப்பட்டது' : 'Account Rejected'}</span>
                      </>
                    ) : (
                      <>
                        <Hourglass className="h-4 w-4 text-amber-300 shrink-0" />
                        <span>{lang === 'si' ? 'අනුමැතිය බලාපොරොත්තුවෙන්' : lang === 'ta' ? 'ஒப்புதலுக்காகக் காத்திருக்கிறது' : 'Pending Approval'}</span>
                      </>
                    )}
                  </div>
                )}
                <Link
                  href="/store"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 sm:py-3 text-xs font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/20"
                >
                  <Store className="h-4 w-4" />
                  <span className="inline">
                    {lang === 'si' ? 'වෙළඳසැල බලන්න' : lang === 'ta' ? 'கடையைப் பார்வையිடு' : 'Visit Storefront'}
                  </span>
                </Link>
              </div>
            </Reveal>

            {/* Seller Account Status Alerts */}
            {sellerStatus === 'PENDING' && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs font-medium text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200">
                <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="font-bold">{d.status.PENDING}</p>
                  <p className="mt-0.5 leading-relaxed text-amber-800 dark:text-amber-300">
                    {d.pendingNote}
                  </p>
                </div>
              </div>
            )}
            {sellerStatus === 'REJECTED' && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-medium text-red-900 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-200">
                <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div className="min-w-0">
                  <p className="font-bold">{d.status.REJECTED}</p>
                  <p className="mt-0.5 leading-relaxed text-red-800 dark:text-red-300">
                    {d.rejectedNote}
                  </p>
                </div>
              </div>
            )}

            {/* 4-Card Executive KPI Metrics */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={Package}
                label={d.statProducts}
                value={products.length}
                sub={`${discountedCount} on active promotion`}
                tone="green"
                trend="Active Catalog"
                onClick={() => setSection('products')}
              />
              <StatCard
                icon={MessageCircle}
                label={d.statClicks}
                value={totalClicks}
                sub={d.statClicksSub}
                tone="dark"
                trend="Direct Leads"
                delay={100}
              />
              <StatCard
                icon={TrendingUp}
                label={d.statWeek}
                value={weekClicks}
                sub={d.statWeekSub}
                tone="gold"
                trend="+High Interest"
                delay={200}
              />
              <StatCard
                icon={ClipboardList}
                label={t.orders?.sellerTitle || 'Orders'}
                value={0}
                sub="Live store pipeline"
                tone="magenta"
                trend="Store Orders"
                delay={300}
                onClick={() => setSection('orders')}
              />
            </section>

            {/* Quick Action Shortcuts Hub */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                disabled={sellerStatus !== 'APPROVED'}
                onClick={() => sellerStatus === 'APPROVED' && setShowAddProduct(true)}
                className={`group flex flex-col justify-between rounded-2xl border p-4 text-left shadow-xs transition-all ${
                  sellerStatus !== 'APPROVED'
                    ? 'border-ink/10 bg-slate-50 opacity-60 cursor-not-allowed dark:border-white/5 dark:bg-slate-900/40'
                    : 'border-ink/10 bg-white hover:border-magenta hover:bg-magenta/5 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-magenta'
                }`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-magenta/10 text-magenta transition-transform group-hover:scale-110">
                  <Plus className="h-5 w-5" />
                </span>
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-ink dark:text-white">{d.addProduct}</h4>
                  <p className="mt-0.5 text-[11px] text-ink/60 dark:text-slate-400">
                    {sellerStatus === 'REJECTED'
                      ? (lang === 'si' ? 'ගිණුම ප්‍රතික්ෂේප කර ඇති බැවින් නිෂ්පාදන එක් කළ නොහැක' : lang === 'ta' ? 'கணக்கு நிராகரிக்கப்பட்டதால் தயாரிப்புகளைச் சேர்க்க முடியாது' : 'Account rejected: cannot add products')
                      : sellerStatus === 'PENDING'
                      ? (lang === 'si' ? 'අනුමැතිය ලැබෙන තෙක් රැඳී සිටින්න' : lang === 'ta' ? 'ஒப்புதலுக்காக காத்திருக்கவும்' : 'Pending approval to list products')
                      : 'List a new handcrafted product with photos'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSection('products')}
                className="group flex flex-col justify-between rounded-2xl border border-ink/10 bg-white p-4 text-left shadow-xs transition-all hover:border-turmeric hover:bg-turmeric/5 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-turmeric"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-turmeric/15 text-turmeric transition-transform group-hover:scale-110">
                  <Tag className="h-5 w-5" />
                </span>
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-ink dark:text-white">
                    {t.discount?.set || 'Promote & Discount'}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-ink/60 dark:text-slate-400">
                    Set percentage sales to attract more shoppers
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSection('orders')}
                className="group flex flex-col justify-between rounded-2xl border border-ink/10 bg-white p-4 text-left shadow-xs transition-all hover:border-brand-500 hover:bg-brand-50/50 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-brand-500"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-transform group-hover:scale-110 dark:bg-brand-950/40 dark:text-brand-400">
                  <ClipboardList className="h-5 w-5" />
                </span>
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-ink dark:text-white">
                    {t.orders?.sellerTitle || 'Manage Orders'}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-ink/60 dark:text-slate-400">
                    Track delivery stages & confirm orders
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSection('settings')}
                className="group flex flex-col justify-between rounded-2xl border border-ink/10 bg-white p-4 text-left shadow-xs transition-all hover:border-slate-500 hover:bg-slate-50 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-slate-400"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-transform group-hover:scale-110 dark:bg-slate-800 dark:text-slate-300">
                  <Settings className="h-5 w-5" />
                </span>
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-ink dark:text-white">
                    {t.contactEdit?.title || 'Store Profile'}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-ink/60 dark:text-slate-400">
                    Keep WhatsApp contact & profile updated
                  </p>
                </div>
              </button>
            </section>

            {/* Performance Insights & Best Practices */}
            <SellerInsights
              profile={profile}
              productCount={products.length}
              onAddProduct={sellerStatus === 'APPROVED' ? () => setShowAddProduct(true) : undefined}
              onNavigate={setSection}
              onAuthError={loggedOut}
            />

            {/* Recent Products Snapshot */}
            {products.length > 0 && (
              <section className="overflow-hidden rounded-[28px] border border-ink/10 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-ink/10 pb-4 dark:border-white/10">
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-ink dark:text-white">
                      {d.myProducts}
                    </h3>
                    <p className="text-xs text-ink/50 dark:text-slate-400">
                      Recently updated handcrafted products in your inventory
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSection('products')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-magenta hover:underline"
                  >
                    <span>View all ({products.length})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {products.slice(0, 3).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3.5 rounded-2xl border border-ink/5 bg-sand/20 p-3 transition-colors hover:border-magenta/30 dark:border-white/5 dark:bg-slate-800/40"
                    >
                      <ProductThumb src={product.images?.[0]} alt={product.title} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-ink dark:text-white">
                          {product.title}
                        </p>
                        <p className="truncate text-[11px] text-ink/50 dark:text-slate-400">
                          {t.categories[product.category] || product.category} ·{' '}
                          <PriceTag product={product} />
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProductToDiscount(product)}
                        title={product.discountPercent ? t.discount?.edit : t.discount?.set}
                        className="rounded-lg p-1.5 text-ink/50 hover:bg-magenta/10 hover:text-magenta dark:text-slate-400"
                      >
                        <Tag className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 2: PRODUCTS INVENTORY HUB                            */}
        {/* ============================================================ */}
        {section === 'products' && (
          <section className="space-y-6">
            {sellerStatus === 'REJECTED' && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs font-medium text-red-900 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-200">
                <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                <div className="min-w-0">
                  <p className="font-bold">
                    {lang === 'si'
                      ? 'අලෙවිකරු ගිණුම ප්‍රතික්ෂේප කර ඇත'
                      : lang === 'ta'
                      ? 'விற்பனையாளர் கணக்கு நிராகரிக்கப்பட்டது'
                      : 'Seller Account Rejected'}
                  </p>
                  <p className="mt-0.5 leading-relaxed text-red-800 dark:text-red-300">
                    {lang === 'si'
                      ? 'ඔබේ අලෙවිකරු ගිණුම පරිපාලක විසින් ප්‍රතික්ෂේප කර ඇති බැවින්, ඔබේ භාණ්ඩ පොදු වෙළඳසැලෙන් ඉවත් කර ඇති අතර ඔබට නව භාණ්ඩ එක් කළ නොහැක.'
                      : lang === 'ta'
                      ? 'உங்கள் விற்பனையாளர் கணக்கு நிர்வாகியால் நிராகரிக்கப்பட்டதால், உங்கள் தயாரிப்புகள் பொதுக் கடையிலிருந்து அகற்றப்பட்டுள்ளன, மேலும் புதிய தயாரிப்புகளைச் சேர்க்க முடியாது.'
                      : 'Because your seller account has been rejected by an administrator, your products have been removed from the public store and you cannot add new products.'}
                  </p>
                </div>
              </div>
            )}

            {/* Products Search & Category Filter Toolbar */}
            <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40 dark:text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by title or description..."
                  className="w-full rounded-full border border-ink/15 bg-sand/20 py-2 pl-9 pr-4 text-xs font-medium text-ink placeholder:text-ink/40 focus:border-magenta focus:bg-white focus:outline-none dark:border-white/15 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink dark:text-slate-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Action and counter */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-ink/60 dark:text-slate-400">
                  {filteredProducts.length} of {products.length} products
                </span>
                {sellerStatus === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(true)}
                    className="btn-shine inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-magenta to-saffron px-4 py-2 text-xs font-bold text-white shadow-md shadow-magenta/20 transition-all hover:opacity-95"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{d.addProduct}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-magenta text-white shadow-xs'
                    : 'border border-ink/10 bg-white text-ink/75 hover:bg-sand/50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                All Categories ({products.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = products.filter((p) => p.category === cat).length;
                if (count === 0 && selectedCategory !== cat) return null;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                      selectedCategory === cat
                        ? 'bg-magenta text-white shadow-xs'
                        : 'border border-ink/10 bg-white text-ink/75 hover:bg-sand/50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t.categories[cat] || cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Product Items Table / List */}
            <div className="overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-xs dark:border-white/10 dark:bg-slate-900">
              {filteredProducts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Package className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                  <p className="mt-4 font-bold text-slate-800 dark:text-white">
                    {productSearch ? 'No matching products found' : d.noProducts}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {productSearch
                      ? 'Try clearing your search query or choosing another category'
                      : d.noProductsSub}
                  </p>
                  {(productSearch || sellerStatus === 'APPROVED') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (productSearch) {
                          setProductSearch('');
                          setSelectedCategory('ALL');
                        } else {
                          setShowAddProduct(true);
                        }
                      }}
                      className="mt-5 inline-flex items-center gap-2 rounded-full bg-linear-to-r from-magenta to-saffron px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95"
                    >
                      <Plus className="h-4 w-4" />
                      <span>{productSearch ? 'Clear Filters' : d.addProduct}</span>
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-ink/5 dark:divide-white/5">
                  {filteredProducts.map((product, index) => (
                    <Reveal
                      as="li"
                      delay={Math.min(index, 8) * 40}
                      key={product.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3.5 sm:px-6 sm:py-4 transition-colors hover:bg-sand/20 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ProductThumb src={product.images?.[0]} alt={product.title} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {product.title}
                            </p>
                            {product.discountPercent > 0 && (
                              <span className="rounded-full bg-red-100 px-2 py-0.2 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-400">
                                -{product.discountPercent}% OFF
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold text-magenta">
                              {t.categories[product.category] || product.category}
                            </span>{' '}
                            · <PriceTag product={product} />
                          </p>
                        </div>
                      </div>

                      {/* Performance indicators and actions on mobile */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 border-t border-ink/5 pt-2 sm:border-0 sm:pt-0">
                        {/* Performance indicators */}
                        <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 md:inline">
                          +{product.clicksThisWeek || 0} {d.thisWeek}
                        </span>
                        <div className="w-16 sm:w-20 shrink-0 text-left sm:text-right">
                          <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                            {product.clickCount || 0}
                          </p>
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            {d.enquiries}
                          </p>
                        </div>

                        {/* Actions toolbar */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setProductToDiscount(product)}
                            aria-label={`${
                              product.discountPercent ? t.discount?.edit : t.discount?.set
                            }: ${product.title}`}
                            title={product.discountPercent ? t.discount?.edit : t.discount?.set}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-sand/30 p-2 text-xs font-bold text-ink transition-colors hover:border-magenta hover:bg-magenta/10 hover:text-magenta dark:border-white/10 dark:bg-slate-800 dark:text-white sm:px-3"
                          >
                            <Tag className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">
                              {product.discountPercent ? t.discount?.edit : t.discount?.set}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setProductToRemove(product)}
                            aria-label={`${d.remove}: ${product.title}`}
                            title={d.remove}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-transparent p-2 text-xs font-semibold text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 sm:px-3"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{d.remove}</span>
                          </button>

                          <Link
                            href="/store"
                            title="View on store"
                            className="rounded-xl border border-ink/10 bg-white p-2 text-slate-400 transition-colors hover:bg-ink/5 hover:text-ink dark:border-white/10 dark:bg-slate-800 dark:hover:text-white"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SECTION 3: ORDERS MANAGEMENT                                 */}
        {/* ============================================================ */}
        {section === 'orders' && <SellerOrders onAuthError={loggedOut} />}

        {/* ============================================================ */}
        {/* SECTION 4: STORE SETTINGS & PROFILE                          */}
        {/* ============================================================ */}
        {section === 'settings' && (
          <Reveal className="space-y-6">
            {/* Profile Photo Editor Card */}
            <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-slate-900 sm:p-8">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                {t.profilePhoto?.title || 'Profile Photo'}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                <ProfilePhotoEditor
                  user={user}
                  name={ownerName}
                  onChanged={contactUpdated}
                  onAuthError={loggedOut}
                />
                <div className="min-w-0 max-w-sm">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{ownerName}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {t.profilePhoto?.hint ||
                      'Upload a clear profile photo for your shop or brand to build trust with buyers across Sri Lanka.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact & Business details form */}
            <ContactDetails user={user} onUpdated={contactUpdated} onAuthError={loggedOut} />
          </Reveal>
        )}
      </DashboardSidebar>

      {/* Modals & Dialogs */}
      {showAddProduct && (
        <AddProductModal
          sellerStatus={sellerStatus}
          onClose={() => setShowAddProduct(false)}
          onAdded={productAdded}
        />
      )}
      {productToDiscount && (
        <SellerDiscountDialog
          product={productToDiscount}
          onClose={() => setProductToDiscount(null)}
          onSaved={discountSaved}
          onAuthError={loggedOut}
        />
      )}
      {productToRemove && (
        <ConfirmDialog
          title={d.removeTitle}
          text={fill(d.removeText, { title: productToRemove.title })}
          confirmLabel={d.removeConfirm}
          busyLabel={d.removing}
          cancelLabel={d.form.cancel}
          errorText={d.removeError}
          onConfirm={removeProduct}
          onClose={() => setProductToRemove(null)}
        />
      )}
    </div>
  );
}
