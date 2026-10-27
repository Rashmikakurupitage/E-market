'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, MapPin, Package, Star } from 'lucide-react';
import WhatsAppIcon from './WhatsAppIcon';
import MessengerIcon from './MessengerIcon';
import { useCanContact } from './ContactGate';
import PriceTag from './DiscountBadge';
import SellerStatusBadge from './SellerStatusBadge';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { useHydrated, useSession } from '../lib/auth';
import { getSeller, messengerLink, toWhatsAppNumber, formatPhone, initials } from '../lib/catalog';
import { profilePhotoUrl } from '../lib/profilePhoto';
import CustomerGateModal from './CustomerGateModal';

const FLAG_URL = 'https://upload.wikimedia.org/wikipedia/commons/1/11/Flag_of_Sri_Lanka.svg';

// Counts the click for the seller's dashboard. Sample products (no sellerId) are skipped.
export function trackContactClick(product, platform = 'WHATSAPP') {
  if (!product.sellerId) return;
  API.post('/products/track-click', { productId: product.id, platform }).catch(() => {});
}

export const trackWhatsAppClick = (product) => trackContactClick(product, 'WHATSAPP');

export default function ProductCard({ product, onOpen }) {
  const { t } = useLanguage();
  const [imageFailed, setImageFailed] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const { canContact } = useCanContact();
  const router = useRouter();
  const session = useSession();
  const hydrated = useHydrated();

  // Opens this product in the Store or triggers onOpen callback. Visitors who are not registered
  // see the CustomerGateModal prompt to register or log in.
  const openInStore = (event) => {
    if (event.target.closest('a, button')) return; // the contact buttons keep their own action
    if (!hydrated) return;
    if (!session) {
      setShowGate(true);
      return;
    }
    if (onOpen) {
      onOpen(product);
      return;
    }
    const target = `/store?product=${encodeURIComponent(product.id)}`;
    router.push(target);
  };
  const onKey = (event) => {
    if (event.key === 'Enter' && event.target === event.currentTarget) openInStore(event);
  };

  const seller = getSeller(product);
  const sellerPhoto = profilePhotoUrl(seller);
  const example = !product.sellerId;
  const image = product.images?.[0];
  const whatsapp = example ? '' : toWhatsAppNumber(seller.whatsappNo);
  const messenger = example ? null : messengerLink(product);
  const whatsappLink = !example && whatsapp
    ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
        `Hello! I'm interested in "${product.title}" on Lanka Women E-Market.`
      )}`
    : null;

  return (
    <>
      <article
        role="link"
        tabIndex={0}
        aria-label={product.title}
      onClick={openInStore}
      onKeyDown={onKey}
      className="group flex h-full cursor-pointer flex-col rounded-[22px] border border-ink/8 bg-white p-2 shadow-sm sm:rounded-[28px] sm:p-3 shadow-ink/5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-ink/10 hover:border-ink/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta">
      {/* Image */}
      <div className="shine relative aspect-square overflow-hidden rounded-[20px] bg-sand">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-108"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink/20">
            <Package className="h-12 w-12" />
          </div>
        )}
        {example ? (
          <span className="absolute left-3 top-3 rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/35 backdrop-blur-md">
            {t.store.exampleBadge}
          </span>
        ) : product.seller?.status === 'APPROVED' ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-magenta px-3 py-1 text-[11px] font-semibold text-white shadow-md">
            <BadgeCheck className="h-3.5 w-3.5" />
            {t.verifiedSeller}
          </span>
        ) : (
          <span className="absolute right-2 top-2">
            <SellerStatusBadge status={product.seller?.status} />
          </span>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col px-2 pb-1 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="line-clamp-1 font-semibold text-ink transition-colors duration-200 group-hover:text-magenta">{product.title}</h3>
          {product.reviewCount > 0 ? (
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              <span>{product.averageRating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-1 text-xs leading-5 text-ink/55 sm:line-clamp-2 sm:min-h-[2.5rem] sm:text-sm">
          {product.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5">
          <PriceTag product={product} />
          {product.category && (
            <span className="truncate max-w-[110px] sm:max-w-[140px] rounded-full bg-sand/70 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold text-ink/80">
              {t.categories[product.category] || product.category}
            </span>
          )}
        </div>

        {/* Seller */}
        <div className="mt-3 flex items-center gap-2.5 border-t border-ink/5 pt-3">
          {sellerPhoto ? (
            <img src={sellerPhoto} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-magenta/20 shadow-xs" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-magenta to-saffron text-xs font-bold text-white">
              {initials(seller.businessName) || '?'}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-ink">{seller.businessName || '—'}</p>
              {seller.reviewCount > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-500" />
                  {seller.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            {seller.district && (
              <p className="flex items-center gap-1 text-xs text-ink/55">
                <MapPin className="h-3 w-3" />
                {seller.district}
              </p>
            )}
          </div>
          <img src={FLAG_URL} alt="Sri Lanka" className="h-3.5 w-auto shrink-0 rounded-[2px] shadow-sm" />
        </div>

        {/* Order button */}
        {canContact && !example && (
          <div className="mt-4 flex flex-1 items-end gap-2">
            {whatsappLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick(product)}
                className="group/order flex min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full border border-emerald-600/30 bg-emerald-50/50 px-3 py-2 text-ink transition-all duration-200 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-md hover:shadow-emerald-600/25 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                <WhatsAppIcon className="h-5 w-5 shrink-0 text-emerald-600 transition-transform duration-300 group-hover/order:-rotate-12 group-hover/order:scale-110 group-hover/order:text-white" />
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
            {messenger && (
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
        )}
      </div>
    </article>
    {showGate && (
      <CustomerGateModal
        isOpen={showGate}
        onClose={() => setShowGate(false)}
        product={product}
      />
    )}
  </>
  );
}
