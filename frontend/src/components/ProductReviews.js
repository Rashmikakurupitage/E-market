'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import API from '../lib/api';
import { formatDate } from '../lib/catalog';
import { useLanguage } from '../lib/i18n';

function RatingStars({ value, onSelect, label }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={onSelect ? () => onSelect(star) : undefined}
          disabled={!onSelect}
          aria-label={`${star} ${label}`}
          className={onSelect ? 'rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-magenta' : 'cursor-default p-0.5'}
        >
          <Star className={`h-4 w-4 ${star <= value ? 'fill-saffron text-saffron' : 'text-ink/20'}`} />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, session }) {
  const { t, lang } = useLanguage();
  const copy = t.store.reviews;
  const isCustomer = session?.user?.role === 'CUSTOMER';
  const [data, setData] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let ignore = false;
    API.get(`/products/${encodeURIComponent(productId)}/reviews`)
      .then(({ data: result }) => {
        if (ignore) return;
        setData(result);
        setRating(result.myReview?.rating || 5);
        setComment(result.myReview?.comment || '');
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, [productId]);

  const submitReview = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await API.post(`/products/${encodeURIComponent(productId)}/reviews`, { rating, comment });
      const { data: result } = await API.get(`/products/${encodeURIComponent(productId)}/reviews`);
      setData(result);
      setRating(result.myReview?.rating || rating);
      setComment(result.myReview?.comment || comment.trim());
      setMessage(copy.saved);
    } catch (error) {
      const code = error.response?.data?.code;
      setMessage(copy.errors[code] || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 border-t border-ink/10 pt-6" aria-labelledby="product-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="product-reviews-heading" className="text-xl font-bold text-ink">{copy.title}</h3>
          {data && (
            <div className="mt-1 flex items-center gap-2 text-sm text-ink/60">
              <RatingStars value={Math.round(data.averageRating)} label={copy.stars} />
              <span>{data.averageRating.toFixed(1)} · {data.reviewCount} {copy.reviewCount}</span>
            </div>
          )}
        </div>
        <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-semibold text-leaf">{copy.verifiedOnly}</span>
      </div>

      {status === 'loading' && <p className="mt-4 text-sm text-ink/55">{copy.loading}</p>}
      {status === 'error' && <p className="mt-4 text-sm text-red-700">{copy.loadError}</p>}
      {status === 'ready' && (
        <>
          <div className="mt-4 space-y-3">
            {data.reviews.length === 0 ? (
              <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/60">{copy.empty}</p>
            ) : data.reviews.map((review) => (
              <article key={review.id} className="rounded-2xl bg-cream/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars value={review.rating} label={copy.stars} />
                  <time className="text-xs text-ink/45" dateTime={review.createdAt}>{formatDate(review.createdAt, lang)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{review.comment}</p>
                <p className="mt-2 text-xs font-semibold text-leaf">{copy.verifiedBuyer}</p>
              </article>
            ))}
          </div>

          {isCustomer && data.canReview ? (
            <form onSubmit={submitReview} className="mt-5 rounded-2xl border border-ink/10 bg-white p-4">
              <h4 className="font-semibold text-ink">{data.myReview ? copy.editTitle : copy.writeTitle}</h4>
              <div className="mt-3 flex items-center gap-2">
                <RatingStars value={rating} onSelect={setRating} label={copy.stars} />
                <span className="text-xs text-ink/55">{rating}/5</span>
              </div>
              <label htmlFor={`review-comment-${productId}`} className="mt-3 block text-sm font-medium text-ink">{copy.commentLabel}</label>
              <textarea
                id={`review-comment-${productId}`}
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 1000))}
                maxLength={1000}
                required
                rows={3}
                placeholder={copy.placeholder}
                className="mt-1 w-full resize-y rounded-xl border border-ink/15 bg-cream/50 px-3 py-2 text-sm text-ink outline-none transition focus:border-magenta"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p aria-live="polite" className="text-xs text-ink/60">{message || `${comment.length}/1000`}</p>
                <button
                  type="submit"
                  disabled={saving || !comment.trim()}
                  className="rounded-full bg-magenta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? copy.saving : data.myReview ? copy.update : copy.submit}
                </button>
              </div>
            </form>
          ) : isCustomer ? (
            <p className="mt-4 rounded-2xl bg-sand/50 px-4 py-3 text-sm text-ink/65">{copy.purchaseRequired}</p>
          ) : (
            <p className="mt-4 text-sm text-ink/60">
              <Link href="/login" className="font-semibold text-magenta underline underline-offset-2">{copy.login}</Link>
              {' '}{copy.loginToReview}
            </p>
          )}
        </>
      )}
    </section>
  );
}
