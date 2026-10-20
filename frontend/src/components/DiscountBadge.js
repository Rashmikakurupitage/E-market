'use client';

import { Sparkles, Tag } from 'lucide-react';
import { fill, useLanguage } from '../lib/i18n';
import { formatDate, formatPrice } from '../lib/catalog';

// Jagged sale seal for the corner of a product picture.
export function DiscountBurst({ percent, className = '' }) {
  const { t } = useLanguage();
  return (
    <span
      role="img"
      aria-label={fill(t.discount.badge, { percent })}
      className={`discount-badge z-10 flex h-[58px] w-[58px] flex-col items-center justify-center bg-linear-to-br from-rose-500 via-red-600 to-rose-700 text-white drop-shadow-lg sm:h-16 sm:w-16 ${className}`}
    >
      <span className="relative z-10 text-sm font-black leading-none tracking-tight sm:text-base">-{percent}%</span>
      <span className="relative z-10 mt-0.5 text-[8px] font-extrabold uppercase leading-none tracking-widest sm:text-[9px]">{t.discount.off}</span>
    </span>
  );
}

// The price next to a product: the new price, the old price struck through and, in the large version,
// how much the customer saves and until when the offer runs.
export default function PriceTag({ product, large = false }) {
  const { t, lang } = useLanguage();
  const d = t.discount;
  const discount = product.discount;
  const regular = formatPrice(product.price);

  if (!regular) {
    return <span className={`font-semibold text-ink/50 ${large ? 'text-base' : 'text-sm'}`}>{t.priceOnRequest}</span>;
  }
  if (!discount) {
    return <span className={`font-bold tabular-nums ${large ? 'text-3xl text-magenta' : 'text-lg text-magenta'}`}>{regular}</span>;
  }

  const endsToday = discount.endsAt && new Date(discount.endsAt).toDateString() === new Date().toDateString();
  return (
    <span className="inline-flex flex-col items-start gap-1.5">
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`price-drop font-extrabold tabular-nums ${large ? 'text-3xl text-red-600' : 'rounded-md bg-red-50 px-2 py-1 text-lg text-red-700 ring-1 ring-red-200 sm:text-xl'}`}>{formatPrice(discount.salePrice)}</span>
        <s className={`tabular-nums text-ink/45 ${large ? 'text-base' : 'text-xs'}`}>{regular}</s>
      </span>
      <span
          className={`discount-percent inline-flex items-center gap-1 rounded-full bg-linear-to-r from-rose-600 via-red-500 to-orange-500 font-extrabold leading-none tracking-wide text-white shadow-sm ring-1 ring-white/80 ${large ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}`}
          aria-label={fill(d.badge, { percent: discount.percent })}
        >
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
          {discount.percent}% {d.off}
        </span>
      {large && (
        <span className="mt-2 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-red-600">
          <span className="inline-flex items-center gap-1.5">
            <Tag className="discount-tag h-4 w-4" />
            {fill(d.saveAmount, { amount: formatPrice(Number(product.price) - discount.salePrice) })}
          </span>
          {discount.endsAt && <span className="text-ink/60">{endsToday ? d.endsToday : fill(d.endsOn, { date: formatDate(discount.endsAt, lang) })}</span>}
        </span>
      )}
    </span>
  );
}
