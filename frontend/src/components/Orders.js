'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, CircleAlert, CircleCheck, Clock, LoaderCircle, MapPin, MessageSquareText, Package, PackageCheck, Phone,
  RotateCw, ShoppingBag, Store, Truck, UserRound, XCircle,
} from 'lucide-react';
import API from '../lib/api';
import { useLanguage, fill } from '../lib/i18n';
import { formatDate, formatPhone, formatPrice, toWhatsAppNumber } from '../lib/catalog';
import ConfirmDialog from './ConfirmDialog';
import Reveal from './Reveal';
import WhatsAppIcon from './WhatsAppIcon';

const STATUS_LOOK = {
  PENDING: { icon: Clock, className: 'bg-turmeric/25 text-ink ring-turmeric/50' },
  CONFIRMED: { icon: CircleCheck, className: 'bg-magenta/10 text-magenta ring-magenta/20' },
  SHIPPED: { icon: Truck, className: 'bg-saffron/15 text-saffron ring-saffron/30' },
  DELIVERED: { icon: PackageCheck, className: 'bg-leaf/15 text-leaf ring-leaf/30' },
  CANCELLED: { icon: XCircle, className: 'bg-ink/5 text-ink/50 ring-ink/10' },
};

// The steps an order goes through, for the progress line
const FLOW = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

// What the seller can do next with an order (same rules as the backend)
const SELLER_NEXT = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const isAuthError = (err) => [401, 403].includes(err.response?.status);

export function OrderStatusBadge({ status }) {
  const { t } = useLanguage();
  const { icon: Icon, className } = STATUS_LOOK[status] || STATUS_LOOK.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {t.orders.status[status] || status}
    </span>
  );
}

