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
import Reveal from '../../src/components/Reveal';
import { CustomerOrders } from '../../src/components/Orders';
import { Lotus, PageArt } from '../../src/components/Art';

const isAuthError = (err) => [401, 403].includes(err.response?.status);

// Colour of the "how to buy" step numbers
const STEP_TONES = ['from-brand-500 to-brand-700'];

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
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <p className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <LoaderCircle className="h-5 w-5 animate-spin text-brand-600" />
          {c.loading}
        </p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="max-w-sm rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-ink/5">
          <CircleAlert className="mx-auto h-10 w-10 text-red-400" />
          <p className="mt-4 font-semibold text-slate-800">{c.loadError}</p>
          <p className="mt-1 text-sm text-slate-500">{t.loginPage.networkError}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('loading');
              setReloadKey((key) => key + 1);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
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
    <main className="relative isolate flex-1 px-4 py-8 sm:py-10">
      <PageArt />
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Welcome */}
        <Reveal as="section" animation="fade-down" className="relative isolate flex flex-col gap-5 overflow-hidden rounded-[32px] bg-ink p-6 text-white shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 -z-10 h-48 w-48 animate-float rounded-full bg-magenta/50 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-10 -z-10 h-56 w-56 animate-float rounded-full bg-saffron/35 blur-3xl [animation-delay:-4s]" />
          <Lotus color="white" className="pointer-events-none absolute -bottom-3 right-1/3 -z-10 hidden w-40 opacity-60 md:block" />

          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-xl font-extrabold text-brand-700 shadow-lg ring-4 ring-white/25">
              {initials(name) || '?'}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-turmeric">{c.accountTitle}</p>
              <h1 className="break-words text-xl font-extrabold sm:text-3xl">{fill(c.welcome, { name })}</h1>
            </div>
          </div>
          <Link
            href="/store"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-turmeric px-5 py-3 text-sm font-bold text-slate-900 shadow-lg shadow-saffron/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-turmeric/85 hover:shadow-xl"
          >
            <ShoppingBag className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
            {c.browse}
          </Link>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Details */}
          <Reveal as="section" animation="fade-right" className="rounded-[28px] bg-white px-6 py-5 shadow-sm ring-1 ring-ink/5">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-800">{c.detailsTitle}</h2>
            <dl className="mt-2 divide-y divide-slate-100">
              <Detail icon={UserRound} label={r.fullName} value={name} />
              <Detail icon={IdCard} label={r.nic} value={user?.profile?.nicNumber || c.noNic} />
            </dl>
          </Reveal>

          {/* Email and phone, with Change buttons */}
          <Reveal animation="fade-left" className="grid"><ContactDetails user={user} onUpdated={contactUpdated} onAuthError={loggedOut} /></Reveal>

          {/* Orders placed in the Store */}
          <div className="md:col-span-2"><CustomerOrders onAuthError={loggedOut} /></div>

          {/* How buying works */}
          <Reveal as="section" delay={100} className="rounded-[28px] bg-white px-6 py-5 shadow-sm ring-1 ring-ink/5 md:col-span-2">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-800">{c.howTitle}</h2>
            <ol className="mt-4 space-y-4">
              {c.howSteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white shadow-md ${STEP_TONES[index % STEP_TONES.length]}`}>
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
