'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, CircleAlert } from 'lucide-react';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';

const STORAGE_KEY = 'lw-customer-order-alerts';

export default function CustomerOrderAlerts({ userId, onAuthError }) {
  const { t } = useLanguage();
  const copy = t.customerFeatures;
  const [enabled, setEnabled] = useState(true);
  const [notice, setNotice] = useState('');
  const [failed, setFailed] = useState(false);
  const previous = useRef(null);
  const storageKey = `${STORAGE_KEY}:${userId}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEnabled(saved === 'true');
      }
      previous.current = null;
    } catch {
      setFailed(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    let ignore = false;
    const checkOrders = async () => {
      try {
        const { data } = await API.get('/orders/mine', { timeout: 15000 });
        if (ignore || !Array.isArray(data)) return;
        const current = new Map(data.map((order) => [order.id, order]));
        if (previous.current) {
          for (const [id, order] of current) {
            const prior = previous.current.get(id);
            if (prior && prior.status !== order.status) {
              setNotice(`${order.reference}: ${t.overview.orderStatus[order.status] || order.status}`);
              break;
            }
          }
        }
        previous.current = current;
        setFailed(false);
      } catch (error) {
        if (ignore) return;
        if ([401, 403].includes(error.response?.status)) onAuthError?.();
        else setFailed(true);
      }
    };

    checkOrders();
    const interval = window.setInterval(checkOrders, 60000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkOrders();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      ignore = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, onAuthError, t.overview.orderStatus]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    previous.current = null;
    setNotice('');
    try {
      localStorage.setItem(storageKey, String(next));
    } catch {
      setFailed(true);
    }
  };

  return (
    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-ink/5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-magenta/10 text-magenta">
            {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          </span>
          <div>
            <h2 className="font-bold text-ink">{copy.orderNotifications}</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink/60">{copy.orderNotificationsHint}</p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${enabled ? 'bg-magenta' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-7' : 'left-1'}`} />
          <span className="sr-only">{enabled ? copy.disableNotifications : copy.enableNotifications}</span>
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-leaf/10 px-4 py-3 text-sm font-semibold text-leaf">
          <Bell className="h-4 w-4 shrink-0" />{notice}
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-xs text-ink/55">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" />{t.orders.loadError}
        </p>
      )}
    </section>
  );
}
