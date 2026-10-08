'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Package, ShoppingBag, Store, Trash2, X } from 'lucide-react';
import { useLanguage, fill } from '../lib/i18n';
import { formatPrice } from '../lib/catalog';
import { closeCart, groupBySeller, removeFromCart, setCartQuantity, useCart, useCartOpen } from '../lib/cart';
import QuantityStepper from './QuantityStepper';
import { Sparkle } from './Art';

// The cart, sliding in from the right. Opened from the header's bag button and after "Add to cart".
export default function CartDrawer() {
  const { t } = useLanguage();
  const c = t.cart;
  const open = useCartOpen();
  const pathname = usePathname();
  const { items, count, total } = useCart();

  // Close when the page changes (e.g. after "Checkout")
  useEffect(() => {
    closeCart();
  }, [pathname]);

  // Escape closes it; the page behind doesn't scroll while it is open
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => event.key === 'Escape' && closeCart();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] print:hidden" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <div className="absolute inset-0 animate-page-in bg-ink/40 backdrop-blur-sm" onClick={closeCart} />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slide-in flex-col bg-cream shadow-2xl sm:rounded-l-[32px]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 px-6 py-5">
          <h2 id="cart-title" className="flex items-center gap-2.5 text-2xl font-bold text-ink">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            {c.title}
            {count > 0 && (
              <span className="rounded-full bg-magenta px-2.5 py-0.5 font-sans text-xs font-bold text-white">{count}</span>
            )}
          </h2>
          <button type="button" onClick={closeCart} aria-label={t.store.close} className="flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition-colors hover:bg-white hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          /* Empty */
          <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg shadow-ink/5">
              <ShoppingBag className="h-10 w-10 text-magenta" />
              <Sparkle className="absolute -right-2 -top-1 h-6 w-6 animate-twinkle text-turmeric" />
              <Sparkle className="absolute -bottom-1 -left-3 h-4 w-4 animate-twinkle text-magenta/60 [animation-delay:-1.5s]" />
            </span>
            <p className="mt-6 text-lg font-bold text-ink">{c.empty}</p>
            <p className="mt-1 text-sm text-ink/60">{c.emptySub}</p>
            <Link href="/store" onClick={closeCart} className="btn-shine mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-magenta">
              <Store className="h-4 w-4" />
              {c.browse}
            </Link>
          </div>
        ) : (
          <>
            {/* Items, by seller */}
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {groupBySeller(items).map((group) => (
                <section key={group.sellerId} className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-ink/5">
                  <p className="flex items-center gap-2 text-xs font-semibold text-ink/60">
                    <Store className="h-3.5 w-3.5 text-magenta" />
                    {fill(c.from, { seller: group.sellerName || '—' })}
                  </p>
                  <ul className="mt-3 divide-y divide-ink/5">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-sand">
                          {item.image ? (
                            <img src={item.image} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-ink/25">
                              <Package className="h-6 w-6" />
                            </span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{item.title}</p>
                            <button type="button" onClick={() => removeFromCart(item.id)} aria-label={`${c.remove}: ${item.title}`} className="shrink-0 rounded-full p-1 text-ink/35 transition-colors hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-0.5 text-xs text-ink/50">
                            {formatPrice(item.price)} {c.each}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <QuantityStepper size="sm" value={item.quantity} onChange={(qty) => setCartQuantity(item.id, qty)} />
                            <span className="text-sm font-bold tabular-nums text-ink">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            {/* Total and checkout */}
            <div className="border-t border-ink/10 bg-white px-6 pb-6 pt-5 sm:rounded-bl-[32px]">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink/70">
                  {c.subtotal} · {fill(c.itemsCount, { count })}
                </span>
                <span className="text-2xl font-bold tabular-nums text-ink">{formatPrice(total)}</span>
              </div>
              <p className="mt-1 text-xs text-ink/50">{c.deliveryNote}</p>
              <Link
                href="/store/checkout"
                className="btn-shine group mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition-colors hover:bg-magenta"
              >
                {c.checkout}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
