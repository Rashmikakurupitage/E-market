'use client';

import { BadgeCheck, Hourglass, CircleX } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

const STATUS_STYLES = {
  PENDING: { icon: Hourglass, className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  APPROVED: { icon: BadgeCheck, className: 'bg-brand-50 text-brand-700 ring-brand-200' },
  REJECTED: { icon: CircleX, className: 'bg-red-50 text-red-700 ring-red-200' },
};

// "Pending approval" / "Approved seller" / "Not approved"
export default function SellerStatusBadge({ status }) {
  const { t } = useLanguage();
  const key = STATUS_STYLES[status] ? status : 'PENDING';
  const { icon: Icon, className } = STATUS_STYLES[key];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {t.dash.status[key]}
    </span>
  );
}
