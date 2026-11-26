'use client';

import { ViewTransition } from 'react';
import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import ScrollExtras from './ScrollExtras';
import { useLanguage } from '../lib/i18n';

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isDashboardRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/account' ||
    pathname.startsWith('/account/');

  if (isDashboardRoute) {
    return (
      <div className="relative z-1 flex min-h-screen flex-1 flex-col w-full max-w-full min-w-0 overflow-x-clip">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-ink focus:shadow-xl">
          {t.skipToContent}
        </a>
        <div id="main-content" tabIndex="-1">
          {/* Pages fade softly into each other when you move around the site */}
          <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">{children}</ViewTransition>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-1 flex min-h-screen flex-1 flex-col w-full max-w-full min-w-0 overflow-x-clip">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-ink focus:shadow-xl">
        {t.skipToContent}
      </a>
      <SiteHeader />
      <div id="main-content" tabIndex="-1" className="flex flex-1 flex-col w-full max-w-full min-w-0 overflow-x-clip">
        <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">{children}</ViewTransition>
      </div>
      <SiteFooter />
      <ScrollExtras />
    </div>
  );
}
