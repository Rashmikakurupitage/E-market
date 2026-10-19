'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, Home, X, ArrowRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import AppearanceMenu from './AppearanceMenu';
import Logo from './Logo';
import { useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';

const TEXT = {
  en: { hi: 'Hi,', collapse: 'Collapse menu', expand: 'Expand menu', open: 'Open menu', close: 'Close menu', dark: 'Dark', light: 'Light', home: 'Home page', mode: 'Menu colour' },
  si: { hi: 'ආයුබෝවන්,', collapse: 'මෙනුව හකුළන්න', expand: 'මෙනුව දිගහරින්න', open: 'මෙනුව විවෘත කරන්න', close: 'මෙනුව වසන්න', dark: 'අඳුරු', light: 'ලා', home: 'මුල් පිටුව', mode: 'මෙනුවේ වර්ණය' },
  ta: { hi: 'வணக்கம்,', collapse: 'பட்டியலைச் சுருக்கு', expand: 'பட்டியலை விரி', open: 'பட்டியலைத் திற', close: 'பட்டியலை மூடு', dark: 'இருண்ட', light: 'வெளிர்', home: 'முகப்பு', mode: 'பட்டியல் நிறம்' },
};

const STORE_KEY = 'dashboard-sidebar';

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
  } catch {
    // private window or blocked storage: the menu simply forgets its state
  }
}

/**
 * The dashboard layout shared by the admin, seller and customer pages:
 * a collapsible sidebar (full or icon-only, light or dark) and the page beside it.
 *
 * items: [{ value, label, icon, badge? }]   active/onSelect: which section is shown
 * card:  { icon, title, text, label, href?, onClick? }   the small promo card at the bottom
 */
