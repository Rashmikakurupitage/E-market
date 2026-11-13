'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck, Package, Search, MapPin, Mail, Phone, IdCard, ArrowLeft,
  ChevronDown, ChevronUp, Eye, EyeOff, Trash2, CircleCheck, CircleAlert, LoaderCircle,
  Users, UserRound, CalendarDays, ShieldCheck, Star, UserPlus, LayoutDashboard, Flag, ImageIcon, Upload, RotateCcw, BookOpen, X,
  Lock, Copy, Check, ZoomIn, Camera, Scan, Clock, Plus,
} from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated, clearSession, updateSessionUser } from '../../src/lib/auth';
import ProfilePhotoEditor from '../../src/components/ProfilePhotoEditor';
import { profilePhotoUrl } from '../../src/lib/profilePhoto';
import { formatPrice, initials, toWhatsAppNumber, formatPhone } from '../../src/lib/catalog';
import { ComplaintStatusBadge, COMPLAINT_STATUSES } from '../../src/components/Complaints';
import ProductThumb from '../../src/components/ProductThumb';
import SellerStatusBadge from '../../src/components/SellerStatusBadge';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import WhatsAppIcon from '../../src/components/WhatsAppIcon';
import DashboardSidebar from '../../src/components/DashboardSidebar';
import AdminOverview from '../../src/components/AdminOverview';
import { allWallpapers, shownWallpapers, BUILTIN_WALLPAPERS } from '../../src/lib/siteImage';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import AdminLearningCourses from '../../src/components/AdminLearningCourses';
import { CameraModal, shrinkImage } from '../../src/components/NicPhotoUpload';
import Face3DVerificationModal from '../../src/components/Face3DVerification';

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
    <div className="flex flex-col gap-3 border-b border-slate-100 bg-white/50 p-4 backdrop-blur-xs lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900/60">
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
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-950 dark:bg-brand-600 dark:text-white dark:ring-brand-500'
                  : 'bg-sand/70 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
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
              <li key={complaint.id} className={`border-l-4 px-5 py-4 ${accent} ${open ? 'bg-slate-50/60 dark:bg-white/[0.04]' : ''}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold tracking-wider text-slate-900 dark:text-slate-100">{complaint.reference}</span>
                      <ComplaintStatusBadge status={complaint.status} />
                      <span className="rounded-full bg-sand/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">{c.reasons[complaint.reason] || complaint.reason}</span>
                      {overdue && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-800/60"><CircleAlert className="h-3 w-3" />{ca.overdue}</span>}
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-700 dark:text-slate-200">
                      <span className="font-semibold">{complaint.customer?.fullName}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-semibold">{complaint.seller?.businessName}</span>
                      {complaint.seller?.district && <span className="text-xs text-slate-500 dark:text-slate-400">({complaint.seller.district})</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fill(ca.received, { date: formatDate(complaint.createdAt) })}</span>
                      <span className={`font-semibold ${overdue ? 'text-rose-700 dark:text-rose-400' : ''}`}>{ageDays === 0 ? t.overview.cmpToday : fill(t.overview.cmpDaysAgo, { count: ageDays })}</span>
                      {complaint.order?.reference && <span>{ca.order} {complaint.order.reference}</span>}
                    </p>
                    {!open && <p className="mt-2 line-clamp-1 text-sm text-slate-600 dark:text-slate-300">{complaint.message}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenIds((ids) => (open ? ids.filter((id) => id !== complaint.id) : [...ids, complaint.id]))}
                    aria-expanded={open}
                    className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-cream dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
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
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{customer?.user?.email || '—'}</span>
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
          {seller?.district && <dd className="flex items-center gap-1.5 text-slate-600"><MapPin className="h-3.5 w-3.5 text-red-500" />{seller.district}</dd>}
          <dd className="mt-1 flex flex-col gap-0.5 text-slate-600">
            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" />{seller?.user?.email || '—'}</span>
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
                    <button type="button" onClick={() => { setRemoveError(''); setToRemove(admin); }} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors">
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
  const [loadingVerification, setLoadingVerification] = useState(false);

  const openVerificationModal = async (seller) => {
    setViewingNicSeller(seller);
    if ((!seller.nicFront && !seller.nicBack) || !seller.facePhoto) {
      setLoadingVerification(true);
      try {
        const res = await API.get(`/admin/sellers/${seller.id}/verification`);
        if (res.data) {
          setViewingNicSeller((prev) => (prev?.id === seller.id ? { ...prev, ...res.data } : prev));
        }
      } catch (err) {
        console.warn('Failed to load seller verification details:', err);
      } finally {
        setLoadingVerification(false);
      }
    }
  };
  const [copiedId, setCopiedId] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState(null);
  const [cameraConfig, setCameraConfig] = useState({ isOpen: false, step: 'front' });
  const [savingSide, setSavingSide] = useState(null);
  const [photoFeedback, setPhotoFeedback] = useState(null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const faceInputRef = useRef(null);
  const [adminFaceModalOpen, setAdminFaceModalOpen] = useState(false);

  const handleSaveSellerPhoto = async (side, base64Data) => {
    if (!viewingNicSeller) return;
    setSavingSide(side);
    setPhotoFeedback(null);
    try {
      const payload = {};
      if (side === 'front') payload.nicFront = base64Data || null;
      else if (side === 'back') payload.nicBack = base64Data || null;
      else if (side === 'face') payload.facePhoto = base64Data || null;

      await API.patch(`/admin/sellers/${viewingNicSeller.id}/photos`, payload);

      setViewingNicSeller((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nicFront: side === 'front' ? (base64Data || null) : prev.nicFront,
          nicBack: side === 'back' ? (base64Data || null) : prev.nicBack,
          facePhoto: side === 'face' ? (base64Data || null) : prev.facePhoto,
        };
      });

      setSellers((prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((s) => (s.id === viewingNicSeller.id ? {
          ...s,
          nicFront: side === 'front' ? (base64Data || null) : s.nicFront,
          nicBack: side === 'back' ? (base64Data || null) : s.nicBack,
          facePhoto: side === 'face' ? (base64Data || null) : s.facePhoto,
        } : s));
      });

      setPhotoFeedback({
        type: 'success',
        text: side === 'front'
          ? (base64Data ? 'Front ID photo updated successfully!' : 'Front ID photo removed.')
          : side === 'back'
          ? (base64Data ? 'Back ID photo updated successfully!' : 'Back ID photo removed.')
          : (base64Data ? '3D Biometric Face photo updated successfully!' : '3D Face photo removed.'),
      });
      setTimeout(() => setPhotoFeedback(null), 3500);
    } catch (err) {
      console.error('Failed to update seller photo:', err);
      setPhotoFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update photo. Please try again.',
      });
    } finally {
      setSavingSide(null);
    }
  };

  const handleFilePicked = async (side, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      setSavingSide(side);
      const compressed = await shrinkImage(file, 1600);
      await handleSaveSellerPhoto(side, compressed);
    } catch (err) {
      setPhotoFeedback({ type: 'error', text: err.message || 'Error processing image file.' });
      setSavingSide(null);
    }
  };

  const handleCameraCapture = async (dataUrl) => {
    const side = cameraConfig.step;
    setCameraConfig({ isOpen: false, step: 'front' });
    if (!dataUrl) return;
    try {
      setSavingSide(side);
      const compressed = await shrinkImage(dataUrl, 1600);
      await handleSaveSellerPhoto(side, compressed);
    } catch (err) {
      setPhotoFeedback({ type: 'error', text: err.message || 'Error processing captured photo.' });
      setSavingSide(null);
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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
      if (viewingNicSeller?.id === seller.id) {
        setViewingNicSeller(null);
      }
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
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sellers.map((seller) => {
            const busy = busyId === seller.id;
            const open = openId === seller.id;
            const whatsapp = toWhatsAppNumber(seller.whatsappNo);
            const applicantName = [seller.firstName, seller.lastName].filter(Boolean).join(' ');
            const isApproved = seller.status === 'APPROVED';

            return (
              <li key={seller.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                      {initials(seller.businessName) || '?'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 dark:text-white">{seller.businessName}</p>
                        {applicantName && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Applicant: {applicantName}
                          </span>
                        )}
                        {seller.reviewCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            {seller.averageRating.toFixed(1)} ({seller.reviewCount})
                          </span>
                        )}
                        {seller.facePhoto && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500/20" title="3D Biometric Verified">
                            <ShieldCheck className="h-3 w-3" />
                            3D Face
                          </span>
                        )}
                        <SellerStatusBadge status={seller.status} />
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-red-500" />{seller.district}</span>
                        {seller.dateOfBirth && (
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                            DOB: {formatDate(seller.dateOfBirth)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{fill(a.registered, { date: formatDate(seller.createdAt) })}</span>
                      </p>
                      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                          <dt className="sr-only">{a.email}</dt>
                          <dd className="truncate">{seller.email || '—'}</dd>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <IdCard className="h-4 w-4 shrink-0 text-slate-400" />
                          <dt className="text-slate-500 dark:text-slate-400">{a.nic}:</dt>
                          <dd className="font-medium tracking-wide flex flex-wrap items-center gap-2">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
                                <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                {seller.nicDisplay || seller.nicMasked || ('••••••' + (seller.nicLast5 || ''))}
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">(Encrypted · Last 5)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-700">
                                {seller.nicDisplay || seller.nicFull || '—'}
                                <span className="rounded bg-amber-200/80 px-1 py-0.2 text-[10px] font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                                  Pending Verification
                                </span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => openVerificationModal(seller)}
                              className={
                                !isApproved
                                  ? "inline-flex items-center gap-1.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 text-xs font-bold shadow-sm transition-all"
                                  : "inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 ring-1 ring-brand-200 transition-colors dark:bg-brand-950/60 dark:text-brand-300 dark:ring-brand-800"
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                              {!isApproved ? 'Verify ID & 3D Face' : (seller.facePhoto || seller.nicFront || seller.nicBack ? 'View ID & 3D Face' : 'ID & Photos')}
                            </button>
                          </dd>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                          <dt className="sr-only">{a.phone}</dt>
                          <dd>{seller.phone}</dd>
                        </div>
                        {whatsapp && (
                          <div className="flex items-center gap-2">
                            <WhatsAppIcon className="h-4 w-4 shrink-0 text-slate-400" />
                            <dt className="sr-only">{a.whatsapp}</dt>
                            <dd>{formatPhone(whatsapp)}</dd>
                          </div>
                        )}
                      </dl>
                      {seller.description && <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">“{seller.description}”</p>}
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : seller.id)}
                        aria-expanded={open}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-400"
                      >
                        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {open ? a.hideProducts : a.showProducts}
                        <span className="font-normal text-slate-500 dark:text-slate-400">
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
                        onClick={() => {
                          if (seller.status === 'PENDING') {
                            openVerificationModal(seller);
                          } else {
                            changeStatus(seller, 'APPROVED');
                          }
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60 shadow-sm"
                      >
                        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                        {seller.status === 'PENDING' ? 'Verify & Approve' : a.approve}
                      </button>
                    )}
                    {seller.status === 'PENDING' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => changeStatus(seller, 'REJECTED')}
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 shadow-sm"
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
                        className="inline-flex items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 shadow-sm transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t.sellerRemoval.remove}
                      </button>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="mt-4 rounded-xl bg-cream p-4 dark:bg-slate-800/60">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => {
            setViewingNicSeller(null);
            setZoomedPhoto(null);
          }}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-7 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 ring-1 ring-brand-200/50">
                  <IdCard className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                      Seller Identity & ID Card Verification
                    </h3>
                    <SellerStatusBadge status={viewingNicSeller.status} />
                  </div>
                  <p className="text-xs text-slate-400">
                    {viewingNicSeller.businessName} · Registered {formatDate(viewingNicSeller.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingNicSeller(null);
                  setZoomedPhoto(null);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Applicant Details Verification Box */}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Applicant Submitted Information
                </h4>
                {viewingNicSeller.status === 'APPROVED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <Lock className="h-3 w-3" /> Encrypted & Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <CircleAlert className="h-3.5 w-3.5" /> Compare with ID card photos below before approving
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                {/* ID Number */}
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 sm:col-span-2 lg:col-span-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    National ID Number (NIC)
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    {viewingNicSeller.status === 'APPROVED' ? (
                      <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <Lock className="h-4 w-4" />
                        {viewingNicSeller.nicDisplay || viewingNicSeller.nicMasked || ('••••••' + (viewingNicSeller.nicLast5 || ''))}
                      </span>
                    ) : (
                      <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                        {viewingNicSeller.nicDisplay || viewingNicSeller.nicFull || '—'}
                      </span>
                    )}
                    {viewingNicSeller.status !== 'APPROVED' && (viewingNicSeller.nicDisplay || viewingNicSeller.nicFull) && (
                      <button
                        type="button"
                        onClick={() => handleCopy(viewingNicSeller.nicDisplay || viewingNicSeller.nicFull)}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                        title="Copy ID Number"
                      >
                        {copiedId ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                        {copiedId ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    {viewingNicSeller.status === 'APPROVED'
                      ? 'ID is encrypted in database. Showing only last 5 digits.'
                      : 'Full plaintext ID shown for verification prior to approval.'}
                  </span>
                </div>

                {/* Applicant Full Name */}
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Applicant Full Name
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block truncate">
                    {[viewingNicSeller.firstName, viewingNicSeller.lastName].filter(Boolean).join(' ') || viewingNicSeller.businessName}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    Business: {viewingNicSeller.businessName}
                  </span>
                </div>

                {/* Date of Birth & District */}
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Date of Birth & District
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {viewingNicSeller.dateOfBirth ? formatDate(viewingNicSeller.dateOfBirth) : 'Not specified'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-500" /> District: {viewingNicSeller.district}
                  </span>
                </div>

                {/* Contact info */}
                <div className="rounded-xl bg-white p-3 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 sm:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Email Address</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate block text-xs">{viewingNicSeller.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">Phone Number</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs">{viewingNicSeller.phone}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">WhatsApp Number</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block text-xs">{viewingNicSeller.whatsappNo || viewingNicSeller.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Photos Section */}
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <IdCard className="h-4 w-4 text-brand-600" />
                  Seller ID Card Photos & Verification
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Upload file or capture via live camera
                </span>
              </div>

              {photoFeedback && (
                <div
                  className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
                    photoFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800'
                      : 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800'
                  }`}
                >
                  {photoFeedback.type === 'success' ? (
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <CircleAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>{photoFeedback.text}</span>
                </div>
              )}

              {loadingVerification && (
                <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-brand-50/70 p-3 text-xs font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                  <LoaderCircle className="h-4 w-4 animate-spin text-brand-600" />
                  Loading high-resolution ID photos...
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilePicked('front', e)}
              />
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilePicked('back', e)}
              />
              <input
                ref={faceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilePicked('face', e)}
              />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {/* 3D Biometric Face Verification Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Scan className="h-3.5 w-3.5 text-brand-600" />
                        3D Face Biometric
                      </span>
                      {viewingNicSeller.facePhoto ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> 3D Verified
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                          Pending
                        </span>
                      )}
                    </div>

                    {viewingNicSeller.facePhoto ? (
                      <div
                        onClick={() => setZoomedPhoto({ src: viewingNicSeller.facePhoto, label: '3D Verified Biometric Face' })}
                        className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 aspect-[16/10] flex items-center justify-center transition-all hover:ring-2 hover:ring-brand-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingNicSeller.facePhoto}
                          alt="3D Verified Face"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ZoomIn className="h-4 w-4" /> Click to enlarge
                        </div>
                        <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 backdrop-blur-xs flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> KYC PASS
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                        {savingSide === 'face' ? (
                          <span className="flex items-center gap-1.5 text-brand-600 font-semibold">
                            <LoaderCircle className="h-4 w-4 animate-spin" /> Saving...
                          </span>
                        ) : (
                          'No 3D face verified yet'
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for Face */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => setAdminFaceModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs transition-colors disabled:opacity-50"
                      title="Run 3D Face Biometric Scan"
                    >
                      <Scan className="h-3.5 w-3.5" />
                      <span>3D Scan</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => setCameraConfig({ isOpen: true, step: 'face' })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 shadow-xs transition-colors disabled:opacity-50"
                      title="Take quick live photo"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Photo</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => faceInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      title="Upload an image file from device"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload</span>
                    </button>

                    {viewingNicSeller.facePhoto && (
                      <button
                        type="button"
                        disabled={savingSide !== null}
                        onClick={() => handleSaveSellerPhoto('face', null)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-xs transition-colors ml-auto disabled:opacity-50"
                        title="Remove face photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Front Photo Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ID Card — Front Side
                      </span>
                      <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        Front Side
                      </span>
                    </div>

                    {viewingNicSeller.nicFront ? (
                      <div
                        onClick={() => setZoomedPhoto({ src: viewingNicSeller.nicFront, label: 'Front Side of ID' })}
                        className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 aspect-[16/10] flex items-center justify-center transition-all hover:ring-2 hover:ring-brand-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingNicSeller.nicFront}
                          alt="NIC Front"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ZoomIn className="h-4 w-4" /> Click to enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                        {savingSide === 'front' ? (
                          <span className="flex items-center gap-1.5 text-brand-600 font-semibold">
                            <LoaderCircle className="h-4 w-4 animate-spin" /> Saving...
                          </span>
                        ) : (
                          'No front photo uploaded'
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for Front */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => setCameraConfig({ isOpen: true, step: 'front' })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 shadow-xs transition-colors disabled:opacity-50"
                      title="Take live photo using webcam / camera"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>{viewingNicSeller.nicFront ? 'Retake Photo' : 'Take Photo'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => frontInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      title="Upload an image file from device"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{viewingNicSeller.nicFront ? 'Replace File' : 'Upload File'}</span>
                    </button>

                    {viewingNicSeller.nicFront && (
                      <button
                        type="button"
                        disabled={savingSide !== null}
                        onClick={() => handleSaveSellerPhoto('front', null)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-xs transition-colors ml-auto disabled:opacity-50"
                        title="Remove front photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Back Photo Card */}
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        ID Card — Back Side
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        Back Side
                      </span>
                    </div>

                    {viewingNicSeller.nicBack ? (
                      <div
                        onClick={() => setZoomedPhoto({ src: viewingNicSeller.nicBack, label: 'Back Side of ID' })}
                        className="group relative cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-800/50 aspect-[16/10] flex items-center justify-center transition-all hover:ring-2 hover:ring-brand-500"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewingNicSeller.nicBack}
                          alt="NIC Back"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <ZoomIn className="h-4 w-4" /> Click to enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/30">
                        {savingSide === 'back' ? (
                          <span className="flex items-center gap-1.5 text-brand-600 font-semibold">
                            <LoaderCircle className="h-4 w-4 animate-spin" /> Saving...
                          </span>
                        ) : (
                          'No back photo uploaded'
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions for Back */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => setCameraConfig({ isOpen: true, step: 'back' })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700 shadow-xs transition-colors disabled:opacity-50"
                      title="Take live photo using webcam / camera"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>{viewingNicSeller.nicBack ? 'Retake Photo' : 'Take Photo'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={savingSide !== null}
                      onClick={() => backInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      title="Upload an image file from device"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{viewingNicSeller.nicBack ? 'Replace File' : 'Upload File'}</span>
                    </button>

                    {viewingNicSeller.nicBack && (
                      <button
                        type="button"
                        disabled={savingSide !== null}
                        onClick={() => handleSaveSellerPhoto('back', null)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-xs transition-colors ml-auto disabled:opacity-50"
                        title="Remove back photo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {!viewingNicSeller.nicFront && !viewingNicSeller.nicBack && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-start gap-2.5">
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900 dark:text-emerald-200">
                        Algorithm-Verified Seller (No initial photos uploaded)
                      </p>
                      <p className="text-emerald-800/90 dark:text-emerald-300/80">
                        This seller was validated by NIC checksum algorithm at signup. You can use the buttons above to upload or take webcam photos of their physical ID at any time.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* In-Modal Action Footer */}
            <div className="mt-7 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                {viewingNicSeller.status === 'PENDING' ? (
                  <span>
                    Once approved, the ID number will be securely encrypted in the database. Only the last 5 digits will be displayed thereafter.
                  </span>
                ) : (
                  <span>
                    This seller is already approved. ID number is encrypted (AES-256-GCM).
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {viewingNicSeller.status !== 'APPROVED' && (
                  <button
                    type="button"
                    disabled={busyId === viewingNicSeller.id}
                    onClick={() => changeStatus(viewingNicSeller, 'APPROVED')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-green-700 shadow-md transition-colors disabled:opacity-60"
                  >
                    {busyId === viewingNicSeller.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <BadgeCheck className="h-4 w-4" />
                        <span>Approve Seller & Encrypt ID</span>
                      </>
                    )}
                  </button>
                )}
                {viewingNicSeller.status === 'PENDING' && (
                  <button
                    type="button"
                    disabled={busyId === viewingNicSeller.id}
                    onClick={() => changeStatus(viewingNicSeller, 'REJECTED')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {busyId === viewingNicSeller.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CircleAlert className="h-4 w-4" />
                        <span>Reject</span>
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setViewingNicSeller(null);
                    setZoomedPhoto(null);
                  }}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal */}
      {cameraConfig.isOpen && (
        <CameraModal
          isOpen={cameraConfig.isOpen}
          initialStep={cameraConfig.step}
          singleStepOnly={true}
          onCaptureFront={handleCameraCapture}
          onCaptureBack={handleCameraCapture}
          onClose={() => setCameraConfig({ isOpen: false, step: 'front' })}
          r={t.register || {}}
        />
      )}

      {/* Admin 3D Face Biometric Scan Modal */}
      {adminFaceModalOpen && (
        <Face3DVerificationModal
          isOpen={adminFaceModalOpen}
          onComplete={async (result) => {
            setAdminFaceModalOpen(false);
            if (result.photo) {
              await handleSaveSellerPhoto('face', result.photo);
            }
          }}
          onClose={() => setAdminFaceModalOpen(false)}
          r={t.register || {}}
        />
      )}

      {/* Lightbox / Zoom Modal for Photo */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setZoomedPhoto(null)}
        >
          <div className="relative max-h-[95vh] max-w-[95vw] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between w-full mb-2 text-white">
              <span className="font-semibold text-sm">{zoomedPhoto.label}</span>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomedPhoto.src}
              alt={zoomedPhoto.label}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            />
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
                    <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{customer.email || '—'}</span>
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
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 shadow-sm transition-colors"
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
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-700 shadow-sm transition-colors"
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
  const p = t.sitePicture || {};
  const [state, setState] = useState(null); // { custom, rotate, seconds, active, timings }
  const [previews, setPreviews] = useState([]); // array of chosen pictures before they are added
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [customSeconds, setCustomSeconds] = useState('6');

  useEffect(() => {
    let ignore = false;
    API.get('/site/settings')
      .then((res) => {
        if (!ignore) {
          setState(res.data);
          setCustomSeconds(String(res.data?.seconds || 6));
        }
      })
      .catch(() => !ignore && setError(p.errors?.generic || 'Failed to load wallpaper settings.'));
    return () => {
      ignore = true;
    };
  }, [p.errors?.generic]);

  const wallpapers = allWallpapers(state);
  const shownId = state ? (shownWallpapers(state)[0]?.id) : null;
  // True once an admin has uploaded or removed anything, so "restore the originals" makes sense
  const changedFromOriginal = state ? state.custom.length > 0 || state.builtin.length < BUILTIN_WALLPAPERS.length : false;

  const fail = (err) => {
    if (isAuthError(err)) return onAuthError();
    const code = err.response?.data?.code;
    setError(
      code === 'TOO_MANY'
        ? (p.errors?.tooMany || 'Maximum wallpapers limit reached.')
        : code === 'LAST_ONE'
        ? (p.errors?.lastOne || 'At least one wallpaper must remain.')
        : err.response?.status === 413
        ? (p.errors?.big || 'One or more pictures are too large.')
        : (p.errors?.generic || 'Failed to update wallpapers.')
    );
  };

  const run = async (request, message) => {
    setBusy(true);
    setError('');
    try {
      const res = await request();
      setState(res.data);
      if (res.data?.seconds) setCustomSeconds(String(res.data.seconds));
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

  const chooseMultiple = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;
    setError('');

    const invalid = files.find((f) => !/^image\/(jpeg|png|webp)$/.test(f.type));
    if (invalid) {
      setError(p.errors?.type || 'Choose JPG, PNG or WebP picture(s).');
      return;
    }

    try {
      setBusy(true);
      const converted = await Promise.all(files.map((file) => shrinkPicture(file)));
      setPreviews((prev) => [...prev, ...converted]);
    } catch {
      setError(p.errors?.type || 'Failed to process images.');
    } finally {
      setBusy(false);
    }
  };

  const removePreview = (index) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addWallpapers = async () => {
    if (previews.length === 0) return;
    const count = previews.length;
    const msg = count === 1 ? (p.added || 'Wallpaper added.') : `${count} wallpapers added successfully.`;
    const ok = await run(() => API.post('/admin/site/wallpapers', { images: previews }), msg);
    if (ok) setPreviews([]);
  };

  const remove = (wallpaper) => run(() => API.delete(`/admin/site/wallpapers/${wallpaper.id}`), p.removed);
  const reset = () => run(() => API.delete('/admin/site/wallpapers'), p.resetDone);

  // Set default hold seconds
  const applyDefaultSeconds = (val) => {
    const num = Math.max(2, Math.min(300, Math.round(Number(val) || 6)));
    setCustomSeconds(String(num));
    saveSettings({ seconds: num }, p.settingsSaved || 'Default hold time updated.');
  };

  // Set individual hold duration for one specific wallpaper
  const setWallpaperDuration = (id, val) => {
    const num = Math.max(2, Math.min(300, Math.round(Number(val) || 6)));
    const nextTimings = { ...(state?.timings || {}), [id]: num };
    saveSettings({ timings: nextTimings }, `Duration set to ${num}s for this wallpaper.`);
  };

  // Revert a specific wallpaper back to default hold duration
  const resetWallpaperDuration = (id) => {
    const nextTimings = { ...(state?.timings || {}) };
    delete nextTimings[id];
    saveSettings({ timings: nextTimings }, 'Reverted wallpaper to default duration.');
  };

  // Reset all wallpapers to default duration
  const resetAllToDefault = () => {
    saveSettings({ timings: {} }, 'All wallpapers set to default duration.');
  };

  const chooseActiveWallpaper = (id) => {
    saveSettings({ active: id }, 'Chosen as primary cover wallpaper.');
  };

  const rotating = state ? state.rotate : true;
  const currentHoldSeconds = state?.seconds || 6;
  const PRESET_SECONDS = [3, 5, 8, 10, 15, 20, 30, 60];
  const customTimingsCount = Object.keys(state?.timings || {}).length;

  return (
    <div className="space-y-6 p-5 sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-slate-800">
          <ImageIcon className="h-4 w-4 text-magenta" />
          {p.title}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{p.intro}</p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 animate-fade-in">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Rotate or keep one + Default hold duration */}
      <div className="rounded-[24px] bg-cream p-5 ring-1 ring-ink/5 space-y-5">
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

        {/* Global Default Duration */}
        {rotating && state && (
          <div className="border-t border-ink/10 pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="wallpaper-default-seconds" className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                <Clock className="h-4 w-4 text-magenta" />
                <span>Default Slideshow Hold Time</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-magenta/10 px-2.5 py-0.5 text-xs font-bold text-magenta">
                  {currentHoldSeconds}s default
                </span>
                {customTimingsCount > 0 && (
                  <button
                    type="button"
                    onClick={resetAllToDefault}
                    disabled={busy}
                    className="text-[11px] font-semibold text-brand-700 hover:underline"
                    title="Clear individual timings and apply default time to all"
                  >
                    Reset all to {currentHoldSeconds}s
                  </button>
                )}
              </div>
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_SECONDS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={busy}
                  onClick={() => applyDefaultSeconds(sec)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    currentHoldSeconds === sec
                      ? 'bg-magenta text-white shadow-sm ring-2 ring-magenta'
                      : 'bg-white text-slate-700 ring-1 ring-ink/10 hover:bg-slate-100 hover:text-ink'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Slider & numeric input */}
            <div className="flex items-center gap-3 pt-1">
              <input
                id="wallpaper-seconds-range"
                type="range"
                min="2"
                max="120"
                step="1"
                value={currentHoldSeconds}
                disabled={busy}
                onChange={(e) => applyDefaultSeconds(Number(e.target.value))}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-magenta"
                aria-label="Default hold duration slider"
              />
              <div className="flex items-center gap-1">
                <input
                  id="wallpaper-default-seconds"
                  type="number"
                  min="2"
                  max="300"
                  value={customSeconds}
                  disabled={busy}
                  onChange={(e) => setCustomSeconds(e.target.value)}
                  onBlur={() => applyDefaultSeconds(customSeconds)}
                  onKeyDown={(e) => e.key === 'Enter' && applyDefaultSeconds(customSeconds)}
                  className="w-16 rounded-xl border border-ink/15 bg-white px-2 py-1 text-center font-mono text-sm font-bold text-ink focus:border-magenta focus:outline-none"
                />
                <span className="text-xs font-medium text-slate-500">sec</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Each wallpaper holds on screen for this duration before moving to the next. You can also customize individual hold durations below.
            </p>
          </div>
        )}
      </div>

      {/* Wallpapers List */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-ink">{rotating ? p.listTitle : p.keepTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{rotating ? p.listHint : p.keepHint}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {wallpapers.length} {wallpapers.length === 1 ? 'wallpaper' : 'wallpapers'}
          </span>
        </div>

        {!state ? (
          <div className="skeleton mt-4 h-40 rounded-[24px]" />
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wallpapers.map((wallpaper, index) => {
              const isSelected = !rotating && shownId === wallpaper.id;
              const isCover = wallpaper.id === (state?.active || wallpapers[0]?.id);
              const duration = wallpaper.duration;
              const hasCustom = wallpaper.hasCustomDuration;

              return (
                <li
                  key={wallpaper.id}
                  className={`relative group rounded-[24px] border bg-white p-2.5 shadow-xs transition-shadow hover:shadow-md ${
                    isSelected || isCover ? 'border-magenta ring-2 ring-magenta/20' : 'border-ink/10'
                  }`}
                >
                  <div className="relative overflow-hidden rounded-[18px]">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => (!rotating ? saveSettings({ active: wallpaper.id }, p.keptSaved) : chooseActiveWallpaper(wallpaper.id))}
                      aria-pressed={isSelected}
                      className={`block w-full text-left transition-all ${
                        !rotating ? 'cursor-pointer hover:opacity-95' : 'cursor-pointer'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={wallpaper.src}
                        alt=""
                        className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {isSelected && (
                        <span className="absolute inset-0 flex items-center justify-center bg-ink/40">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-magenta text-white shadow-lg">
                            <Check className="h-6 w-6 stroke-[3]" />
                          </span>
                        </span>
                      )}
                      {isCover && !isSelected && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-magenta px-2.5 py-1 text-[11px] font-bold text-white shadow">
                          <Star className="h-3 w-3 fill-white" />
                          Cover
                        </span>
                      )}
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
                        #{index + 1}
                      </span>
                    </button>

                    {/* Remove button */}
                    {wallpapers.length > 1 && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(wallpaper)}
                        aria-label={p.remove}
                        title={p.remove}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600/90 text-white shadow-md transition-colors hover:bg-red-700 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Individual duration control per wallpaper (when rotating) */}
                  {rotating && (
                    <div className="mt-3 space-y-2 px-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-slate-600">Hold time:</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            hasCustom
                              ? 'bg-magenta/10 text-magenta ring-1 ring-magenta/20'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {hasCustom ? `${duration}s (Custom)` : `${duration}s (Default)`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center rounded-xl border border-ink/15 bg-slate-50 p-0.5">
                          <button
                            type="button"
                            onClick={() => setWallpaperDuration(wallpaper.id, Math.max(2, duration - 1))}
                            disabled={busy || duration <= 2}
                            title="Decrease hold time by 1s"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-slate-700 hover:bg-white transition-colors disabled:opacity-40"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="2"
                            max="300"
                            value={hasCustom ? duration : ''}
                            placeholder={`${currentHoldSeconds}`}
                            disabled={busy}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || Number(val) <= 0) {
                                resetWallpaperDuration(wallpaper.id);
                              } else {
                                setWallpaperDuration(wallpaper.id, val);
                              }
                            }}
                            className="w-10 bg-transparent text-center font-mono text-xs font-bold text-ink focus:outline-none"
                            title="Custom hold time in seconds"
                          />
                          <button
                            type="button"
                            onClick={() => setWallpaperDuration(wallpaper.id, Math.min(300, duration + 1))}
                            disabled={busy || duration >= 300}
                            title="Increase hold time by 1s"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-slate-700 hover:bg-white transition-colors disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>

                        {hasCustom ? (
                          <button
                            type="button"
                            onClick={() => resetWallpaperDuration(wallpaper.id)}
                            disabled={busy}
                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Reset to default duration"
                          >
                            Reset
                          </button>
                        ) : (
                          <div className="flex gap-1">
                            {[5, 10].map((quickSec) => (
                              <button
                                key={quickSec}
                                type="button"
                                onClick={() => setWallpaperDuration(wallpaper.id, quickSec)}
                                disabled={busy}
                                className="rounded-md border border-ink/10 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:border-magenta hover:text-magenta transition-colors"
                              >
                                {quickSec}s
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add One or More Wallpapers */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-dashed border-ink/20 p-5 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <p className="font-bold text-ink text-sm flex items-center gap-2">
            <Upload className="h-4 w-4 text-magenta" />
            <span>Add One or More Wallpapers</span>
          </p>
          {previews.length > 0 && (
            <span className="rounded-full bg-magenta/10 px-2.5 py-0.5 text-xs font-bold text-magenta">
              {previews.length} selected
            </span>
          )}
        </div>

        {/* Selected Previews Gallery */}
        {previews.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {previews.map((src, index) => (
                <div key={index} className="relative overflow-hidden rounded-[18px] ring-1 ring-ink/10 shadow-sm aspect-[4/5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePreview(index)}
                    disabled={busy}
                    title="Remove this preview"
                    aria-label="Remove picture"
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink/75 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    #{index + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={addWallpapers}
                disabled={busy}
                className={`${primaryButtonClass} flex-1 min-w-[200px]`}
              >
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                <span>
                  {busy
                    ? (p.saving || 'Uploading...')
                    : previews.length === 1
                    ? 'Upload 1 Wallpaper'
                    : `Upload ${previews.length} Wallpapers`}
                </span>
              </button>

              <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-slate-100 transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span>Add more</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={chooseMultiple}
                  disabled={busy || !state}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => setPreviews([])}
                disabled={busy}
                className="rounded-full border border-ink/15 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-sand/60"
              >
                {p.cancel || 'Clear'}
              </button>
            </div>
          </div>
        )}

        {/* Upload Trigger Button when no previews */}
        {previews.length === 0 && (
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-[20px] border-2 border-dashed border-magenta/30 bg-white p-6 text-center transition-all hover:border-magenta hover:bg-magenta/5 group">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-magenta/10 text-magenta transition-transform group-hover:scale-110">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">{p.choose || 'Choose Wallpaper(s)'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Click to select 1 or multiple wallpapers</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={chooseMultiple}
              disabled={busy || !state}
              className="sr-only"
            />
          </label>
        )}

        <p className="text-xs text-slate-500">{p.hint}</p>

        {changedFromOriginal && previews.length === 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50 disabled:opacity-60 self-start"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{p.reset || 'Reset to built-in wallpapers'}</span>
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
            <DashboardSidebar
        items={menu}
        active={tab}
        onSelect={setTab}
        name={session.user?.profile?.fullName || a.title}
        subtitle={session.user?.email}
        photoUrl={profilePhotoUrl(session.user)}
        roleLabel="Admin"
        onLogout={loginExpired}
        menuLabel={a.menuTitle}
        backHref="/"
        backLabel={t.admin?.publicSite || 'Store'}
        hideDesktopTopBar={true}
        card={{ icon: ShieldCheck, title: a.title, text: stats ? fill(a.statProductsSub, { count: stats.products.total }) : a.subtitle, label: a.tabSellers, onClick: () => setTab('sellers') }}
      >
          <section className="flex flex-col gap-4 rounded-[22px] sm:rounded-[28px] bg-slate-800 p-4 sm:p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ProfilePhotoEditor
                user={session.user}
                name={session.user?.profile?.fullName || session.user?.email || a.title}
                onChanged={(updatedUser) => {
                  updateSessionUser(updatedUser);
                  changed('Profile photo updated successfully!');
                }}
                onAuthError={loginExpired}
              />
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-extrabold">
                  <ShieldCheck className="h-6 w-6 text-brand-300" />
                  {a.title}
                </h1>
                <p className="mt-1 text-sm text-slate-300">{a.subtitle}</p>
              </div>
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
              <AdminsPanel session={session} onChanged={changed} onAuthError={loginExpired} />
            </section>
          )}
      </DashboardSidebar>
    </div>
  );
}
