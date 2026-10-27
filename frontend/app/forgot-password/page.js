'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleCheck, KeyRound, LoaderCircle, Mail, Terminal } from 'lucide-react';
import API from '../../src/lib/api';
import { fill, useLanguage } from '../../src/lib/i18n';
import { isStrongPassword } from '../../src/lib/catalog';
import AuthPanel from '../../src/components/AuthPanel';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import PasswordInput from '../../src/components/PasswordInput';
import { PageArt } from '../../src/components/Art';

function ForgotPassword() {
  const router = useRouter();
  const { t } = useLanguage();
  const f = t.forgot;
  const r = t.register;
  const as = useAccountType();
  const loginHref = as === 'customer' ? '/login?as=customer' : '/login';

  const [step, setStep] = useState('email'); // 'email' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [emailed, setEmailed] = useState(true);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step !== 'done') return;
    const timer = setTimeout(() => {
      router.push(loginHref);
    }, 3000);
    return () => clearTimeout(timer);
  }, [step, loginHref, router]);

  const fail = (err) => {
    const data = err.response?.data;
    const template = f.errors[data?.code];
    setError(!err.response ? f.errors.network : template ? fill(template, { seconds: data.retryAfter ?? '' }) : f.errors.generic);
  };

  const sendCode = async (event) => {
    event?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/auth/forgot-password', { email: email.trim() });
      setSentTo(response.data.sentTo || '');
      setEmailed(response.data.emailed !== false);
      setResendIn(response.data.resendAfterSeconds || 60);
      setStep('reset');
    } catch (err) {
      fail(err);
      if (err.response?.data?.code === 'RESEND_TOO_SOON') {
        setResendIn(err.response.data.retryAfter);
        setStep('reset');
      }
    } finally {
      setLoading(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    const found = {};
    if (!/^\d{6}$/.test(code.trim())) found.code = f.codeInvalid;
    if (!isStrongPassword(password)) found.password = r.passwordRule;
    if (password !== confirm) found.confirm = f.noMatch;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await API.post('/auth/reset-password', { email: email.trim(), code: code.trim(), newPassword: password });
      setStep('done');
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate flex-1 px-3 py-6 sm:px-6 sm:py-14 w-full max-w-full overflow-x-hidden">
      <PageArt />
      <div className="mx-auto grid max-w-5xl animate-zoom-in overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel title={f.title} subtitle={f.subtitle} listTitle={f.stepsTitle} items={f.steps} numbered />

        <section className="flex flex-col justify-center px-4 py-6 sm:px-10 sm:py-12">
          {step !== 'done' && (
            <div className="mb-6">
              <AccountTypeTabs basePath="/forgot-password" current={as} />
            </div>
          )}

          {step === 'done' ? (
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-white shadow-lg shadow-leaf/30">
                <CircleCheck className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-ink">{f.doneTitle}</h2>
              <p className="mt-2 text-sm text-ink/65">{f.doneText}</p>
              <Link href={loginHref} className={`${primaryButtonClass} mt-6`}>
                {f.toLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={step === 'email' ? sendCode : save} noValidate className="space-y-5">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-ink">
                  <KeyRound className="h-6 w-6 text-magenta" />
                  {step === 'email' ? f.emailTitle : f.resetTitle}
                </h2>
                <p className="mt-1.5 text-sm text-ink/65">{step === 'email' ? f.emailText : f.sentText}</p>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Field id="email" label={r.email} required>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  readOnly={step === 'reset'}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass(false)} ${step === 'reset' ? 'bg-slate-50 text-slate-600 cursor-not-allowed' : ''}`}
                  placeholder="name@example.com"
                />
                {step === 'reset' && (
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {f.resettingFor} <strong className="font-semibold text-slate-800">{email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('email');
                        setCode('');
                        setPassword('');
                        setConfirm('');
                        setError('');
                      }}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {f.changeEmail}
                    </button>
                  </div>
                )}
              </Field>

              {step === 'reset' && (
                <>
                  {emailed ? (
                    <div role="status" className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-brand-100">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
                      <p className="text-sm text-slate-700">
                        {sentTo ? <>{f.codeSentTo} <strong className="text-slate-900">{sentTo}</strong></> : f.sentText}
                        <span className="mt-1 block text-xs text-slate-500">{f.checkSpam}</span>
                      </p>
                    </div>
                  ) : (
                    <div role="status" className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
                      <Terminal className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                      <p>{f.notEmailed}</p>
                    </div>
                  )}
                  <Field id="code" label={f.code} required hint={f.codeHint} error={errors.code}>
                    <input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className={`${inputClass(errors.code)} text-center text-xl tracking-[0.5em] font-mono`}
                      placeholder="••••••"
                    />
                  </Field>
                  <Field id="password" label={f.newPassword} required hint={r.passwordRule} error={errors.password}>
                    <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hasError={!!errors.password} placeholder="" showLabel={r.showPassword} hideLabel={r.hidePassword} />
                  </Field>
                  <Field id="confirm" label={r.confirmPassword} required error={errors.confirm}>
                    <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} hasError={!!errors.confirm} placeholder="" showLabel={r.showPassword} hideLabel={r.hidePassword} />
                  </Field>
                </>
              )}

              <button type="submit" disabled={loading || !email.trim()} className={primaryButtonClass}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : step === 'email' ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                {loading ? f.working : step === 'email' ? f.sendCode : f.savePassword}
              </button>

              {step === 'reset' && (
                <button type="button" onClick={sendCode} disabled={loading || resendIn > 0} className="w-full text-center text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60">
                  {resendIn > 0 ? fill(f.resendIn, { seconds: resendIn }) : f.resend}
                </button>
              )}

              <p className="text-center text-sm text-slate-500">
                <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">
                  {f.back}
                </Link>
              </p>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <ForgotPassword />
    </Suspense>
  );
}
