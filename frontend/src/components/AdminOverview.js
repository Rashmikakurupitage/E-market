'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowRight, BadgeCheck, CalendarDays, ChevronDown, CircleCheck, FileText, Flag, Hourglass, MessageCircle, Package, RefreshCw, ShoppingBag, Store, TrendingUp, Users, Wallet,
} from 'lucide-react';
import API from '../lib/api';
import { fill, useLanguage } from '../lib/i18n';
import { formatPrice, initials } from '../lib/catalog';
import CountUp from './CountUp';
import Reveal from './Reveal';
import { ComplaintStatusBadge } from './Complaints';

export const ORDER_COLORS = { PENDING: '#f59e0b', CONFIRMED: '#3b82f6', SHIPPED: '#8b5cf6', DELIVERED: '#16a34a', CANCELLED: '#94a3b8' };
const SELLER_COLORS = { PENDING: '#f59e0b', APPROVED: '#16a34a', REJECTED: '#94a3b8' };

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export function Kpi({ icon: Icon, label, value, sub, tone, delay, onClick }) {
  const tones = {
    magenta: 'from-magenta to-saffron',
    ink: 'from-ink to-slate-600',
    leaf: 'from-leaf to-emerald-400',
    blue: 'from-blue-500 to-cyan-400',
    amber: 'from-amber-500 to-yellow-400',
    rose: 'from-rose-500 to-orange-400',
  };
  return (
    <Reveal delay={delay} className="group relative overflow-hidden rounded-[22px] sm:rounded-[26px] border border-ink/8 bg-white p-3.5 sm:p-5 shadow-sm shadow-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 hover:border-ink/15">
      <span aria-hidden="true" className={`absolute -right-6 -top-6 h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-linear-to-br opacity-15 transition-transform duration-500 group-hover:scale-125 ${tones[tone]}`} />
      <span className={`flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl sm:rounded-2xl bg-linear-to-br text-white shadow-md shadow-ink/10 transition-transform duration-300 group-hover:scale-105 ${tones[tone]}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <p className="mt-2.5 sm:mt-3.5 text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-ink">{typeof value === 'number' ? <CountUp value={value} /> : value ?? '–'}</p>
      <p className="mt-1 text-xs sm:text-sm font-semibold text-ink/75">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] sm:text-xs font-medium text-ink/50">{sub}</p>}
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          aria-label={`${label}: ${value ?? ''}`}
          className="absolute inset-0 z-10 rounded-[22px] sm:rounded-[26px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-magenta"
        >
          <span className="sr-only">{label}</span>
        </button>
      )}
    </Reveal>
  );
}

export function Card({ title, action, children, className = '', id }) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-[22px] sm:rounded-[28px] border border-ink/8 bg-white p-4 sm:p-6 shadow-sm shadow-ink/5 transition-all duration-300 hover:shadow-md hover:border-ink/12 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-ink/5 pb-3">
        <h3 className="font-sans text-xs font-extrabold uppercase tracking-wider text-slate-700">{title}</h3>
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
      <div className={`flex h-40 items-end ${days.length > 31 ? 'gap-px' : 'gap-1.5 sm:gap-2'}`} role="img" aria-label="Enquiries per day">
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

function RegistrationChart({ days, lang, labels, previousTotal }) {
  const [active, setActive] = useState(null);
  const locale = lang === 'en' ? 'en-GB' : lang === 'si' ? 'si-LK' : 'ta-LK';
  const formatDay = (date, options = { day: 'numeric', month: 'short' }) => new Date(`${date}T00:00:00`).toLocaleDateString(locale, options);

  const totals = days.reduce(
    (sum, day) => ({ customers: sum.customers + day.customers, sellers: sum.sellers + day.sellers }),
    { customers: 0, sellers: 0 }
  );
  const grand = totals.customers + totals.sellers;
  const peakIndex = days.reduce((best, day, i) => (day.customers + day.sellers > days[best].customers + days[best].sellers ? i : best), 0);
  const peak = days[peakIndex];
  const peakTotal = peak.customers + peak.sellers;

  // A tidy axis: whole numbers only, four steps up to a round maximum
  const rawMax = Math.max(...days.map((day) => day.customers + day.sellers));
  const step = Math.max(1, Math.ceil(rawMax / 4));
  const axisMax = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const current = active !== null ? days[active] : null;
  const labelStep = Math.max(1, Math.ceil(days.length / 14));
  const gapClass = days.length > 31 ? 'gap-px' : 'gap-1 sm:gap-1.5';
  const delta = typeof previousTotal === 'number' ? grand - previousTotal : null;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{labels.total}</p>
          <p className="text-3xl font-bold leading-none tabular-nums text-ink">{grand}</p>
          {delta !== null && (
            <p className={`mt-1 text-[11px] font-semibold tabular-nums ${delta > 0 ? 'text-leaf' : delta < 0 ? 'text-rose-600' : 'text-ink/45'}`}>
              {delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '● '}{delta} {labels.vsPrevious}
            </p>
          )}
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50"><span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />{labels.customers}</p>
          <p className="text-xl font-bold leading-none tabular-nums text-ink">{totals.customers}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink/50"><span className="h-2.5 w-2.5 rounded-sm bg-magenta" />{labels.sellers}</p>
          <p className="text-xl font-bold leading-none tabular-nums text-ink">{totals.sellers}</p>
        </div>
        {peakTotal > 0 && (
          <div className="sm:ml-auto sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/50">{labels.peak}</p>
            <p className="text-sm font-semibold tabular-nums text-ink">{formatDay(peak.date)} · {peakTotal}</p>
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2">
        <div className="relative h-48 w-6 shrink-0 text-right text-[11px] tabular-nums text-ink/45" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(tick / axisMax) * 100}%` }}>{tick}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative h-48" role="img" aria-label={labels.chart} onMouseLeave={() => setActive(null)}>
            {ticks.map((tick) => (
              <div key={tick} className={`absolute inset-x-0 border-t ${tick === 0 ? 'border-ink/25' : 'border-dashed border-ink/10'}`} style={{ bottom: `${(tick / axisMax) * 100}%` }} />
            ))}

            <div className={`absolute inset-0 flex items-end ${gapClass}`}>
              {days.map((day, i) => {
                const total = day.customers + day.sellers;
                return (
                  <button
                    type="button"
                    key={day.date}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${formatDay(day.date)}: ${labels.customers} ${day.customers}, ${labels.sellers} ${day.sellers}`}
                    className={`relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-t-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${active === i ? 'bg-ink/[0.06]' : ''}`}
                  >
                    {total > 0 ? (
                      <span className="flex w-full flex-col justify-end gap-0.5" style={{ height: `${(total / axisMax) * 100}%` }}>
                        {day.sellers > 0 && <span className={`w-full bg-magenta ${day.customers > 0 ? 'rounded-t-[5px]' : 'rounded-t-[5px]'}`} style={{ flexGrow: day.sellers, flexBasis: 0, minHeight: 4 }} />}
                        {day.customers > 0 && <span className={`w-full bg-blue-500 ${day.sellers > 0 ? '' : 'rounded-t-[5px]'}`} style={{ flexGrow: day.customers, flexBasis: 0, minHeight: 4 }} />}
                      </span>
                    ) : (
                      <span className="mx-auto mb-px h-0.5 w-3/5 rounded-full bg-ink/15" />
                    )}
                  </button>
                );
              })}
            </div>

            {current && (
              <div
                role="status"
                className="pointer-events-none absolute z-10 w-40 -translate-x-1/2 rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-ink/10"
                style={{ left: `${Math.min(88, Math.max(12, ((active + 0.5) / days.length) * 100))}%`, bottom: `calc(${((current.customers + current.sellers) / axisMax) * 100}% + 10px)` }}
              >
                <p className="font-semibold text-ink">{formatDay(current.date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                <p className="mt-1 flex items-center justify-between gap-3 text-ink/70"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-500" />{labels.customers}</span><strong className="tabular-nums text-ink">{current.customers}</strong></p>
                <p className="flex items-center justify-between gap-3 text-ink/70"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-magenta" />{labels.sellers}</span><strong className="tabular-nums text-ink">{current.sellers}</strong></p>
                <p className="mt-1 flex items-center justify-between gap-3 border-t border-ink/10 pt-1 text-ink/70"><span>{labels.total}</span><strong className="tabular-nums text-ink">{current.customers + current.sellers}</strong></p>
              </div>
            )}
          </div>

          <div className={`mt-2 flex ${gapClass}`} aria-hidden="true">
            {days.map((day, i) => {
              const date = new Date(`${day.date}T00:00:00`);
              const newMonth = i === 0 || date.getDate() === 1;
              return (
                <div key={day.date} className={`min-w-0 flex-1 text-center text-[10px] leading-tight tabular-nums ${active === i ? 'font-bold text-ink' : 'text-ink/45'}`}>
                  <span className={i % labelStep === 0 ? '' : 'hidden'}>{date.getDate()}</span>
                  {newMonth && <span className="block font-semibold text-ink/60">{formatDay(day.date, { month: 'short' })}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
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
  const [reloadKey, setReloadKey] = useState(0);
  const [now] = useState(() => new Date());
  const currentYear = now.getFullYear();
  const [rangeMode, setRangeMode] = useState('days-14');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState('all');
  const [reportError, setReportError] = useState(false);

  useEffect(() => {
    let ignore = false;
    const load = () => {
      let queryParam = '';
      if (rangeMode === 'custom') {
        queryParam = `year=${selectedYear}`;
        if (selectedMonth !== 'all') queryParam += `&month=${selectedMonth}`;
        if (selectedDay !== 'all') queryParam += `&day=${selectedDay}`;
      } else {
        const numDays = Number(rangeMode.replace('days-', '')) || 14;
        queryParam = `days=${numDays}`;
      }
      API.get(`/admin/overview?${queryParam}`, { timeout: 15000 })
        .then((res) => {
          if (ignore) return;
          setData(res.data);
          setFailed(false);
        })
        .catch((err) => {
          if (ignore) return;
          if ([401, 403].includes(err.response?.status)) onAuthError();
          else setFailed(true);
        });
    };
    load();
    const refreshTimer = setInterval(load, 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ignore = true;
      clearInterval(refreshTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [onAuthError, reloadKey, rangeMode, selectedYear, selectedMonth, selectedDay]);

  // Cards with no page of their own: bring the matching section into view
  const scrollToCard = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const fullMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const daysInSelectedMonth = selectedMonth === 'all'
    ? 31
    : new Date(selectedYear, Number(selectedMonth), 0).getDate();
  const safeSelectedDay = selectedDay === 'all' || Number(selectedDay) <= daysInSelectedMonth ? selectedDay : 'all';
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

  const getPeriodLabel = () => {
    if (rangeMode === 'custom') {
      if (selectedMonth !== 'all' && safeSelectedDay !== 'all') {
        return `${safeSelectedDay} ${fullMonthNames[Number(selectedMonth) - 1]} ${selectedYear}`;
      }
      if (selectedMonth !== 'all') {
        return `${fullMonthNames[Number(selectedMonth) - 1]} ${selectedYear}`;
      }
      return `${selectedYear}`;
    }
    const numDays = Number(rangeMode.replace('days-', '')) || 14;
    if (numDays === 1) return o.rangeDay1 || 'Day · Today (1 day)';
    if (numDays === 7) return o.rangeDay7 || 'Day · Last 7 days';
    if (numDays === 14) return o.rangeDay14 || 'Day · Last 14 days';
    if (numDays === 30) return o.rangeMonth30 || 'Month · Last 30 days';
    if (numDays === 90) return o.rangeMonth90 || 'Month · Last 90 days (Quarter)';
    if (numDays === 365) return o.rangeYear365 || 'Year · Last 365 days (1 year)';
    return fill(o.lastDays, { days: numDays });
  };

  const generateRegistrationReport = () => {
    const reportDays = data?.registrations?.byDay;
    if (!reportDays?.length) return;

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) {
      setReportError(true);
      return;
    }
    reportWindow.opener = null;
    setReportError(false);

    const locale = lang === 'en' ? 'en-GB' : lang === 'si' ? 'si-LK' : 'ta-LK';
    const formatDate = (value, options) => new Date(`${value}T00:00:00`).toLocaleDateString(locale, options);
    const reportTotals = reportDays.reduce(
      (sum, day) => ({ customers: sum.customers + day.customers, sellers: sum.sellers + day.sellers }),
      { customers: 0, sellers: 0 }
    );
    const peak = reportDays.reduce((best, day) =>
      day.customers + day.sellers > best.customers + best.sellers ? day : best
    );
    const reportLabels = {
      title: o.reportTitle || 'Registration report',
      period: `${o.reportPeriod || 'Reporting period'}: ${getPeriodLabel()}`,
      generated: o.reportGenerated || 'Generated',
      breakdown: o.reportDaily || 'Daily breakdown',
      date: o.reportDate || 'Date',
      customers: o.customers || 'Customers',
      sellers: o.sellers || 'Sellers',
      total: o.regTotal || 'Total',
      peak: o.regPeak || 'Busiest day',
      print: o.printReport || 'Print report',
      close: o.closeReport || 'Close',
    };
    const rows = reportDays.map((day) => `
      <tr>
        <td>${escapeHtml(formatDate(day.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }))}</td>
        <td class="number">${escapeHtml(day.customers)}</td>
        <td class="number">${escapeHtml(day.sellers)}</td>
        <td class="number">${escapeHtml(day.customers + day.sellers)}</td>
      </tr>
    `).join('');

    reportWindow.document.open();
    reportWindow.document.write(`<!doctype html>
      <html lang="${escapeHtml(lang)}">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(reportLabels.title)} - Lanka Women E-Market</title>
          <style>
            :root { color-scheme: light; font-family: Arial, sans-serif; color: #172033; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 32px; background: #f4f6f8; }
            main { max-width: 960px; margin: 0 auto; padding: 36px; background: white; border: 1px solid #dfe4ea; border-radius: 12px; }
            header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; padding-bottom: 24px; border-bottom: 2px solid #172033; }
            h1 { margin: 0; font-size: 25px; }
            .brand { margin: 0 0 8px; color: #526079; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
            .meta { margin: 8px 0 0; color: #526079; font-size: 13px; }
            .actions { display: flex; gap: 8px; }
            button { border: 0; border-radius: 7px; padding: 10px 14px; background: #172033; color: white; font-weight: 700; cursor: pointer; }
            button.secondary { background: #eef1f5; color: #172033; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
            .metric { padding: 16px; border: 1px solid #dfe4ea; border-radius: 8px; }
            .metric span { display: block; color: #526079; font-size: 12px; }
            .metric strong { display: block; margin-top: 6px; font-size: 24px; }
            .peak { margin: 0 0 20px; color: #526079; font-size: 13px; }
            h2 { margin: 28px 0 12px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 10px 12px; border-bottom: 1px solid #dfe4ea; text-align: left; }
            th { background: #f4f6f8; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; }
            .number { text-align: right; font-variant-numeric: tabular-nums; }
            @media (max-width: 600px) {
              body { padding: 12px; }
              main { padding: 20px; }
              header { flex-direction: column; }
            }
            @media print {
              @page { size: A4; margin: 16mm; }
              body { padding: 0; background: white; }
              main { max-width: none; padding: 0; border: 0; }
              .actions { display: none; }
              tr { break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <main>
            <header>
              <div>
                <p class="brand">Lanka Women E-Market</p>
                <h1>${escapeHtml(reportLabels.title)}</h1>
                <p class="meta">${escapeHtml(reportLabels.period)}: ${escapeHtml(formatDate(reportDays[0].date))} – ${escapeHtml(formatDate(reportDays[reportDays.length - 1].date))}</p>
                <p class="meta">${escapeHtml(reportLabels.generated)}: ${escapeHtml(new Date().toLocaleString(locale))}</p>
              </div>
              <div class="actions">
                <button type="button" onclick="window.print()">${escapeHtml(reportLabels.print)}</button>
                <button type="button" class="secondary" onclick="window.close()">${escapeHtml(reportLabels.close)}</button>
              </div>
            </header>
            <section class="summary" aria-label="${escapeHtml(reportLabels.title)}">
              <div class="metric"><span>${escapeHtml(reportLabels.total)}</span><strong>${escapeHtml(reportTotals.customers + reportTotals.sellers)}</strong></div>
              <div class="metric"><span>${escapeHtml(reportLabels.customers)}</span><strong>${escapeHtml(reportTotals.customers)}</strong></div>
              <div class="metric"><span>${escapeHtml(reportLabels.sellers)}</span><strong>${escapeHtml(reportTotals.sellers)}</strong></div>
            </section>
            ${peak.customers + peak.sellers > 0 ? `<p class="peak"><strong>${escapeHtml(reportLabels.peak)}:</strong> ${escapeHtml(formatDate(peak.date))} · ${escapeHtml(peak.customers + peak.sellers)}</p>` : ''}
            <h2>${escapeHtml(reportLabels.breakdown)}</h2>
            <table>
              <thead><tr><th>${escapeHtml(reportLabels.date)}</th><th class="number">${escapeHtml(reportLabels.customers)}</th><th class="number">${escapeHtml(reportLabels.sellers)}</th><th class="number">${escapeHtml(reportLabels.total)}</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </main>
        </body>
      </html>`);
    reportWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <Reveal animation="fade-down" className="relative isolate overflow-hidden rounded-[22px] sm:rounded-[28px] bg-linear-to-br from-ink via-[#2a1d3a] to-magenta-dark p-4 sm:p-6 text-white shadow-lg">
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
        <Kpi icon={Store} label={o.sellers} value={data?.registrations?.sellers} sub={sellers && fill(o.sellersSub, { approved: sellers.APPROVED, pending: sellers.PENDING, rejected: sellers.REJECTED })} tone="magenta" delay={0} onClick={() => onNavigate('sellers')} />
        <Kpi icon={Users} label={o.customers} value={data?.customers} sub={o.customersSub} tone="blue" delay={60} onClick={() => onNavigate('customers')} />
        <Kpi icon={Package} label={o.products} value={stats?.products.onSite} sub={stats && fill(o.productsSub, { count: stats.products.total })} tone="leaf" delay={120} onClick={() => onNavigate('products')} />
        <Kpi icon={ShoppingBag} label={o.orders} value={data ? orderTotal : undefined} sub={data && fill(o.ordersSub, { count: data.orders.byStatus.DELIVERED })} tone="ink" delay={180} onClick={() => scrollToCard('orders-card')} />
        <Kpi icon={MessageCircle} label={o.enquiries} value={weekEnquiries} sub={o.enquiriesSub} tone="amber" delay={240} onClick={() => scrollToCard('enquiries-card')} />
        <Kpi icon={Flag} label={o.complaints} value={stats?.complaints.OPEN} sub={stats && fill(o.complaintsSub, { count: stats.complaints.IN_REVIEW })} tone="rose" delay={300} onClick={() => onNavigate('complaints')} />
      </div>

      {failed && <Empty>{o.loadError}</Empty>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-ink/60" />
          <p className="text-sm font-semibold text-ink/70">{o.rangeLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main Range Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={rangeMode}
              onChange={(e) => setRangeMode(e.target.value)}
              aria-label={o.rangeLabel}
              className="h-10 cursor-pointer appearance-none rounded-xl border border-ink/15 bg-white py-2 pl-3.5 pr-9 text-xs font-bold text-ink shadow-sm transition hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <optgroup label={o.optDay || 'Day'}>
                <option value="days-1">{o.rangeDay1 || 'Day · Today (1 day)'}</option>
                <option value="days-7">{o.rangeDay7 || 'Day · Last 7 days'}</option>
                <option value="days-14">{o.rangeDay14 || 'Day · Last 14 days'}</option>
              </optgroup>
              <optgroup label={o.optMonth || 'Month'}>
                <option value="days-30">{o.rangeMonth30 || 'Month · Last 30 days'}</option>
                <option value="days-90">{o.rangeMonth90 || 'Month · Last 90 days (Quarter)'}</option>
              </optgroup>
              <optgroup label={o.optYear || 'Year'}>
                <option value="days-365">{o.rangeYear365 || 'Year · Last 365 days (1 year)'}</option>
              </optgroup>
              <optgroup label={o.optCustom || 'Custom'}>
                <option value="custom">{o.rangeCustom || '📅 Specific Year / Month / Day'}</option>
              </optgroup>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-ink/40" />
          </div>

          {/* Granular Year, Month, Day Dropdowns */}
          {rangeMode === 'custom' && (
            <div className="flex flex-wrap items-center gap-1.5 animate-fadeIn">
              {/* Year Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  aria-label={o.selectYear || 'Year'}
                  className="h-10 cursor-pointer appearance-none rounded-xl border border-ink/15 bg-white py-2 pl-3 pr-7 text-xs font-bold text-ink shadow-sm transition hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink/40" />
              </div>

              {/* Month Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedMonth(val === 'all' ? 'all' : Number(val));
                    if (val === 'all') setSelectedDay('all');
                  }}
                  aria-label={o.selectMonth || 'Month'}
                  className="h-10 cursor-pointer appearance-none rounded-xl border border-ink/15 bg-white py-2 pl-3 pr-7 text-xs font-bold text-ink shadow-sm transition hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <option value="all">{o.allMonths || 'All Months'}</option>
                  {monthNames.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink/40" />
              </div>

              {/* Day Dropdown */}
              <div className="relative inline-flex items-center">
                <select
                  value={safeSelectedDay}
                  disabled={selectedMonth === 'all'}
                  onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  aria-label={o.selectDay || 'Day'}
                  className="h-10 cursor-pointer appearance-none rounded-xl border border-ink/15 bg-white py-2 pl-3 pr-7 text-xs font-bold text-ink shadow-sm transition hover:border-ink/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50"
                >
                  <option value="all">{o.allDays || 'All Days'}</option>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>Day {d}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink/40" />
              </div>
            </div>
          )}
        </div>
      </div>

      <Card
        title={`${o.regShort} · ${getPeriodLabel()}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={generateRegistrationReport}
              disabled={!data?.registrations?.byDay?.length}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              {o.generateReport}
            </button>
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              aria-label={o.refreshRegistrations}
              title={o.refreshRegistrations}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sand/70 px-3 py-2 text-xs font-semibold text-ink/70 transition-colors hover:bg-sand"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {o.refreshRegistrations}
            </button>
          </div>
        }
      >
        {reportError && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{o.reportPopupBlocked}</p>}
        {data?.registrations?.byDay?.length ? (
          <RegistrationChart
            days={data.registrations.byDay}
            lang={lang}
            previousTotal={data.previous?.registrations}
            labels={{ chart: o.chartRegistrations, customers: o.customers, sellers: o.sellers, total: o.regTotal, peak: o.regPeak, vsPrevious: fill(o.vsPrevious, { days: data?.days || 14 }) }}
          />
        ) : (
          <div className="skeleton h-40 rounded-2xl" />
        )}
      </Card>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card id="enquiries-card" title={`${o.enqShort} · ${getPeriodLabel()}`} action={<span className="rounded-full bg-sand/70 px-3 py-1 text-xs font-semibold text-ink/70">{fill(o.inTotal, { count: totalEnquiries })}</span>}>
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
      <Card id="orders-card" title={o.chartOrders} action={data && <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf"><Wallet className="h-3.5 w-3.5" />{fill(o.deliveredValue, { value: formatPrice(data.orders.deliveredValue) || 'LKR 0' })}</span>}>
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

        <Card
          id="complaints-card"
          title={o.complaintsTitle}
          action={<button type="button" onClick={() => onNavigate('complaints')} className="inline-flex items-center gap-1 text-xs font-bold text-magenta hover:underline">{o.viewAll}<ArrowRight className="h-3.5 w-3.5" /></button>}
        >
          {stats && (
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                {fill(o.cmpOpenCount, { count: stats.complaints.OPEN })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                {fill(o.cmpReviewCount, { count: stats.complaints.IN_REVIEW })}
              </span>
            </div>
          )}
          {data ? (
            data.recentComplaints.length === 0 ? (
              <Empty><CircleCheck className="mx-auto mb-1 h-5 w-5 text-leaf" />{o.nothingOpen}</Empty>
            ) : (
              <ul className="space-y-2">
                {data.recentComplaints.map((complaint) => {
                  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(complaint.createdAt).getTime()) / 86400000));
                  const overdue = complaint.status === 'OPEN' && ageDays >= 3;
                  return (
                    <li key={complaint.id} className={`rounded-2xl p-3 ${overdue ? 'bg-rose-50 ring-1 ring-rose-200' : 'bg-cream'}`}>
                      <div className="flex items-start gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${complaint.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>
                          {overdue ? <AlertTriangle className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-ink">{complaint.customer?.fullName} → {complaint.seller?.businessName}</p>
                          <p className="truncate text-xs text-ink/50">{complaint.reference} · {t.complaints.reasons[complaint.reason] || complaint.reason}</p>
                          {complaint.message && <p className="mt-1 line-clamp-1 text-xs text-ink/65">{complaint.message}</p>}
                        </div>
                        <div className="shrink-0 text-right">
                          <ComplaintStatusBadge status={complaint.status} />
                          <p className={`mt-1 text-[11px] font-semibold tabular-nums ${overdue ? 'text-rose-700' : 'text-ink/45'}`}>
                            {ageDays === 0 ? o.cmpToday : fill(o.cmpDaysAgo, { count: ageDays })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button type="button" onClick={() => onNavigate('complaints')} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-ink/10 transition-colors hover:bg-magenta hover:text-white">
                          {o.open}
                        </button>
                      </div>
                    </li>
                  );
                })}
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

      {/* Latest people to join */}
      <Card title={o.recentTitle}>
        {data ? (
          data.recentSignups?.length ? (
            <ul className="divide-y divide-ink/5">
              {data.recentSignups.map((person) => (
                <li key={person.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${person.role === 'SELLER' ? 'bg-magenta/10 text-magenta' : 'bg-blue-100 text-blue-700'}`}>{initials(person.name) || '?'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{person.name || '–'}</p>
                    <p className="truncate text-xs text-ink/50">{person.detail || (person.role === 'SELLER' ? o.roleSeller : o.roleCustomer)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${person.role === 'SELLER' ? 'bg-magenta/10 text-magenta' : 'bg-blue-100 text-blue-700'}`}>{person.role === 'SELLER' ? o.roleSeller : o.roleCustomer}</span>
                    <p className="mt-0.5 text-[11px] tabular-nums text-ink/45">{new Date(person.createdAt).toLocaleString(lang === 'en' ? 'en-GB' : lang === 'si' ? 'si-LK' : 'ta-LK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>{o.noRecent}</Empty>
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
