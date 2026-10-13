'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, MapPin, Package } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import MessengerIcon from './MessengerIcon';
import { useCanContact } from './ContactGate';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { useHydrated, useSession } from '../lib/auth';
import { getSeller, messengerLink, toWhatsAppNumber, formatPhone, formatPrice, initials } from '../lib/catalog';

const FLAG_URL = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg';

// Counts the click for the seller's dashboard. Sample products (no sellerId) are skipped.
export function trackContactClick(product, platform = 'WHATSAPP') {
  if (!product.sellerId) return;
  API.post('/products/track-click', { productId: product.id, platform }).catch(() => {});
}

export const trackWhatsAppClick = (product) => trackContactClick(product, 'WHATSAPP');

export default function ProductCard({ product }) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const { canContact } = useCanContact();
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();

  // Opens this product in the Store. Visitors who are not registered land on the customer sign-up form first,
  // and come back to the product once they have registered (or logged in).
  const openInStore = (event) => {
    if (event.target.closest('a, button')) return; // the contact buttons keep their own action
    if (!hydrated) return;
    const target = `/store?product=${encodeURIComponent(product.id)}`;
    router.push(session ? target : `/register?as=customer&next=${encodeURIComponent(target)}`);
  };
  const onKey = (event) => {
    if (event.key === 'Enter' && event.target === event.currentTarget) openInStore(event);
  };

  const seller = getSeller(product);
  const image = product.images?.[0];
  const price = formatPrice(product.price);
  const whatsapp = toWhatsAppNumber(seller.whatsappNo);
  const messenger = messengerLink(product);
  const whatsappLink = whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hello! I'm interested in "${product.title}" on Lanka Women E-Market.`
      )}`
    : null;

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={product.title}
      onClick={openInStore}
      onKeyDown={onKey}
      className="group flex h-full cursor-pointer flex-col rounded-[22px] border border-ink/5 bg-white p-2 shadow-sm sm:rounded-[28px] sm:p-3 shadow-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta">
      {/* Image */}
      <div className="shine relative aspect-square overflow-hidden rounded-[22px] bg-sand">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/20">
            <Package className="h-12 w-12" />
          </div>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-magenta px-3 py-1 text-[11px] font-semibold text-white shadow-md">
          <BadgeCheck className="h-3.5 w-3.5" />
          {t.verifiedSeller}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <h3 className="line-clamp-1 font-semibold text-ink">{product.title}</h3>
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-ink/55 sm:line-clamp-2 sm:min-h-[2.5rem] sm:text-sm">
          {product.description}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-lg font-bold tabular-nums text-ink">
            {price || <span className="text-sm font-semibold text-ink/50">{t.priceOnRequest}</span>}
          </span>
          {product.category && (
            <span className="truncate rounded-full bg-sand/70 px-3 py-1 text-[11px] font-semibold text-ink/80">
              {t.categories[product.category] || product.category}
            </span>
          )}
        </div>

        {/* Seller */}
        <div className="mt-3 flex items-center gap-2.5 border-t border-ink/5 pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-magenta to-saffron text-xs font-bold text-white">
            {initials(seller.businessName) || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{seller.businessName || '—'}</p>
            {seller.district && (
              <p className="flex items-center gap-1 text-xs text-ink/55">
                <MapPin className="h-3 w-3" />
                {seller.district}
              </p>
            )}
          </div>
          <img src={FLAG_URL} alt="Sri Lanka" className="hidden h-3.5 w-auto shrink-0 rounded-[2px] shadow-sm sm:block" />
        </div>

        {/* Order button */}
        <div className="mt-4 flex flex-1 items-end gap-2">
          {!canContact ? null : whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick(product)}
              className="group/order flex min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full border border-ink/15 px-3 py-2 text-ink transition-all duration-200 hover:border-leaf hover:bg-leaf hover:text-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf"
            >
              <WhatsAppIcon className="h-5 w-5 shrink-0 text-leaf transition-transform duration-300 group-hover/order:-rotate-12 group-hover/order:scale-110 group-hover/order:text-white" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold">{t.orderWhatsapp}</span>
                <span className="hidden text-[11px] font-medium tabular-nums opacity-70 sm:block">{formatPhone(whatsapp)}</span>
              </span>
            </a>
          ) : (
            <span className="flex w-full items-center justify-center gap-2 rounded-full bg-sand/70 px-3 py-3 text-sm font-semibold text-ink/40">
              <WhatsAppIcon className="h-5 w-5" />
              {t.whatsappUnavailable}
            </span>
          )}
          {canContact && messenger && (
            <a
              href={messenger}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackContactClick(product, 'MESSENGER')}
              aria-label={t.store.chatMessenger}
              title={t.store.chatMessenger}
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-ink/15 text-[#0084ff] transition-colors hover:border-[#0084ff] hover:bg-[#0084ff] hover:text-white"
            >
              <MessengerIcon className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
