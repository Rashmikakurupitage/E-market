'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Hourglass, BadgeCheck, Package, MessageCircle, Search, MapPin, Mail, Phone, IdCard,
  ChevronDown, ChevronUp, Eye, EyeOff, Trash2, CircleCheck, CircleAlert, LoaderCircle,
  Users, CalendarDays, ShieldCheck,
} from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated, clearSession } from '../../src/lib/auth';
import { formatPrice, initials, toWhatsAppNumber, formatPhone } from '../../src/lib/catalog';
import ProductThumb from '../../src/components/ProductThumb';
import SellerStatusBadge from '../../src/components/SellerStatusBadge';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import WhatsAppIcon from '../../src/components/WhatsAppIcon';

const isAuthError = (err) => [401, 403].includes(err.response?.status);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// 'onSite' | 'waiting' (seller not approved) | 'hidden' (hidden by an admin)
const productVisibility = (product) =>
  !product.isPublished ? 'hidden' : product.seller?.status === 'APPROVED' ? 'onSite' : 'waiting';

const VISIBILITY_STYLES = {
  onSite: 'bg-brand-50 text-brand-700 ring-brand-200',
  waiting: 'bg-amber-50 text-amber-800 ring-amber-200',
  hidden: 'bg-slate-100 text-slate-600 ring-slate-200',
};

