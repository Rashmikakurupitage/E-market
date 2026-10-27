'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleAlert, LoaderCircle, Tag, X } from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { formatPrice } from '../lib/catalog';
import { Field, inputClass, primaryButtonClass } from './form';
import DiscountOptions from './DiscountOptions';

const toDay = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

// A seller sets, changes or removes the discount on one of their products
export default function SellerDiscountDialog({ product, onClose, onSaved, onAuthError }) {
  const { t } = useLanguage();
  const d = t.discount;
  const [percent, setPercent] = useState(product.discountPercent ? String(product.discountPercent) : '');
  const [endsAt, setEndsAt] = useState(toDay(product.discountEndsAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const number = Number(percent);
  const valid = Number.isInteger(number) && number >= 1 && number <= 90;
  const price = product.price === null || product.price === undefined ? null : Number(product.price);
  const preview = valid && price !== null ? Math.round(price * (100 - number)) / 100 : null;
  const today = new Date().toISOString().slice(0, 10);

  const save = async (value) => {
    setBusy(true);
    setError('');
    try {
      const res = await API.patch(`/products/${product.id}/discount`, value === null ? { percent: null } : { percent: number, endsAt: endsAt || null });
      onSaved(res.data.product);
      onClose();
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) return onAuthError?.();
      setError(!err.response ? d.errors.network : d.errors[err.response.data?.code] || d.errors.generic);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => !busy && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save();
        }}
        className="max-h-[92vh] w-full max-w-md animate-zoom-in space-y-4 overflow-y-auto rounded-t-[28px] bg-white p-4 sm:p-6 shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="discount-title" className="flex items-center gap-2 text-xl font-bold text-ink">
              <Tag className="h-5 w-5 shrink-0 text-red-600" />
              {fill(d.dialogTitle, { title: product.title })}
            </h2>
            <p className="mt-1.5 text-sm text-ink/60">{d.dialogIntro}</p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label={d.cancel} className="shrink-0 rounded-full p-1.5 text-ink/40 hover:bg-sand/70 hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {price === null && (
          <p className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {d.errors.DISCOUNT_NEEDS_PRICE}
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <Field id="discount-percent" label={d.percent} hint={d.percentHint}>
          <input
            id="discount-percent"
            type="number"
            min="1"
            max="90"
            step="1"
            inputMode="numeric"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            className={inputClass(false)}
            placeholder="20"
            disabled={price === null}
          />
        </Field>
        <DiscountOptions
          percent={percent}
          endsAt={endsAt}
          disabled={price === null}
          onSelect={({ percent: value, endsAt: end }) => {
            setPercent(String(value));
            setEndsAt(end);
          }}
        />

        <Field id="discount-end" label={d.endDate} hint={d.endHint}>
          <input id="discount-end" type="date" min={today} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass(false)} disabled={price === null} />
        </Field>

        {preview !== null && (
          <div className="rounded-2xl bg-red-50 p-4 text-center ring-1 ring-red-200">
            <p className="text-xs font-semibold text-red-700">{d.newPrice}</p>
            <p className="price-drop text-2xl font-extrabold tabular-nums text-red-600">{formatPrice(preview)}</p>
            <p className="text-xs text-ink/50">
              <s>{formatPrice(price)}</s>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
          <button type="submit" disabled={busy || !valid || price === null} className={`${primaryButtonClass} flex-1`}>
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {busy ? d.saving : d.save}
          </button>
          {product.discountPercent ? (
            <button type="button" onClick={() => save(null)} disabled={busy} className="flex-1 rounded-full border border-red-300 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50">
              {d.remove}
            </button>
          ) : (
            <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-full border border-ink/15 py-3 text-sm font-semibold text-ink/70 transition-colors hover:bg-sand/60">
              {d.cancel}
            </button>
          )}
        </div>
      </form>
    </div>,
    document.body
  );
}
