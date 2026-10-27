'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LogOut,
  Menu,
  Home,
  X,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Store,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import LanguageSelect from './LanguageSelect';
import { useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';

const TEXT = {
  en: {
    hi: 'Hi,',
    collapse: 'Collapse menu',
    expand: 'Expand menu',
    open: 'Open menu',
    close: 'Close menu',
    home: 'Home page',
    backToStore: 'Back to Store',
    visitStore: 'Visit Storefront',
    overview: 'Overview',
    portalBadge: 'Dashboard',
    logout: 'Log out',
  },
  si: {
    hi: 'ආයුබෝවන්,',
    collapse: 'මෙනුව හකුළන්න',
    expand: 'මෙනුව දිගහරින්න',
    open: 'මෙනුව විවෘත කරන්න',
    close: 'මෙනුව වසන්න',
    home: 'මුල් පිටුව',
    backToStore: 'වෙළඳසැලට ආපසු',
    visitStore: 'පොදු වෙළඳසැල බලන්න',
    overview: 'දළ විශ්ලේෂණය',
    portalBadge: 'පාලක පුවරුව',
    logout: 'ඉවත් වන්න',
  },
  ta: {
    hi: 'வணக்கம்,',
    collapse: 'பட்டியலைச் சுருக்கு',
    expand: 'பட்டியலை விரி',
    open: 'பட்டியலைத் திற',
    close: 'பட்டியலை மூடு',
    home: 'முகப்பு',
    backToStore: 'கடைக்குத் திரும்பு',
    visitStore: 'கடையைப் பார்வையிடு',
    overview: 'கண்ணோட்டம்',
    portalBadge: 'டாஷ்போர்டு',
    logout: 'வெளியேறு',
  },
};

const STORE_KEY = 'dashboard-sidebar-rail';

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function savePrefs(next) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
  } catch {}
}

/**
 * Modern side-mounted edge-to-edge dashboard layout.
 * Mounts directly to the left screen edge with collapsible mini-rail,
 * in-website back navigation, integrated utilities, and responsive drawer on mobile.
 */