// Search box that waits until typing stops before searching
function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function StatCard({ icon: Icon, label, value, sub, highlight }) {
  return (
    <div className={`flex items-center gap-4 rounded-2xl p-5 shadow-sm ring-1 ${highlight ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200'}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${highlight ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-700'}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900">{value ?? '–'}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function Toolbar({ filters, active, onFilter, search, onSearch, placeholder }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => onFilter(filter.value)}
            aria-pressed={active === filter.value}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              active === filter.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter.label}
            {filter.count !== undefined && <span className="ml-1.5 opacity-70">{filter.count}</span>}
          </button>
        ))}
      </div>
      <label className="relative block lg:w-80">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
        />
      </label>
    </div>
  );
}

function ListMessage({ children, loading }) {
  return (
    <p className="flex items-center justify-center gap-2 px-6 py-14 text-center text-sm text-slate-500">
      {loading && <LoaderCircle className="h-4 w-4 animate-spin text-brand-600" />}
      {children}
    </p>
  );
}

function SellerProducts({ sellerId, onAuthError }) {
  const { t } = useLanguage();
  const a = t.admin;
  const [products, setProducts] = useState(null);

  useEffect(() => {
    let ignore = false;
    API.get(`/admin/sellers/${sellerId}/products`)
      .then((res) => !ignore && setProducts(res.data))
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) onAuthError();
        else setProducts([]);
      });
    return () => {
      ignore = true;
    };
  }, [sellerId, onAuthError]);

  if (!products) return <ListMessage loading>{a.loading}</ListMessage>;
  if (products.length === 0) return <p className="px-2 py-4 text-sm text-slate-500">{a.sellerNoProducts}</p>;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {products.map((product) => (
        <li key={product.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <ProductThumb src={product.images?.[0]} alt={product.title} size="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{product.title}</p>
            <p className="truncate text-xs text-slate-500">
              {t.categories[product.category] || product.category} · {formatPrice(product.price) || t.priceOnRequest}
            </p>
            <p className="line-clamp-1 text-xs text-slate-400">{product.description}</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500">{fill(a.enquiryCount, { count: product.clickCount })}</span>
        </li>
      ))}
    </ul>
  );
}

function SellersPanel({ stats, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const a = t.admin;
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const [sellers, setSellers] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    API.get('/admin/sellers', { params: { status: status === 'ALL' ? undefined : status, search: query || undefined } })
      .then((res) => {
        if (ignore) return;
        setSellers(res.data);
        setFailed(false);
      })
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) onAuthError();
        else setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [status, query, reloadKey, onAuthError]);

  const chooseStatus = (value) => {
    setSellers(null);
    setStatus(value);
  };

  const changeStatus = async (seller, newStatus) => {
    setBusyId(seller.id);
    try {
      await API.patch(`/admin/sellers/${seller.id}/status`, { status: newStatus });
      onChanged(fill(newStatus === 'APPROVED' ? a.approvedMsg : a.rejectedMsg, { name: seller.businessName }));
      setReloadKey((key) => key + 1);
    } catch (err) {
      if (isAuthError(err)) onAuthError();
      else onChanged(a.actionError, true);
    } finally {
      setBusyId(null);
    }
  };

  const counts = stats?.sellers;
  const filters = [
    { value: 'PENDING', label: a.sellerFilters.PENDING, count: counts?.PENDING },
    { value: 'APPROVED', label: a.sellerFilters.APPROVED, count: counts?.APPROVED },
    { value: 'REJECTED', label: a.sellerFilters.REJECTED, count: counts?.REJECTED },
    { value: 'ALL', label: a.sellerFilters.ALL },
  ];

  return (
    <>
      <Toolbar filters={filters} active={status} onFilter={chooseStatus} search={search} onSearch={setSearch} placeholder={a.searchSellers} />

      {failed ? (
        <ListMessage>{a.actionError}</ListMessage>
      ) : !sellers ? (
        <ListMessage loading>{a.loading}</ListMessage>
      ) : sellers.length === 0 ? (
        <ListMessage>{a.noSellers}</ListMessage>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sellers.map((seller) => {
            const busy = busyId === seller.id;
            const open = openId === seller.id;
            const whatsapp = toWhatsAppNumber(seller.whatsappNo);
            return (
              <li key={seller.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800">
                      {initials(seller.businessName) || '?'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{seller.businessName}</p>
                        <SellerStatusBadge status={seller.status} />
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{seller.district}</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fill(a.registered, { date: formatDate(seller.createdAt) })}</span>
                      </p>
                      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-slate-700 sm:grid-cols-2">
                        <div className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><dt className="sr-only">{a.email}</dt><dd className="truncate">{seller.email}</dd></div>
                        <div className="flex items-center gap-2"><IdCard className="h-4 w-4 shrink-0 text-slate-400" /><dt className="text-slate-500">{a.nic}</dt><dd className="font-medium">{seller.nicNumber}</dd></div>
                        <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-slate-400" /><dt className="sr-only">{a.phone}</dt><dd>{seller.phone}</dd></div>
                        {whatsapp && (
                          <div className="flex items-center gap-2"><WhatsAppIcon className="h-4 w-4 shrink-0 text-slate-400" /><dt className="sr-only">{a.whatsapp}</dt><dd>{formatPhone(whatsapp)}</dd></div>
                        )}
                      </dl>
                      {seller.description && <p className="mt-2 text-sm italic text-slate-500">“{seller.description}”</p>}
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : seller.id)}
                        aria-expanded={open}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
                      >
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {open ? a.hideProducts : a.showProducts}
                        <span className="font-normal text-slate-500">
                          ({fill(a.productCount, { count: seller.productCount })} · {fill(a.enquiryCount, { count: seller.clickCount })})
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 lg:flex-col xl:flex-row">
                    {seller.status !== 'APPROVED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(seller, 'APPROVED')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                      >
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        {a.approve}
                      </button>
                    )}
                    {seller.status !== 'REJECTED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(seller, 'REJECTED')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {a.reject}
                      </button>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <SellerProducts sellerId={seller.id} onAuthError={onAuthError} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ProductsPanel({ onChanged, onAuthError }) {
  const { t } = useLanguage();
  const a = t.admin;
  const [visibility, setVisibility] = useState('all');
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toRemove, setToRemove] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    API.get('/admin/products', { params: { visibility: visibility === 'all' ? undefined : visibility, search: query || undefined } })
      .then((res) => {
        if (ignore) return;
        setProducts(res.data);
        setFailed(false);
      })
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) onAuthError();
        else setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [visibility, query, reloadKey, onAuthError]);

  const chooseVisibility = (value) => {
    setProducts(null);
    setVisibility(value);
  };

  const togglePublished = async (product) => {
    setBusyId(product.id);
    try {
      await API.patch(`/admin/products/${product.id}`, { isPublished: !product.isPublished });
      onChanged(fill(product.isPublished ? a.hiddenMsg : a.shownMsg, { title: product.title }));
      setReloadKey((key) => key + 1);
    } catch (err) {
      if (isAuthError(err)) onAuthError();
      else onChanged(a.actionError, true);
    } finally {
      setBusyId(null);
    }
  };

  // Called by the confirm box; throwing keeps it open with an error message
  const removeProduct = async () => {
    try {
      await API.delete(`/admin/products/${toRemove.id}`);
    } catch (err) {
      if (isAuthError(err)) return onAuthError();
      if (err.response?.status !== 404) throw err;
    }
    onChanged(fill(t.dash.removed, { title: toRemove.title }));
    setToRemove(null);
    setReloadKey((key) => key + 1);
  };

  const filters = ['all', 'onSite', 'waiting', 'hidden'].map((value) => ({ value, label: a.productFilters[value] }));

  return (
    <>
      <Toolbar filters={filters} active={visibility} onFilter={chooseVisibility} search={search} onSearch={setSearch} placeholder={a.searchProducts} />

      {failed ? (
        <ListMessage>{a.actionError}</ListMessage>
      ) : !products ? (
        <ListMessage loading>{a.loading}</ListMessage>
      ) : products.length === 0 ? (
        <ListMessage>{a.noProducts}</ListMessage>
      ) : (
        <ul className="divide-y divide-slate-100">
          {products.map((product) => {
            const state = productVisibility(product);
            const busy = busyId === product.id;
            return (
              <li key={product.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <ProductThumb src={product.images?.[0]} alt={product.title} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{product.title}</p>
                    <p className="truncate text-xs text-slate-500">
                      {product.seller?.businessName} · {product.seller?.district} · {t.categories[product.category] || product.category} ·{' '}
                      {formatPrice(product.price) || t.priceOnRequest}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${VISIBILITY_STYLES[state]}`}>
                        {a.productFilters[state]}
                      </span>
                      <span className="text-xs text-slate-500">{fill(a.enquiryCount, { count: product.clickCount })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => togglePublished(product)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : product.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {product.isPublished ? a.hide : a.show}
                  </button>
                  <button
                    type="button"
                    onClick={() => setToRemove(product)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {a.remove}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toRemove && (
        <ConfirmDialog
          title={t.dash.removeTitle}
          text={fill(t.dash.removeText, { title: toRemove.title })}
          confirmLabel={t.dash.removeConfirm}
          busyLabel={t.dash.removing}
          cancelLabel={t.dash.form.cancel}
          errorText={t.dash.removeError}
          onConfirm={removeProduct}
          onClose={() => setToRemove(null)}
        />
      )}
    </>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const a = t.admin;
  const session = useSession();
  const hydrated = useHydrated();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';

  const [tab, setTab] = useState('sellers');
  const [stats, setStats] = useState(null);
  const [statsKey, setStatsKey] = useState(0);
  const [notice, setNotice] = useState(null); // { text, error }

  // Not an admin (or the login expired): back to the admin login page
  const loginExpired = useCallback(() => {
    clearSession();
    router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    if (hydrated && !isAdmin) router.replace('/admin/login');
  }, [hydrated, isAdmin, router]);

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    let ignore = false;
    API.get('/admin/stats')
      .then((res) => !ignore && setStats(res.data))
      .catch((err) => {
        if (!ignore && isAuthError(err)) loginExpired();
      });
    return () => {
      ignore = true;
    };
  }, [hydrated, isAdmin, statsKey, loginExpired]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  // After any change: show a message and refresh the totals
  const changed = useCallback((text, error = false) => {
    setNotice({ text, error });
    setStatsKey((key) => key + 1);
  }, []);

  if (!hydrated || !isAdmin) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-20">
        <LoaderCircle className="h-6 w-6 animate-spin text-brand-600" />
      </main>
    );
  }

  const tabs = [
    { value: 'sellers', label: a.tabSellers, icon: Users },
    { value: 'products', label: a.tabProducts, icon: Package },
  ];

  return (
    <main className="flex-1 bg-slate-100 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-col gap-2 rounded-2xl bg-slate-800 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              <ShieldCheck className="h-6 w-6 text-brand-300" />
              {a.title}
            </h1>
            <p className="mt-1 text-sm text-slate-300">{a.subtitle}</p>
          </div>
          <p className="text-xs text-slate-400">
            {fill(a.loggedInAs, {
              email: session.user?.profile?.fullName ? `${session.user.profile.fullName} (${session.user.email})` : session.user?.email || '',
            })}
          </p>
        </section>

        {notice && (
          <div
            role="status"
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ring-1 ${
              notice.error ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-brand-50 text-brand-800 ring-brand-200'
            }`}
          >
            {notice.error ? <CircleAlert className="h-5 w-5 shrink-0 text-red-600" /> : <CircleCheck className="h-5 w-5 shrink-0 text-brand-600" />}
            {notice.text}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Hourglass} label={a.statPending} value={stats?.sellers.PENDING} highlight={stats?.sellers.PENDING > 0} />
          <StatCard
            icon={BadgeCheck}
            label={a.statApproved}
            value={stats?.sellers.APPROVED}
            sub={stats && fill(a.statRejectedSub, { count: stats.sellers.REJECTED })}
          />
          <StatCard
            icon={Package}
            label={a.statProducts}
            value={stats?.products.onSite}
            sub={stats && fill(a.statProductsSub, { count: stats.products.total })}
          />
          <StatCard
            icon={MessageCircle}
            label={a.statClicks}
            value={stats?.clicks.total}
            sub={stats && fill(a.statClicksSub, { count: stats.clicks.thisWeek })}
          />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div role="tablist" className="flex border-b border-slate-200">
            {tabs.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3.5 text-sm font-bold transition-colors sm:flex-none sm:px-6 ${
                  tab === value ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === 'sellers' ? (
            <SellersPanel stats={stats} onChanged={changed} onAuthError={loginExpired} />
          ) : (
            <ProductsPanel onChanged={changed} onAuthError={loginExpired} />
          )}
        </section>
      </div>
    </main>
  );
}
