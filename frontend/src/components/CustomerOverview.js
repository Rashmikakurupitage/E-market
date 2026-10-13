'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Flag, PackageCheck, ShoppingBag, Truck } from 'lucide-react';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { formatDate, formatPrice } from '../lib/catalog';
import { Card, Kpi, ORDER_COLORS } from './AdminOverview';

// The customer's overview: order numbers, quick actions and the latest orders
export default function CustomerOverview({ onNavigate, onAuthError }) {
  const { t, lang } = useLanguage();
  const d = t.dashboards;
  const o = t.overview;
  const [orders, setOrders] = useState(null);
  const [complaints, setComplaints] = useState(null);

  useEffect(() => {
    let ignore = false;
    const fail = (err) => {
      if (!ignore && [401, 403].includes(err.response?.status)) onAuthError();
    };
    API.get('/orders/mine').then((res) => !ignore && setOrders(res.data)).catch((err) => { fail(err); if (!ignore) setOrders([]); });
    API.get('/complaints/mine').then((res) => !ignore && setComplaints(res.data)).catch((err) => { fail(err); if (!ignore) setComplaints([]); });
    return () => {
      ignore = true;
    };
  }, [onAuthError]);

  const count = (status) => (orders ? orders.filter((order) => order.status === status).length : undefined);
  const inProgress = orders ? orders.filter((order) => ['PENDING', 'CONFIRMED', 'SHIPPED'].includes(order.status)).length : undefined;
  const openComplaints = complaints ? complaints.filter((complaint) => ['OPEN', 'IN_REVIEW'].includes(complaint.status)).length : undefined;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={ShoppingBag} label={d.ordersPlaced} value={orders ? orders.length : undefined} tone="magenta" delay={0} />
        <Kpi icon={Truck} label={d.inProgress} value={inProgress} tone="amber" delay={60} />
        <Kpi icon={PackageCheck} label={o.orderStatus.DELIVERED} value={count('DELIVERED')} tone="leaf" delay={120} />
        <Kpi icon={Flag} label={d.myComplaints} value={openComplaints} sub={d.openOnes} tone="rose" delay={180} />
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { href: '/store', icon: ShoppingBag, label: d.browseStore, hint: d.browseHint },
          { tab: 'orders', icon: ClipboardList, label: t.orders.myTitle, hint: d.ordersHint },
          { tab: 'complaints', icon: Flag, label: t.complaints.myTitle, hint: d.complaintsHint },
        ].map(({ href, tab, icon: Icon, label, hint }) => {
          const inner = (
            <>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ink text-white transition-colors group-hover:bg-magenta">
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">{label}</span>
                <span className="block text-xs text-ink/50">{hint}</span>
              </span>
              <ArrowRight className="h-5 w-5 text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-magenta" />
            </>
          );
          const cls = 'group flex items-center gap-4 rounded-[28px] bg-white p-5 text-left shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg';
          return href ? (
            <Link key={label} href={href} className={cls}>{inner}</Link>
          ) : (
            <button key={label} type="button" onClick={() => onNavigate(tab)} className={cls}>{inner}</button>
          );
        })}
      </section>

      <Card
        title={d.recentOrders}
        action={
          <button type="button" onClick={() => onNavigate('orders')} className="inline-flex items-center gap-1 text-xs font-bold text-magenta hover:underline">
            {o.viewAll}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        }
      >
        {orders === null ? (
          <div className="skeleton h-32 rounded-2xl" />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-cream px-4 py-8 text-center">
            <ShoppingBag className="h-9 w-9 text-ink/20" />
            <p className="text-sm text-ink/60">{d.noOrdersYet}</p>
            <Link href="/store" className="btn-shine inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-magenta">
              {d.startShopping}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <li key={order.id} className="flex items-center gap-3 rounded-2xl bg-cream p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink/60 ring-1 ring-ink/5">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{order.reference}{order.seller?.businessName ? ` · ${order.seller.businessName}` : ''}</p>
                  <p className="truncate text-xs text-ink/50">{formatPrice(order.total)} · {formatDate(order.createdAt, lang)}</p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white" style={{ backgroundColor: ORDER_COLORS[order.status] }}>
                  {o.orderStatus[order.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
