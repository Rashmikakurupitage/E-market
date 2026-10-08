'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck, Terminal } from 'lucide-react';
import API from '../lib/api';
import { fill } from '../lib/i18n';
import { saveSession } from '../lib/auth';
import { Field, inputClass, primaryButtonClass } from './form';

// Two-step login used by sellers and admins:
//   1. email + NIC  ->  the backend emails a 6-digit code
//   2. type the code ->  logged in, then go to `redirectTo`
// `texts` is the loginPage translation block (admins pass a copy with their own hints/errors).
export default function CodeLogin({ requestPath, verifyPath, texts: l, redirectTo, footer }) {
  const router = useRouter();

  const [step, setStep] = useState('details'); // 'details' = email + NIC, 'code' = 6-digit code
  const [email, setEmail] = useState('');
  const [nic, setNic] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [emailed, setEmailed] = useState(true); // false while the backend has no email (SMTP) settings
  const [minutes, setMinutes] = useState(10);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Count down until "Resend code" is allowed again
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const describeError = (err) => {
    if (!err.response) return l.networkError;
    const data = err.response.data || {};
    const template = l.errors[data.code];
    return template ? fill(template, { seconds: data.retryAfter ?? '' }) : data.message || l.genericError;
  };

  const loginDetails = () => ({ email: email.trim(), nicNumber: nic.trim().toUpperCase() });

  const requestCode = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await API.post(requestPath, loginDetails());
      setSentTo(res.data.sentTo);
      setEmailed(res.data.emailed !== false);
      setMinutes(res.data.expiresInMinutes);
      setResendIn(res.data.resendAfterSeconds);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(describeError(err));
      // A code was sent less than a minute ago and is still valid, so let them type it in
      if (err.response?.data?.code === 'RESEND_TOO_SOON') {
        setResendIn(err.response.data.retryAfter);
        setStep('code');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await API.post(verifyPath, { ...loginDetails(), code });
      saveSession(res.data.token, res.data.user);
      router.push(redirectTo);
    } catch (err) {
      setError(describeError(err));
      setLoading(false);
    }
  };

  const backToDetails = () => {
    setStep('details');
    setError('');
    setCode('');
  };

  return (
    <>
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === 'details' ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestCode();
          }}
          className="space-y-5"
        >
          <Field id="email" label={l.email} required>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass(false)}
              placeholder="name@example.com"
            />
          </Field>
          <Field id="nic" label={l.nic} required hint={l.nicHint}>
            <input
              id="nic"
              type="text"
              required
              value={nic}
              onChange={(e) => setNic(e.target.value)}
              className={`${inputClass(false)} uppercase`}
            />
          </Field>

          <button type="submit" disabled={loading} className={primaryButtonClass}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            {loading ? l.sending : l.sendCode}
          </button>

          {footer}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-5">
          <button
            type="button"
            onClick={backToDetails}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {l.changeDetails}
          </button>

          {sentTo && !emailed && (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <p>{l.notEmailed}</p>
            </div>
          )}

          {sentTo && emailed && (
            <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
              <p className="text-sm text-slate-700">
                {l.codeSentTo} <strong className="text-slate-900">{sentTo}</strong>
                <span className="mt-1 block text-xs text-slate-500">{l.checkSpam}</span>
              </p>
            </div>
          )}

          <Field id="code" label={l.codeLabel} hint={fill(l.codeHint, { minutes })}>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              autoFocus
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass(false)} py-3.5 text-center text-2xl font-bold tracking-[0.5em]`}
              placeholder="000000"
            />
          </Field>

          <button type="submit" disabled={loading || code.length !== 6} className={primaryButtonClass}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? l.verifying : l.verify}
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
    </>
  );
}
