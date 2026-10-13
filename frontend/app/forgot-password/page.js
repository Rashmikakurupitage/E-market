'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CircleAlert, CircleCheck, KeyRound, LoaderCircle, Mail } from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage } from '../../src/lib/i18n';
import { isStrongPassword } from '../../src/lib/catalog';
import AuthPanel from '../../src/components/AuthPanel';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import PasswordInput from '../../src/components/PasswordInput';
import { PageArt } from '../../src/components/Art';

function ForgotPassword() {
  const { t } = useLanguage();
  const f = t.forgot;
  const r = t.register;
  const as = useSearchParams().get('as') === 'customer' ? 'customer' : 'seller';
  const loginHref = as === 'customer' ? '/login?as=customer' : '/login';

  const [step, setStep] = useState('email'); // 'email' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fail = (err) => {
    const data = err.response?.data;
    setError(!err.response ? f.errors.network : f.errors[data?.code] || f.errors.generic);
  };

  const sendCode = async (event) => {
    event?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setStep('reset');
    } catch (err) {
      fail(err);
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
    <main className="relative isolate flex-1 px-4 py-10 sm:py-14">
      <PageArt />
      <div className="mx-auto grid max-w-5xl animate-zoom-in overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel title={f.title} subtitle={f.subtitle} listTitle={f.stepsTitle} items={f.steps} numbered />

        <section className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
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
                  className={inputClass(false)}
                  placeholder="name@example.com"
                />
              </Field>

              {step === 'reset' && (
                <>
                  <Field id="code" label={f.code} required hint={f.codeHint} error={errors.code}>
                    <input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className={`${inputClass(errors.code)} tracking-[0.5em]`}
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
                <button type="button" onClick={sendCode} disabled={loading} className="w-full text-center text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60">
                  {f.resend}
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
