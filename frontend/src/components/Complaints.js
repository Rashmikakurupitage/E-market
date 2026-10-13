'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CircleAlert, CircleCheck, Clock, Flag, LoaderCircle, MessageSquareReply, Pencil, Plus, RotateCw, Scale, ShieldCheck, Store, X, XCircle } from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { formatDate } from '../lib/catalog';
import { Field, inputClass, primaryButtonClass } from './form';
import Reveal from './Reveal';

export const REASONS = ['NOT_DELIVERED', 'NOT_AS_DESCRIBED', 'POOR_QUALITY', 'OVERCHARGED', 'RUDE_BEHAVIOUR', 'OTHER'];
export const COMPLAINT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];
const MIN_MESSAGE = 20;
const MAX_MESSAGE = 1500;

const STATUS_LOOK = {
  OPEN: { icon: Clock, className: 'bg-turmeric/25 text-ink ring-turmeric/50' },
  IN_REVIEW: { icon: Scale, className: 'bg-magenta/10 text-magenta ring-magenta/20' },
  RESOLVED: { icon: CircleCheck, className: 'bg-leaf/15 text-leaf ring-leaf/30' },
  DISMISSED: { icon: XCircle, className: 'bg-ink/5 text-ink/55 ring-ink/10' },
};

const CHANGED_EVENT = 'lw-complaints-changed';
const isAuthError = (err) => [401, 403].includes(err.response?.status);

export function ComplaintStatusBadge({ status }) {
  const { t } = useLanguage();
  const { icon: Icon, className } = STATUS_LOOK[status] || STATUS_LOOK.OPEN;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {t.complaints.status[status] || status}
    </span>
  );
}

// The logged-in customer's complaints, reloaded whenever one is sent
export function useMyComplaints(onAuthError) {
  const [complaints, setComplaints] = useState([]);
  const [status, setStatus] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    API.get('/complaints/mine')
      .then((res) => {
        if (ignore) return;
        setComplaints(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) onAuthError?.();
        else setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, [reloadKey, onAuthError]);

  useEffect(() => {
    const reload = () => setReloadKey((key) => key + 1);
    window.addEventListener(CHANGED_EVENT, reload);
    return () => window.removeEventListener(CHANGED_EVENT, reload);
  }, []);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };
  return { complaints, status, retry };
}

