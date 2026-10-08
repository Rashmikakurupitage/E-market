'use client';

import { Minus, Plus } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { MAX_QUANTITY } from '../lib/cart';

// −  2  +   (1 to 99)
export default function QuantityStepper({ value, onChange, size = 'md' }) {
  const { t } = useLanguage();
  const small = size === 'sm';
  const button = `flex items-center justify-center rounded-full text-ink transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-30 ${
    small ? 'h-7 w-7' : 'h-9 w-9'
  }`;

  return (
    <div className={`inline-flex items-center rounded-full bg-sand/70 p-0.5 ring-1 ring-ink/5 ${small ? 'gap-0.5' : 'gap-1'}`}>
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label={t.cart.decrease} className={button}>
        <Minus className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      <span aria-live="polite" className={`text-center font-bold tabular-nums text-ink ${small ? 'w-6 text-xs' : 'w-8 text-sm'}`}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= MAX_QUANTITY} aria-label={t.cart.increase} className={button}>
        <Plus className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
