'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../../src/lib/i18n';
import { useSession, useHydrated } from '../../../src/lib/auth';
import AdminAuthCard from '../../../src/components/AdminAuthCard';
import CodeLogin from '../../../src/components/CodeLogin';

export default function AdminLogin() {
  const router = useRouter();
  const { t } = useLanguage();
  const a = t.admin;
  const session = useSession();
  const hydrated = useHydrated();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';

  // Already logged in as an admin? Go straight to the admin dashboard
  useEffect(() => {
    if (hydrated && isAdmin) router.replace('/admin');
  }, [hydrated, isAdmin, router]);

  if (hydrated && isAdmin) return <main className="flex-1 bg-slate-100" />;

  // Same email + NIC + emailed code login as sellers, with admin wording
  const texts = {
    ...t.loginPage,
    nicHint: a.loginNicHint,
    errors: { ...t.loginPage.errors, ...a.loginErrors },
  };

  return (
    <AdminAuthCard title={a.loginTitle} subtitle={a.loginSubtitle}>
      <CodeLogin
        requestPath="/auth/admin-login/request-code"
        verifyPath="/auth/admin-login/verify-code"
        texts={texts}
        redirectTo="/admin"
        footer={
          <p className="text-center text-sm text-slate-500">
            {a.noAccount}{' '}
            <Link href="/admin/register" className="font-semibold text-brand-700 hover:underline">
              {a.registerLink}
            </Link>
          </p>
        }
      />
    </AdminAuthCard>
  );
}
