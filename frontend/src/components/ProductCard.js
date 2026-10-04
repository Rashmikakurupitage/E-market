'use client';

import { useState } from 'react';
import { BadgeCheck, MapPin, Package } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { getSeller, toWhatsAppNumber, formatPhone, formatPrice, initials } from '../lib/catalog';

const FLAG_URL = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg';

// Counts the click for the seller's dashboard. Sample products (no sellerId) are skipped.
function trackWhatsAppClick(product) {
  if (!product.sellerId) return;
  API.post('/products/track-click', { productId: product.id, platform: 'WHATSAPP' }).catch(() => {});
}

export default function ProductCard({ product }) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);

  const seller = getSeller(product);
  const image = product.images?.[0];
  const price = formatPrice(product.price);
  const whatsapp = toWhatsAppNumber(seller.whatsappNo);
  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hello! I'm interested in "${product.title}" on Lanka Women E-Market.`
      )}`
    : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* Image */}
      <div className="relative aspect-[5/4] overflow-hidden bg-slate-100">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className="h-12 w-12" />
          </div>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
          <BadgeCheck className="h-3.5 w-3.5" />
          {t.verifiedSeller}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold text-slate-900">{product.title}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-500">
          {product.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-lg font-extrabold text-slate-900">
            {price || <span className="text-sm font-semibold text-slate-500">{t.priceOnRequest}</span>}
          </span>
          {product.category && (
            <span className="truncate rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
              {t.categories[product.category] || product.category}
            </span>
          )}
        </div>

        {/* Seller */}
        <div className="mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
            {initials(seller.businessName) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{seller.businessName || '—'}</p>
            {seller.district && (
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3" />
                {seller.district}
              </p>
            )}
          </div>
          <img src={FLAG_URL} alt="Sri Lanka" className="h-3.5 w-auto shrink-0 rounded-[2px] shadow-sm" />
        </div>

        {/* Order button */}
        <div className="mt-4 flex flex-1 items-end">
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick(product)}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-3 py-2.5 text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-sm font-bold">{t.orderWhatsapp}</span>
                <span className="text-[11px] font-medium text-white/80">{formatPhone(whatsapp)}</span>
              </span>
            </a>
          ) : (
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-400">
              <WhatsAppIcon className="h-5 w-5" />
              {t.whatsappUnavailable}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