export default function DashboardSidebar({
  items, active, onSelect, name, photoUrl, subtitle, onLogout, card, menuLabel, homeHref = '/', stickyClass = 'lg:top-6', children,
}) {
  const { lang } = useLanguage();
  const s = TEXT[lang] || TEXT.en;
  const [collapsed, setCollapsed] = useState(false);
  const [openOnPhone, setOpenOnPhone] = useState(false);

  // Remember the choices after the first render (keeps server and browser output identical)
  useEffect(() => {
    const prefs = readPrefs();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(Boolean(prefs.collapsed));
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      savePrefs({ ...readPrefs(), collapsed: !value });
      return !value;
    });
  };

  const shell = 'bg-white text-ink ring-ink/5';
  const soft = 'text-ink/50';
  const line = 'border-ink/10';
  const rail = collapsed; // icon-only on large screens
  const showLabel = !rail ? '' : 'lg:hidden';

  return (
    <div
      className={`mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:items-start ${
        rail ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-[272px_minmax(0,1fr)]'
      }`}
    >
      <aside className={`min-w-0 lg:sticky ${stickyClass}`}>
        <nav aria-label={menuLabel} className={`flex flex-col rounded-[28px] p-3 shadow-sm ring-1 transition-colors ${shell} ${rail ? 'lg:items-center lg:px-2' : 'lg:p-4'}`}>
          {/* Logo and menu button */}
          <div className={`flex items-center justify-between gap-2 px-1 ${rail ? 'lg:flex-col lg:gap-3' : ''}`}>
            <Link href={homeHref} aria-label={s.home} className="flex items-center gap-2">
              <Logo className="h-10" />
              <span className={`text-sm font-extrabold leading-tight ${showLabel}`}>Lanka Women<br />E-Market</span>
            </Link>
            <button
              type="button"
              onClick={() => (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? toggleCollapsed() : setOpenOnPhone((v) => !v))}
              aria-label={openOnPhone ? s.close : rail ? s.expand : s.collapse}
              aria-expanded={openOnPhone || !rail}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${'hover:bg-sand/70'}`}
            >
              {openOnPhone ? <X className="h-5 w-5 lg:hidden" /> : <Menu className="h-5 w-5 lg:hidden" />}
              <Menu className="hidden h-5 w-5 lg:block" />
            </button>
          </div>

          {/* The rest is always open on large screens, and opens with the button on phones */}
          <div className={`${openOnPhone ? 'block' : 'hidden'} lg:block ${rail ? 'lg:w-full' : ''}`}>
            {/* Who is logged in */}
            <div className={`mt-4 flex items-center gap-3 border-y px-1 py-3 ${line} ${rail ? 'lg:justify-center lg:border-x-0' : ''}`}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-magenta to-saffron text-sm font-extrabold text-white">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(name) || '?'
                )}
              </span>
              <div className={`min-w-0 ${showLabel}`}>
                <p className="truncate text-sm font-bold">{s.hi} {name}</p>
                {subtitle && <p className={`truncate text-xs ${soft}`}>{subtitle}</p>}
              </div>
            </div>

            {/* Sections */}
            <ul className="mt-3 flex flex-col gap-1">
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
                      aria-current={on ? 'page' : undefined}
                      title={rail ? label : undefined}
                      className={`relative flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-sm font-semibold transition-colors ${rail ? 'lg:justify-center' : ''} ${
                        on
                          ? 'bg-magenta/10 text-magenta'
                          : 'text-ink/70 hover:bg-sand/70 hover:text-ink'
                      }`}
                    >
                      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        on ? 'bg-magenta text-white shadow-md shadow-magenta/30' : 'bg-sand/80'
                      }`}>
                        <Icon className="h-[18px] w-[18px]" />
                        {badge > 0 && <span className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-saffron ring-2 ${'ring-white'} ${rail ? 'hidden lg:block' : 'hidden'}`} />}
                      </span>
                      <span className={`flex-1 truncate text-left ${showLabel}`}>{label}</span>
                      {badge > 0 && (
                        <span className={`rounded-full bg-magenta px-2 py-0.5 text-[11px] font-bold text-white ${showLabel}`}>{badge}</span>
                      )}
                      {on && <span aria-hidden="true" className={`absolute -right-3 top-1/2 hidden h-7 w-1.5 -translate-y-1/2 rounded-full bg-magenta lg:block ${rail ? 'lg:-right-2' : ''}`} />}
                    </button>
                  </li>
                );
              })}
              <li>
                <Link
                  href={homeHref}
                  title={rail ? s.home : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-sm font-semibold transition-colors ${rail ? 'lg:justify-center' : ''} ${'text-ink/70 hover:bg-sand/70 hover:text-ink'}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${'bg-sand/80'}`}><Home className="h-[18px] w-[18px]" /></span>
                  <span className={`flex-1 truncate ${showLabel}`}>{s.home}</span>
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onLogout}
                  title={rail ? undefined : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-sm font-semibold text-red-500 transition-colors ${rail ? 'lg:justify-center' : ''} ${'hover:bg-red-50'}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${'bg-red-50'}`}><LogOut className="h-[18px] w-[18px]" /></span>
                  <LogoutLabel className={showLabel} />
                </button>
              </li>
            </ul>

            {/* Promo card */}
            {card && !rail && (
              <div className="relative mt-4 overflow-hidden rounded-3xl bg-linear-to-br from-magenta to-saffron p-4 text-white">
                <span aria-hidden="true" className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
                <card.icon className="relative h-6 w-6" />
                <p className="relative mt-2 text-sm font-extrabold">{card.title}</p>
                <p className="relative mt-1 text-xs text-white/85">{card.text}</p>
                {card.href ? (
                  <Link href={card.href} className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-magenta transition-transform hover:scale-105">
                    {card.label} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <button type="button" onClick={card.onClick} className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-magenta transition-transform hover:scale-105">
                    {card.label} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Light / dark for the whole website */}
            <ThemeToggle variant="segmented" iconOnly={rail} className="mt-4" />
            {!rail && <AppearanceMenu inline className="mt-4" />}
          </div>
        </nav>
      </aside>

      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}

function LogoutLabel({ className }) {
  const { t } = useLanguage();
  return <span className={`flex-1 truncate text-left ${className}`}>{t.logout}</span>;
}
