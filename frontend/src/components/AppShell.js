'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, House, LifeBuoy, Store, UserRound, X } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { homePathFor, useSession } from '../lib/auth';

const DISMISS_KEY = 'lw-install-dismissed';

// Registers the service worker (production only, so development is never served from a cache)
function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}

const INSTALL_TEXT = {
  en: { title: 'Install the app', body: 'Add Women E-Market to your home screen.', ios: 'Tap Share, then "Add to Home Screen".', button: 'Install' },
  si: { title: 'යෙදුම ස්ථාපනය කරන්න', body: 'Women E-Market ඔබේ මුල් තිරයට එක් කරන්න.', ios: 'Share ඔබා "Add to Home Screen" තෝරන්න.', button: 'ස්ථාපනය' },
  ta: { title: 'செயலியை நிறுவுங்கள்', body: 'Women E-Market ஐ முகப்புத் திரையில் சேர்க்கவும்.', ios: 'Share ஐத் தட்டி "Add to Home Screen" ஐத் தேர்ந்தெடுக்கவும்.', button: 'நிறுவு' },
};

// "Install the app" banner: Android/Chrome offers it directly; iPhones get a hint to use Share > Add to Home Screen
function InstallBanner() {
  const { lang } = useLanguage();
  const [promptEvent, setPromptEvent] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let was = false;
    try {
      was = Boolean(localStorage.getItem(DISMISS_KEY));
    } catch {
      // storage blocked: the banner may show again next visit
    }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(was || Boolean(standalone));
    setIosHint(ios);

    const onPrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
    };
    const onInstalled = () => setDismissed(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (dismissed || (!promptEvent && !iosHint)) return null;
  const text = INSTALL_TEXT[lang] || INSTALL_TEXT.en;

  const close = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };
  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    await promptEvent.userChoice.catch(() => {});
    setPromptEvent(null);
    close();
  };

  return (
    <div role="dialog" aria-label={text.title} className="app-install fixed inset-x-3 z-[55] flex items-center gap-3 rounded-[22px] bg-ink p-3 text-white shadow-2xl lg:hidden">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-magenta">
        <Download className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-xs leading-snug">
        <p className="text-sm font-bold">{text.title}</p>
        <p className="text-white/75">{promptEvent ? text.body : text.ios}</p>
      </div>
      {promptEvent && (
        <button type="button" onClick={install} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink">
          {text.button}
        </button>
      )}
      <button type="button" onClick={close} aria-label="Close" className="shrink-0 rounded-full p-1.5 text-white/60 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// App-style bottom tabs on phones (Home, Store, Help, Account/Login). Hidden on larger screens and in the admin portal.
function BottomTabs() {
  const { t } = useLanguage();
  const pathname = usePathname() || '/';
  const session = useSession();
  if (pathname.startsWith('/admin') || pathname.startsWith('/staff-portal')) return null;

  const tabs = [
    { href: '/', label: t.navHome, icon: House, active: pathname === '/' },
    { href: '/store', label: t.navStore, icon: Store, active: pathname.startsWith('/store') },
    { href: '/support', label: t.navSupport, icon: LifeBuoy, active: pathname.startsWith('/support') || pathname.startsWith('/faq') },
    session
      ? { href: homePathFor(session.user?.role), label: session.user?.role === 'CUSTOMER' ? t.myAccount : t.dashboardBtn, icon: UserRound, active: pathname.startsWith('/account') || pathname.startsWith('/dashboard') }
      : { href: '/login', label: t.login, icon: UserRound, active: pathname.startsWith('/login') || pathname.startsWith('/register') },
  ];

  return (
    <nav aria-label="App" className="bottom-tabs fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-lg">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={href} className="flex-1">
            <Link href={href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${active ? 'text-magenta' : 'text-ink/55'}`}>
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate px-1">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function AppShell() {
  return (
    <>
      <ServiceWorker />
      <BottomTabs />
      <InstallBanner />
    </>
  );
}
