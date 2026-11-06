'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Banknote, CircleAlert, CircleCheck, LoaderCircle, LogIn, MapPin, Package, ShoppingBag, Store, Truck, UserPlus,
} from 'lucide-react';
import API from '../../../src/lib/api';
import { useLanguage, fill } from '../../../src/lib/i18n';
import { useHydrated, useSession } from '../../../src/lib/auth';
import { DISTRICTS, formatPrice } from '../../../src/lib/catalog';
import { clearCart, groupBySeller, removeFromCart, updateCartProductSnapshots, useCart } from '../../../src/lib/cart';
import { Field, inputClass, primaryButtonClass } from '../../../src/components/form';
import { PageArt, Sparkle, Squiggle } from '../../../src/components/Art';

// Same rule as the backend (orderController.js)
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;
const NEXT = encodeURIComponent('/store/checkout');

function Steps({ current }) {
  const { t } = useLanguage();
  const steps = [
    { icon: ShoppingBag, label: t.checkout.reviewStep },
    { icon: Truck, label: t.checkout.delivery },
    { icon: CircleCheck, label: t.checkout.confirmStep },
  ];
  return (
    <ol aria-label={t.checkout.title} className="mt-6 flex flex-wrap items-center gap-2">
      {steps.map(({ icon: Icon, label }, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true" className={`h-px w-6 sm:w-10 ${done || active ? 'bg-magenta' : 'bg-ink/15'}`} />}
            <span
              aria-current={active ? 'step' : undefined}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active ? 'bg-ink text-white' : done ? 'bg-magenta/10 text-magenta' : 'bg-white/70 text-ink/50 ring-1 ring-ink/10'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Summary({ groups, total, count }) {
  const { t } = useLanguage();
  const c = t.checkout;
  return (
    <aside className="rounded-[32px] bg-white p-6 shadow-xl shadow-ink/5 ring-1 ring-ink/5 lg:sticky lg:top-44">
      <h2 className="text-2xl font-bold text-ink">{c.summary}</h2>
      <div className="mt-5 space-y-4">
        {groups.map((group) => (
          <section key={group.sellerId} className="rounded-[22px] bg-cream p-4 ring-1 ring-ink/5">
            <p className="flex items-center gap-2 text-xs font-semibold text-ink/60">
              <Store className="h-3.5 w-3.5 text-magenta" />
              {fill(t.cart.from, { seller: group.sellerName || '—' })}
              {group.district && (
                <span className="inline-flex items-center gap-0.5 text-ink/40">
                  <MapPin className="h-3 w-3 text-red-500" />
                  {group.district}
                </span>
              )}
            </p>
            <ul className="mt-3 space-y-3">
              {group.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sand">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="m-3 h-6 w-6 text-ink/25" />
                    )}
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                      {item.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.title}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between border-t border-ink/10 pt-3 text-sm">
              <span className="text-ink/60">{t.cart.subtotal}</span>
              <span className="font-bold tabular-nums text-ink">{formatPrice(group.subtotal)}</span>
            </p>
          </section>
        ))}
      </div>
      <div className="mt-5 flex items-baseline justify-between border-t border-ink/10 pt-5">
        <span className="font-semibold text-ink/70">
          {t.orders.total} · {fill(t.cart.itemsCount, { count })}
        </span>
        <span className="text-3xl font-bold tabular-nums text-magenta">{formatPrice(total)}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink/50">{t.cart.deliveryNote}</p>
      {groups.length > 1 && <p className="mt-1 text-xs leading-relaxed text-ink/50">{c.splitNote}</p>}
    </aside>
  );
}

export default function CheckoutPage() {
  const { t } = useLanguage();
  const c = t.checkout;
  const hydrated = useHydrated();
  const session = useSession();
  const { items, count, total } = useCart();
  const role = session?.user?.role;

  // Name and phone start from the customer's account; anything typed replaces them
  const [typed, setTyped] = useState({});
  const defaults = {
    name: session?.user?.profile?.fullName || '',
    phone: session?.user?.phone || '',
    address: '',
    district: '',
    note: '',
  };
  const form = { ...defaults, ...typed };
  const set = (key) => (e) => {
    const { value } = e.target;
    setTyped((old) => ({ ...old, [key]: value }));
    setErrors((old) => old[key] ? { ...old, [key]: undefined } : old);
    setServerError('');
  };

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(null); // { reference, orders } after success
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [saveDelivery, setSaveDelivery] = useState(false);

  useEffect(() => {
    if (!hydrated || role !== 'CUSTOMER') return undefined;
    let ignore = false;
    API.get('/customer/delivery-details')
      .then(({ data }) => {
        if (ignore) return;
        setTyped((current) => ({
          ...current,
          ...Object.fromEntries(
            ['name', 'phone', 'address', 'district']
              .filter((key) => current[key] === undefined && data[key])
              .map((key) => [key, data[key]])
          ),
        }));
      })
      .catch((error) => {
        if (!ignore && [401, 403].includes(error.response?.status)) {
          setServerError(c.errors.generic);
        }
      });
    return () => { ignore = true; };
  }, [hydrated, role, c.errors.generic]);

  const goToStep = (step) => {
    setCheckoutStep(step);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const validate = () => {
    const found = {};
    if (!form.name.trim()) found.name = c.errors.NAME;
    if (!PHONE_PATTERN.test(form.phone.replace(/[\s-]/g, ''))) found.phone = c.errors.PHONE;
    if (!form.address.trim()) found.address = c.errors.ADDRESS;
    if (!form.district) found.district = c.errors.DISTRICT;
    if (form.note.length > 500) found.note = c.errors.NOTE;
    return found;
  };

  const placeOrder = async (e) => {
    e.preventDefault();
    setServerError('');
    const found = validate();
    setErrors(found);
    const firstInvalid = Object.keys(found)[0];
    if (firstInvalid) {
      document.getElementById(`checkout-${firstInvalid}`)?.focus();
      return;
    }

    if (checkoutStep === 1) {
      goToStep(2);
      return;
    }

    setPlacing(true);
    try {
      if (saveDelivery) {
        try {
          await API.put('/customer/delivery-details', {
            name: form.name,
            phone: form.phone,
            address: form.address,
            district: form.district,
          });
        } catch {
          setServerError(t.customerFeatures.deliverySaveError);
          setPlacing(false);
          return;
        }
      }
      const res = await API.post('/orders', {
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity, expectedPrice: item.price })),
        delivery: { name: form.name, phone: form.phone, address: form.address, district: form.district },
        note: form.note,
      });
      setPlaced(res.data);
      clearCart();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const data = err.response?.data;
      const code = data?.code;
      if (!err.response) {
        setServerError(c.errors.network);
      } else if (code === 'UNAVAILABLE') {
        removeFromCart(data.productIds || []);
        setServerError(c.errors.UNAVAILABLE);
      } else if (code === 'PRICE_CHANGED' || code === 'OUT_OF_STOCK') {
        updateCartProductSnapshots(data.productUpdates || []);
        setCheckoutStep(0);
        setServerError(c.errors[code]);
      } else if (['NAME', 'PHONE', 'ADDRESS', 'DISTRICT', 'NOTE'].includes(code)) {
        setErrors({ [code.toLowerCase()]: c.errors[code] });
      } else {
        setServerError(c.errors[code] || c.errors.generic);
      }
    } finally {
      setPlacing(false);
    }
  };

  const groups = groupBySeller(items);

  // Done
  if (placed) {
    const [successBefore, successAfter = ''] = c.successText.split('{reference}');
    return (
      <main className="relative isolate flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <PageArt />
        <div className="draw-now relative mx-auto max-w-2xl animate-zoom-in overflow-hidden rounded-[40px] bg-white px-6 py-12 text-center shadow-2xl shadow-ink/10 ring-1 ring-ink/5 sm:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-leaf/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-turmeric/25 blur-3xl" />
          <span className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-leaf text-white shadow-xl shadow-leaf/30">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-leaf/30" />
            <CircleCheck className="relative h-10 w-10" />
            <Sparkle className="absolute -right-4 -top-2 h-6 w-6 animate-twinkle text-turmeric" />
            <Sparkle className="absolute -bottom-2 -left-5 h-4 w-4 animate-twinkle text-magenta [animation-delay:-1.5s]" />
          </span>
          <h1 className="relative mt-6 text-3xl font-bold text-ink sm:text-4xl">{c.successTitle}</h1>
          <Squiggle className="relative mx-auto mt-1 h-3 w-36" />
          <p className="relative mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/70 sm:text-base">
            {/* The reference number is shown as a dark pill inside the sentence */}
            {successBefore}
            <span className="mx-1 inline-block rounded-full bg-ink px-3 py-0.5 font-mono text-sm font-bold tracking-wider text-white">{placed.reference}</span>
            {successAfter}
          </p>
          {placed.orders?.length > 1 && (
            <p className="relative mt-3 text-sm font-semibold text-magenta">{fill(c.successSellers, { count: placed.orders.length })}</p>
          )}
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/account#orders" className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition-colors hover:bg-magenta">
              <Package className="h-4 w-4" />
              {c.viewOrders}
            </Link>
            <Link href="/store" className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white">
              <Store className="h-4 w-4" />
              {c.keepShopping}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <PageArt />
      <div className="mx-auto max-w-6xl">
        <Link href="/store" className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-ink/70 ring-1 ring-ink/10 transition-colors hover:bg-white hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          {c.back}
        </Link>
        <div className="draw-now mt-6">
          <h1 className="text-4xl font-bold text-ink sm:text-5xl">{c.title}</h1>
          <Squiggle className="mt-1 h-3 w-40" />
        </div>
        <Steps current={checkoutStep} />

        {!hydrated ? (
          <div className="mt-8 h-64 animate-pulse rounded-[32px] bg-white/60" />
        ) : items.length === 0 ? (
          <div className="mt-8 animate-fade-up rounded-[32px] bg-white px-6 py-16 text-center shadow-xl shadow-ink/5 ring-1 ring-ink/5">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-sand">
              <ShoppingBag className="h-9 w-9 text-magenta" />
            </span>
            <p className="mt-5 text-lg font-bold text-ink">{c.empty}</p>
            <p className="mt-1 text-sm text-ink/60">{t.cart.emptySub}</p>
            <Link href="/store" className="btn-shine mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-magenta">
              <Store className="h-4 w-4" />
              {t.cart.browse}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.25fr_1fr]">
            <div className="order-2 lg:order-1">
              {checkoutStep === 0 ? (
                <section className="rounded-[32px] bg-white p-6 shadow-xl shadow-ink/5 ring-1 ring-ink/5 sm:p-8">
                  <h2 className="text-xl font-bold text-ink sm:text-2xl">{c.reviewHeading}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink/65">{c.reviewText}</p>
                  {serverError && (
                    <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{serverError}
                    </p>
                  )}
                  <div className="mt-6 rounded-2xl bg-cream p-4 ring-1 ring-ink/5">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <ShoppingBag className="h-4 w-4 text-magenta" />
                      {fill(t.cart.itemsCount, { count })}
                    </p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-magenta">{formatPrice(total)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink/60">{c.deliveryEstimateNote}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className={`${primaryButtonClass} mt-6 min-h-12`}
                  >
                    {c.continueToDelivery}<ArrowLeft className="h-4 w-4 rotate-180" />
                  </button>
                </section>
              ) : !session ? (
                /* Not logged in */
                <div className="relative isolate animate-fade-up overflow-hidden rounded-[32px] bg-ink p-8 text-white shadow-2xl shadow-ink/20">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 -z-10 h-56 w-56 rounded-full bg-magenta/50 blur-3xl" />
                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 -z-10 h-56 w-56 rounded-full bg-saffron/35 blur-3xl" />
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-turmeric text-ink">
                    <LogIn className="h-6 w-6" />
                  </span>
                  <h2 className="mt-5 text-2xl font-bold">{c.loginTitle}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{c.loginText}</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link href={`/login?as=customer&next=${NEXT}`} className="btn-shine inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-turmeric">
                      <LogIn className="h-4 w-4" />
                      {c.login}
                    </Link>
                    <Link href={`/register?as=customer&next=${NEXT}`} className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">
                      <UserPlus className="h-4 w-4" />
                      {c.register}
                    </Link>
                  </div>
                  <button type="button" onClick={() => goToStep(0)} className="mt-5 min-h-11 rounded-full px-5 text-sm font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30">
                    {c.backStep}
                  </button>
                </div>
              ) : role !== 'CUSTOMER' ? (
                /* Seller or admin account */
                <div className="space-y-4">
                  <p className="flex animate-fade-up items-start gap-3 rounded-[24px] bg-turmeric/20 p-5 text-sm leading-relaxed text-ink ring-1 ring-turmeric/40">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-saffron" />
                    {c.wrongAccount}
                  </p>
                  <button type="button" onClick={() => goToStep(0)} className="min-h-11 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-ink/15 hover:bg-cream">
                    {c.backStep}
                  </button>
                </div>
              ) : (
                /* Delivery form */
                <form onSubmit={placeOrder} noValidate className="animate-fade-up space-y-6 rounded-[32px] bg-white p-6 shadow-xl shadow-ink/5 ring-1 ring-ink/5 sm:p-8">
                      {checkoutStep === 1 ? (
                        <>
                          <div>
                            <h2 className="flex items-center gap-2.5 text-xl font-bold text-ink sm:text-2xl">
                              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-magenta/10 text-magenta">
                                <Truck className="h-5 w-5" />
                              </span>
                              {c.delivery}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-ink/60">{c.deliveryIntro}</p>
                          </div>
                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field id="checkout-name" label={c.name} required error={errors.name}>
                              <input id="checkout-name" value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} className={inputClass(errors.name)} />
                            </Field>
                            <Field id="checkout-phone" label={c.phone} required error={errors.phone}>
                              <input id="checkout-phone" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" aria-invalid={!!errors.phone} className={inputClass(errors.phone)} />
                            </Field>
                          </div>
                          <Field id="checkout-address" label={c.address} required error={errors.address}>
                            <textarea id="checkout-address" rows={3} value={form.address} onChange={set('address')} placeholder={c.addressPlaceholder} autoComplete="street-address" aria-invalid={!!errors.address} className={inputClass(errors.address)} />
                          </Field>
                          <Field id="checkout-district" label={c.district} required error={errors.district}>
                            <select id="checkout-district" value={form.district} onChange={set('district')} aria-invalid={!!errors.district} className={inputClass(errors.district)}>
                              <option value="">—</option>
                              {DISTRICTS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </Field>
                          <Field id="checkout-note" label={c.note} error={errors.note}>
                            <textarea id="checkout-note" rows={2} maxLength={500} value={form.note} onChange={set('note')} placeholder={c.notePlaceholder} className={inputClass(errors.note)} />
                          </Field>
                          <label className="flex items-start gap-3 rounded-2xl bg-cream px-4 py-3 text-sm text-ink/75 ring-1 ring-ink/5">
                            <input
                              type="checkbox"
                              checked={saveDelivery}
                              onChange={(event) => setSaveDelivery(event.target.checked)}
                              className="mt-0.5 h-4 w-4 rounded border-ink/25 accent-magenta"
                            />
                            <span>{t.customerFeatures.saveForNextTime}</span>
                          </label>
                        </>
                      ) : (
                        <>
                          <div>
                            <h2 className="text-xl font-bold text-ink sm:text-2xl">{c.confirmHeading}</h2>
                            <p className="mt-2 text-sm leading-relaxed text-ink/60">{c.confirmText}</p>
                          </div>
                          <dl className="divide-y divide-ink/10 rounded-2xl bg-cream px-4 ring-1 ring-ink/5">
                            <div className="py-3">
                              <dt className="text-xs font-semibold text-ink/55">{c.name}</dt>
                              <dd className="mt-1 break-words text-sm font-semibold text-ink">{form.name}</dd>
                            </div>
                            <div className="py-3">
                              <dt className="text-xs font-semibold text-ink/55">{c.phone}</dt>
                              <dd className="mt-1 break-words text-sm font-semibold text-ink">{form.phone}</dd>
                            </div>
                            <div className="py-3">
                              <dt className="text-xs font-semibold text-ink/55">{c.address}</dt>
                              <dd className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-ink">{form.address}, {form.district}</dd>
                            </div>
                            {form.note.trim() && (
                              <div className="py-3">
                                <dt className="text-xs font-semibold text-ink/55">{c.note}</dt>
                                <dd className="mt-1 whitespace-pre-line break-words text-sm text-ink">{form.note}</dd>
                              </div>
                            )}
                          </dl>
                          <div className="flex gap-3 rounded-[22px] bg-cream p-4 ring-1 ring-ink/5">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf/15 text-leaf">
                              <Banknote className="h-5 w-5" />
                            </span>
                            <div>
                              <p className="text-sm font-bold text-ink">{c.payment}</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-ink/60">{c.paymentText}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {serverError && (
                        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                          {serverError}
                        </p>
                      )}

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                        <button type="button" onClick={() => goToStep(checkoutStep - 1)} className="min-h-12 rounded-full px-5 text-sm font-semibold text-ink ring-1 ring-ink/15 transition hover:bg-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100">
                          {c.backStep}
                        </button>
                        {checkoutStep === 1 ? (
                          <button type="submit" className={`${primaryButtonClass} min-h-12`}>
                            {c.continueToConfirm}<ArrowLeft className="h-4 w-4 rotate-180" />
                          </button>
                        ) : (
                          <button type="submit" disabled={placing} className={`${primaryButtonClass} min-h-12`}>
                            {placing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            {placing ? c.placing : `${c.place} · ${formatPrice(total)}`}
                          </button>
                        )}
                      </div>
                    </form>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <Summary groups={groups} total={total} count={count} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
