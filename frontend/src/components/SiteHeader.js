'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  LogIn,
  LogOut,
  UserPlus,
  ShoppingBag,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useLanguage, SITE_TITLES } from '../lib/i18n';
import { useSession, clearSession, homePathFor, loginPathFor } from '../lib/auth';
import { openCart, useCart } from '../lib/cart';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import CartDrawer from './CartDrawer';

export const EMBLEM_URL = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Emblem_of_Sri_Lanka.svg';

const outlineButton =
  'inline-flex items-center justify-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-ink/85 ring-1 ring-ink/15 transition-all duration-200 hover:bg-white hover:text-ink hover:ring-ink/30 dark:text-slate-200 dark:ring-white/20 dark:hover:bg-white/10 dark:hover:text-white 2xl:px-4 2xl:text-sm';
const solidButton =
  'btn-shine inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-md shadow-ink/15 transition-all duration-200 hover:bg-magenta dark:bg-magenta dark:hover:bg-magenta/90 2xl:px-5 2xl:text-sm';

export default function SiteHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const { count: cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  // Hide on downward scroll and reveal on upward scroll; keep it available near the top and with the mobile menu open.
  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const scrollDelta = currentScrollY - lastScrollY.current;

      setScrolled(currentScrollY > 8);

      if (currentScrollY < 80 || menuOpen) {
        setHidden(false);
      } else if (Math.abs(scrollDelta) > 6) {
        setHidden(scrollDelta > 0);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  const links = [
    { href: '/', label: t.navHome, active: pathname === '/' },
    { href: '/store', label: t.navStore, active: pathname.startsWith('/store') },
    { href: '/register', label: t.navSellers, active: pathname.startsWith('/register') },
    { href: '/e-learning', label: t.navElearn, active: pathname.startsWith('/e-learning') },
    // One help link keeps the menu short in Sinhala and Tamil; the Support page links to the FAQ
    { href: '/support', label: t.navSupport, active: pathname.startsWith('/support') || pathname.startsWith('/faq') },
    { href: '/about', label: t.navAbout, active: pathname.startsWith('/about') },
    { href: '/#contact', label: t.navContact },
  ];

  const role = session?.user?.role;
  const isCustomer = role === 'CUSTOMER';
  const isAdmin = role === 'SUPER_ADMIN';

  const logout = () => {
    clearSession();
    setMenuOpen(false);
    router.push(loginPathFor(role));
  };

  // Account presentation: Profile capsule + Logout when logged in; Register + Login when logged out.
  const accountButtons = session ? (
    <div className="flex items-center gap-1.5">
      <Link
        href={homePathFor(role)}
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/90 py-1 pl-1.5 pr-2.5 text-xs font-semibold text-ink shadow-sm transition-all duration-200 hover:border-magenta hover:bg-white dark:border-white/20 dark:bg-slate-800/90 dark:text-white dark:hover:border-white/40"
        title={isCustomer ? t.myAccount : t.dashboardBtn}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-magenta text-[10px] font-bold uppercase text-white shadow-sm">
          {session.user?.name?.charAt(0) || (isAdmin ? 'A' : 'U')}
        </span>
        <span className="max-w-[70px] truncate text-[11px] font-bold text-ink dark:text-white 2xl:max-w-[95px] 2xl:text-xs">
          {session.user?.name || (isAdmin ? 'Admin' : isCustomer ? 'Customer' : 'Seller')}
        </span>
        <span className="rounded-full bg-magenta/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-magenta dark:bg-magenta/20 dark:text-magenta-light">
          {isAdmin ? 'Admin' : isCustomer ? 'Buyer' : 'Seller'}
        </span>
      </Link>

      <button
        type="button"
        onClick={logout}
        title={t.logout}
        aria-label={t.logout}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/75 transition-all duration-200 hover:border-red-500 hover:bg-red-50 hover:text-red-600 dark:border-white/20 dark:text-slate-300 dark:hover:border-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-400 2xl:h-10 2xl:w-10"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-1.5">
      <Link href="/register" onClick={() => setMenuOpen(false)} className={solidButton}>
        <UserPlus className="h-3.5 w-3.5" />
        {t.registerBtn}
      </Link>
      <Link href="/login" onClick={() => setMenuOpen(false)} className={outlineButton}>
        <LogIn className="h-3.5 w-3.5" />
        {t.login}
      </Link>
    </div>
  );

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-ink/10 bg-white/95 backdrop-blur-md transition-all duration-300 ease-out dark:border-white/10 dark:bg-slate-900/95 ${
          scrolled ? 'shadow-md shadow-ink/5 dark:shadow-black/20' : ''
        } ${hidden && !menuOpen ? '-translate-y-full pointer-events-none' : 'translate-y-0'}`}
      >
        {/* Official State Trust & Helpline Micro-Bar */}
        <div className="w-full border-b border-ink/5 bg-gradient-to-r from-amber-500/[0.05] via-magenta/[0.03] to-amber-500/[0.05] px-4 py-1 text-[11px] text-ink/75 dark:border-white/5 dark:from-amber-500/[0.08] dark:to-slate-900 dark:text-slate-300 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Official Gov Seal & Affiliation */}
            <div className="flex items-center gap-2 truncate">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" />
                <span className="hidden sm:inline">Official Sri Lanka Gov Platform</span>
                <span className="sm:hidden">Official Gov Portal</span>
              </span>
              <span className="hidden text-ink/30 dark:text-white/20 md:inline">|</span>
              <span className="hidden font-medium text-ink/70 dark:text-slate-300 md:inline">
                {t.ministry}
              </span>
            </div>

            {/* Right: Artisan Direct Guarantee */}
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink/65 dark:text-slate-400">
                <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                <span>100% Direct to Artisan</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="w-full px-3 sm:px-5 lg:px-6 2xl:px-8">
          <div className="flex h-14 items-center justify-between gap-2 lg:gap-3 2xl:gap-4">
            {/* Brand Identity: Logo, State Emblem, Trilingual Titles */}
            <Link
              href="/"
              className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-2.5"
              onClick={() => setMenuOpen(false)}
            >
              <Logo preload className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:scale-105 sm:h-10" />
              <span aria-hidden="true" className="h-6 w-px shrink-0 bg-ink/10 dark:bg-white/15 sm:h-7" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={EMBLEM_URL}
                alt="State Emblem of Sri Lanka"
                className="h-7 w-7 shrink-0 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8"
              />
              <div className="min-w-0 leading-tight">
                <span className="block text-xs font-extrabold tracking-tight text-magenta-dark dark:text-magenta-light sm:text-sm">
                  {SITE_TITLES.en}
                </span>
                <span className="block text-[10px] font-bold text-ink dark:text-white sm:text-[11px]">
                  {SITE_TITLES.si}
                </span>
                <span className="hidden text-[9px] font-semibold text-ink/65 dark:text-slate-400 2xl:block">
                  {SITE_TITLES.ta}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Floating Pill Container) */}
            <nav
              className="hidden items-center justify-center gap-0.5 rounded-full border border-ink/10 bg-black/[0.02] p-1 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04] xl:flex 2xl:gap-1"
              aria-label="Main"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={link.active ? 'page' : undefined}
                  className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 2xl:px-3.5 2xl:text-sm ${
                    link.active
                      ? 'bg-ink text-white shadow-sm shadow-ink/20 dark:bg-white dark:text-slate-900'
                      : 'text-ink/75 hover:bg-black/5 hover:text-ink dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                  {link.active && (
                    <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-magenta dark:bg-magenta-light" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Right Controls & Actions: Clearly Grouped Pods */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Pod 1: Commerce Actions (Search + Shopping Bag) */}
              <div className="flex items-center gap-1.5">
                <Link
                  href="/store"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink/75 transition-all duration-200 hover:border-magenta hover:bg-magenta/5 hover:text-magenta dark:border-white/20 dark:text-slate-200 dark:hover:border-magenta dark:hover:bg-magenta/10 2xl:h-10 2xl:w-10"
                  title="Search Products & Artisans"
                  aria-label="Search Products & Artisans"
                >
                  <Search className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={openCart}
                  aria-label={t.cart?.title || 'Shopping Cart'}
                  title={t.cart?.title || 'Shopping Cart'}
                  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink transition-all duration-200 hover:border-magenta hover:bg-magenta/5 hover:text-magenta dark:border-white/20 dark:text-slate-200 dark:hover:border-magenta dark:hover:bg-magenta/10 2xl:h-10 2xl:w-10"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-magenta px-1 text-[9px] font-extrabold text-white shadow-sm ring-1 ring-white dark:ring-slate-900 animate-scale-in">
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Vertical Divider */}
              <span aria-hidden="true" className="hidden h-5 w-px bg-ink/10 dark:bg-white/15 xl:block" />

              {/* Pod 2: Preferences (Theme, Palette, Language) */}
              <div className="hidden items-center gap-1.5 xl:flex">
                <ThemeToggle className="!h-9 !w-9 2xl:!h-10 2xl:!w-10" />
                <LanguageSelect className="!h-9" />
              </div>

              {/* Vertical Divider */}
              <span aria-hidden="true" className="hidden h-5 w-px bg-ink/10 dark:bg-white/15 xl:block" />

              {/* Pod 3: User Account / Authentication */}
              <div className="hidden items-center gap-1.5 xl:flex">
                {accountButtons}
              </div>

              {/* Mobile & Tablet Hamburger Toggle (< xl) */}
              <div className="flex items-center gap-1.5 xl:hidden">
                <ThemeToggle className="!h-9 !w-9" />
                <button
                  type="button"
                  onClick={() => {
                    setHidden(false);
                    setMenuOpen((open) => !open);
                  }}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-menu"
                  aria-label={t.menu}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-colors hover:bg-magenta"
                >
                  {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile & Tablet Dropdown Navigation Drawer */}
          {menuOpen && (
            <nav id="mobile-menu" className="mt-2 flex animate-fade-up flex-col gap-1 border-t border-ink/10 pb-4 pt-3 dark:border-white/10 xl:hidden">
              {/* Quick Search on Mobile */}
              <Link
                href="/store"
                onClick={() => setMenuOpen(false)}
                className="mb-2 flex items-center gap-2 rounded-xl border border-ink/10 bg-black/[0.03] px-3.5 py-2.5 text-xs font-semibold text-ink/70 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300"
              >
                <Search className="h-4 w-4 text-ink/50" />
                <span>Search products, categories, sellers...</span>
              </Link>

              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={link.active ? 'page' : undefined}
                  className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    link.active
                      ? 'bg-ink text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : 'text-ink/80 hover:bg-ink/5 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{link.label}</span>
                  {link.active && <span className="h-1.5 w-1.5 rounded-full bg-magenta" />}
                </Link>
              ))}

              <div className="mt-3 flex flex-col gap-3 border-t border-ink/10 pt-3 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink/60 dark:text-slate-400">Language:</span>
                  <LanguageSelect />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {accountButtons}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
