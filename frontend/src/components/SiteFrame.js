'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import ScrollExtras from './ScrollExtras';

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  const isDashboardRoute =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/account' ||
    pathname.startsWith('/account/');

  if (isDashboardRoute) {
    return <div className="relative z-1 flex min-h-screen flex-1 flex-col w-full max-w-full min-w-0 overflow-x-clip">{children}</div>;
  }

  return (
    <div className="relative z-1 flex min-h-screen flex-1 flex-col w-full max-w-full min-w-0 overflow-x-clip">
      <SiteHeader />
      <div className="flex flex-1 flex-col w-full max-w-full min-w-0 overflow-x-clip">{children}</div>
      <SiteFooter />
      <ScrollExtras />
    </div>
  );
}
