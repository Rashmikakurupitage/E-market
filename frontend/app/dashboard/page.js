'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Package, MessageCircle, TrendingUp, MapPin, LoaderCircle, CircleAlert, X,
  Hourglass, CircleX, RefreshCw, Trash2, CircleCheck,
} from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated, clearSession, updateSessionUser, homePathFor } from '../../src/lib/auth';
import { CATEGORIES, formatPrice, initials } from '../../src/lib/catalog';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import ProductThumb from '../../src/components/ProductThumb';
import SellerStatusBadge from '../../src/components/SellerStatusBadge';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import ContactDetails from '../../src/components/ContactDetails';
import Reveal from '../../src/components/Reveal';
import CountUp from '../../src/components/CountUp';
import { SellerOrders } from '../../src/components/Orders';
import { Lotus, PageArt } from '../../src/components/Art';

const isAuthError = (err) => [401, 403].includes(err.response?.status);

// Seller account + their products with WhatsApp click counts
async function fetchDashboard() {
  const [me, products] = await Promise.all([API.get('/auth/me'), API.get('/products/my-products')]);
  return { user: me.data.user, products: products.data };
}

const STAT_TONES = {
  green: 'from-brand-500 to-brand-700 shadow-brand-600/30',
  dark: 'from-brand-600 to-brand-800 shadow-brand-700/30',
  gold: 'from-turmeric to-saffron shadow-saffron/30',
};

function StatCard({ icon: Icon, label, value, sub, tone = 'green', delay = 0 }) {
  const gradient = STAT_TONES[tone];
  return (
    <Reveal animation="zoom-in" delay={delay} className="grid">
      <div className="group relative flex items-center gap-4 overflow-hidden rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <span aria-hidden="true" className={`absolute -right-8 -top-8 h-28 w-28 rounded-full bg-linear-to-br opacity-10 transition-transform duration-500 group-hover:scale-125 ${gradient}`} />
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${gradient}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="relative">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900">
            <CountUp value={value} />
          </p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </Reveal>
  );
}

