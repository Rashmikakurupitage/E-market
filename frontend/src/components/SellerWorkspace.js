'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Globe2, LoaderCircle, MapPin, MessageCircle, Save, Star } from 'lucide-react';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { DISTRICTS, formatDate, initials, toWhatsAppNumber, cleanMessengerUrl } from '../lib/catalog';
import { profilePhotoUrl } from '../lib/profilePhoto';
import ProfilePhotoEditor from './ProfilePhotoEditor';
import SellerStatusBadge from './SellerStatusBadge';
import { inputClass, primaryButtonClass } from './form';
import WhatsAppIcon from './WhatsAppIcon';

function ContactLink({ href, icon: Icon, children, tone }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:-translate-y-0.5 ${tone}`}
    >
      <Icon className="h-4 w-4" />
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
    </a>
  );
}

export function SellerProfilePanel({ user, onUpdated, onAuthError }) {
  const { t } = useLanguage();
  const copy = t.sellerWorkspace;
  const profile = user.profile || {};
  const [form, setForm] = useState({
    businessName: profile.businessName || '',
    description: profile.description || '',
    district: profile.district || DISTRICTS[0],
    whatsappNo: profile.whatsappNo || user.phone || '',
    messengerUrl: profile.messengerUrl || '',
    facebookUrl: profile.facebookUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
    setSaved(false);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const { data } = await API.put('/profile/seller', form);
      const updatedUser = { ...user, profile: { ...user.profile, ...data.profile } };
      onUpdated(updatedUser);
      setForm((current) => ({ ...current, ...data.profile }));
      setSaved(true);
    } catch (err) {
      if ([401, 403].includes(err.response?.status)) onAuthError();
      else setError(err.response?.data?.message || copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const whatsAppNumber = toWhatsAppNumber(form.whatsappNo);
  const messengerUrl = cleanMessengerUrl(form.messengerUrl) || '';
  const facebookUrl = form.facebookUrl.trim().startsWith('https://') ? form.facebookUrl.trim() : '';
  const photoUrl = profilePhotoUrl(user);

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-ink p-6 text-white shadow-xl sm:p-8">
        <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10 opacity-70" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <ProfilePhotoEditor user={user} name={form.businessName || copy.shopName} onChanged={onUpdated} onAuthError={onAuthError} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-turmeric">{copy.profileLabel}</p>
            <h1 className="mt-1 break-words text-2xl font-extrabold sm:text-3xl">{form.businessName || copy.shopName}</h1>
            <p className="mt-1 text-sm text-white/75">{profile.firstName} {profile.lastName}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/85">
                <MapPin className="h-3.5 w-3.5" />{form.district}
              </span>
              <SellerStatusBadge status={profile.status || 'PENDING'} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-white/15 pt-5">
          <ContactLink href={whatsAppNumber ? `https://wa.me/${whatsAppNumber}` : ''} icon={WhatsAppIcon} tone="bg-[#25D366] text-white hover:bg-[#1fb85a]">{copy.whatsapp}</ContactLink>
          <ContactLink href={messengerUrl || ''} icon={MessageCircle} tone="bg-white/10 text-white hover:bg-white/20">{copy.messenger}</ContactLink>
          <ContactLink href={facebookUrl || ''} icon={Globe2} tone="bg-white/10 text-white hover:bg-white/20">{copy.facebook}</ContactLink>
          {!whatsAppNumber && !messengerUrl && !facebookUrl && <p className="self-center text-sm text-white/65">{copy.noContacts}</p>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <form onSubmit={save} className="space-y-5 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:p-7">
          <div>
            <h2 className="text-lg font-extrabold text-ink">{copy.editTitle}</h2>
            <p className="mt-1 text-sm text-ink/60">{copy.editIntro}</p>
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {saved && <p role="status" className="rounded-xl border border-leaf/20 bg-leaf/10 px-4 py-3 text-sm font-semibold text-leaf">{copy.saved}</p>}
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>{copy.businessName}</span>
            <input name="businessName" required maxLength={120} value={form.businessName} onChange={update} className={inputClass(false)} />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>{copy.district}</span>
            <select name="district" required value={form.district} onChange={update} className={inputClass(false)}>
              {DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>{copy.description}</span>
            <textarea name="description" rows={4} maxLength={1000} value={form.description} onChange={update} className={inputClass(false)} placeholder={copy.descriptionHint} />
            <span className="block text-right text-xs font-normal text-ink/45">{form.description.length}/1000</span>
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>{copy.whatsappNumber}</span>
            <input name="whatsappNo" type="tel" inputMode="tel" required value={form.whatsappNo} onChange={update} className={inputClass(false)} placeholder="0771234567" />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>{copy.messengerUrl}</span>
            <input name="messengerUrl" type="url" value={form.messengerUrl} onChange={update} className={inputClass(false)} placeholder="https://m.me/your-page" />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold text-ink">
            <span>{copy.facebookUrl}</span>
            <input name="facebookUrl" type="url" value={form.facebookUrl} onChange={update} className={inputClass(false)} placeholder="https://facebook.com/your-page" />
          </label>
          <button type="submit" disabled={saving} className={primaryButtonClass}>
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? copy.saving : copy.save}
          </button>
        </form>

        <aside className="space-y-4">
          <section className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-ink/5">
            <h2 className="text-lg font-extrabold text-ink">{copy.previewTitle}</h2>
            <p className="mt-1 text-sm text-ink/60">{copy.previewHint}</p>
            <div className="mt-5 flex items-start gap-4 rounded-2xl bg-cream p-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white text-xl font-bold text-brand-700 ring-1 ring-ink/5">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : initials(form.businessName) || '?'}
              </span>
              <div className="min-w-0">
                <p className="break-words font-bold text-ink">{form.businessName || copy.shopName}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-ink/55"><MapPin className="h-3.5 w-3.5" />{form.district}</p>
                {form.description && <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-ink/70">{form.description}</p>}
              </div>
            </div>
          </section>
          <section className="rounded-[28px] bg-linear-to-br from-brand-50 to-amber-50 p-6 ring-1 ring-brand-100">
            <h2 className="flex items-center gap-2 font-extrabold text-ink"><MessageCircle className="h-5 w-5 text-brand-700" />{copy.connectionTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">{copy.connectionHint}</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-brand-800">
              <Star className="h-4 w-4 fill-saffron text-saffron" />
              {copy.trustHint}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function RatingStars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= value ? 'fill-saffron text-saffron' : 'text-ink/15'}`} />)}
    </span>
  );
}

export function SellerReviewsPanel({ onAuthError }) {
  const { t, lang } = useLanguage();
  const copy = t.sellerWorkspace;
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    API.get('/products/seller/reviews', { timeout: 15000 })
      .then(({ data: result }) => {
        if (ignore) return;
        setData(result);
        setError(false);
      })
      .catch((err) => {
        if (ignore) return;
        if ([401, 403].includes(err.response?.status)) onAuthError();
        else setError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, [onAuthError]);

  if (loading) return <div className="skeleton h-72 rounded-[28px]" />;
  if (error) return <section role="alert" className="rounded-[28px] bg-red-50 p-6 text-sm text-red-700">{copy.reviewsError}</section>;

  return (
    <div className="space-y-6">
      <section className="relative isolate overflow-hidden rounded-[30px] bg-ink p-6 text-white shadow-xl sm:p-8">
        <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10 opacity-70" />
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-turmeric">{copy.reviewsLabel}</p>
        <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
          <p className="text-5xl font-black">{data.averageRating.toFixed(1)}</p>
          <div className="pb-1">
            <RatingStars value={Math.round(data.averageRating)} />
            <p className="mt-1 text-sm text-white/70">{data.reviewCount} {copy.reviewCount}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)]">
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-ink/5">
          <h2 className="text-lg font-extrabold text-ink">{copy.ratingBreakdown}</h2>
          <div className="mt-5 space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = data.ratingCounts[rating] || 0;
              const percent = data.reviewCount ? (count / data.reviewCount) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 font-bold text-ink">{rating} <Star className="mb-0.5 inline h-3.5 w-3.5 fill-saffron text-saffron" /></span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-sand/70">
                    <span className="block h-full rounded-full bg-saffron transition-[width]" style={{ width: `${percent}%` }} />
                  </span>
                  <span className="w-8 text-right text-xs text-ink/55">{count}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-5 rounded-2xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">{copy.verifiedOnly}</p>
        </div>

        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-ink/5">
          <h2 className="text-lg font-extrabold text-ink">{copy.latestReviews}</h2>
          {data.reviews.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-cream p-5 text-sm text-ink/60">{copy.noReviews}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.reviews.map((review) => (
                <li key={review.id} className="rounded-2xl bg-cream p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-ink">{review.product.title}</p>
                      <RatingStars value={review.rating} />
                    </div>
                    <time dateTime={review.createdAt} className="text-xs text-ink/50">{formatDate(review.createdAt, lang)}</time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/75">{review.comment}</p>
                  <p className="mt-2 text-xs font-semibold text-leaf">{copy.verifiedBuyer}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
