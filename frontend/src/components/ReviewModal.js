'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Star, X, Store, Package, CheckCircle2, ShieldCheck, MessageSquare, AlertCircle } from 'lucide-react';
import Portal from './Portal';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { formatDate } from '../lib/catalog';
import { profilePhotoUrl } from '../lib/profilePhoto';

function StarPicker({ value, onSelect, readonly = false, size = 'md' }) {
  const [hovered, setHovered] = useState(0);
  const activeRating = hovered || value;
  const sizeClasses = size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={onSelect ? () => onSelect(star) : undefined}
          onMouseEnter={!readonly ? () => setHovered(star) : undefined}
          aria-label={`${star} stars`}
          className={readonly ? 'cursor-default p-0.5' : 'rounded p-1 transition-transform hover:scale-115 focus-visible:outline-2 focus-visible:outline-magenta'}
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

export default function ReviewModal({
  isOpen,
  onClose,
  type = 'seller', // 'seller' | 'product'
  targetId,
  title,
  subtitle,
  session,
  onReviewSaved
}) {
  const { t, lang } = useLanguage();
  const isSeller = type === 'seller';
  const copy = isSeller ? t.store.sellerReviews : t.store.reviews;
  const isCustomer = session?.user?.role === 'CUSTOMER';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ error: '', success: '' });

  const endpoint = isSeller
    ? `/sellers/${encodeURIComponent(targetId)}/reviews`
    : `/products/${encodeURIComponent(targetId)}/reviews`;

  const fetchReviews = useCallback(() => {
    if (!targetId) return;
    setLoading(true);
    API.get(endpoint)
      .then((res) => {
        setData(res.data);
        if (res.data.myReview) {
          setRating(res.data.myReview.rating || 5);
          setComment(res.data.myReview.comment || '');
        } else {
          setRating(5);
          setComment('');
        }
      })
      .catch((err) => {
        console.error('Fetch reviews error:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [endpoint, targetId]);

  useEffect(() => {
    if (isOpen && targetId) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setFeedback({ error: '', success: '' });
      /* eslint-enable react-hooks/set-state-in-effect */
      fetchReviews();
    }
  }, [isOpen, targetId, fetchReviews]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSaving(true);
    setFeedback({ error: '', success: '' });
    try {
      await API.post(endpoint, { rating, comment: comment.trim() });
      setFeedback({ error: '', success: copy.saved });
      fetchReviews();
      if (onReviewSaved) onReviewSaved();
    } catch (err) {
      const code = err.response?.data?.code;
      const errMsg = copy.errors?.[code] || copy.saveError || 'Could not save review.';
      setFeedback({ error: errMsg, success: '' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* Modal Window */}
        <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] sm:rounded-[28px] bg-white shadow-2xl ring-1 ring-ink/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink/10 bg-linear-to-r from-cream via-white to-cream px-4 py-3 sm:px-8 sm:py-4.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-magenta to-saffron text-white shadow-md">
                {isSeller ? <Store className="h-5 w-5" /> : <Package className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-base sm:text-xl font-bold text-ink">{title || copy.title}</h3>
                {subtitle && <p className="truncate text-xs font-medium text-ink/55">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-ink/5 text-ink/70 transition-colors hover:bg-ink hover:text-white"
              aria-label={t.store?.close || 'Close'}
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
            {/* Summary Rating Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-linear-to-br from-sand/40 to-cream p-4 ring-1 ring-ink/5">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-3xl font-extrabold tabular-nums text-ink sm:text-4xl">
                    {data?.averageRating ? data.averageRating.toFixed(1) : '—'}
                  </span>
                  <span className="text-[11px] font-semibold text-ink/50">/ 5.0</span>
                </div>
                <div>
                  <StarPicker value={Math.round(data?.averageRating || 0)} readonly size="md" />
                  <p className="mt-1 text-xs font-semibold text-ink/60">
                    {data ? `${data.reviewCount} ${copy.reviewCount}` : '...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-leaf/10 px-3 py-1.5 text-xs font-semibold text-leaf">
                <ShieldCheck className="h-4 w-4" />
                <span>{copy.verifiedOnly}</span>
              </div>
            </div>

            {/* Review Submission Form (if customer is eligible) */}
            {isCustomer && data?.canReview ? (
              <form onSubmit={handleSubmit} className="mt-6 rounded-2xl border-2 border-magenta/20 bg-magenta/[0.02] p-5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-ink sm:text-base">
                    {data?.myReview ? copy.editTitle : copy.writeTitle}
                  </h4>
                  {data?.myReview && (
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

                <label htmlFor="review-comment-input" className="mt-4 block text-xs font-bold uppercase tracking-wider text-ink/60">
                  {copy.commentLabel}
                </label>
                <textarea
                  id="review-comment-input"
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
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
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-magenta px-5 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? copy.saving : data?.myReview ? copy.update : copy.submit}
                  </button>
                </div>
              </form>
            ) : isCustomer && !data?.canReview ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-500/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>{copy.purchaseRequired}</p>
              </div>
            ) : !isCustomer && session ? (
              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-500/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>{copy.errors?.NOT_CUSTOMER || 'Only customer accounts can submit reviews.'}</p>
              </div>
            ) : !session ? (
              <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-sand/40 p-4 text-xs text-ink/70">
                <p>
                  <Link href="/login" onClick={onClose} className="font-bold text-magenta underline underline-offset-2">
                    {copy.login}
                  </Link>{' '}
                  {copy.loginToReview}
                </p>
              </div>
            ) : null}

            {/* Reviews List */}
            <div className="mt-8">
              <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
                <MessageSquare className="h-4 w-4 text-magenta" />
                <span>{copy.title}</span>
                {data && <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold text-ink/60">({data.reviews.length})</span>}
              </h4>

              {loading ? (
                <div className="mt-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-20 rounded-2xl" />
                  ))}
                </div>
              ) : !data || data.reviews.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-sand/30 p-6 text-center text-sm text-ink/60">
                  {copy.empty}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.reviews.map((rev) => {
                    const reviewerPhoto = profilePhotoUrl(rev.reviewerUserId, rev.reviewerPhotoVersion);
                    return (
                      <article key={rev.id} className="rounded-2xl bg-cream/70 p-4 ring-1 ring-ink/5 transition hover:bg-cream">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {reviewerPhoto ? (
                              <img src={reviewerPhoto} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-magenta/25 shadow-2xs" />
                            ) : (
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-magenta to-saffron text-[10px] font-bold text-white shadow-2xs">
                                {rev.reviewerName?.charAt(0) || 'C'}
                              </span>
                            )}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-ink">{rev.reviewerName}</span>
                                {rev.isVerifiedBuyer ? (
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
                                <StarPicker value={rev.rating} readonly size="sm" />
                              </div>
                            </div>
                          </div>
                          <time className="text-xs text-ink/40" dateTime={rev.createdAt}>
                            {formatDate(rev.createdAt, lang)}
                          </time>
                        </div>
                        <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                          {rev.comment}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
