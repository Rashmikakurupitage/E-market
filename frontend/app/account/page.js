'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle, CircleAlert, RefreshCw, ShoppingBag, IdCard, UserRound } from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage, fill } from '../../src/lib/i18n';
import { useSession, useHydrated, clearSession, updateSessionUser, homePathFor } from '../../src/lib/auth';
import { initials } from '../../src/lib/catalog';
import ContactDetails from '../../src/components/ContactDetails';

const isAuthError = (err) => [401, 403].includes(err.response?.status);

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words font-medium text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

// A customer's own page: their details and how buying works
export default function Account() {
  const router = useRouter();
  const { t } = useLanguage();
  const c = t.customer;
  const r = t.register;
  const session = useSession();
  const hydrated = useHydrated();
  const role = session?.user?.role;
  const loggedIn = Boolean(session);
  const isCustomer = role === 'CUSTOMER';

  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [user, setUser] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Only logged-in customers may see this page
  useEffect(() => {
    if (!hydrated) return;
    if (!loggedIn) {
      router.replace('/login?as=customer');
      return;
    }
    if (!isCustomer) {
      router.replace(homePathFor(role)); // sellers and admins have their own dashboards
      return;
    }

    let ignore = false;
    API.get('/auth/me')
      .then((res) => {
        if (ignore) return;
        setUser(res.data.user);
        setStatus('ready');
      })
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) {
          // Expired or invalid login: start again from the login page
          clearSession();
          router.replace('/login?as=customer');
        } else {
          setStatus('error');
        }
      });

    return () => {
      ignore = true;
    };
  }, [hydrated, loggedIn, isCustomer, role, router, reloadKey]);

  if (status === 'loading' || !isCustomer) {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-20">
        <p className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
          {c.loading}
        </p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-20">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <CircleAlert className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-4 font-semibold text-slate-800">{c.loadError}</p>
          <p className="mt-1 text-sm text-slate-500">{t.loginPage.networkError}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading');
              setReloadKey((key) => key + 1);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <RefreshCw className="h-4 w-4" />
            {t.dash.retry}
          </button>
        </div>
      </main>
    );
  }

  const name = user?.profile?.fullName || '';

  // Keep the page and the saved login (used by the header) in step with the new email/phone
  const contactUpdated = (updatedUser) => {
    setUser(updatedUser);
    updateSessionUser(updatedUser);
  };

  const loggedOut = () => {
    clearSession();
    router.replace('/login?as=customer');
  };

  return (
    <main className="flex-1 bg-slate-100 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Welcome */}
        <section className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
              {initials(name) || '?'}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c.accountTitle}</p>
              <h1 className="break-words text-xl font-extrabold text-slate-900 sm:text-2xl">{fill(c.welcome, { name })}</h1>
            </div>
          </div>
          <Link
            href="/#products"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
          >
            <ShoppingBag className="h-4 w-4" />
            {c.browse}
          </Link>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Details */}
          <section className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{c.detailsTitle}</h2>
            <dl className="mt-2 divide-y divide-slate-100">
              <Detail icon={UserRound} label={r.fullName} value={name} />
              <Detail icon={IdCard} label={r.nic} value={user?.profile?.nicNumber || c.noNic} />
            </dl>
          </section>

          {/* Email and phone, with Change buttons */}
          <ContactDetails user={user} onUpdated={contactUpdated} onAuthError={loggedOut} />

          {/* How buying works */}
          <section className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200 md:col-span-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">{c.howTitle}</h2>
            <ol className="mt-4 space-y-4">
              {c.howSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </main>
  );
}
