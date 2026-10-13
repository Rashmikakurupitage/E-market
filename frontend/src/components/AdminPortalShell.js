'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { LANGUAGES, useLanguage } from '../lib/i18n';
import { clearSession, useHydrated, useSession } from '../lib/auth';
import ThemeToggle from './ThemeToggle';

export default function AdminPortalShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t } = useLanguage();
  const session = useSession();
  const hydrated = useHydrated();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';
  const isDashboard = pathname === '/admin';

  const logout = () => {
    clearSession();
    router.replace('/admin/login');
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
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
            <div role="group" aria-label="Language" className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              {LANGUAGES.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  lang={option.code}
                  aria-pressed={lang === option.code}
                  onClick={() => setLang(option.code)}
                  className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${
                    lang === option.code ? 'bg-white text-slate-900' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

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

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
