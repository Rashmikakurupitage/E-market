'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, ShieldCheck, ArrowRight, Package, MapPin, Sparkles, LogIn } from 'lucide-react';
import Portal from './Portal';
import { useLanguage } from '../lib/i18n';
import { formatPrice, getSeller } from '../lib/catalog';
import PriceTag from './DiscountBadge';

export default function CustomerGateModal({ isOpen, onClose, product }) {
  const router = useRouter();
  const { t } = useLanguage();
  const gm = t.customer?.gateModal || {
    badge: 'Customer Registration',
    title: 'Register as a Customer',
    message: 'Please register as a customer to view complete product details, contact the artisan, place orders, and submit reviews.',
    productPreview: 'Product you selected',
    registerButton: 'Register as Customer',
    alreadyRegistered: 'Already have an account?',
    loginButton: 'Log In',
    cancelButton: 'Cancel',
  };

  const benefitsList = gm.benefits || (Array.isArray(t.customer?.benefits) && t.customer.benefits.length > 0
    ? t.customer.benefits.slice(0, 3)
    : [
        'Direct WhatsApp contact with rural women makers',
        'Safe islandwide deliveries across 25 districts',
        'Leave ratings and genuine reviews for products',
      ]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const targetPath = product?.id
    ? `/store?product=${encodeURIComponent(product.id)}`
    : '/store';

  const registerUrl = `/register?as=customer&next=${encodeURIComponent(targetPath)}`;
  const loginUrl = `/login?next=${encodeURIComponent(targetPath)}`;

  const handleRegisterClick = () => {
    onClose();
    router.push(registerUrl);
  };

  const handleLoginClick = () => {
    onClose();
    router.push(loginUrl);
  };

  const seller = product ? getSeller(product) : null;
  const image = product?.images?.[0];

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-gate-title"
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl animate-zoom-in"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header Badge */}
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-magenta/10 text-magenta shadow-xs">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-magenta" />
              {gm.badge}
            </span>
          </div>

          {/* Title & Message */}
          <div className="mt-4">
            <h2 id="customer-gate-title" className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              {gm.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
              {gm.message}
            </p>
          </div>

          {/* Selected Product Preview Card */}
          {product && (
            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                {gm.productPreview}
              </p>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                  {image ? (
                    <img
                      src={image}
                      alt={product.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-bold text-slate-900 text-sm">
                    {product.title}
                  </h4>
                  <div className="mt-1 flex items-center justify-between">
                    <PriceTag product={product} />
                    {seller?.businessName && (
                      <span className="truncate text-xs text-slate-500 font-medium">
                        {seller.businessName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Benefits Checkmarks */}
          <ul className="mt-5 space-y-2 text-xs text-slate-600">
            {benefitsList.map((benefit, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleRegisterClick}
              className="btn-shine flex w-full items-center justify-center gap-2 rounded-full bg-magenta py-3 text-sm font-bold text-white shadow-md shadow-magenta/25 transition-all hover:bg-magenta-dark active:scale-95"
            >
              <span>{gm.registerButton}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={onClose}
                className="font-medium text-slate-500 hover:text-slate-800"
              >
                {gm.cancelButton}
              </button>

              <button
                type="button"
                onClick={handleLoginClick}
                className="inline-flex items-center gap-1 font-bold text-magenta hover:text-magenta-dark hover:underline"
              >
                <span>{gm.alreadyRegistered}</span>
                <span className="font-extrabold">{gm.loginButton}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
