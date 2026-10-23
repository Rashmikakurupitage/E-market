'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CircleCheck, Circle, MessageSquare, Package, RefreshCw, ShoppingBag, Star, Wallet } from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { formatPrice, formatDate } from '../lib/catalog';
import { BarChart, Card, Empty, ORDER_COLORS } from './AdminOverview';

// Ring showing how complete the shop profile is
function Ring({ percent }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`${percent}%`}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-ink/5" />
        <circle cx="50" cy="50" r={R} fill="none" stroke="url(#ring-grad)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(percent / 100) * C} ${C}`} className="transition-all duration-700" />
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-brand-700)' }} />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-ink">{percent}%</span>
    </div>
  );
}

// The seller's overview: enquiry chart, a "complete your shop" checklist, recent orders and best products
export default function SellerInsights({ profile, productCount, onAddProduct, onNavigate, onAuthError }) {
  const { t, lang } = useLanguage();
  const d = t.dashboards;
  const o = t.overview;
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    API.get('/products/seller-overview', { timeout: 15000 })
      .then((res) => {
        if (ignore) return;
        if (
          !Array.isArray(res.data?.clicksByDay) ||
          !Array.isArray(res.data?.topProducts) ||
          !Array.isArray(res.data?.recentOrders) ||
          !res.data?.orders
        ) {
          setFailed(true);
          return;
        }
        setData(res.data);
        setFailed(false);
      })
      .catch((err) => {
        if (ignore) return;
        if ([401, 403].includes(err.response?.status)) onAuthError();
        else setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [onAuthError, productCount, reloadKey]);

  const retry = () => {
    setFailed(false);
    setData(null);
    setReloadKey((key) => key + 1);
  };

  const checklist = [
    { key: 'description', label: d.checkDescription, done: Boolean(profile?.description?.trim()), action: () => onNavigate('settings') },
    { key: 'whatsapp', label: d.checkWhatsapp, done: Boolean(profile?.whatsappNo), action: () => onNavigate('settings') },
    { key: 'messenger', label: d.checkMessenger, done: Boolean(profile?.messengerUrl || profile?.facebookUrl), action: () => onNavigate('settings') },
    { key: 'first', label: d.checkFirstProduct, done: productCount >= 1, action: onAddProduct },
    { key: 'three', label: d.checkThreeProducts, done: productCount >= 3, action: onAddProduct },
  ];
  const doneCount = checklist.filter((item) => item.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);
  const totalEnquiries = data ? data.clicksByDay.reduce((sum, day) => sum + day.count, 0) : 0;
  const maxTop = data?.topProducts[0]?.count || 1;

  return (
    <div className="space-y-6">
      {failed && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          <span>{o.loadError}</span>
          <button type="button" onClick={retry} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold ring-1 ring-red-200 hover:bg-red-100">
            <RefreshCw className="h-4 w-4" />
            {t.dash.retry}
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title={d.enquiries14} action={<span className="rounded-full bg-sand/70 px-3 py-1 text-xs font-semibold text-ink/70">{fill(o.inTotal, { count: totalEnquiries })}</span>}>
          {data ? totalEnquiries > 0 ? <BarChart days={data.clicksByDay} lang={lang} /> : <Empty>{o.noEnquiries}</Empty> : failed ? <Empty>{o.loadError}</Empty> : <div className="skeleton h-40 rounded-2xl" />}
        </Card>

        <Card title={d.checklistTitle}>
          <div className="flex items-center gap-4">
            <Ring percent={percent} />
            <p className="text-sm text-ink/65">{percent === 100 ? d.checklistDone : fill(d.checklistHint, { done: doneCount, total: checklist.length })}</p>
          </div>
          <ul className="mt-4 space-y-1.5">
            {checklist.map((item) => (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.done ? undefined : item.action}
                  disabled={item.done}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${item.done ? 'text-ink/45' : 'font-semibold text-ink hover:bg-sand/60'}`}
                >
                  {item.done ? <CircleCheck className="h-4.5 w-4.5 shrink-0 text-leaf" /> : <Circle className="h-4.5 w-4.5 shrink-0 text-ink/25" />}
                  <span className={`flex-1 ${item.done ? 'line-through' : ''}`}>{item.label}</span>
                  {!item.done && <ArrowRight className="h-4 w-4 text-magenta" />}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title={d.recentOrders}
          action={
            <button type="button" onClick={() => onNavigate('orders')} className="inline-flex items-center gap-1 text-xs font-bold text-magenta hover:underline">
              {o.viewAll}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          }
        >
          {data ? (
            data.recentOrders.length === 0 ? (
              <Empty>{d.noOrders}</Empty>
            ) : (
              <ul className="space-y-2">
                {data.recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink/60 ring-1 ring-ink/5">
                      <ShoppingBag className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{order.reference} · {order.deliveryName}</p>
                      <p className="truncate text-xs text-ink/50">{fill(d.items, { count: order.itemCount })} · {formatPrice(order.total)} · {formatDate(order.createdAt, lang)}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: ORDER_COLORS[order.status] }}>
                      {o.orderStatus[order.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            failed ? <Empty>{o.loadError}</Empty> :
            <div className="skeleton h-32 rounded-2xl" />
          )}
          {data && data.orders.deliveredValue > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf">
              <Wallet className="h-3.5 w-3.5" />
              {fill(o.deliveredValue, { value: formatPrice(data.orders.deliveredValue) })}
            </p>
          )}
        </Card>

        <Card title={d.topProducts}>
          {data ? (
            data.topProducts.length === 0 ? (
              <Empty>{o.noEnquiries}</Empty>
            ) : (
              <ol className="space-y-3">
                {data.topProducts.map((product, index) => (
                  <li key={product.id} className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${index === 0 ? 'bg-turmeric text-ink' : 'bg-sand/80 text-ink/60'}`}>{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-ink"><Package className="h-3.5 w-3.5 shrink-0 text-ink/40" /><span className="truncate">{product.title}</span></p>
                        <p className="shrink-0 text-xs font-semibold text-ink/55">{fill(o.enquiryCount, { count: product.count })}</p>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
                        <div className="h-full rounded-full bg-linear-to-r from-magenta to-saffron" style={{ width: `${(product.count / maxTop) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )
          ) : (
            failed ? <Empty>{o.loadError}</Empty> :
            <div className="skeleton h-32 rounded-2xl" />
          )}
        </Card>

        <Card title={d.customerReviews || 'Customer Reviews & Rating'} className="md:col-span-2">
          {data ? (
            !data.reviews || data.reviews.reviewCount === 0 ? (
              <Empty>{d.noCustomerReviews || 'No customer reviews yet. Customers can review your shop after their orders are delivered.'}</Empty>
            ) : (
              <div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-amber-50/70 p-4 ring-1 ring-amber-200/60">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-extrabold tabular-nums text-amber-900">
                      {data.reviews.averageRating.toFixed(1)}
                    </span>
                    <div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= Math.round(data.reviews.averageRating)
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-ink/20'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-0.5 text-xs font-semibold text-ink/60">
                        {data.reviews.reviewCount} {t.store?.sellerReviews?.reviewCount || 'reviews'}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-leaf/15 px-3 py-1 text-xs font-bold text-leaf">
                    {t.store?.sellerReviews?.verifiedOnly || 'Verified buyers only'}
                  </span>
                </div>

                <ul className="space-y-3">
                  {data.reviews.recent.map((rev) => (
                    <li key={rev.id} className="rounded-2xl bg-cream p-3.5 ring-1 ring-ink/5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`h-3 w-3 ${
                                  s <= rev.rating ? 'fill-amber-400 text-amber-500' : 'text-ink/20'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-bold text-ink">{rev.reviewerName}</span>
                        </div>
                        <time className="text-xs text-ink/45" dateTime={rev.createdAt}>
                          {formatDate(rev.createdAt, lang)}
                        </time>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-ink/75">{rev.comment}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : failed ? (
            <Empty>{o.loadError}</Empty>
          ) : (
            <div className="skeleton h-32 rounded-2xl" />
          )}
        </Card>
      </div>
    </div>
  );
}
