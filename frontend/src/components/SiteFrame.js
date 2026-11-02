'use client';

import { usePathname } from 'next/navigation';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import ScrollExtras from './ScrollExtras';
import CartDrawer from './CartDrawer';

export default function SiteFrame({ children }) {
  const pathname = usePathname();
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  if (isAdminRoute) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      <SiteHeader />
      <CartDrawer />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
      <ScrollExtras />
    </>
  );
}
