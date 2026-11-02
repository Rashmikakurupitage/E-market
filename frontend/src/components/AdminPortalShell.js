'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { logoutSession, useHydrated, useSession } from '../lib/auth';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';

export default function AdminPortalShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const session = useSession();
  const [logoutError, setLogoutError] = useState(false);
  const hydrated = useHydrated();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';
  const isDashboard = pathname === '/admin';

  const logout = async () => {
    setLogoutError(false);
    try {
      await logoutSession();
      router.replace('/admin/login');
    } catch (error) {
      console.error('ADMIN_LOGOUT_ERROR:', error?.response?.status || error?.message || 'Unknown error');
      setLogoutError(true);
    }
  };

  return (
    <div className="admin-surface flex min-h-full flex-1 flex-col">
      <header className="border-b border-white/10 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-300 ring-1 ring-white/15">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">{t.admin.portalTitle}</p>
              <p className="text-xs text-white/55">{t.admin.portalSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="!text-white/85 !ring-white/20 hover:!bg-white/10 hover:!text-white" />
            <LanguageSelect variant="dark" />

            {isDashboard && hydrated && isAdmin ? (
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {t.logout}
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
                {t.admin.publicSite}
              </Link>
            )}
          </div>
        </div>
      </header>

      {logoutError && <p role="alert" className="mx-auto mt-3 w-full max-w-7xl rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-800">{t.logoutError}</p>}
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