// A pop-up where the customer describes a problem with the seller of one of their orders
// With an order: a complaint about that order's seller. Without one: the customer picks the seller.
// With a complaint: the customer edits their own (still open) complaint.
export function ComplaintDialog({ order = null, complaint = null, onClose }) {
  const { t } = useLanguage();
  const c = t.complaints;
  const [reason, setReason] = useState(complaint?.reason || '');
  const [sellerId, setSellerId] = useState('');
  const [sellers, setSellers] = useState(null); // null while loading
  const [message, setMessage] = useState(complaint?.message || '');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // the saved complaint

  useEffect(() => {
    if (order || complaint) return;
    let ignore = false;
    API.get('/complaints/sellers')
      .then((res) => !ignore && setSellers(res.data))
      .catch(() => !ignore && setSellers([]));
    return () => {
      ignore = true;
    };
  }, [order, complaint]);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && !sending && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const submit = async (event) => {
    event.preventDefault();
    setServerError('');
    const found = {};
    if (!order && !complaint && !sellerId) found.seller = c.sellerMissing;
    if (!reason) found.reason = c.reasonMissing;
    if (message.trim().length < MIN_MESSAGE) found.message = c.messageShort;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSending(true);
    try {
      const res = complaint
        ? await API.patch(`/complaints/${complaint.id}`, { reason, message: message.trim() })
        : await API.post('/complaints', { ...(order ? { orderId: order.id } : { sellerId }), reason, message: message.trim() });
      setSent(res.data);
      window.dispatchEvent(new Event(CHANGED_EVENT));
    } catch (err) {
      const code = err.response?.data?.code;
      setServerError(!err.response ? c.errors.network : c.errors[code] || c.errors.generic);
    } finally {
      setSending(false);
    }
  };

  // Drawn straight into <body>, so the site header can never cover it
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !sending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complaint-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg animate-zoom-in overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-[28px]"
      >
        {sent ? (
          <div className="text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-white shadow-lg shadow-leaf/30">
              <CircleCheck className="h-8 w-8" />
            </span>
            <h2 id="complaint-title" className="mt-4 text-2xl font-bold text-ink">{complaint ? c.savedTitle : c.sentTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">{complaint ? fill(c.saved, { reference: sent.reference }) : fill(c.sent, { reference: sent.reference })}</p>
            <button type="button" onClick={onClose} className="btn-shine mt-6 w-full rounded-full bg-ink py-3 text-sm font-semibold text-white transition-colors hover:bg-magenta">
              {c.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="complaint-title" className="flex items-center gap-2 text-xl font-bold text-ink">
                  <Flag className="h-5 w-5 shrink-0 text-magenta" />
                  {complaint ? c.editTitle : order ? fill(c.dialogTitle, { seller: order.seller?.businessName || '' }) : c.newTitle}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{complaint ? fill(c.editIntro, { seller: complaint.seller?.businessName || '' }) : order ? fill(c.dialogIntro, { reference: order.reference }) : c.newIntro}</p>
              </div>
              <button type="button" onClick={onClose} disabled={sending} aria-label={c.close} className="shrink-0 rounded-full p-1.5 text-ink/40 hover:bg-sand/70 hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {serverError && (
              <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {serverError}
              </div>
            )}

            {!order && !complaint && (
              <Field id="complaint-seller" label={c.seller} required error={errors.seller}>
                <select
                  id="complaint-seller"
                  value={sellerId}
                  disabled={sellers === null}
                  onChange={(e) => {
                    setSellerId(e.target.value);
                    setErrors((old) => ({ ...old, seller: undefined }));
                  }}
                  aria-invalid={!!errors.seller}
                  className={inputClass(errors.seller)}
                >
                  <option value="">{sellers === null ? c.sellersLoading : sellers.length === 0 ? c.noSellers : c.chooseSeller}</option>
                  {(sellers || []).map((seller) => (
                    <option key={seller.id} value={seller.id}>
                      {seller.businessName}{seller.district ? ` (${seller.district})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field id="complaint-reason" label={c.reason} required error={errors.reason}>
              <select
                id="complaint-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setErrors((old) => ({ ...old, reason: undefined }));
                }}
                aria-invalid={!!errors.reason}
                className={inputClass(errors.reason)}
              >
                <option value="">{c.choose}</option>
                {REASONS.map((value) => (
                  <option key={value} value={value}>
                    {c.reasons[value]}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="complaint-message" label={c.message} required hint={c.messageHint} error={errors.message}>
              <textarea
                id="complaint-message"
                rows={5}
                maxLength={MAX_MESSAGE}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setErrors((old) => ({ ...old, message: undefined }));
                }}
                aria-invalid={!!errors.message}
                className={inputClass(errors.message)}
              />
              <p className="mt-1 text-right text-[11px] tabular-nums text-ink/40">
                {message.length} / {MAX_MESSAGE}
              </p>
            </Field>

            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
              <button type="button" onClick={onClose} disabled={sending} className="flex-1 rounded-full border border-ink/15 py-3 text-sm font-semibold text-ink/70 transition-colors hover:bg-sand/60">
                {c.cancel}
              </button>
              <button type="submit" disabled={sending} className={`${primaryButtonClass} flex-1`}>
                {sending && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {sending ? c.sending : complaint ? c.saveChanges : c.submit}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

// "My complaints" on the My account page
export function CustomerComplaints({ onAuthError }) {
  const { t, lang } = useLanguage();
  const c = t.complaints;
  const { complaints, status, retry } = useMyComplaints(onAuthError);
  const [writing, setWriting] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <section id="complaints" className="rounded-[28px] bg-white px-6 py-5 shadow-sm ring-1 ring-ink/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-slate-800">
          <Flag className="h-4 w-4 text-magenta" />
          {c.myTitle}
        </h2>
        <button type="button" onClick={() => setWriting(true)} className="inline-flex items-center gap-2 rounded-full bg-magenta px-4 py-2 text-sm font-semibold text-white shadow-md shadow-magenta/20 transition-colors hover:bg-ink">
          <Plus className="h-4 w-4" />
          {c.newButton}
        </button>
      </div>
      {writing && <ComplaintDialog onClose={() => setWriting(false)} />}
      {editing && <ComplaintDialog complaint={editing} onClose={() => setEditing(null)} />}

      {status === 'loading' ? (
        <div className="skeleton mt-5 h-24 rounded-[24px]" />
      ) : status === 'error' ? (
        <div className="mt-5 flex flex-col items-center gap-3 rounded-[24px] bg-red-50 px-6 py-8 text-center text-sm text-red-700 ring-1 ring-red-200">
          <CircleAlert className="h-6 w-6" />
          {c.loadError}
          <button type="button" onClick={retry} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold ring-1 ring-red-200 hover:bg-red-100">
            <RotateCw className="h-4 w-4" />
            {c.retry}
          </button>
        </div>
      ) : complaints.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-[24px] bg-cream px-6 py-8 text-center">
          <ShieldCheck className="h-9 w-9 text-ink/20" />
          <p className="mt-2 text-sm text-ink/60">{c.none}</p>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {complaints.map((complaint, index) => (
            <Reveal as="li" key={complaint.id} delay={Math.min(index, 4) * 80} className="rounded-[24px] bg-cream p-5 ring-1 ring-ink/5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold tracking-wider text-ink">{fill(c.ref, { reference: complaint.reference })}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/50">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {fill(c.filed, { date: formatDate(complaint.createdAt, lang) })}
                    {complaint.status === 'OPEN' && new Date(complaint.updatedAt) - new Date(complaint.createdAt) > 2000 && <span className="ml-2 text-ink/40">· {fill(c.editedOn, { date: formatDate(complaint.updatedAt, lang) })}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {complaint.status === 'OPEN' && (
                    <button type="button" onClick={() => setEditing(complaint)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink ring-1 ring-ink/10 transition-colors hover:bg-magenta hover:text-white">
                      <Pencil className="h-3.5 w-3.5" />
                      {c.edit}
                    </button>
                  )}
                  <ComplaintStatusBadge status={complaint.status} />
                </div>
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/70">
                <Store className="h-4 w-4 text-magenta" />
                <span className="font-semibold text-ink">{fill(c.about, { seller: complaint.seller?.businessName || '' })}</span>
                {complaint.order?.reference && <span className="text-ink/45">· {fill(c.forOrder, { reference: complaint.order.reference })}</span>}
              </p>

              <p className="mt-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/70 ring-1 ring-ink/5">{c.reasons[complaint.reason] || complaint.reason}</p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80">{complaint.message}</p>

              <div className={`mt-4 rounded-[20px] p-4 text-sm ${complaint.adminNote ? 'bg-white ring-1 ring-leaf/30' : 'bg-white/60 text-ink/50'}`}>
                {complaint.adminNote ? (
                  <>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-leaf">
                      <MessageSquareReply className="h-4 w-4" />
                      {c.response}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line leading-relaxed text-ink/80">{complaint.adminNote}</p>
                  </>
                ) : (
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    {c.waiting}
                  </p>
                )}
              </div>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}
