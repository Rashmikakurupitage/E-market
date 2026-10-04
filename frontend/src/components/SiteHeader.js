'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogIn, LogOut, LayoutDashboard, UserPlus, UserRound } from 'lucide-react';
import { useLanguage, LANGUAGES, SITE_TITLES } from '../lib/i18n';
import { useSession, clearSession, homePathFor, loginPathFor } from '../lib/auth';

export const EMBLEM_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Emblem_of_Sri_Lanka.svg';

function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex items-center text-xs ${className}`}>
      {LANGUAGES.map((option, index) => (
        <span key={option.code} className="flex items-center">
          {index > 0 && <span className="px-1.5 text-white/40">|</span>}
          <button
            type="button"
            lang={option.code}
            onClick={() => setLang(option.code)}
            aria-pressed={lang === option.code}
            className={`transition-colors ${
              lang === option.code ? 'font-bold text-white' : 'text-white/70 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        </span>
      ))}
    </div>
  );
}

const outlineButton =
  'inline-flex items-center gap-1.5 rounded-lg border border-brand-600 px-3.5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-50';
const solidButton =
  'inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700';

export default function SiteHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/', label: t.navHome, active: pathname === '/' },
    { href: '/#categories', label: t.navCategories },
    { href: '/register', label: t.navSellers, active: pathname.startsWith('/register') },
    { href: '/e-learning', label: t.navElearn, active: pathname.startsWith('/e-learning') },
    // One help link keeps the menu short in Sinhala and Tamil; the Support page links to the FAQ
    { href: '/support', label: t.navSupport, active: pathname.startsWith('/support') || pathname.startsWith('/faq') },
    { href: '/#about', label: t.navAbout },
    { href: '/#contact', label: t.navContact },
  ];

  const role = session?.user?.role;
  const isCustomer = role === 'CUSTOMER';

  const logout = () => {
    clearSession();
    setMenuOpen(false);
    router.push(loginPathFor(role));
  };

  // Login + Register when logged out; Dashboard (sellers, admins) or My account (customers) + Logout when logged in.
  // There is no admin link for visitors; an admin's own Dashboard button goes to /admin.
  const accountButtons = session ? (
    <>
      <Link href={homePathFor(role)} onClick={() => setMenuOpen(false)} className={solidButton}>
        {isCustomer ? <UserRound className="h-4 w-4" /> : <LayoutDashboard className="h-4 w-4" />}
        {isCustomer ? t.myAccount : t.dashboardBtn}
      </Link>
      <button type="button" onClick={logout} className={outlineButton}>
        <LogOut className="h-4 w-4" />
        {t.logout}
      </button>
    </>
  ) : (
    <>
      <Link href="/login" onClick={() => setMenuOpen(false)} className={outlineButton}>
        <LogIn className="h-4 w-4" />
        {t.login}
      </Link>
      <Link href="/register" onClick={() => setMenuOpen(false)} className={solidButton}>
        <UserPlus className="h-4 w-4" />
        {t.registerBtn}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="relative mx-auto max-w-7xl px-4">
        {/* Language tab hanging from the top edge */}
        <LanguageSwitcher className="absolute right-4 top-0 rounded-b-lg bg-slate-700 px-3 py-1 shadow" />

        <div className="flex items-center justify-between gap-4 pb-3 pt-8">
          {/* Emblem, ministry and site title */}
          <Link href="/" className="flex min-w-0 items-center gap-3" onClick={() => setMenuOpen(false)}>
            <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
            <span className="hidden w-28 shrink-0 text-[11px] font-semibold leading-tight text-slate-600 2xl:block">
              {t.ministry}
            </span>
            <span className="hidden h-10 w-px shrink-0 bg-slate-200 2xl:block" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-xs font-bold text-brand-800 sm:text-sm">{SITE_TITLES.en}</span>
              <span className="block truncate text-xs font-bold text-slate-800 sm:text-sm">{SITE_TITLES.si}</span>
              <span className="block truncate text-[11px] font-semibold text-slate-600 sm:text-xs">{SITE_TITLES.ta}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-5">
            {/* Desktop navigation */}
            <nav className="hidden items-center gap-5 xl:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.active ? 'page' : undefined}
                  className={`border-b-2 py-1 text-sm font-medium transition-colors ${
                    link.active
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-700 hover:border-brand-200 hover:text-brand-700'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="hidden items-center gap-2 sm:flex">{accountButtons}</div>

            {/* Menu toggle for smaller screens */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={t.menu}
              className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 xl:hidden"
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation for smaller screens */}
      {menuOpen && (
        <nav id="mobile-menu" className="border-t border-slate-100 bg-white px-4 py-2 xl:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={link.active ? 'page' : undefined}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                link.active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 border-t border-slate-100 px-1 pb-1 pt-3 sm:hidden">{accountButtons}</div>
        </nav>
      )}
    </header>
  );
}
