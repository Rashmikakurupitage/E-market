'use client';

import { useEffect, useState } from 'react';
import { Mail, Phone, Pencil, X, LoaderCircle, CircleAlert, CircleCheck, ArrowLeft, ShieldCheck, Terminal, RefreshCw } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import API from '../lib/api';
import { useLanguage, fill } from '../lib/i18n';
import { Field, inputClass, primaryButtonClass } from './form';

// Same rule as the backend (authController.js)
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;
const cleanPhone = (value) => value.replace(/[\s-]/g, '');

const isAuthError = (err) => [401, 403].includes(err.response?.status);

// Turns a backend error into a sentence in the chosen language
function useErrorText() {
  const { t } = useLanguage();
  return (err) => {
    if (!err.response) return t.loginPage.networkError;
    const data = err.response.data || {};
    const template = t.contactEdit.errors[data.code] || t.loginPage.errors[data.code];
    return template ? fill(template, { seconds: data.retryAfter ?? '' }) : data.message || t.admin.actionError;
  };
}

function ErrorBox({ children }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Dialog({ title, onClose, children }) {
  const { t } = useLanguage();

  useEffect(() => {
    const closeOnEscape = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 id="contact-dialog-title" className="text-lg font-extrabold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.dash.form.cancel}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-sand/60 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// New email: a code goes to the new address, and the email only changes once that code is typed in
function EmailDialog({ onClose, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const c = t.contactEdit;
  const l = t.loginPage;
  const errorText = useErrorText();

  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [newEmail, setNewEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [emailed, setEmailed] = useState(true);
  const [minutes, setMinutes] = useState(10);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const fail = (err) => {
    if (isAuthError(err)) return onAuthError?.();
    setError(errorText(err));
  };

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/me/email/request-code', { newEmail: newEmail.trim() });
      setSentTo(res.data.sentTo);
      setEmailed(res.data.emailed !== false);
      setMinutes(res.data.expiresInMinutes);
      setResendIn(res.data.resendAfterSeconds);
      setCode('');
      setStep('code');
    } catch (err) {
      fail(err);
      if (err.response?.data?.code === 'RESEND_TOO_SOON') setResendIn(err.response.data.retryAfter);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post('/auth/me/email/verify-code', { newEmail: newEmail.trim(), code });
      onChanged(res.data.user, fill(c.emailChanged, { email: res.data.user.email }));
    } catch (err) {
      fail(err);
      setLoading(false);
    }
  };

  return (
    <Dialog title={c.emailTitle} onClose={onClose}>
      {step === 'email' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestCode();
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-500">{c.emailIntro}</p>
          {error && <ErrorBox>{error}</ErrorBox>}
          <Field id="new-email" label={c.newEmail} required>
            <input
              id="new-email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass(false)}
              placeholder="name@example.com"
            />
          </Field>
          <button type="submit" disabled={loading || resendIn > 0} className={primaryButtonClass}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {loading ? l.sending : resendIn > 0 ? fill(l.resendIn, { seconds: resendIn }) : c.sendCode}
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setStep('email');
              setError('');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {c.back}
          </button>

          {emailed ? (
            <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm text-slate-700">
                {l.codeSentTo} <strong className="text-slate-900">{sentTo}</strong>
                <span className="mt-1 block text-xs text-slate-500">{l.checkSpam}</span>
              </p>
            </div>
          ) : (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p>{l.notEmailed}</p>
            </div>
          )}

          {error && <ErrorBox>{error}</ErrorBox>}

          <Field id="email-code" label={l.codeLabel} hint={fill(l.codeHint, { minutes })}>
            <input
              id="email-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass(false)} py-3 text-center text-2xl font-bold tracking-[0.5em]`}
              placeholder="000000"
            />
          </Field>

          <button type="submit" disabled={loading || code.length !== 6} className={primaryButtonClass}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? l.verifying : c.confirm}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={requestCode}
              disabled={resendIn > 0 || loading}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              <RefreshCw className="h-4 w-4" />
              {resendIn > 0 ? fill(l.resendIn, { seconds: resendIn }) : l.resend}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// Phone number, plus the WhatsApp number customers order on (sellers only)
function PhoneDialog({ user, onClose, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const c = t.contactEdit;
  const r = t.register;
  const errorText = useErrorText();
  const isSeller = user.role === 'SELLER';
  const currentWhatsapp = user.profile?.whatsappNo || '';

  const [phone, setPhone] = useState(user.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentWhatsapp);
  const [sameAsPhone, setSameAsPhone] = useState(!currentWhatsapp || currentWhatsapp === user.phone);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!PHONE_PATTERN.test(cleanPhone(phone))) errors.phone = c.errors.INVALID_PHONE;
    if (isSeller && !sameAsPhone && !PHONE_PATTERN.test(cleanPhone(whatsapp))) errors.whatsapp = c.errors.INVALID_WHATSAPP;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const body = { phone: cleanPhone(phone) };
      if (isSeller) body.whatsappNo = sameAsPhone ? body.phone : cleanPhone(whatsapp);
      const res = await API.patch('/auth/me/phone', body);
      onChanged(res.data.user, c.phoneChanged);
    } catch (err) {
      if (isAuthError(err)) return onAuthError?.();
      const code = err.response?.data?.code;
      if (code === 'INVALID_PHONE' || code === 'PHONE_TAKEN') setFieldErrors({ phone: errorText(err) });
      else if (code === 'INVALID_WHATSAPP') setFieldErrors({ whatsapp: errorText(err) });
      else setError(errorText(err));
      setLoading(false);
    }
  };

  return (
    <Dialog title={c.phoneTitle} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && <ErrorBox>{error}</ErrorBox>}
        <Field id="new-phone" label={r.phone} required error={fieldErrors.phone}>
          <input
            id="new-phone"
            type="tel"
            inputMode="tel"
            required
            autoFocus
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFieldErrors({ ...fieldErrors, phone: undefined });
            }}
            aria-invalid={!!fieldErrors.phone}
            className={inputClass(fieldErrors.phone)}
          />
        </Field>

        {isSeller && (
          <Field id="new-whatsapp" label={r.whatsapp} required hint={r.whatsappHint} error={fieldErrors.whatsapp}>
            <input
              id="new-whatsapp"
              type="tel"
              inputMode="tel"
              required={!sameAsPhone}
              disabled={sameAsPhone}
              value={sameAsPhone ? phone : whatsapp}
              onChange={(e) => {
                setWhatsapp(e.target.value);
                setFieldErrors({ ...fieldErrors, whatsapp: undefined });
              }}
              aria-invalid={!!fieldErrors.whatsapp}
              className={inputClass(fieldErrors.whatsapp)}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={sameAsPhone}
                onChange={(e) => {
                  setSameAsPhone(e.target.checked);
                  if (!e.target.checked && !whatsapp) setWhatsapp(phone);
                  setFieldErrors({ ...fieldErrors, whatsapp: undefined });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              {r.sameAsPhone}
            </label>
          </Field>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="w-1/3 rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-600 hover:bg-cream">
            {t.dash.form.cancel}
          </button>
          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {loading ? c.saving : c.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Row({ icon: Icon, label, value, onChange, changeLabel }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words font-medium text-slate-900">{value || '—'}</dd>
      </div>
      <button
        type="button"
        onClick={onChange}
        aria-label={`${changeLabel}: ${label}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-200 hover:bg-brand-50"
      >
        <Pencil className="h-3.5 w-3.5" />
        {changeLabel}
      </button>
    </div>
  );
}

// "Contact details" card with Change buttons, used on the seller dashboard and the customer account page.
// `onUpdated(user)` receives the updated user from the backend.
export default function ContactDetails({ user, onUpdated, onAuthError, className = '' }) {
  const { t } = useLanguage();
  const c = t.contactEdit;
  const r = t.register;
  const [open, setOpen] = useState(null); // 'email' | 'phone' | null
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  const changed = (updatedUser, message) => {
    setOpen(null);
    setNotice(message);
    onUpdated(updatedUser);
  };

  return (
    <section className={`rounded-[28px] bg-white px-6 py-5 shadow-sm ring-1 ring-ink/5 ${className}`}>
      <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-800">{c.title}</h2>

      {notice && (
        <p role="status" className="mt-3 flex items-start gap-2.5 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-800 ring-1 ring-brand-200">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          {notice}
        </p>
      )}

      <dl className="mt-2 divide-y divide-slate-100">
        <Row icon={Mail} label={r.email} value={user.email} changeLabel={c.change} onChange={() => setOpen('email')} />
        <Row icon={Phone} label={r.phone} value={user.phone} changeLabel={c.change} onChange={() => setOpen('phone')} />
        {user.role === 'SELLER' && (
          <Row
            icon={WhatsAppIcon}
            label={r.whatsapp}
            value={user.profile?.whatsappNo}
            changeLabel={c.change}
            onChange={() => setOpen('phone')}
          />
        )}
      </dl>

      {open === 'email' && <EmailDialog onClose={() => setOpen(null)} onChanged={changed} onAuthError={onAuthError} />}
      {open === 'phone' && <PhoneDialog user={user} onClose={() => setOpen(null)} onChanged={changed} onAuthError={onAuthError} />}
    </section>
  );
}
