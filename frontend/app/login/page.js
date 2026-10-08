'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '../../src/lib/i18n';
import { useSession, useHydrated, homePathFor, safeNextPath } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import CodeLogin from '../../src/components/CodeLogin';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';
import { PageArt } from '../../src/components/Art';

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
    <main className="relative isolate flex-1 px-4 py-10 sm:py-14">
      <PageArt />
      <div className="mx-auto grid max-w-5xl animate-zoom-in overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel title={texts.title} subtitle={l.subtitle} listTitle={l.welcome} items={texts.steps} numbered />

        <section className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12">
          <div className="mb-6">
            <AccountTypeTabs basePath="/login" current={type} />
          </div>
          <CodeLogin
            key={type}
            requestPath={`/auth/${type}-login/request-code`}
            verifyPath={`/auth/${type}-login/verify-code`}
            texts={texts}
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