export default function DashboardSidebar({
  items = [],
  active,
  onSelect,
  name,
  photoUrl,
  subtitle,
  roleLabel,
  status,
  statusLabel,
  onLogout,
  card,
  menuLabel,
  homeHref = '/',
  backHref = '/store',
  backLabel,
  topActions,
  hideDesktopTopBar = false,
  children,
}) {
  const { lang, t } = useLanguage();
  const s = TEXT[lang] || TEXT.en;
  const [collapsed, setCollapsed] = useState(false);
  const [openOnPhone, setOpenOnPhone] = useState(false);

  useEffect(() => {
    const prefs = readPrefs();
    setCollapsed(Boolean(prefs.collapsed));
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      savePrefs({ collapsed: next });
      return next;
    });
  };

  const currentItem = items.find((i) => i.value === active);
  const CurrentIcon = currentItem?.icon;
  const rail = collapsed;
  const showLabel = !rail ? '' : 'lg:hidden';
  const effectiveBackLabel = backLabel || s.backToStore;

  const STATUS_STYLES = {
    APPROVED: {
      pill: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300',
      dot: 'bg-emerald-500 animate-pulse',
    },
    PENDING: {
      pill: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/20 dark:text-amber-300',
      dot: 'bg-amber-500',
    },
    REJECTED: {
      pill: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:bg-red-500/20 dark:text-red-300',
      dot: 'bg-red-500',
    },
  };
  const activeStatusKey = status ? String(status).toUpperCase() : null;
  const statusConfig = activeStatusKey && STATUS_STYLES[activeStatusKey]
    ? STATUS_STYLES[activeStatusKey]
    : {
        pill: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300',
        dot: 'bg-emerald-500 animate-pulse',
      };
  const statusBadgeText = statusLabel || roleLabel || s.portalBadge;

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-ink dark:bg-slate-950 dark:text-white">
      {/* 1. DESKTOP SIDEBAR: Mounted flush against left edge */}
      <aside
        aria-label={menuLabel || 'Dashboard Navigation'}
        className={`hidden lg:flex flex-col shrink-0 border-r border-ink/10 bg-white/95 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 sticky top-0 h-screen z-40 transition-all duration-300 ease-in-out ${
          rail ? 'w-20' : 'w-64 xl:w-72'
        }`}
      >
        {/* Top Header / Back & Brand Area */}
        <div className="flex flex-col border-b border-ink/10 p-3.5 dark:border-white/10">
          {/* In-website Back Navigation Button */}
          <Link
            href={backHref}
            title={effectiveBackLabel}
            className={`group mb-2.5 flex items-center gap-2 rounded-xl border border-ink/10 bg-sand/40 px-3 py-2 text-xs font-bold text-ink/80 transition-all hover:border-magenta hover:bg-magenta/10 hover:text-magenta dark:border-white/10 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-magenta dark:hover:bg-magenta/20 dark:hover:text-white ${
              rail ? 'justify-center px-2' : ''
            }`}
          >
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
            {!rail && <span className="truncate">{effectiveBackLabel}</span>}
          </Link>

          {/* Brand Logo & Rail Toggle */}
          <div className={`flex items-center justify-between gap-2 px-1 ${rail ? 'flex-col gap-2' : ''}`}>
            <Link href={homeHref} className="flex items-center gap-2.5 min-w-0" title={s.home}>
              <Logo className="h-8 w-auto shrink-0" />
              {!rail && (
                <div className="min-w-0 leading-tight">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider text-magenta">
                    Lanka Women
                  </span>
                  <span className="block text-sm font-extrabold text-ink dark:text-white truncate">
                    E-Market
                  </span>
                </div>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleCollapsed}
              title={rail ? s.expand : s.collapse}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink/60 transition-colors hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {rail ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4">
          {/* User Profile Capsule */}
          <div
            className={`flex items-center gap-3 rounded-2xl border border-ink/5 bg-sand/20 p-2.5 dark:border-white/5 dark:bg-slate-800/40 ${
              rail ? 'justify-center p-2' : ''
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-tr from-magenta to-saffron text-sm font-extrabold text-white shadow-sm ring-1 ring-white/30">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(name) || '?'
              )}
            </span>
            {!rail && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-bold text-ink dark:text-white">{name}</p>
                </div>
                {subtitle && (
                  <p className="truncate text-[11px] text-ink/50 dark:text-slate-400">{subtitle}</p>
                )}
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {roleLabel && (
                    <span className="inline-block rounded-full bg-magenta/10 px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider text-magenta dark:bg-magenta/25 dark:text-magenta-light">
                      {roleLabel}
                    </span>
                  )}
                  {status && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9px] font-bold ring-1 ${statusConfig.pill}`}>
                      <span className={`h-1 w-1 rounded-full ${statusConfig.dot}`} />
                      <span>{statusLabel || status}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Navigation Links */}
          <nav aria-label="Sections">
            <ul className="flex flex-col gap-1.5">
              {items.map(({ value, label, icon: Icon, badge }) => {
                const on = active === value;
                return (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => onSelect(value)}
                      aria-current={on ? 'page' : undefined}
                      title={rail ? label : undefined}
                      className={`group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold transition-all ${
                        rail ? 'justify-center px-2' : ''
                      } ${
                        on
                          ? 'bg-linear-to-r from-magenta to-saffron text-white shadow-md shadow-magenta/20'
                          : 'text-ink/75 hover:bg-magenta/10 hover:text-magenta dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
                          on ? 'bg-white/20 text-white' : 'bg-ink/5 text-ink/70 dark:bg-white/10 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className={`flex-1 truncate text-left ${showLabel}`}>{label}</span>
                      {badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            on ? 'bg-white text-magenta' : 'bg-magenta text-white'
                          } ${showLabel}`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Promo or Quick Action Card */}
          {card && !rail && (
            <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-magenta via-magenta/90 to-saffron p-4 text-white shadow-md">
              <span aria-hidden="true" className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15" />
              <div className="flex items-center gap-2">
                <card.icon className="h-5 w-5" />
                <p className="text-xs font-extrabold uppercase tracking-wider">{card.title}</p>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/90">{card.text}</p>
              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-magenta shadow-xs transition-transform hover:scale-105 active:scale-95"
                >
                  {card.label} <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={card.onClick}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-magenta shadow-xs transition-transform hover:scale-105 active:scale-95"
                >
                  {card.label} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* 2. MOBILE HEADER & SLIDE-OUT DRAWER (< lg screens) */}
      <div className="flex w-full flex-col lg:hidden">
        {/* Mobile Sticky Bar */}
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-ink/10 bg-white/95 px-2.5 sm:px-4 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 shadow-2xs">
          {/* Back button */}
          <Link
            href={backHref}
            className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-ink/10 bg-white/90 px-2 py-1 text-xs font-bold font-sans text-ink shadow-2xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-magenta" />
            <span className="truncate max-w-[70px] xs:max-w-[90px]">{effectiveBackLabel}</span>
          </Link>

          {/* Active Section Identity */}
          <div className="flex items-center gap-1.5 font-sans min-w-0 mx-1">
            {CurrentIcon && (
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-magenta/15 to-saffron/15 text-magenta dark:from-magenta/25 dark:to-saffron/25 dark:text-magenta-light">
                <CurrentIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </span>
            )}
            <span className="font-extrabold font-sans text-xs text-ink dark:text-white truncate max-w-[90px] xs:max-w-[140px]">
              {currentItem?.label || s.overview}
            </span>
          </div>

          {/* Mobile Actions: Logout & Hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title={t.logout || s.logout}
                aria-label={t.logout || s.logout}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-red-200/70 bg-red-50/70 text-red-600 shadow-2xs transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpenOnPhone(true)}
              aria-label={s.open}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink shadow-xs dark:border-white/10 dark:bg-slate-800 dark:text-white"
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </header>

        {/* Mobile Slide-Out Drawer */}
        {openOnPhone && (
          <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-ink/65 backdrop-blur-xs transition-opacity"
              onClick={() => setOpenOnPhone(false)}
            />

            {/* Drawer Body */}
            <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col border-r border-ink/10 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Logo className="h-8" />
                  <span className="font-extrabold text-sm text-ink dark:text-white">Lanka Women</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenOnPhone(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink dark:bg-white/10 dark:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Back to store in mobile drawer */}
              <Link
                href={backHref}
                onClick={() => setOpenOnPhone(false)}
                className="mt-3 flex items-center gap-2 rounded-xl bg-magenta/10 px-3 py-2 text-xs font-bold text-magenta dark:bg-magenta/20 dark:text-magenta-light"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{effectiveBackLabel}</span>
              </Link>

              {/* User summary in drawer */}
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-sand/30 p-2.5 dark:bg-slate-800/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-tr from-magenta to-saffron text-sm font-extrabold text-white">
                  {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : initials(name) || '?'}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-ink dark:text-white">{name}</p>
                  {subtitle && <p className="truncate text-[11px] text-ink/50 dark:text-slate-400">{subtitle}</p>}
                </div>
              </div>

              {/* Nav Items */}
              <ul className="mt-4 flex flex-col gap-1.5 flex-1">
                {items.map(({ value, label, icon: Icon, badge }) => {
                  const on = active === value;
                  return (
                    <li key={value}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(value);
                          setOpenOnPhone(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                          on
                            ? 'bg-linear-to-r from-magenta to-saffron text-white shadow-md'
                            : 'text-ink/75 hover:bg-ink/5 dark:text-slate-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1 text-left">{label}</span>
                        {badge > 0 && (
                          <span className="rounded-full bg-magenta px-2 py-0.5 text-[10px] text-white">
                            {badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* Utilities */}
              <div className="mt-6 border-t border-ink/10 pt-4 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <ThemeToggle />
                  <LanguageSelect />
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-xl py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t.logout || s.logout}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. RIGHT MAIN CONTENT CANVAS */}
      <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
        {/* Desktop Sticky Header Bar */}
        {!hideDesktopTopBar && (
          <header className="sticky top-0 z-30 hidden lg:flex h-16 items-center justify-between border-b border-ink/10 bg-white/85 px-6 sm:px-8 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/85 shadow-2xs">
            {/* Left: Enhanced Breadcrumb & Active Section Identity */}
            <div className="flex items-center gap-3.5">
              {/* In-site back shortcut */}
              <Link
                href={backHref}
                className="group inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/90 px-3.5 py-1.5 text-xs font-bold font-sans text-ink/80 shadow-2xs backdrop-blur-xs transition-all hover:border-magenta/50 hover:bg-magenta/5 hover:text-magenta hover:shadow-xs active:scale-98 dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200 dark:hover:border-magenta dark:hover:bg-magenta/20 dark:hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5 text-magenta transition-transform group-hover:-translate-x-1" />
                <span>{effectiveBackLabel}</span>
              </Link>

              <ChevronRight className="h-4 w-4 text-ink/25 dark:text-white/25 shrink-0" aria-hidden="true" />

              {/* Active Section Identity */}
              <div className="flex items-center gap-3">
                {CurrentIcon && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-magenta/15 via-magenta/10 to-saffron/15 text-magenta shadow-2xs ring-1 ring-magenta/20 dark:from-magenta/25 dark:via-magenta/20 dark:to-saffron/25 dark:text-magenta-light dark:ring-magenta/35">
                    <CurrentIcon className="h-4.5 w-4.5" />
                  </span>
                )}
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2.5">
                    <span className="font-sans text-sm sm:text-base font-extrabold tracking-tight text-ink dark:text-white leading-tight">
                      {currentItem?.label || s.overview}
                    </span>
                    {/* Dynamic Status / Portal Indicator */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold font-sans tracking-wide ring-1 ${statusConfig.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                      <span>{statusBadgeText}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium font-sans text-ink/45 dark:text-slate-400">
                    <span>{menuLabel || s.portalBadge}</span>
                    <span className="text-ink/20 dark:text-white/20">/</span>
                    <span className="font-semibold text-magenta dark:text-magenta-light">
                      {currentItem?.label || s.overview}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Quick actions, Storefront Link, ThemeToggle, LanguageSelect */}
            <div className="flex items-center gap-3">
              {topActions}

              <Link
                href="/store"
                className="hidden xl:inline-flex items-center gap-1.5 rounded-xl border border-ink/10 bg-white/90 px-3.5 py-1.5 text-xs font-bold font-sans text-ink/80 shadow-2xs transition-all hover:border-magenta hover:text-magenta dark:border-white/10 dark:bg-slate-800/90 dark:text-slate-200"
                title={s.visitStore}
              >
                <Store className="h-3.5 w-3.5 text-magenta" />
                <span>{s.visitStore}</span>
                <ExternalLink className="h-3 w-3 text-ink/40 dark:text-white/40" />
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-ink/10 dark:border-white/10">
                <ThemeToggle className="!h-8 !w-8" />
                <LanguageSelect />

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    title={t.logout || s.logout}
                    aria-label={t.logout || s.logout}
                    className="group inline-flex items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/70 px-3 py-1.5 text-xs font-bold text-red-600 shadow-2xs transition-all duration-200 hover:border-red-300 hover:bg-red-100 hover:text-red-700 active:scale-95 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
                    <span>{t.logout || s.logout}</span>
                  </button>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Scrollable View Area */}
        <div className="flex-1 p-3.5 sm:p-7 lg:p-8 xl:p-10 min-w-0 max-w-full overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
