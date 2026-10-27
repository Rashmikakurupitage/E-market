'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck, Package, Search, MapPin, Mail, Phone, IdCard, ArrowLeft,
  ChevronDown, ChevronUp, Eye, EyeOff, Trash2, CircleCheck, CircleAlert, LoaderCircle,
  Users, UserRound, CalendarDays, ShieldCheck, Star, UserPlus, LayoutDashboard, Flag, ImageIcon, Upload, RotateCcw, BookOpen, X,
} from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated, clearSession } from '../../src/lib/auth';
import { formatPrice, initials, toWhatsAppNumber, formatPhone } from '../../src/lib/catalog';
import { ComplaintStatusBadge, COMPLAINT_STATUSES } from '../../src/components/Complaints';
import ProductThumb from '../../src/components/ProductThumb';
import SellerStatusBadge from '../../src/components/SellerStatusBadge';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import WhatsAppIcon from '../../src/components/WhatsAppIcon';
import { PageArt } from '../../src/components/Art';
import DashboardSidebar from '../../src/components/DashboardSidebar';
import AdminOverview from '../../src/components/AdminOverview';
import { allWallpapers, shownWallpapers, BUILTIN_WALLPAPERS } from '../../src/lib/siteImage';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import AdminLearningCourses from '../../src/components/AdminLearningCourses';

const isAuthError = (err) => [401, 403].includes(err.response?.status);

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// 'onSite' | 'waiting' (seller not approved) | 'hidden' (hidden by an admin)
const productVisibility = (product) =>
  !product.isPublished ? 'hidden' : product.seller?.status === 'APPROVED' ? 'onSite' : 'waiting';

