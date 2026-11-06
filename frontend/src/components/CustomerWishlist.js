'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, LoaderCircle, Package, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react';
import API from '../lib/api';
import { effectivePrice, formatPrice } from '../lib/catalog';
import { useLanguage } from '../lib/i18n';
import { addToCart, openCart } from '../lib/cart';

export default function CustomerWishlist({ onAuthError }) {
  const { t } = useLanguage();
  const copy = t.customerFeatures;
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    Promise.all([API.get('/customer/wishlist'), API.get('/products')])
      .then(([wishlistResponse, productResponse]) => {
        if (ignore) return;
        const ids = wishlistResponse.data?.productIds;
        const allProducts = productResponse.data?.products || productResponse.data;
        if (!Array.isArray(ids) || !Array.isArray(allProducts)) throw new Error('Invalid wishlist response');
        const byId = new Map(allProducts.map((product) => [product.id, product]));
        setProducts(ids.map((id) => byId.get(id)).filter(Boolean));
        setStatus('ready');
      })
      .catch((requestError) => {
        if (ignore) return;
        if ([401, 403].includes(requestError.response?.status)) onAuthError?.();
        setError(copy.wishlistError);
        setStatus('error');
      });
    return () => { ignore = true; };
  }, [copy.wishlistError, onAuthError, retryKey]);

  const retry = () => {
    setError('');
    setStatus('loading');
    setRetryKey((current) => current + 1);
  };

  const remove = async (productId) => {
    setRemovingId(productId);
    setError('');
    try {
      await API.delete(`/customer/wishlist/${encodeURIComponent(productId)}`);
      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch (requestError) {
      if ([401, 403].includes(requestError.response?.status)) onAuthError?.();
      setError(copy.wishlistError);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <section className="rounded-[28px] bg-white px-5 py-5 shadow-sm ring-1 ring-ink/5 sm:px-6">
      <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-wider text-ink">
        <Heart className="h-4 w-4 fill-magenta text-magenta" />
        {copy.wishlistTitle}
      </h2>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {status === 'loading' ? (
        <div className="mt-5 flex min-h-32 items-center justify-center text-sm text-ink/55">
          <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />{copy.loading}
        </div>
      ) : status === 'error' ? (
        <button type="button" onClick={retry} className="mt-4 rounded-full px-4 py-2 text-sm font-semibold text-magenta ring-1 ring-magenta/20">
          {t.orders.retry}
        </button>
      ) : products.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl bg-cream px-4 py-8 text-center">
          <Heart className="h-9 w-9 text-ink/20" />
          <p className="mt-3 text-sm text-ink/60">{copy.wishlistEmpty}</p>
          <Link href="/store" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-magenta">
            <ShoppingBag className="h-4 w-4" />{t.orders.shopNow}
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {products.map((product) => (
            <li key={product.id} className="flex min-w-0 items-center gap-3 rounded-2xl bg-cream p-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                {product.images?.[0]
                  ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                  )
                  : <Package className="h-6 w-6 text-ink/25" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{product.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-magenta">{product.price == null ? t.priceOnRequest : formatPrice(effectivePrice(product))}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link href={`/store?product=${encodeURIComponent(product.id)}`} className="text-xs font-semibold text-ink/60 underline underline-offset-2 hover:text-magenta">
                    {copy.viewProduct}
                  </Link>
                  <button
                    type="button"
                    disabled={product.price == null}
                    onClick={() => { addToCart(product); openCart(); }}
                    aria-label={t.store.addToCart}
                    title={t.store.addToCart}
                    className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-magenta disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />{t.store.addToCart}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(product.id)}
                disabled={removingId === product.id}
                aria-label={copy.removeWishlist}
                title={copy.removeWishlist}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink/50 ring-1 ring-ink/10 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                {removingId === product.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