// Four dots joined by a line: placed → confirmed → shipped → delivered
function Progress({ status }) {
  const { t } = useLanguage();
  if (status === 'CANCELLED') return null;
  const reached = FLOW.indexOf(status);
  return (
    <ol className="mt-4 grid grid-cols-4" aria-label={t.orders.status[status]}>
      {FLOW.map((step, index) => {
        const done = index <= reached;
        return (
          <li key={step} className="relative flex flex-col items-center text-center">
            {index > 0 && (
              <span aria-hidden="true" className={`absolute right-1/2 top-2.5 h-0.5 w-full ${index <= reached ? 'bg-magenta' : 'bg-ink/10'}`} />
            )}
            <span className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white ${done ? 'bg-magenta text-white' : 'bg-ink/10'}`}>
              {done && <CircleCheck className="h-3 w-3" />}
            </span>
            <span className={`mt-1.5 text-[10px] font-semibold leading-tight sm:text-[11px] ${done ? 'text-ink' : 'text-ink/40'}`}>
              {t.orders.status[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ItemList({ items }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-sand">
            {item.image ? (
              <img src={item.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <Package className="m-3 h-6 w-6 text-ink/25" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">{item.title}</span>
            <span className="text-xs text-ink/50">
              {item.quantity} × {formatPrice(item.price)}
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold tabular-nums text-ink">{formatPrice(Number(item.price) * item.quantity)}</span>
        </li>
      ))}
    </ul>
  );
}

function LoadState({ status, onRetry }) {
  const { t } = useLanguage();
  if (status === 'loading') {
    return (
      <div className="mt-5 space-y-4">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton h-40 rounded-[24px]" />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-5 flex flex-col items-center gap-3 rounded-[24px] bg-red-50 px-6 py-8 text-center text-sm text-red-700 ring-1 ring-red-200">
      <CircleAlert className="h-6 w-6" />
      {t.orders.loadError}
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100">
        <RotateCw className="h-4 w-4" />
        {t.orders.retry}
      </button>
    </div>
  );
}

// Loads a list of orders; `onAuthError` runs when the login has expired
function useOrders(path, onAuthError) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    API.get(path)
      .then((res) => {
        if (ignore) return;
        setOrders(res.data);
        setStatus('ready');
      })
      .catch((err) => {
        if (ignore) return;
        if (isAuthError(err)) onAuthError?.();
        else setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, [path, reloadKey, onAuthError]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };
  const replace = (updated) => setOrders((list) => list.map((order) => (order.id === updated.id ? updated : order)));
  return { orders, status, retry, replace };
}

/* ---------- Customers: My account ---------- */

export function CustomerOrders({ onAuthError }) {
  const { t, lang } = useLanguage();
  const o = t.orders;
  const { orders, status, retry, replace } = useOrders('/orders/mine', onAuthError);
  const [toCancel, setToCancel] = useState(null);

  const cancelOrder = async () => {
    const res = await API.patch(`/orders/${toCancel.id}/cancel`);
    replace(res.data);
    setToCancel(null);
  };

  return (
    <section id="orders" className="rounded-[28px] bg-white px-6 py-5 shadow-sm ring-1 ring-ink/5">
      <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-slate-800">
        <ShoppingBag className="h-4 w-4 text-magenta" />
        {o.myTitle}
      </h2>

      {status !== 'ready' ? (
        <LoadState status={status} onRetry={retry} />
      ) : orders.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-[24px] bg-cream px-6 py-10 text-center">
          <ShoppingBag className="h-10 w-10 text-ink/20" />
          <p className="mt-3 text-sm text-ink/60">{o.none}</p>
          <Link href="/store" className="btn-shine mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-magenta">
            <Store className="h-4 w-4" />
            {o.shopNow}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {orders.map((order, index) => {
            const whatsapp = toWhatsAppNumber(order.seller?.whatsappNo);
            return (
              <Reveal as="li" key={order.id} delay={Math.min(index, 4) * 80} className="rounded-[24px] bg-cream p-5 ring-1 ring-ink/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold tracking-wider text-ink">{fill(o.reference, { reference: order.reference })}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/50">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {fill(o.placed, { date: formatDate(order.createdAt, lang) })}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink/70">
                  <Store className="h-4 w-4 text-magenta" />
                  <span className="font-semibold text-ink">{order.seller?.businessName}</span>
                  {order.seller?.district && <span className="text-ink/45">· {order.seller.district}</span>}
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello! About my order ${order.reference} on Lanka Women E-Market.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2.5 py-0.5 text-xs font-semibold text-leaf transition-colors hover:bg-leaf hover:text-white">
                      <WhatsAppIcon className="h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  )}
                </p>

                <Progress status={order.status} />
                <ItemList items={order.items} />

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
                  <p className="text-sm text-ink/60">
                    {o.total} <span className="ml-1 text-lg font-bold tabular-nums text-ink">{formatPrice(order.total)}</span>
                  </p>
                  {order.status === 'PENDING' && (
                    <button type="button" onClick={() => setToCancel(order)} className="rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink/70 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700">
                      {o.cancel}
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ul>
      )}

      {toCancel && (
        <ConfirmDialog
          title={o.cancelTitle}
          text={o.cancelText}
          confirmLabel={o.cancelConfirm}
          busyLabel={o.cancelConfirm}
          cancelLabel={o.keep}
          errorText={o.updateError}
          onConfirm={cancelOrder}
          onClose={() => setToCancel(null)}
        />
      )}
    </section>
  );
}

/* ---------- Sellers: Dashboard ---------- */

export function SellerOrders({ onAuthError }) {
  const { t, lang } = useLanguage();
  const o = t.orders;
  const { orders, status, retry, replace } = useOrders('/orders/seller', onAuthError);
  const [busy, setBusy] = useState(null); // "orderId:STATUS" while saving
  const [failed, setFailed] = useState(null); // order id whose update failed

  const changeStatus = async (order, next) => {
    setBusy(`${order.id}:${next}`);
    setFailed(null);
    try {
      const res = await API.patch(`/orders/${order.id}/status`, { status: next });
      replace(res.data);
    } catch (err) {
      if (isAuthError(err)) onAuthError?.();
      else setFailed(order.id);
    } finally {
      setBusy(null);
    }
  };

  const newCount = orders.filter((order) => order.status === 'PENDING').length;

  return (
    <section id="orders" className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-ink/5">
      <h2 className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 font-sans text-sm font-bold uppercase tracking-wider text-slate-800">
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-magenta" />
          {o.sellerTitle}
        </span>
        {newCount > 0 && (
          <span className="rounded-full bg-magenta px-2.5 py-0.5 text-[11px] font-bold normal-case tracking-normal text-white">
            {fill(o.newCount, { count: newCount })}
          </span>
        )}
      </h2>

      <div className="px-6 pb-6">
        {status !== 'ready' ? (
          <LoadState status={status} onRetry={retry} />
        ) : orders.length === 0 ? (
          <div className="mt-5 flex flex-col items-center rounded-[24px] bg-cream px-6 py-10 text-center">
            <ShoppingBag className="h-10 w-10 text-ink/20" />
            <p className="mt-3 max-w-sm text-sm text-ink/60">{o.sellerNone}</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-4">
            {orders.map((order, index) => {
              const phone = toWhatsAppNumber(order.deliveryPhone);
              return (
                <Reveal
                  as="li"
                  key={order.id}
                  delay={Math.min(index, 4) * 80}
                  className={`rounded-[24px] p-5 ring-1 ${order.status === 'PENDING' ? 'bg-turmeric/10 ring-turmeric/40' : 'bg-cream ring-ink/5'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold tracking-wider text-ink">{fill(o.reference, { reference: order.reference })}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-ink/50">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {fill(o.placed, { date: formatDate(order.createdAt, lang) })}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* Customer and delivery */}
                  <div className="mt-4 grid gap-3 rounded-[20px] bg-white p-4 text-sm ring-1 ring-ink/5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-ink/50">{o.customer}</p>
                      <p className="mt-1 flex items-center gap-1.5 font-semibold text-ink">
                        <UserRound className="h-4 w-4 text-magenta" />
                        {order.deliveryName}
                      </p>
                      {order.customer?.fullName && order.customer.fullName !== order.deliveryName && (
                        <p className="ml-5.5 text-xs text-ink/45">{order.customer.fullName}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a href={`tel:${order.deliveryPhone}`} className="inline-flex items-center gap-1 rounded-full bg-sand/70 px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-white">
                          <Phone className="h-3.5 w-3.5" />
                          {phone ? formatPhone(phone) : order.deliveryPhone}
                        </a>
                        {phone && (
                          <a href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello! About your order ${order.reference} on Lanka Women E-Market.`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-leaf/15 px-2.5 py-1 text-xs font-semibold text-leaf transition-colors hover:bg-leaf hover:text-white">
                            <WhatsAppIcon className="h-3.5 w-3.5" />
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-ink/50">{o.deliverTo}</p>
                      <p className="mt-1 flex items-start gap-1.5 text-ink/80">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-saffron" />
                        <span className="whitespace-pre-line">
                          {order.deliveryAddress}
                          {'\n'}
                          <span className="font-semibold">{order.deliveryDistrict}</span>
                        </span>
                      </p>
                    </div>
                    {order.note && (
                      <p className="flex items-start gap-1.5 text-ink/70 sm:col-span-2">
                        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                        <span>
                          <span className="font-semibold text-ink">{o.note}: </span>
                          {order.note}
                        </span>
                      </p>
                    )}
                  </div>

                  <Progress status={order.status} />
                  <ItemList items={order.items} />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
                    <p className="text-sm text-ink/60">
                      {o.total} <span className="ml-1 text-lg font-bold tabular-nums text-ink">{formatPrice(order.total)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SELLER_NEXT[order.status].map((next) => {
                        const saving = busy === `${order.id}:${next}`;
                        const cancel = next === 'CANCELLED';
                        return (
                          <button
                            key={next}
                            type="button"
                            disabled={!!busy}
                            onClick={() => changeStatus(order, next)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                              cancel
                                ? 'border border-ink/15 text-ink/70 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                                : 'btn-shine bg-ink text-white hover:bg-magenta'
                            }`}
                          >
                            {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                            {o.actions[next]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {failed === order.id && (
                    <p role="alert" className="mt-3 flex items-center gap-2 text-xs font-medium text-red-700">
                      <CircleAlert className="h-4 w-4" />
                      {o.updateError}
                    </p>
                  )}
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