const VISIBILITY_STYLES = {
  onSite: 'bg-brand-50 text-brand-700 ring-brand-200',
  waiting: 'bg-amber-50 text-amber-800 ring-amber-200',
  hidden: 'bg-sand/60 text-slate-600 ring-slate-200',
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

function Toolbar({ filters, active, onFilter, search, onSearch, placeholder }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 bg-white/50 p-4 backdrop-blur-xs lg:flex-row lg:items-center lg:justify-between">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {filters.map((filter) => {
          const on = active === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilter(filter.value)}
              aria-pressed={on}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                on
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-950'
                  : 'bg-sand/70 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {on && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
              <span>{filter.label}</span>
              {filter.count !== undefined && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${on ? 'bg-white/20 text-white' : 'bg-ink/10 text-ink/70'}`}>
                  {filter.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="relative lg:w-80">
        <label htmlFor="toolbar-search" className="sr-only">{placeholder}</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="toolbar-search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 shadow-xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
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

function ComplaintsPanel({ stats, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const c = t.complaints;
  const ca = c.admin;
  const [status, setStatus] = useState('OPEN');
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const [complaints, setComplaints] = useState(null);
  const [failed, setFailed] = useState(false);
  const [openIds, setOpenIds] = useState([]); // complaints start folded to one line; the admin opens the one to handle
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let ignore = false;
    API.get('/admin/complaints', { params: { status: status === 'all' ? undefined : status, search: query || undefined } })
      .then((res) => {
        if (ignore) return;
        setComplaints(res.data);
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
  }, [status, query, onAuthError]);

  const chooseStatus = (value) => {
    setComplaints(null);
    setStatus(value);
  };

  const counts = stats?.complaints;
  const filters = ['all', ...COMPLAINT_STATUSES].map((value) => ({
    value,
    label: ca.filters[value],
    count: value === 'all' ? (counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined) : counts?.[value],
  }));

  const saved = (updated) => {
    setComplaints((list) => (list ? list.map((item) => (item.id === updated.id ? updated : item)) : list));
    onChanged(fill(ca.saved, { reference: updated.reference }));
  };

  return (
    <>
      <Toolbar filters={filters} active={status} onFilter={chooseStatus} search={search} onSearch={setSearch} placeholder={ca.search} />

      {failed ? (
        <ListMessage>{ca.loadError}</ListMessage>
      ) : !complaints ? (
        <ListMessage loading>{ca.loading}</ListMessage>
      ) : complaints.length === 0 ? (
        <ListMessage>{ca.none}</ListMessage>
      ) : (
        <ul className="divide-y divide-slate-100">
          {complaints.map((complaint) => {
            const open = openIds.includes(complaint.id);
            const ageDays = Math.max(0, Math.floor((now - new Date(complaint.createdAt).getTime()) / 86400000));
            const overdue = complaint.status === 'OPEN' && ageDays >= 3;
            const accent = overdue ? 'border-l-rose-500' : { OPEN: 'border-l-rose-300', IN_REVIEW: 'border-l-blue-400', RESOLVED: 'border-l-emerald-400', DISMISSED: 'border-l-slate-300' }[complaint.status] || 'border-l-slate-200';
            return (
              <li key={complaint.id} className={`border-l-4 px-5 py-4 ${accent} ${open ? 'bg-slate-50/60' : ''}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold tracking-wider text-slate-900">{complaint.reference}</span>
                      <ComplaintStatusBadge status={complaint.status} />
                      <span className="rounded-full bg-sand/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{c.reasons[complaint.reason] || complaint.reason}</span>
                      {overdue && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200"><CircleAlert className="h-3 w-3" />{ca.overdue}</span>}
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700">
                      <span className="font-semibold">{complaint.customer?.fullName}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold">{complaint.seller?.businessName}</span>
                      {complaint.seller?.district && <span className="text-xs text-slate-500">({complaint.seller.district})</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fill(ca.received, { date: formatDate(complaint.createdAt) })}</span>
                      <span className={`font-semibold ${overdue ? 'text-rose-700' : ''}`}>{ageDays === 0 ? t.overview.cmpToday : fill(t.overview.cmpDaysAgo, { count: ageDays })}</span>
                      {complaint.order?.reference && <span>{ca.order} {complaint.order.reference}</span>}
                    </p>
                    {!open && <p className="mt-2 line-clamp-1 text-sm text-slate-600">{complaint.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenIds((ids) => (open ? ids.filter((id) => id !== complaint.id) : [...ids, complaint.id]))}
                    aria-expanded={open}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-cream"
                  >
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {open ? ca.hideDetails : ca.showDetails}
                  </button>
                </div>

                {open && <ComplaintDetails complaint={complaint} onSaved={saved} onChanged={onChanged} onAuthError={onAuthError} />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function ComplaintDetails({ complaint, onSaved, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const c = t.complaints;
  const ca = c.admin;
  const [status, setStatus] = useState(complaint.status);
  const [note, setNote] = useState(complaint.adminNote || '');
  const [saving, setSaving] = useState(false);
  const dirty = status !== complaint.status || note.trim() !== (complaint.adminNote || '');

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await API.patch(`/admin/complaints/${complaint.id}`, { status, adminNote: note });
      onSaved(res.data);
    } catch (err) {
      if (isAuthError(err)) onAuthError();
      else onChanged(err.response?.data?.code === 'NOTE_LONG' ? ca.noteLong : ca.saveError, true);
    } finally {
      setSaving(false);
    }
  };

  const customer = complaint.customer;
  const seller = complaint.seller;
  const sellerWhatsapp = toWhatsAppNumber(seller?.whatsappNo);

  return (
    <div className="mt-4 space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>{fill(ca.received, { date: formatDate(complaint.createdAt) })}</span>
        {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt && <span>{fill(ca.lastUpdated, { date: formatDate(complaint.updatedAt) })}</span>}
        {complaint.resolvedAt && <span>{fill(ca.closedOn, { date: formatDate(complaint.resolvedAt) })}</span>}
      </p>
      <p className="whitespace-pre-line rounded-xl bg-white p-3 text-sm leading-relaxed text-slate-800 ring-1 ring-slate-200">{complaint.message}</p>

      {complaint.order && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
          <span className="font-semibold text-slate-900">{ca.order} {complaint.order.reference}</span>
          {complaint.order.status && <span>{complaint.order.status}</span>}
          {complaint.order.total != null && <span>{formatPrice(complaint.order.total)}</span>}
        </p>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <dt className="text-xs font-semibold text-slate-500">{ca.customer}</dt>
          <dd className="mt-1 font-semibold text-slate-900">{customer?.fullName}</dd>
          <dd className="mt-1 flex flex-col gap-0.5 text-slate-600">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{customer?.user?.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{customer?.user?.phone}</span>
            {customer?.user?.createdAt && <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{fill(ca.memberSince, { date: formatDate(customer.user.createdAt) })}</span>}
          </dd>
          {customer?._count && (
            <dd className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded-full bg-sand/70 px-2.5 py-1 text-slate-700">{fill(ca.customerOrders, { count: customer._count.orders })}</span>
              <span className={`rounded-full px-2.5 py-1 ${customer._count.complaints > 1 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-sand/70 text-slate-700'}`}>{fill(ca.customerComplaints, { count: customer._count.complaints })}</span>
            </dd>
          )}
        </div>
        <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <dt className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
            {ca.seller}
            {seller?.status && <SellerStatusBadge status={seller.status} />}
          </dt>
          <dd className="mt-1 font-semibold text-slate-900">{seller?.businessName}</dd>
          {(seller?.firstName || seller?.lastName) && <dd className="text-slate-600">{[seller.firstName, seller.lastName].filter(Boolean).join(' ')}</dd>}
          {seller?.district && <dd className="flex items-center gap-1.5 text-slate-600"><MapPin className="h-3.5 w-3.5 text-slate-400" />{seller.district}</dd>}
          <dd className="mt-1 flex flex-col gap-0.5 text-slate-600">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{seller?.user?.email}</span>
            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{seller?.user?.phone}</span>
            {sellerWhatsapp && <span className="flex items-center gap-1.5"><WhatsAppIcon className="h-3.5 w-3.5 text-slate-400" />{formatPhone(sellerWhatsapp)}</span>}
          </dd>
          {seller?._count && <dd className="mt-2 text-xs font-semibold text-slate-600">{fill(ca.sellerProducts, { count: seller._count.products })}</dd>}
          {(seller?.facebookUrl || seller?.messengerUrl) && (
            <dd className="mt-1 flex flex-col gap-0.5 text-xs">
              {seller.facebookUrl && <a href={seller.facebookUrl} target="_blank" rel="noopener noreferrer" className="truncate text-brand-700 underline">{seller.facebookUrl}</a>}
              {seller.messengerUrl && <a href={seller.messengerUrl} target="_blank" rel="noopener noreferrer" className="truncate text-brand-700 underline">{seller.messengerUrl}</a>}
            </dd>
          )}
          {seller?._count?.complaints > 1 && (
            <dd className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              <CircleAlert className="h-3.5 w-3.5" />
              {fill(ca.complaintCount, { count: seller._count.complaints })}
            </dd>
          )}
        </div>
      </dl>

      <form onSubmit={save} className="grid gap-3 sm:grid-cols-[200px_1fr]">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">{ca.status}</p>
          <div role="radiogroup" aria-label={ca.status} className="flex flex-col gap-1.5">
            {COMPLAINT_STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={status === value}
                onClick={() => setStatus(value)}
                className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ring-1 transition-colors ${status === value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-cream'}`}
              >
                {c.status[value]}
              </button>
            ))}
          </div>
        </div>
        <Field id={`note-${complaint.id}`} label={ca.note}>
          <textarea
            id={`note-${complaint.id}`}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={ca.notePlaceholder}
            className={inputClass(false)}
          />
        </Field>
        <div className="sm:col-span-2 sm:max-w-xs">
          <button type="submit" disabled={saving || !dirty} className={primaryButtonClass}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
            {saving ? ca.saving : ca.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateAdminPanel({ onCreated, onAuthError }) {
  const { t } = useLanguage();
  const a = t.admin;
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', nicNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await API.post('/admin/admins', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ''),
        nicNumber: form.nicNumber.trim().toUpperCase(),
      });
      setForm({ fullName: '', email: '', phone: '', nicNumber: '' });
      onCreated(a.adminCreated);
    } catch (err) {
      if (isAuthError(err)) {
        onAuthError();
        return;
      }
      const code = err.response?.data?.code;
      setError(a.creationErrors[code] || (err.response ? a.actionError : t.loginPage.networkError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-5 sm:p-7">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">{a.createAdminTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{a.createAdminDescription}</p>
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field id="admin-fullName" label={a.adminName} required>
          <input
            id="admin-fullName"
            name="fullName"
            type="text"
            required
            maxLength={120}
            autoComplete="name"
            value={form.fullName}
            onChange={update}
            className={inputClass(false)}
          />
        </Field>
        <Field id="admin-email" label={a.email} required>
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={update}
            className={inputClass(false)}
          />
        </Field>
        <Field id="admin-phone" label={a.phone} required>
          <input
            id="admin-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={update}
            className={inputClass(false)}
            placeholder="0771234567"
          />
        </Field>
        <Field id="admin-nic" label={a.nic} required hint={a.adminNicHint}>
          <input
            id="admin-nic"
            name="nicNumber"
            type="text"
            required
            autoComplete="off"
            value={form.nicNumber}
            onChange={update}
            className={inputClass(false)}
          />
        </Field>
        <div className="sm:col-span-2 sm:max-w-xs">
          <button type="submit" disabled={submitting} className={primaryButtonClass}>
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {submitting ? a.creatingAdmin : a.createAdmin}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminsPanel({ onChanged, onAuthError }) {
  const { t } = useLanguage();
  const a = t.admin;
  const [admins, setAdmins] = useState(null);
  const [viewerIsPrimary, setViewerIsPrimary] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [failed, setFailed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    API.get('/admin/admins')
      .then((res) => {
        if (ignore) return;
        setAdmins(res.data.admins);
        setViewerIsPrimary(!!res.data.viewerIsPrimary);
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
  }, [refreshKey, onAuthError]);

  // Called by the confirm box; throwing keeps it open with the reason
  const removeAdmin = async () => {
    const admin = toRemove;
    setRemoveError('');
    try {
      await API.delete(`/admin/admins/${admin.id}`);
    } catch (err) {
      if (isAuthError(err)) {
        onAuthError();
        return;
      }
      setRemoveError(a.adminRemovalErrors[err.response?.data?.code] || a.adminRemovalErrors.generic);
      throw err;
    }
    setToRemove(null);
    setRefreshKey((key) => key + 1);
    onChanged(fill(a.adminRemovalDone, { name: admin.fullName || admin.email }));
  };

  return (
    <div className="divide-y divide-slate-100">
      <CreateAdminPanel
        onCreated={(message) => {
          setRefreshKey((key) => key + 1);
          onChanged(message);
        }}
        onAuthError={onAuthError}
      />
      <section className="p-5 sm:p-7">
        <h2 className="text-lg font-bold text-slate-900">{a.registeredAdminsTitle}</h2>
        <p className="mt-1 text-sm text-slate-500">{a.registeredAdminsDescription}</p>
        {failed ? (
          <p role="alert" className="py-8 text-center text-sm text-red-700">{a.adminsLoadError}</p>
        ) : !admins ? (
          <ListMessage loading>{a.loading}</ListMessage>
        ) : admins.length === 0 ? (
          <ListMessage>{a.noAdmins}</ListMessage>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {admins.map((admin) => (
              <li key={admin.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {admin.fullName || admin.email}
                    {admin.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700"><ShieldCheck className="h-3.5 w-3.5" />{a.primaryAdmin}</span>}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4 text-slate-400" />{admin.email}</span>
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-4 w-4 text-slate-400" />{admin.phone}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p className="text-xs text-slate-500">{fill(a.registered, { date: formatDate(admin.createdAt) })}</p>
                  {viewerIsPrimary && !admin.isPrimary && (
                    <button type="button" onClick={() => { setRemoveError(''); setToRemove(admin); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      {a.removeAdmin}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toRemove && (
        <ConfirmDialog
          title={fill(a.adminRemovalTitle, { name: toRemove.fullName || toRemove.email })}
          text={a.adminRemovalText}
          confirmLabel={a.adminRemovalConfirm}
          busyLabel={a.adminRemovalBusy}
          cancelLabel={a.adminRemovalCancel}
          errorText={removeError || a.adminRemovalErrors.generic}
          onConfirm={removeAdmin}
          onClose={() => setToRemove(null)}
        />
      )}
    </div>
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
        <li key={product.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-ink/5">
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
  const [toRemove, setToRemove] = useState(null);
  const [removeError, setRemoveError] = useState('');
  const [viewingNicSeller, setViewingNicSeller] = useState(null);

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

  const removeSeller = async () => {
    const seller = toRemove;
    const sr = t.sellerRemoval;
    setRemoveError('');
    try {
      await API.delete(`/admin/sellers/${seller.id}`);
    } catch (err) {
      if (isAuthError(err)) {
        onAuthError();
        return;
      }
      const code = err.response?.data?.code;
      const count = err.response?.data?.count;
      setRemoveError(code && sr.errors[code] ? fill(sr.errors[code], { count }) : sr.errors.generic);
      throw err;
    }
    setToRemove(null);
    onChanged(fill(sr.done, { name: seller.businessName }));
    setReloadKey((key) => key + 1);
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
                        {seller.reviewCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {seller.averageRating.toFixed(1)} ({seller.reviewCount})
                          </span>
                        )}
                        <SellerStatusBadge status={seller.status} />
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{seller.district}</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fill(a.registered, { date: formatDate(seller.createdAt) })}</span>
                      </p>
                      <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-slate-700 sm:grid-cols-2">
                        <div className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-slate-400" /><dt className="sr-only">{a.email}</dt><dd className="truncate">{seller.email}</dd></div>
                        <div className="flex flex-wrap items-center gap-2">
                          <IdCard className="h-4 w-4 shrink-0 text-slate-400" />
                          <dt className="text-slate-500">{a.nic}</dt>
                          <dd className="font-medium tracking-wide flex items-center gap-2">
                            <span>{seller.nicMasked || '—'}</span>
                            {(seller.nicFront || seller.nicBack) && (
                              <button
                                type="button"
                                onClick={() => setViewingNicSeller(seller)}
                                className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200 transition-colors dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-800"
                              >
                                <Eye className="h-3 w-3" />
                                {a.viewNicPhotos || 'View Photos'}
                              </button>
                            )}
                          </dd>
                        </div>
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
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        {a.approve}
                      </button>
                    )}
                    {seller.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(seller, 'REJECTED')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleAlert className="h-4 w-4" />}
                        {a.reject}
                      </button>
                    )}
                    {seller.status === 'APPROVED' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRemoveError('');
                          setToRemove(seller);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 hover:text-red-700 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t.sellerRemoval.remove}
                      </button>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="mt-4 rounded-xl bg-cream p-4">
                    <SellerProducts sellerId={seller.id} onAuthError={onAuthError} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {toRemove && (
        <ConfirmDialog
          title={fill(t.sellerRemoval.title, { name: toRemove.businessName })}
          text={t.sellerRemoval.text}
          confirmLabel={t.sellerRemoval.confirm}
          busyLabel={t.sellerRemoval.busy}
          cancelLabel={t.sellerRemoval.cancel}
          errorText={removeError || t.sellerRemoval.errors.generic}
          onConfirm={removeSeller}
          onClose={() => setToRemove(null)}
        />
      )}
      {viewingNicSeller && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setViewingNicSeller(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  <IdCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    {a.nicPhotosTitle || 'National Identity Card (NIC)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {viewingNicSeller.businessName} · {viewingNicSeller.nicMasked || ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingNicSeller(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Front Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Front Side
                  </span>
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    Front
                  </span>
                </div>
                {viewingNicSeller.nicFront ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 aspect-[16/10] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingNicSeller.nicFront}
                      alt="NIC Front"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
                    {a.noNicPhotos || 'No front photo uploaded'}
                  </div>
                )}
              </div>

              {/* Back Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Back Side
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Back
                  </span>
                </div>
                {viewingNicSeller.nicBack ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 aspect-[16/10] flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingNicSeller.nicBack}
                      alt="NIC Back"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/30">
                    {a.noNicPhotos || 'No back photo uploaded'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CustomersPanel({ onChanged, onAuthError, onBack }) {
  const { t } = useLanguage();
  const a = t.admin;
  const removal = a.customerRemoval;
  const [search, setSearch] = useState('');
  const query = useDebounced(search.trim());
  const [customers, setCustomers] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toRemove, setToRemove] = useState(null);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    let ignore = false;
    API.get('/admin/customers', { params: { search: query || undefined }, timeout: 15000 })
      .then((res) => {
        if (ignore) return;
        setCustomers(res.data);
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
  }, [query, reloadKey, onAuthError]);

  const removeCustomer = async () => {
    const customer = toRemove;
    setRemoveError('');
    try {
      await API.delete(`/admin/customers/${customer.userId}`);
    } catch (err) {
      if (isAuthError(err)) {
        onAuthError();
        return;
      }
      setRemoveError(removal.errors.generic);
      throw err;
    }
    setToRemove(null);
    onChanged(fill(removal.done, { name: customer.fullName }));
    setReloadKey((key) => key + 1);
  };

  return (
    <>
      <div className="border-b border-slate-100 px-4 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-sand/60 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-magenta"
        >
          <ArrowLeft className="h-4 w-4" />
          {a.backToOverview}
        </button>
      </div>
      <Toolbar filters={[]} active="" onFilter={() => {}} search={search} onSearch={setSearch} placeholder={a.searchCustomers} />
      {failed ? (
        <ListMessage>{a.actionError}</ListMessage>
      ) : !customers ? (
        <ListMessage loading>{a.loading}</ListMessage>
      ) : customers.length === 0 ? (
        <ListMessage>{a.noCustomers}</ListMessage>
      ) : (
        <ul className="divide-y divide-slate-100">
          {customers.map((customer) => (
            <li key={customer.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">
                  {initials(customer.fullName) || '?'}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{customer.fullName}</p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{customer.email}</span>
                    <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fill(a.registered, { date: formatDate(customer.createdAt) })}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRemoveError('');
                  setToRemove(customer);
                }}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                {removal.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      {toRemove && (
        <ConfirmDialog
          title={fill(removal.title, { name: toRemove.fullName })}
          text={removal.text}
          confirmLabel={removal.confirm}
          busyLabel={removal.busy}
          cancelLabel={removal.cancel}
          errorText={removeError || removal.errors.generic}
          onConfirm={removeCustomer}
          onClose={() => setToRemove(null)}
        />
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-cream disabled:opacity-60"
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

// Shrinks a chosen picture in the browser (max 1600px wide, JPEG) so it uploads fast and loads quickly for visitors
function shrinkPicture(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('type'));
    };
    img.src = url;
  });
}

// Admin: the home page wallpapers. They rotate on their own, or the admin keeps one single wallpaper.
function WallpaperPanel({ onChanged, onAuthError }) {
  const { t } = useLanguage();
  const p = t.sitePicture;
  const [state, setState] = useState(null); // { custom, rotate, seconds, active }
  const [preview, setPreview] = useState(null); // a chosen picture, before it is added
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    API.get('/site/settings')
      .then((res) => !ignore && setState(res.data))
      .catch(() => !ignore && setError(p.errors.generic));
    return () => {
      ignore = true;
    };
  }, [p.errors.generic]);

  const wallpapers = allWallpapers(state);
  const shownId = state ? (shownWallpapers(state)[0]?.id) : null;
  // True once an admin has uploaded or removed anything, so "restore the originals" makes sense
  const changedFromOriginal = state ? state.custom.length > 0 || state.builtin.length < BUILTIN_WALLPAPERS.length : false;

  const fail = (err) => {
    if (isAuthError(err)) return onAuthError();
    const code = err.response?.data?.code;
    setError(code === 'TOO_MANY' ? p.errors.tooMany : code === 'LAST_ONE' ? p.errors.lastOne : err.response?.status === 413 ? p.errors.big : p.errors.generic);
  };

  const run = async (request, message) => {
    setBusy(true);
    setError('');
    try {
      const res = await request();
      setState(res.data);
      if (message) onChanged(message);
      return true;
    } catch (err) {
      fail(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = (changes, message) => run(() => API.put('/admin/site/wallpaper-settings', changes), message);

  const choose = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError(p.errors.type);
      return;
    }
    try {
      setPreview(await shrinkPicture(file));
    } catch {
      setError(p.errors.type);
    }
  };

  const add = async () => {
    if (await run(() => API.post('/admin/site/wallpapers', { image: preview }), p.added)) setPreview(null);
  };
  const remove = (wallpaper) => run(() => API.delete(`/admin/site/wallpapers/${wallpaper.id}`), p.removed);
  const reset = () => run(() => API.delete('/admin/site/wallpapers'), p.resetDone);

  const rotating = state ? state.rotate : true;

  return (
    <div className="space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-slate-800">
          <ImageIcon className="h-4 w-4 text-magenta" />
          {p.title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{p.intro}</p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Rotate or keep one */}
      <div className="rounded-[24px] bg-cream p-5 ring-1 ring-ink/5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-ink">{p.rotateTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{rotating ? p.rotateOn : p.rotateOff}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={rotating}
            aria-label={p.rotateTitle}
            disabled={busy || !state}
            onClick={() => saveSettings({ rotate: !rotating }, rotating ? p.rotationStopped : p.rotationStarted)}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${rotating ? 'bg-leaf' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${rotating ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {rotating && state && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="wallpaper-seconds" className="font-semibold text-slate-700">{p.interval}</label>
            <select
              id="wallpaper-seconds"
              value={state.seconds}
              disabled={busy}
              onChange={(event) => saveSettings({ seconds: Number(event.target.value) }, p.settingsSaved)}
              className={`${inputClass(false)} !w-auto`}
            >
              {[4, 6, 8, 10, 15, 20].map((value) => (
                <option key={value} value={value}>{fill(p.seconds, { count: value })}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Wallpapers */}
      <div>
        <p className="font-bold text-ink">{rotating ? p.listTitle : p.keepTitle}</p>
        <p className="mt-1 text-sm text-slate-600">{rotating ? p.listHint : p.keepHint}</p>

        {!state ? (
          <div className="skeleton mt-4 h-40 rounded-[24px]" />
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {wallpapers.map((wallpaper) => {
              const selected = !rotating && shownId === wallpaper.id;
              return (
                <li key={wallpaper.id} className="relative">
                  <button
                    type="button"
                    disabled={rotating || busy}
                    onClick={() => saveSettings({ active: wallpaper.id }, p.keptSaved)}
                    aria-pressed={selected}
                    className={`block w-full overflow-hidden rounded-[22px] text-left ring-2 transition-all ${selected ? 'ring-magenta shadow-lg' : 'ring-ink/10'} ${rotating ? 'cursor-default' : 'hover:ring-magenta/50'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={wallpaper.src} alt="" className="aspect-[4/5] w-full object-cover" />
                    {selected && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-magenta px-2.5 py-1 text-[11px] font-bold text-white shadow">
                        <CircleCheck className="h-3.5 w-3.5" />
                        {p.showing}
                      </span>
                    )}
                  </button>
                  {wallpapers.length > 1 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(wallpaper)}
                      aria-label={p.remove}
                      title={p.remove}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-600 shadow transition-colors hover:bg-red-600 hover:text-white disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add a wallpaper */}
      <div className="flex flex-col gap-3 md:max-w-md">
        {preview && (
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">{p.newPicture}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="aspect-[4/5] w-40 rounded-[22px] object-cover shadow-md ring-1 ring-ink/10" />
          </div>
        )}

        {preview ? (
          <div className="flex gap-2">
            <button type="button" onClick={add} disabled={busy} className={`${primaryButtonClass} flex-1`}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
              {busy ? p.saving : p.add}
            </button>
            <button type="button" onClick={() => setPreview(null)} disabled={busy} className="rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink/70 hover:bg-sand/60">
              {p.cancel}
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-sand/60">
            <Upload className="h-4 w-4" />
            {p.choose}
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={busy || !state} className="sr-only" />
          </label>
        )}
        <p className="text-xs text-slate-500">{p.hint}</p>

        {changedFromOriginal && !preview && (
          <button type="button" onClick={reset} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 disabled:opacity-60">
            <RotateCcw className="h-4 w-4" />
            {p.reset}
          </button>
        )}
      </div>
    </div>
  );
}

const ADMIN_TABS = ['overview', 'customers', 'sellers', 'products', 'courses', 'complaints', 'appearance', 'admins'];

export default function AdminDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const a = t.admin;
  const session = useSession();
  const hydrated = useHydrated();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';

  const [tab, setTabState] = useState('overview'); // 'overview' | 'customers' | 'sellers' | 'products' | 'complaints' | 'appearance' | 'admins'

  // The open tab lives in the address (#customers), so refreshing or using the browser's back button returns to it, not to the overview
  const setTab = useCallback((next) => {
    setTabState(next);
    if (typeof window !== 'undefined' && window.location.hash !== `#${next}`) {
      window.history.pushState(null, '', next === 'overview' ? window.location.pathname : `#${next}`);
    }
  }, []);
  useEffect(() => {
    const fromHash = () => {
      const name = window.location.hash.slice(1);
      setTabState(ADMIN_TABS.includes(name) ? name : 'overview');
    };
    fromHash();
    window.addEventListener('popstate', fromHash);
    return () => window.removeEventListener('popstate', fromHash);
  }, []);
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
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <LoaderCircle className="h-6 w-6 animate-spin text-brand-600" />
      </main>
    );
  }

  const menu = [
    { value: 'overview', label: a.tabOverview, icon: LayoutDashboard },
    { value: 'customers', label: a.tabCustomers, icon: UserRound },
    { value: 'sellers', label: a.tabSellers, icon: Users, badge: stats?.sellers.PENDING },
    { value: 'products', label: a.tabProducts, icon: Package },
    { value: 'courses', label: a.tabCourses, icon: BookOpen },
    { value: 'complaints', label: t.complaints.admin.tab, icon: Flag, badge: stats?.complaints.OPEN },
    { value: 'appearance', label: t.sitePicture.tab, icon: ImageIcon },
    { value: 'admins', label: a.tabAdmins, icon: UserPlus },
  ];

  return (
    <div className="relative isolate min-h-screen w-full">
      <PageArt />
      <DashboardSidebar
        items={menu}
        active={tab}
        onSelect={setTab}
        name={session.user?.profile?.fullName || a.title}
        subtitle={session.user?.email}
        onLogout={loginExpired}
        menuLabel={a.menuTitle}
        hideDesktopTopBar={true}
        card={{ icon: ShieldCheck, title: a.title, text: stats ? fill(a.statProductsSub, { count: stats.products.total }) : a.subtitle, label: a.tabSellers, onClick: () => setTab('sellers') }}
      >
          <section className="flex flex-col gap-2 rounded-[22px] sm:rounded-[28px] bg-slate-800 p-4 sm:p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
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

          {tab === 'overview' && <AdminOverview stats={stats} onNavigate={setTab} onAuthError={loginExpired} />}

          {tab === 'sellers' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <SellersPanel stats={stats} onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}

          {tab === 'customers' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <CustomersPanel onChanged={changed} onAuthError={loginExpired} onBack={() => setTab('overview')} />
            </section>
          )}

          {tab === 'products' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <ProductsPanel onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}

          {tab === 'courses' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <AdminLearningCourses onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}

          {tab === 'complaints' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <ComplaintsPanel stats={stats} onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}

          {tab === 'appearance' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <WallpaperPanel onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}

          {tab === 'admins' && (
            <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
              <AdminsPanel onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}
      </DashboardSidebar>
    </div>
  );
}