function AddProductModal({ onClose, onAdded }) {
  const { t } = useLanguage();
  const f = t.dash.form;
  const [form, setForm] = useState({ title: '', price: '', category: CATEGORIES[0], imageUrl: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const closeOnEscape = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await API.post('/products', {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        price: form.price === '' ? null : Number(form.price),
        images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
      });
      onAdded();
    } catch {
      setError(f.error);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-product-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="add-product-title" className="text-lg font-extrabold text-slate-900">{f.title}</h2>
          <button type="button" onClick={onClose} aria-label={f.cancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-sand/60 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <Field id="title" label={f.name} required>
            <input id="title" name="title" required value={form.title} onChange={update} className={inputClass(false)} placeholder={f.namePlaceholder} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="price" label={f.price}>
              <input id="price" name="price" type="number" min="0" step="any" value={form.price} onChange={update} className={inputClass(false)} placeholder="2500" />
            </Field>
            <Field id="category" label={f.category} required>
              <select id="category" name="category" value={form.category} onChange={update} className={inputClass(false)}>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t.categories[category]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field id="imageUrl" label={f.imageUrl} hint={f.imageHint}>
            <div className="flex items-center gap-3">
              <input id="imageUrl" name="imageUrl" type="url" value={form.imageUrl} onChange={update} className={inputClass(false)} placeholder="https://..." />
              <ProductThumb key={form.imageUrl} src={form.imageUrl.trim()} alt="" />
            </div>
          </Field>
          <Field id="description" label={f.description} required>
            <textarea id="description" name="description" rows={3} required value={form.description} onChange={update} className={inputClass(false)} placeholder={f.descriptionPlaceholder} />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="w-1/3 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:bg-cream">
              {f.cancel}
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {saving ? f.saving : f.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const d = t.dash;
  const session = useSession();
  const hydrated = useHydrated();
  const role = session?.user?.role;
  const otherAccount = role === 'SUPER_ADMIN' || role === 'CUSTOMER';
  const loggedIn = Boolean(session) && !otherAccount;

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productToRemove, setProductToRemove] = useState(null);
  const [notice, setNotice] = useState('');

  // Hide the "removed" message after a few seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Only logged-in sellers may see this page
  useEffect(() => {
    if (!hydrated) return;
    if (otherAccount) {
      router.replace(homePathFor(role)); // admins and customers have their own pages
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
          // Expired or invalid login: start again from the login page
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
    setReloadKey((key) => key + 1);
  };

  // Called by the confirm box; throwing keeps the box open with an error message
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
      if (err.response?.status !== 404) throw err; // 404 = already gone
    }
    setProducts((current) => current.filter((p) => p.id !== product.id));
    setProductToRemove(null);
    setNotice(fill(d.removed, { title: product.title }));
  };

  if (status === 'loading' || !loggedIn) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <p className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
          {d.loading}
        </p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-sm rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-ink/5">
          <CircleAlert className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-4 font-semibold text-slate-800">{d.loadError}</p>
          <p className="mt-1 text-sm text-slate-500">{t.loginPage.networkError}</p>
          <button type="button" onClick={retry} className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            <RefreshCw className="h-4 w-4" />
            {d.retry}
          </button>
        </div>
      </main>
    );
  }

  const totalClicks = products.reduce((sum, p) => sum + (p.clickCount || 0), 0);
  const weekClicks = products.reduce((sum, p) => sum + (p.clicksThisWeek || 0), 0);
  const profile = user?.profile;
  const sellerStatus = profile?.status || 'PENDING';

  // Keep the page and the saved login (used by the header) in step with the new email/phone
  const contactUpdated = (updatedUser) => {
    setUser(updatedUser);
    updateSessionUser(updatedUser);
  };

  const loggedOut = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <main className="relative isolate flex-1 px-4 py-8 sm:py-10">
      <PageArt />
      <div className="mx-auto max-w-6xl space-y-6">
        {notice && (
          <div role="status" className="flex items-center gap-2.5 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
            <CircleCheck className="h-5 w-5 shrink-0 text-brand-600" />
            {notice}
          </div>
        )}

        {/* Welcome */}
        <Reveal as="section" animation="fade-down" className="relative isolate flex flex-col gap-5 overflow-hidden rounded-[32px] bg-ink p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-10 -top-16 -z-10 h-48 w-48 animate-float rounded-full bg-magenta/50 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-10 -z-10 h-56 w-56 animate-float rounded-full bg-saffron/35 blur-3xl [animation-delay:-4s]" />
          <Lotus color="white" className="pointer-events-none absolute -bottom-3 right-1/3 -z-10 hidden w-40 opacity-40 md:block" />

          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-xl font-extrabold text-brand-700 shadow-lg ring-4 ring-white/25">
              {initials(profile?.businessName) || '?'}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-turmeric">{d.title}</p>
              <h1 className="break-words text-xl font-extrabold sm:text-3xl">
                {fill(d.welcome, { name: profile?.businessName || '' })}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile?.district}
                </span>
                <SellerStatusBadge status={sellerStatus} />
              </div>
            </div>
          </div>
          <button
            id="add-product"
            type="button"
            onClick={() => setShowAddProduct(true)}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-turmeric px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-saffron/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-turmeric/85 hover:shadow-xl active:translate-y-0"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            {d.addProduct}
          </button>
        </Reveal>

        {/* Until approved, products don't appear on the website */}
        {sellerStatus === 'PENDING' && (
          <p className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
            <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            {d.pendingNote}
          </p>
        )}
        {sellerStatus === 'REJECTED' && (
          <p className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
            <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            {d.rejectedNote}
          </p>
        )}

        {/* Results */}
        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Package} label={d.statProducts} value={products.length} tone="green" />
          <StatCard icon={MessageCircle} label={d.statClicks} value={totalClicks} sub={d.statClicksSub} tone="dark" delay={100} />
          <StatCard icon={TrendingUp} label={d.statWeek} value={weekClicks} sub={d.statWeekSub} tone="gold" delay={200} />
        </section>
        <p className="px-1 text-xs leading-relaxed text-slate-500">{d.resultsNote}</p>

        {/* Products */}
        <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
          <h2 className="font-sans border-b border-slate-100 px-6 py-4 text-sm font-bold uppercase tracking-wider text-slate-800">{d.myProducts}</h2>

          {products.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Package className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 font-semibold text-slate-800">{d.noProducts}</p>
              <p className="mt-1 text-sm text-slate-500">{d.noProductsSub}</p>
              <button
                type="button"
                onClick={() => setShowAddProduct(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-4 w-4" />
                {d.addProduct}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {products.map((product, index) => (
                <Reveal as="li" delay={Math.min(index, 8) * 60} key={product.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream">
                  <ProductThumb src={product.images?.[0]} alt={product.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{product.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {t.categories[product.category] || product.category} · {formatPrice(product.price) || t.priceOnRequest}
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 sm:inline">
                    +{product.clicksThisWeek || 0} {d.thisWeek}
                  </span>
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-lg font-extrabold text-slate-900">{product.clickCount || 0}</p>
                    <p className="text-[11px] text-slate-500">{d.enquiries}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductToRemove(product)}
                    aria-label={`${d.remove}: ${product.title}`}
                    title={d.remove}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-transparent p-2 text-sm font-semibold text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden md:inline">{d.remove}</span>
                  </button>
                </Reveal>
              ))}
            </ul>
          )}
        </section>

        {/* Orders customers placed in the Store */}
        <SellerOrders onAuthError={loggedOut} />

        {/* Email, phone and the WhatsApp number customers order on */}
        <Reveal><ContactDetails user={user} onUpdated={contactUpdated} onAuthError={loggedOut} /></Reveal>
      </div>

      {showAddProduct && <AddProductModal onClose={() => setShowAddProduct(false)} onAdded={productAdded} />}
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
    </main>
  );
}
