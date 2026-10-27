'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleAlert, LoaderCircle, ShieldCheck } from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage } from '../../src/lib/i18n';
import { useSession, useHydrated, homePathFor, safeNextPath, saveSession } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import PasswordInput from '../../src/components/PasswordInput';
import { PageArt } from '../../src/components/Art';

function PasswordLogin({ redirectTo, footer }) {
  const router = useRouter();
  const { t } = useLanguage();
  const l = t.loginPage;
  const forgotHref = useSearchParams().get('as') === 'customer' ? '/forgot-password?as=customer' : '/forgot-password';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false); // the account exists but its email was never verified
  const asParam = useSearchParams().get('as') === 'customer' ? 'customer' : 'seller';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setUnverified(false);
    setLoading(true);

    try {
      const res = await API.post('/auth/login', { email: email.trim(), password });
      saveSession(res.data.token, res.data.user);
      router.push(redirectTo);
    } catch (err) {
      const responseError = err.response?.data;
      if (responseError?.code === 'EMAIL_NOT_VERIFIED') setUnverified(true);
      const message =
        l.errors?.[responseError?.code] ||
        responseError?.message ||
        l.genericError ||
        'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            {error}
            {unverified && (
              <>
                {' '}
                <Link href={`/verify-email?email=${encodeURIComponent(email.trim())}&as=${asParam}&resend=1`} className="font-semibold underline">
                  {l.verifyNow}
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      <Field id="email" label={l.email || 'Email'} required>
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

      <Field id="password" label={l.password || 'Password'} required>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          showLabel={l.showPassword}
          hideLabel={l.hidePassword}
        />
        <p className="mt-2 text-right text-sm">
          <Link href={forgotHref} className="font-semibold text-brand-700 hover:underline">
            {t.forgot.link}
          </Link>
        </p>
      </Field>

      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {loading ? l.loggingIn || 'Logging in...' : l.login || 'Log in'}
      </button>

      {footer}
    </form>
  );
}

function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const l = t.loginPage;
  const c = t.customer;
  const type = useAccountType();
  const session = useSession();
  const hydrated = useHydrated();
  const role = session?.user?.role;
  // e.g. /store/checkout, when the Store sent the customer here to log in
  const next = safeNextPath(useSearchParams().get('next'));

  // Already logged in? Go straight to where they were heading, or their dashboard or account
  useEffect(() => {
    if (hydrated && session) router.replace(next || homePathFor(role));
  }, [hydrated, session, role, router, next]);

  // Don't flash the form while redirecting someone who is logged in
  if (hydrated && session) return <main className="flex-1" />;

  // Sellers and customers log in the same way (email + NIC + emailed code), only the wording differs
  const texts =
    type === 'customer'
      ? { ...l, title: c.loginTitle, steps: c.loginSteps, registerLink: c.registerLink, errors: { ...l.errors, ...c.loginErrors } }
      : l;

  return (
    <main className="relative isolate flex-1 px-3 py-6 sm:px-6 sm:py-14 w-full max-w-full overflow-x-hidden">
      <PageArt />
      <div className="mx-auto grid max-w-5xl animate-zoom-in overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel title={texts.title} subtitle={l.subtitle} listTitle={l.welcome} items={texts.steps} numbered />

        <section className="flex flex-col justify-center px-4 py-6 sm:px-10 sm:py-12">
          <div className="mb-6">
            <AccountTypeTabs basePath="/login" current={type} />
          </div>
          <PasswordLogin
            key={type}
            redirectTo={next || (type === 'customer' ? '/account' : '/dashboard')}
            footer={
              <p className="text-center text-sm text-slate-500">
                {l.noAccount}{' '}
                <Link
                  href={type === 'customer' ? `/register?as=customer${next ? `&next=${encodeURIComponent(next)}` : ''}` : '/register'}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {texts.registerLink}
                </Link>
              </p>
            }
          />
        </section>
      </div>
    </main>
  );
}

// The Seller/Customer choice comes from the URL (?as=customer), which needs a Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Login />
    </Suspense>
  );
}
