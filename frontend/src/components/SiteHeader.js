'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogIn, LogOut, LayoutDashboard, UserPlus, UserRound, ShoppingBag } from 'lucide-react';
import { useLanguage, LANGUAGES, SITE_TITLES } from '../lib/i18n';
import { useSession, clearSession, homePathFor, loginPathFor } from '../lib/auth';
import { openCart, useCart } from '../lib/cart';
import Logo from './Logo';

export const EMBLEM_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Emblem_of_Sri_Lanka.svg';

function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div role="group" aria-label="Language" className={`items-center rounded-full bg-white/70 p-1 ring-1 ring-ink/5 ${className}`}>
      {LANGUAGES.map((option) => {
        const active = lang === option.code;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.code}
            onClick={() => setLang(option.code)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors duration-200 ${
              active ? 'bg-ink text-white shadow-sm' : 'text-ink/65 hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const outlineButton =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-ink/80 ring-1 ring-ink/10 transition-all duration-200 hover:bg-white hover:text-ink';
const solidButton =
  'btn-shine inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition-all duration-200 hover:bg-magenta';

export default function SiteHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count: cartCount } = useCart();

  // A deeper shadow once the page has scrolled under the header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: t.navHome, active: pathname === '/' },
    { href: '/store', label: t.navStore, active: pathname.startsWith('/store') },
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
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`glass mx-auto max-w-7xl rounded-[32px] bg-white/90 px-3 py-2 transition-shadow duration-300 sm:px-5 ${
          scrolled ? 'shadow-xl shadow-ink/10' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Logo, emblem, ministry and site title */}
          <Link href="/" className="group flex min-w-0 items-center gap-2.5 sm:gap-3" onClick={() => setMenuOpen(false)}>
            <Logo preload className="hidden h-14 shrink-0 transition-transform duration-500 group-hover:scale-105 sm:block" />
            <span aria-hidden="true" className="hidden h-10 w-px shrink-0 bg-ink/10 sm:block" />
            <img
              src={EMBLEM_URL}
              alt="State Emblem of Sri Lanka"
              className="h-10 w-10 shrink-0 object-contain transition-transform duration-500 group-hover:scale-110 sm:h-12 sm:w-12"
            />
            <span className="hidden w-28 shrink-0 text-[11px] font-semibold leading-tight text-ink/70 2xl:block">
              {t.ministry}
            </span>
            <span className="hidden h-10 w-px shrink-0 bg-ink/10 2xl:block" />
            <span className="min-w-0 leading-tight">
              <span className="block text-xs font-bold text-magenta-dark sm:truncate sm:text-sm">{SITE_TITLES.en}</span>
              <span className="block text-xs font-bold text-ink sm:truncate sm:text-sm">{SITE_TITLES.si}</span>
              <span className="block text-[11px] font-semibold text-ink/65 sm:truncate sm:text-xs">{SITE_TITLES.ta}</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher className="hidden xl:flex" />
            <div className="hidden items-center gap-2 xl:flex">{accountButtons}</div>

            {/* Cart */}
            <button
              type="button"
              onClick={openCart}
              aria-label={cartCount > 0 ? `${t.cart.open} (${cartCount})` : t.cart.open}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-ink ring-1 ring-ink/10 transition-colors hover:bg-magenta hover:text-white"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 animate-zoom-in items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Menu toggle for smaller screens */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={t.menu}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-magenta xl:hidden"
            >
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
            </button>
          </div>
        </div>

        {/* Second row below 1280px wide: language buttons, plus the account buttons from tablet size up (on phones those are in the menu) */}
        <div className="mt-2 flex items-center justify-center gap-2 border-t border-ink/10 pt-2 sm:justify-between xl:hidden">
          <LanguageSwitcher className="flex" />
          <div className="hidden items-center gap-2 sm:flex">{accountButtons}</div>
        </div>

        {/* Desktop navigation */}
        <nav className="mt-2 hidden flex-wrap items-center gap-1 border-t border-ink/10 pt-2 xl:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? 'page' : undefined}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                link.active ? 'bg-ink text-white' : 'text-ink/75 hover:bg-white/80 hover:text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Navigation for smaller screens */}
        {menuOpen && (
          <nav id="mobile-menu" className="mt-2 flex animate-fade-up flex-col gap-1 border-t border-ink/10 pb-1 pt-2 xl:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                aria-current={link.active ? 'page' : undefined}
                className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                  link.active ? 'bg-ink text-white' : 'text-ink/80 hover:bg-white/80'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">{accountButtons}</div>
          </nav>
        )}
      </div>
    </header>
  );
}
