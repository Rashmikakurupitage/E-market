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
    return <div className="flex min-h-screen flex-1 flex-col w-full max-w-full min-w-0 overflow-x-hidden">{children}</div>;
  }

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col w-full max-w-full min-w-0 overflow-x-hidden">{children}</div>
      <SiteFooter />
      <ScrollExtras />
    </>
  );
}
