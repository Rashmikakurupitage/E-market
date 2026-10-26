'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { clearSession, useHydrated, useSession } from '../lib/auth';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';

export default function AdminPortalShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const session = useSession();
  const hydrated = useHydrated();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';
  const isDashboard = pathname === '/admin';

  const logout = () => {
    clearSession();
    router.replace('/admin/login');
  };

  return (
    <div className="admin-surface flex min-h-full flex-1 flex-col">
      <header className="border-b border-white/10 bg-slate-950 text-white shadow-lg">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-300 ring-1 ring-white/15">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold">{t.admin.portalTitle}</p>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live System
                </span>
              </div>
              <p className="text-xs text-white/55">{t.admin.portalSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="!text-white/85 !ring-white/20 hover:!bg-white/10 hover:!text-white" />
            <LanguageSelect variant="dark" />

            {isDashboard && hydrated && isAdmin ? (
              <>
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                  title={t.admin.publicSite}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{t.admin.publicSite}</span>
                </Link>
                {session?.user?.email && (
                  <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-3 pr-2 text-xs">
                    <span className="font-medium text-white/80 max-w-[150px] truncate">{session.user.email}</span>
                    <span className="rounded-full bg-brand-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-200">Admin</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t.logout}
                </button>
              </>
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

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
