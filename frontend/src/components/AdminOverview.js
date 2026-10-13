'use client';

import { useEffect, useState } from 'react';
import {
  ArrowRight, BadgeCheck, CalendarDays, CircleCheck, Flag, Hourglass, MessageCircle, Package, ShoppingBag, Store, TrendingUp, UserRound, Users, Wallet,
} from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { formatPrice, initials } from '../lib/catalog';
import CountUp from './CountUp';
import Reveal from './Reveal';

export const ORDER_COLORS = { PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#94a3b8' };
const SELLER_COLORS = { PENDING: '#f59e0b', APPROVED: '#16a34a', REJECTED: '#94a3b8' };

export function Kpi({ icon: Icon, label, value, sub, tone, delay }) {
  const tones = {
    magenta: 'from-magenta to-saffron',
    ink: 'from-ink to-slate-600',
    leaf: 'from-leaf to-emerald-400',
    blue: 'from-blue-500 to-cyan-400',
    amber: 'from-amber-500 to-yellow-400',
    rose: 'from-rose-500 to-orange-400',
  };
  return (
    <Reveal delay={delay} className="relative overflow-hidden rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <span aria-hidden="true" className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-linear-to-br opacity-15 ${tones[tone]}`} />
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-md ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-3xl font-extrabold tabular-nums text-ink">{typeof value === 'number' ? <CountUp value={value} /> : value ?? '–'}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink/70">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-ink/45">{sub}</p>}
    </Reveal>
  );
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-ink/5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-800">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

// 14 bars, one per day. Hover (or tap) a bar for the exact number.
export function BarChart({ days, lang }) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const label = (date) => new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'si' ? 'si-LK' : 'ta-LK', { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5 sm:gap-2" role="img" aria-label="Enquiries per day">
        {days.map((day, index) => (
          <div key={day.date} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${label(day.date)}: ${day.count}`}>
            <span className="pointer-events-none absolute -top-6 left-1/2 z-10 hidden -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-bold text-white group-hover:block">{day.count}</span>
            <div
              className="w-full origin-bottom animate-grow-up rounded-t-lg bg-linear-to-t from-magenta to-saffron opacity-80 transition-opacity group-hover:opacity-100"
              style={{ height: `${Math.max(4, (day.count / max) * 100)}%`, animationDelay: `${index * 40}ms`, opacity: day.count === 0 ? 0.25 : undefined }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink/45">
        <span>{label(days[0].date)}</span>
        <span>{label(days[Math.floor(days.length / 2)].date)}</span>
        <span>{label(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

function Donut({ parts, total }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Sellers by status">
      <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" strokeWidth="12" className="text-ink/5" />
      {total > 0 &&
        parts.map((part) => {
          const length = (part.value / total) * C;
          const circle = (
            <circle
              key={part.key}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={part.color}
              strokeWidth="12"
              strokeDasharray={`${Math.max(0, length - 1)} ${C - Math.max(0, length - 1)}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += length;
          return circle;
        })}
    </svg>
  );
}

export function Empty({ children }) {
  return <p className="rounded-2xl bg-cream px-4 py-6 text-center text-sm text-ink/50">{children}</p>;
}

export default function AdminOverview({ stats, onNavigate, onAuthError }) {
  const { t, lang } = useLanguage();
  const o = t.overview;
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let ignore = false;
    API.get('/admin/overview')
      .then((res) => !ignore && setData(res.data))
      .catch((err) => {
        if (ignore) return;
        if ([401, 403].includes(err.response?.status)) onAuthError();
        else setFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [onAuthError]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? o.morning : hour < 17 ? o.afternoon : o.evening;
  const today = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'si' ? 'si-LK' : 'ta-LK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const sellers = stats?.sellers;
  const sellerTotal = sellers ? sellers.PENDING + sellers.APPROVED + sellers.REJECTED : 0;
  const sellerParts = sellers
    ? ['APPROVED', 'PENDING', 'REJECTED'].map((key) => ({ key, value: sellers[key], color: SELLER_COLORS[key], label: o.sellerStatus[key] }))
    : [];
  const weekEnquiries = data ? data.clicksByDay.slice(-7).reduce((sum, day) => sum + day.count, 0) : stats?.clicks.thisWeek;
  const totalEnquiries = data ? data.clicksByDay.reduce((sum, day) => sum + day.count, 0) : 0;
  const orderTotal = data?.orders.total || 0;
  const needsAttention = (stats?.sellers.PENDING || 0) + (stats?.complaints.OPEN || 0);

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <Reveal animation="fade-down" className="relative isolate overflow-hidden rounded-[28px] bg-linear-to-br from-ink via-[#2a1d3a] to-magenta-dark p-6 text-white shadow-lg">
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 -z-10 h-44 w-44 animate-float rounded-full bg-saffron/30 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 left-1/3 -z-10 h-40 w-40 animate-float rounded-full bg-magenta/40 blur-3xl [animation-delay:-3s]" />
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-turmeric">
          <CalendarDays className="h-4 w-4" />
          {today}
        </p>
        <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">{greeting} 👋</h2>
        <p className="mt-1 text-sm text-white/75">
          {needsAttention > 0 ? fill(o.attention, { count: needsAttention }) : o.allClear}
        </p>
      </Reveal>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi icon={Store} label={o.sellers} value={sellers ? sellers.APPROVED : undefined} sub={sellers && fill(o.sellersSub, { count: sellers.PENDING })} tone="magenta" delay={0} />
        <Kpi icon={Users} label={o.customers} value={data?.customers} sub={o.customersSub} tone="blue" delay={60} />
        <Kpi icon={Package} label={o.products} value={stats?.products.onSite} sub={stats && fill(o.productsSub, { count: stats.products.total })} tone="leaf" delay={120} />
        <Kpi icon={ShoppingBag} label={o.orders} value={data ? orderTotal : undefined} sub={data && fill(o.ordersSub, { count: data.orders.byStatus.DELIVERED })} tone="ink" delay={180} />
        <Kpi icon={MessageCircle} label={o.enquiries} value={weekEnquiries} sub={o.enquiriesSub} tone="amber" delay={240} />
        <Kpi icon={Flag} label={o.complaints} value={stats?.complaints.OPEN} sub={stats && fill(o.complaintsSub, { count: stats.complaints.IN_REVIEW })} tone="rose" delay={300} />
      </div>

      {failed && <Empty>{o.loadError}</Empty>}

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title={o.chartEnquiries} action={<span className="rounded-full bg-sand/70 px-3 py-1 text-xs font-semibold text-ink/70">{fill(o.inTotal, { count: totalEnquiries })}</span>}>
          {data ? (totalEnquiries > 0 ? <BarChart days={data.clicksByDay} lang={lang} /> : <Empty>{o.noEnquiries}</Empty>) : <div className="skeleton h-40 rounded-2xl" />}
        </Card>

        <Card title={o.chartSellers}>
          {sellers ? (
            <div className="flex flex-wrap items-center justify-center gap-5">
              <div className="relative">
                <Donut parts={sellerParts} total={sellerTotal} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-ink">{sellerTotal}</span>
                  <span className="text-[11px] text-ink/50">{o.sellersWord}</span>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                {sellerParts.map((part) => (
                  <li key={part.key} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: part.color }} />
                    <span className="text-ink/70">{part.label}</span>
                    <span className="ml-auto font-bold tabular-nums text-ink">{part.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="skeleton h-36 rounded-2xl" />
          )}
        </Card>
      </div>

      {/* Orders pipeline */}
      <Card title={o.chartOrders} action={data && <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf"><Wallet className="h-3.5 w-3.5" />{fill(o.deliveredValue, { value: formatPrice(data.orders.deliveredValue) || 'LKR 0' })}</span>}>
        {data ? (
          orderTotal > 0 ? (
            <>
              <div className="flex h-4 overflow-hidden rounded-full bg-ink/5">
                {Object.entries(data.orders.byStatus).map(([key, value]) =>
                  value > 0 ? <span key={key} title={`${o.orderStatus[key]}: ${value}`} style={{ width: `${(value / orderTotal) * 100}%`, backgroundColor: ORDER_COLORS[key] }} /> : null
                )}
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
                {Object.entries(data.orders.byStatus).map(([key, value]) => (
                  <li key={key} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: ORDER_COLORS[key] }} />
                    <span className="truncate text-ink/65">{o.orderStatus[key]}</span>
                    <span className="ml-auto font-bold tabular-nums text-ink">{value}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Empty>{o.noOrders}</Empty>
          )
        ) : (
          <div className="skeleton h-16 rounded-2xl" />
        )}
      </Card>

      {/* Needs attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={o.pendingTitle} action={<button type="button" onClick={() => onNavigate('sellers')} className="inline-flex items-center gap-1 text-xs font-bold text-magenta hover:underline">{o.viewAll}<ArrowRight className="h-3.5 w-3.5" /></button>}>
          {data ? (
            data.pendingSellers.length === 0 ? (
              <Empty><CircleCheck className="mx-auto mb-1 h-5 w-5 text-leaf" />{o.nothingPending}</Empty>
            ) : (
              <ul className="space-y-2">
                {data.pendingSellers.map((seller) => (
                  <li key={seller.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{initials(seller.businessName) || '?'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{seller.businessName}</p>
                      <p className="truncate text-xs text-ink/50">{seller.district}</p>
                    </div>
                    <button type="button" onClick={() => onNavigate('sellers')} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-magenta">
                      <Hourglass className="h-3.5 w-3.5" />
                      {o.review}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="skeleton h-32 rounded-2xl" />
          )}
        </Card>

        <Card title={o.complaintsTitle} action={<button type="button" onClick={() => onNavigate('complaints')} className="inline-flex items-center gap-1 text-xs font-bold text-magenta hover:underline">{o.viewAll}<ArrowRight className="h-3.5 w-3.5" /></button>}>
          {data ? (
            data.recentComplaints.length === 0 ? (
              <Empty><CircleCheck className="mx-auto mb-1 h-5 w-5 text-leaf" />{o.nothingOpen}</Empty>
            ) : (
              <ul className="space-y-2">
                {data.recentComplaints.map((complaint) => (
                  <li key={complaint.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{complaint.customer?.fullName} → {complaint.seller?.businessName}</p>
                      <p className="truncate text-xs text-ink/50">{complaint.reference} · {t.complaints.reasons[complaint.reason] || complaint.reason}</p>
                    </div>
                    <button type="button" onClick={() => onNavigate('complaints')} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-ink/10 transition-colors hover:bg-magenta hover:text-white">
                      {o.open}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="skeleton h-32 rounded-2xl" />
          )}
        </Card>
      </div>

      {/* Top sellers */}
      <Card title={o.topSellers}>
        {data ? (
          data.topSellers.length === 0 ? (
            <Empty>{o.noEnquiries}</Empty>
          ) : (
            <ol className="space-y-3">
              {data.topSellers.map((seller, index) => (
                <li key={seller.id} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${index === 0 ? 'bg-turmeric text-ink' : 'bg-sand/80 text-ink/60'}`}>{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-bold text-ink">{seller.businessName}</p>
                      <p className="shrink-0 text-xs font-semibold text-ink/55">{fill(o.enquiryCount, { count: seller.count })}</p>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/5">
                      <div className="h-full rounded-full bg-linear-to-r from-magenta to-saffron" style={{ width: `${(seller.count / data.topSellers[0].count) * 100}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )
        ) : (
          <div className="skeleton h-32 rounded-2xl" />
        )}
      </Card>

      {/* Shortcuts */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { value: 'sellers', icon: BadgeCheck, label: t.admin.reviewSellers, hint: t.admin.tabSellers },
          { value: 'products', icon: Package, label: t.admin.manageProducts, hint: t.admin.tabProducts },
          { value: 'complaints', icon: TrendingUp, label: t.complaints.admin.title, hint: t.complaints.admin.tab },
        ].map(({ value, icon: Icon, label, hint }) => (
          <button
            key={value}
            type="button"
            onClick={() => onNavigate(value)}
            className="group flex items-center gap-4 rounded-[28px] bg-white p-5 text-left shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white transition-colors group-hover:bg-magenta">
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{label}</span>
              <span className="block text-xs text-ink/50">{hint}</span>
            </span>
            <ArrowRight className="h-5 w-5 text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-magenta" />
          </button>
        ))}
      </section>
    </div>
  );
}
