'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleAlert, CircleCheck, LoaderCircle, MailCheck } from 'lucide-react';
import API from '../../src/lib/api';
import { fill, useLanguage } from '../../src/lib/i18n';
import { homePathFor, safeNextPath, saveSession } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import { PageArt } from '../../src/components/Art';

const RESEND_WAIT = 60;

function VerifyEmail() {
  const { t } = useLanguage();
  const v = t.verify;
  const router = useRouter();
  const params = useSearchParams();
  const email = (params.get('email') || '').trim();
  const as = params.get('as') === 'customer' ? 'customer' : 'seller';
  const next = safeNextPath(params.get('next'));
  const resendOnLoad = params.get('resend') === '1';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [wait, setWait] = useState(resendOnLoad ? 0 : RESEND_WAIT); // seconds until "send again" is allowed
  const sentOnLoad = useRef(false);

  // Count down to the next allowed "send again"
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const explain = (err) => {
    const data = err.response?.data;
    return !err.response ? v.errors.network : v.errors[data?.code] || v.errors.generic;
  };

  const sendAgain = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await API.post('/auth/resend-verification', { email });
      setInfo(v.sentAgain);
      setWait(RESEND_WAIT);
    } catch (err) {
      setError(explain(err));
    } finally {
      setLoading(false);
    }
  };

  // Arriving from the login page (an unverified account): send a fresh code once
  useEffect(() => {
    if (!resendOnLoad || !email || sentOnLoad.current) return;
    sentOnLoad.current = true;
    sendAgain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setInfo('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError(v.codeInvalid);
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/verify-email', { email, code: code.trim() });
      saveSession(res.data.token, res.data.user);
      setDone(true);
      const target = res.data.user.role === 'CUSTOMER' ? next || homePathFor('CUSTOMER') : homePathFor(res.data.user.role);
      setTimeout(() => router.replace(target), 1800);
    } catch (err) {
      setError(explain(err));
      if (err.response?.data?.code === 'ALREADY_VERIFIED') setTimeout(() => router.replace(as === 'customer' ? '/login?as=customer' : '/login'), 1800);
    } finally {
      setLoading(false);
    }
  };

  const masked = email ? email.replace(/^(.{2})(.*)(@.*)$/, (m, a, b, c) => `${a}${'*'.repeat(Math.max(b.length, 2))}${c}`) : '';

  return (
    <main className="relative isolate flex-1 px-3 py-6 sm:px-6 sm:py-14 w-full max-w-full overflow-x-hidden">
      <PageArt />
      <div className="mx-auto grid max-w-5xl animate-zoom-in overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel title={v.title} subtitle={v.subtitle} listTitle={v.stepsTitle} items={v.steps} numbered />

        <section className="flex flex-col justify-center px-4 py-6 sm:px-10 sm:py-12">
          {done ? (
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-white shadow-lg shadow-leaf/30">
                <CircleCheck className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-ink">{v.doneTitle}</h2>
              <p className="mt-2 text-sm text-ink/65">{v.doneText}</p>
            </div>
          ) : !email ? (
            <div className="text-center">
              <p className="text-sm text-ink/70">{v.noEmail}</p>
              <Link href={as === 'customer' ? '/register?as=customer' : '/register'} className={`${primaryButtonClass} mt-6`}>
                {v.toRegister}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-ink">
                  <MailCheck className="h-6 w-6 text-magenta" />
                  {v.formTitle}
                </h2>
                <p className="mt-1.5 text-sm text-ink/65">{fill(v.sentTo, { email: masked })}</p>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {info && !error && (
                <div role="status" className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800">
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{info}</span>
                </div>
              )}

              <Field id="code" label={v.code} required hint={v.codeHint}>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputClass(!!error)} text-center text-xl tracking-[0.5em]`}
                  placeholder="••••••"
                />
              </Field>

              <button type="submit" disabled={loading || code.length !== 6} className={primaryButtonClass}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                {loading ? v.working : v.verify}
              </button>

              <button type="button" onClick={sendAgain} disabled={loading || wait > 0} className="w-full text-center text-sm font-semibold text-brand-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60 disabled:no-underline">
                {wait > 0 ? fill(v.resendIn, { seconds: wait }) : v.resend}
              </button>

              <p className="text-center text-sm text-slate-500">
                {v.wrongEmail}{' '}
                <Link href={as === 'customer' ? '/register?as=customer' : '/register'} className="font-semibold text-brand-700 hover:underline">
                  {v.toRegister}
                </Link>
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <VerifyEmail />
    </Suspense>
  );
}
