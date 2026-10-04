'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Store, ShoppingBag } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

// 'customer' for /login?as=customer and /register?as=customer, otherwise 'seller'.
// Pages that use this must render inside <Suspense>.
export function useAccountType() {
  return useSearchParams().get('as') === 'customer' ? 'customer' : 'seller';
}

// "Seller | Customer" switch at the top of the login and register forms.
// The choice lives in the URL so links and page reloads keep it.
export default function AccountTypeTabs({ basePath, current }) {
  const { t } = useLanguage();
  const c = t.customer;

  const options = [
    { type: 'seller', label: c.seller, icon: Store, href: basePath },
    { type: 'customer', label: c.customer, icon: ShoppingBag, href: `${basePath}?as=customer` },
  ];

  return (
    <nav aria-label={c.accountType} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
      {options.map(({ type, label, icon: Icon, href }) => {
        const active = type === current;
        return (
          <Link
            key={type}
            href={href}
            replace
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
              active ? 'bg-white text-brand-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
