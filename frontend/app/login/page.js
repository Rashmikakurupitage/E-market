'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../src/lib/i18n';
import { useSession, useHydrated, homePathFor } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import CodeLogin from '../../src/components/CodeLogin';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';

function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const l = t.loginPage;
  const c = t.customer;
  const type = useAccountType();
  const session = useSession();
  const hydrated = useHydrated();
  const role = session?.user?.role;

  // Already logged in? Go straight to your dashboard or account
  useEffect(() => {
    if (hydrated && session) router.replace(homePathFor(role));
  }, [hydrated, session, role, router]);

  // Don't flash the form while redirecting someone who is logged in
  if (hydrated && session) return <main className="flex-1 bg-slate-100" />;

  // Sellers and customers log in the same way (email + NIC + emailed code), only the wording differs
  const texts =
    type === 'customer'
      ? { ...l, title: c.loginTitle, steps: c.loginSteps, registerLink: c.registerLink, errors: { ...l.errors, ...c.loginErrors } }
      : l;

  return (
    <main className="flex-1 bg-slate-100 px-4 py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 lg:grid-cols-[2fr_3fr]">
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
            redirectTo={type === 'customer' ? '/account' : '/dashboard'}
            footer={
              <p className="text-center text-sm text-slate-500">
                {l.noAccount}{' '}
                <Link
                  href={type === 'customer' ? '/register?as=customer' : '/register'}
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
    <Suspense fallback={<main className="flex-1 bg-slate-100" />}>
      <Login />
    </Suspense>
  );
}
