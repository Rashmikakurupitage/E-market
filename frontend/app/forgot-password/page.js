'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleAlert, CircleCheck, CheckCircle2, KeyRound, LoaderCircle, Mail, ShieldCheck, Terminal } from 'lucide-react';
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
  const f = t.forgot || {};
  const r = t.register || {};
  const as = useAccountType();
  const loginHref = as === 'customer' ? '/login?as=customer' : '/login';

  // Steps: 'email' (Step 1) -> 'verify' (Step 2: Check Code) -> 'new-password' (Step 3: Create Password) -> 'done'
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [emailed, setEmailed] = useState(true);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // Auto redirect to login on completion
  useEffect(() => {
    if (step !== 'done') return;
    const timer = setTimeout(() => {
      router.push(loginHref);
    }, 3000);
    return () => clearTimeout(timer);
  }, [step, loginHref, router]);

  const fail = (err) => {
    const data = err.response?.data;
    const template = f.errors?.[data?.code];
    setError(
      !err.response
        ? (f.errors?.network || 'Cannot reach the server. Please try again.')
        : template
        ? fill(template, {
            seconds: data.retryAfter ?? '',
            role: data.role || (as === 'seller' ? 'Seller' : 'Customer'),
          })
        : (data?.message || f.errors?.generic || 'Something went wrong. Please try again.')
    );
  };

  // Step 1: Send the 6-digit OTP code to the user's original registered Gmail
  const handleSendCode = async (event) => {
    event?.preventDefault();
    setError('');
    setErrors({});

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError(f.errors?.MISSING_DETAILS || 'Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/auth/forgot-password', {
        email: cleanEmail,
        role: as === 'seller' ? 'SELLER' : 'CUSTOMER',
      });

      // Code successfully sent to original registered email
      const verifiedEmail = response.data.email || cleanEmail;
      setEmail(verifiedEmail);
      setSentTo(response.data.sentTo || verifiedEmail);
      setEmailed(response.data.emailed !== false);
      setResendIn(response.data.resendAfterSeconds || 60);
      setCode('');
      setStep('verify');
    } catch (err) {
      fail(err);
      if (err.response?.data?.code === 'RESEND_TOO_SOON') {
        setResendIn(err.response.data.retryAfter || 60);
        setStep('verify');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setCode('');
    setError('');
    setErrors({});
  };

  // Step 2: Verify whether the 6-digit OTP code is correct or incorrect
  const handleVerifyCode = async (event) => {
    event?.preventDefault();
    setError('');
    setErrors({});

    const cleanCode = code.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setErrors({ code: f.codeInvalid || 'Please enter the complete 6-digit verification code.' });
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/auth/verify-reset-code', {
        email: email.trim(),
        code: cleanCode,
        role: as === 'seller' ? 'SELLER' : 'CUSTOMER',
      });

      if (response.data.verified && response.data.resetToken) {
        setResetToken(response.data.resetToken);
        setError('');
        setStep('new-password');
      } else {
        setError(f.errors?.WRONG_CODE || 'The verification code is incorrect. Please try again.');
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Once verified, save the new password
  const handleSavePassword = async (event) => {
    event?.preventDefault();
    setError('');
    const found = {};

    if (!isStrongPassword(password)) {
      found.password = r.passwordRule || 'Password must have at least 8 characters, one uppercase letter, and one number or symbol.';
    }
    if (password !== confirm) {
      found.confirm = f.noMatch || 'Passwords do not match.';
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await API.post('/auth/reset-password', {
        email: email.trim(),
        code: code.trim(),
        resetToken: resetToken || undefined,
        newPassword: password,
      });
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
        <AuthPanel
          title={f.title || 'Reset your password'}
          subtitle={f.subtitle || 'Choose a new password with a code sent to your email.'}
          listTitle={f.stepsTitle || 'Steps'}
          items={f.steps || [
            'Enter your registered email address',
            'Verify the 6-digit Gmail code',
            'Create a new password and log in',
          ]}
          numbered
        />

        <section className="flex flex-col justify-center px-4 py-6 sm:px-10 sm:py-12">
          {step !== 'done' && (
            <div className="mb-6">
              <AccountTypeTabs basePath="/forgot-password" current={as} />
            </div>
          )}

          {step === 'done' ? (
            /* Completed Screen */
            <div className="text-center animate-fade-in">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                <CircleCheck className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-2xl font-bold text-ink">{f.doneTitle || 'Password changed successfully!'}</h2>
              <p className="mt-2 text-sm text-ink/65">{f.doneText || 'You can now log in with your new password.'}</p>
              <Link href={loginHref} className={`${primaryButtonClass} mt-6 inline-flex items-center justify-center gap-2`}>
                <span>{f.toLogin || 'Log in now'}</span>
              </Link>
            </div>
          ) : step === 'email' ? (
            /* STEP 1: Enter Registered Email Address Only */
            <form onSubmit={handleSendCode} noValidate className="space-y-5 animate-fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-ink">
                  <Mail className="h-6 w-6 text-magenta" />
                  {f.emailTitle || 'Find your account'}
                </h2>
                <p className="mt-1.5 text-sm text-ink/65">
                  {f.emailText || 'Enter the email you registered with. We will send you a code.'}
                </p>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 animate-fade-in">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <Field
                id="email"
                label={r.email || 'Email Address'}
                required
              >
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass(false)}
                  placeholder="name@example.com"
                  autoFocus
                />
              </Field>

              <button type="submit" disabled={loading || !email.trim()} className={primaryButtonClass}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                <span>{loading ? (f.working || 'Please wait...') : (f.sendCode || 'Send code')}</span>
              </button>

              <p className="text-center text-sm text-slate-500 pt-2">
                <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">
                  {f.back || 'Back to login'}
                </Link>
              </p>
            </form>
          ) : step === 'verify' ? (
            /* STEP 2: Verify Code (Correct / Incorrect Check) */
            <form onSubmit={handleVerifyCode} noValidate className="space-y-5 animate-fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-ink">
                  <ShieldCheck className="h-6 w-6 text-brand-600" />
                  {f.verifyCodeTitle || 'Verify your code'}
                </h2>
                <p className="mt-1.5 text-sm text-ink/65">
                  {f.verifyCodeText || 'Enter the 6-digit code sent to your Gmail to verify your identity.'}
                </p>
              </div>

              {/* Email summary capsule */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {f.resettingFor || 'Resetting password for:'} <strong className="font-bold text-slate-900">{email}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="font-semibold text-brand-700 hover:underline ml-2 shrink-0"
                >
                  {f.changeEmail || 'Use a different email address'}
                </button>
              </div>

              {/* Delivery notification */}
              {emailed ? (
                <div role="status" className="flex items-start gap-3 rounded-xl bg-brand-50 p-3.5 ring-1 ring-brand-100 text-sm text-slate-700">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                  <div>
                    <p>
                      {sentTo ? <>{f.codeSentTo || 'We sent a 6-digit code to'} <strong className="text-slate-900">{sentTo}</strong></> : f.sentText}
                    </p>
                    <span className="mt-1 block text-xs text-slate-500">{f.checkSpam || "Can't find it? Check your spam folder."}</span>
                  </div>
                </div>
              ) : (
                <div role="status" className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-amber-200">
                  <Terminal className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                  <p>{f.notEmailed || 'Code logged in backend terminal for development.'}</p>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 animate-shake">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* 6-Digit Code Input */}
              <Field id="code" label={f.code || '6-Digit Code'} required hint={f.codeHint || 'Valid for 10 minutes. Check spam folder.'} error={errors.code}>
                <input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setCode(clean);
                    if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                    if (error) setError('');
                  }}
                  className={`${inputClass(!!errors.code)} text-center text-2xl tracking-[0.45em] font-mono py-3 font-bold`}
                  placeholder="••••••"
                  autoFocus
                />
              </Field>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || code.trim().length !== 6}
                className={primaryButtonClass}
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                <span>{loading ? (f.working || 'Verifying...') : (f.verifyCodeBtn || 'Verify Code')}</span>
              </button>

              {/* Resend Link */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={loading || resendIn > 0}
                  className="text-xs sm:text-sm font-semibold text-brand-700 hover:underline disabled:opacity-60"
                >
                  {resendIn > 0
                    ? fill(f.resendIn || 'Resend code in {seconds}s', { seconds: resendIn })
                    : (f.resend || 'Send the code again')}
                </button>
              </div>

              <p className="text-center text-sm text-slate-500 pt-1">
                <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">
                  {f.back || 'Back to login'}
                </Link>
              </p>
            </form>
          ) : (
            /* STEP 3: Create New Password (Shown Only After Code Is Verified) */
            <form onSubmit={handleSavePassword} noValidate className="space-y-5 animate-fade-in">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-ink">
                  <KeyRound className="h-6 w-6 text-magenta" />
                  {f.newPasswordTitle || 'Create a new password'}
                </h2>
                <p className="mt-1.5 text-sm text-ink/65">
                  {f.newPasswordText || 'Your code is verified! Enter a strong new password for your account.'}
                </p>
              </div>

              {/* Code verified badge */}
              <div className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  {f.codeVerified || 'Code verified successfully for'} <strong className="font-bold">{email}</strong>
                </span>
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <Field id="password" label={f.newPassword || 'New Password'} required hint={r.passwordRule || 'At least 8 characters, 1 uppercase letter, and 1 number/symbol'} error={errors.password}>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  hasError={!!errors.password}
                  placeholder="••••••••"
                  showLabel={r.showPassword || 'Show password'}
                  hideLabel={r.hidePassword || 'Hide password'}
                  autoFocus
                />
              </Field>

              <Field id="confirm" label={r.confirmPassword || 'Confirm New Password'} required error={errors.confirm}>
                <PasswordInput
                  id="confirm"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                  hasError={!!errors.confirm}
                  placeholder="••••••••"
                  showLabel={r.showPassword || 'Show password'}
                  hideLabel={r.hidePassword || 'Hide password'}
                />
              </Field>

              <button type="submit" disabled={loading || !password || !confirm} className={primaryButtonClass}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                <span>{loading ? (f.working || 'Saving...') : (f.savePassword || 'Save new password')}</span>
              </button>

              <p className="text-center text-sm text-slate-500 pt-1">
                <Link href={loginHref} className="font-semibold text-brand-700 hover:underline">
                  {f.back || 'Back to login'}
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
