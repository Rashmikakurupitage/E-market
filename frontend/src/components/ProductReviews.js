'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import API from '../lib/api';
import { formatDate } from '../lib/catalog';
import { useLanguage } from '../lib/i18n';
import { profilePhotoUrl } from '../lib/profilePhoto';

function StarPicker({ value, onSelect, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const activeRating = hovered || value;
  const sizeClasses = size === 'lg' ? 'h-6 w-6' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => !readonly && setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={onSelect ? () => onSelect(star) : undefined}
          onMouseEnter={!readonly ? () => setHovered(star) : undefined}
          aria-label={`${star} stars`}
          className={
            readonly
              ? 'cursor-default p-0.5'
              : 'rounded p-1 transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-magenta'
          }
        >
          <Star
            className={`${sizeClasses} transition-colors ${
              star <= activeRating
                ? 'fill-amber-400 text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.3)]'
                : 'text-ink/20'
            }`}
          />
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
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const fetchReviews = () => {
    API.get(`/products/${encodeURIComponent(productId)}/reviews`)
      .then(({ data: result }) => {
        setData(result);
        if (result.myReview) {
          setRating(result.myReview.rating || 5);
          setComment(result.myReview.comment || '');
        }
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
      });
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    setFeedback({ error: '', success: '' });
    try {
      await API.post(`/products/${encodeURIComponent(productId)}/reviews`, {
        rating,
        comment: comment.trim()
      });
      fetchReviews();
      setFeedback({ error: '', success: copy.saved || 'Review saved successfully!' });
    } catch (error) {
      const code = error.response?.data?.code;
      const errMsg = copy.errors?.[code] || copy.saveError || 'Could not save review.';
      setFeedback({ error: errMsg, success: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 border-t border-ink/10 pt-6" aria-labelledby="product-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="product-reviews-heading" className="text-xl font-bold text-ink flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-magenta" />
            <span>{copy.title}</span>
            {data && <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink/60">({data.reviewCount})</span>}
          </h3>
          {data && (
            <div className="mt-1 flex items-center gap-2 text-sm text-ink/60">
              <StarPicker value={Math.round(data.averageRating)} readonly size="sm" />
              <span className="font-semibold text-ink">{data.averageRating.toFixed(1)}</span>
              <span>·</span>
              <span>{data.reviewCount} {copy.reviewCount}</span>
            </div>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>{copy.verifiedOnly}</span>
        </span>
      </div>

      {status === 'loading' && <p className="mt-4 text-sm text-ink/55">{copy.loading}</p>}
      {status === 'error' && <p className="mt-4 text-sm text-red-700">{copy.loadError}</p>}
      {status === 'ready' && (
        <>
          {/* Reviews List */}
          <div className="mt-4 space-y-3">
            {data.reviews.length === 0 ? (
              <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/60">{copy.empty}</p>
            ) : (
              data.reviews.map((review) => {
                const reviewerPhoto = profilePhotoUrl(review.reviewerUserId, review.reviewerPhotoVersion);
                return (
                  <article key={review.id} className="rounded-2xl bg-cream/80 p-4 ring-1 ring-ink/5 transition hover:bg-cream">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {reviewerPhoto ? (
                          <img src={reviewerPhoto} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-magenta/25 shadow-2xs" />
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-magenta to-saffron text-[10px] font-bold text-white shadow-2xs">
                            {review.reviewerName?.charAt(0) || 'C'}
                          </span>
                        )}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink">{review.reviewerName}</span>
                            {review.isVerifiedBuyer ? (
                              <span className="inline-flex items-center gap-0.5 rounded bg-leaf/15 px-1.5 py-0.5 text-[10px] font-semibold text-leaf">
                                <ShieldCheck className="h-3 w-3" />
                                {copy.verifiedBuyer}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                <MessageSquare className="h-3 w-3" />
                                {lang === 'si' ? 'පාරිභෝගිකයා' : lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <StarPicker value={review.rating} readonly size="sm" />
                          </div>
                        </div>
                      </div>
                      <time className="text-xs text-ink/45" dateTime={review.createdAt}>
                        {formatDate(review.createdAt, lang)}
                      </time>
                    </div>
                    <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{review.comment}</p>
                  </article>
                );
              })
            )}
          </div>

          {/* Review Submission Form */}
          {isCustomer ? (
            <form onSubmit={submitReview} className="mt-5 rounded-2xl border-2 border-magenta/20 bg-magenta/[0.02] p-4.5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-bold text-ink sm:text-base">
                  {data.myReview ? copy.editTitle : copy.writeTitle}
                </h4>
                {data.myReview && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-magenta/10 px-2.5 py-0.5 text-xs font-semibold text-magenta">
                    <CheckCircle2 className="h-3 w-3" />
                    {copy.saved}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <StarPicker value={rating} onSelect={setRating} size="lg" />
                <span className="text-sm font-bold text-ink">{rating} / 5</span>
              </div>

              <label htmlFor={`review-comment-${productId}`} className="mt-3 block text-xs font-bold uppercase tracking-wider text-ink/60">
                {copy.commentLabel}
              </label>
              <textarea
                id={`review-comment-${productId}`}
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 1000))}
                maxLength={1000}
                required
                rows={3}
                placeholder={copy.placeholder}
                className="mt-1.5 w-full resize-y rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-magenta focus:ring-2 focus:ring-magenta/15"
              />

              {feedback.error && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {feedback.error}
                </p>
              )}
              {feedback.success && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-leaf">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {feedback.success}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-ink/45">{comment.length} / 1000</span>
                <button
                  type="submit"
                  disabled={saving || !comment.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-magenta-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? copy.saving : data.myReview ? copy.update : copy.submit}
                </button>
              </div>
            </form>
          ) : !session ? (
            <div className="mt-5 rounded-2xl bg-sand/40 p-4 text-xs sm:text-sm text-ink/75 ring-1 ring-ink/5">
              <p>
                <Link href="/login" className="font-bold text-magenta underline underline-offset-2 hover:text-magenta-dark">
                  {copy.login}
                </Link>{' '}
                {copy.loginToReview}
              </p>
            </div>
          ) : (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-amber-500/10 p-4 text-xs text-amber-900 ring-1 ring-amber-500/20">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>{copy.errors?.NOT_CUSTOMER || 'Only customer accounts can write reviews and leave comments.'}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
