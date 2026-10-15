'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, CircleAlert, CircleCheck, ArrowRight, KeyRound } from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage } from '../../src/lib/i18n';
import { saveSession, safeNextPath } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import PasswordInput from '../../src/components/PasswordInput';
import { PageArt } from '../../src/components/Art';
import { DISTRICTS, isStrongPassword } from '../../src/lib/catalog';

// Same rules as the backend (authController.js)
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

const cleanPhone = (value) => value.replace(/[\s-]/g, '');
const capitalizeInitial = (value) => value.replace(/^(\s*)(\p{L})/u, (_, spaces, letter) => `${spaces}${letter.toLocaleUpperCase()}`);

function SectionTitle({ number, children }) {
  return (
    <h2 className="font-sans flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{number}</span>
      {children}
    </h2>
  );
}

function SellerRegisterForm({ onRegistered }) {
  const { t } = useLanguage();
  const r = t.register;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    district: 'Colombo',
    description: '',
    phone: '',
    whatsappNo: '',
    messengerUrl: '',
    facebookUrl: '',
  });
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = ['firstName', 'lastName'].includes(name) ? capitalizeInitial(value) : value;
    setFormData({ ...formData, [name]: formattedValue });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
  };

  const validate = () => {
    const errors = {};
    if (!/^(\d{9}[VX]|\d{12})$/.test(formData.nicNumber.trim().toUpperCase())) errors.nic = r.nicInvalid;
    if (!isStrongPassword(formData.password)) errors.password = r.passwordRule;
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!PHONE_PATTERN.test(cleanPhone(formData.phone))) errors.phone = r.phoneInvalid;
    if (!whatsappSameAsPhone && !PHONE_PATTERN.test(cleanPhone(formData.whatsappNo))) {
      errors.whatsappNo = r.phoneInvalid;
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    const phone = cleanPhone(formData.phone);
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        role: 'SELLER',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nicNumber: formData.nicNumber.trim().toUpperCase(),
        businessName: formData.businessName.trim(),
        district: formData.district,
        description: formData.description.trim(),
        phone,
        whatsappNo: whatsappSameAsPhone ? phone : cleanPhone(formData.whatsappNo),
        messengerUrl: formData.messengerUrl.trim(),
        facebookUrl: formData.facebookUrl.trim(),
      });

      // Log the new seller straight in
      saveSession(res.data.token, res.data.user);
      onRegistered();
    } catch (err) {
      if (!err.response) {
        setError(r.networkError);
      } else {
        setError(err.response.data?.message || r.genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Personal details */}
      <fieldset className="space-y-4">
        <SectionTitle number={1}>{r.sectionPersonal}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label={r.firstName} required>
            <input id="firstName" name="firstName" type="text" required autoComplete="given-name" value={formData.firstName} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="lastName" label={r.lastName} required>
            <input id="lastName" name="lastName" type="text" required autoComplete="family-name" value={formData.lastName} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="email" label={r.email} required>
            <input id="email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass(false)} placeholder="name@example.com" />
          </Field>
          <Field id="nicNumber" label={r.nic} required hint={r.nicHint} error={fieldErrors.nic}>
            <input id="nicNumber" name="nicNumber" type="text" required autoComplete="off" maxLength={12} value={formData.nicNumber} onChange={handleChange} className={inputClass(!!fieldErrors.nic)} aria-invalid={!!fieldErrors.nic} />
          </Field>
          <Field id="password" label={r.password || 'Password'} required hint={r.passwordRule} error={fieldErrors.password}>
            <PasswordInput id="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} hasError={!!fieldErrors.password} placeholder="" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
          <Field id="confirmPassword" label={r.confirmPassword || 'Confirm password'} required error={fieldErrors.confirmPassword}>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} hasError={!!fieldErrors.confirmPassword} placeholder="Repeat your password" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
        </div>
        <p className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5 text-sm text-slate-700 ring-1 ring-brand-100">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          {r.loginInfo}
        </p>
      </fieldset>

      {/* 2. Business details */}
      <fieldset className="space-y-4">
        <SectionTitle number={2}>{r.sectionBusiness}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="businessName" label={r.businessName} required>
            <input id="businessName" name="businessName" type="text" required autoComplete="organization" value={formData.businessName} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="district" label={r.district} required>
            <select id="district" name="district" value={formData.district} onChange={handleChange} className={inputClass(false)}>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field id="description" label={r.description} className="sm:col-span-2">
            <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} className={inputClass(false)} placeholder={r.descriptionPlaceholder} />
          </Field>
        </div>
      </fieldset>

      {/* 3. Contact details */}
      <fieldset className="space-y-4">
        <SectionTitle number={3}>{r.sectionContact}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label={r.phone} required error={fieldErrors.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={formData.phone} onChange={handleChange} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} />
          </Field>
          <Field id="whatsappNo" label={r.whatsapp} required hint={r.whatsappHint} error={fieldErrors.whatsappNo}>
            <input
              id="whatsappNo"
              name="whatsappNo"
              type="tel"
              inputMode="tel"
              required={!whatsappSameAsPhone}
              disabled={whatsappSameAsPhone}
              value={whatsappSameAsPhone ? formData.phone : formData.whatsappNo}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.whatsappNo}
              className={inputClass(fieldErrors.whatsappNo)}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={whatsappSameAsPhone}
                onChange={(e) => {
                  setWhatsappSameAsPhone(e.target.checked);
                  setFieldErrors({ ...fieldErrors, whatsappNo: undefined });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              {r.sameAsPhone}
            </label>
          </Field>
          <Field id="messengerUrl" label={r.messengerUrl || 'Facebook Messenger URL'} className="sm:col-span-2">
            <input id="messengerUrl" name="messengerUrl" type="url" value={formData.messengerUrl} onChange={handleChange} className={inputClass(false)} placeholder="https://m.me/your-page" />
          </Field>
          <Field id="facebookUrl" label={r.facebookUrl || 'Facebook profile URL'} className="sm:col-span-2">
            <input id="facebookUrl" name="facebookUrl" type="url" value={formData.facebookUrl} onChange={handleChange} className={inputClass(false)} placeholder="https://facebook.com/your-page" />
          </Field>
        </div>
      </fieldset>

      <div className="space-y-4">
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? r.submitting : r.submit}
        </button>
        <p className="text-center text-sm text-slate-500">
          {r.haveAccount}{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {r.loginLink}
          </Link>
        </p>
      </div>
    </form>
  );
}

function CustomerRegisterForm({ onRegistered }) {
  const { t } = useLanguage();
  const r = t.register;
  const c = t.customer;
  // Keep the page the customer came from (e.g. a product) when they choose to log in instead
  const next = safeNextPath(useSearchParams().get('next'));

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const formattedValue = ['firstName', 'lastName'].includes(name) ? capitalizeInitial(value) : value;
    setFormData({ ...formData, [name]: formattedValue });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!isStrongPassword(formData.password)) errors.password = r.passwordRule;
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!PHONE_PATTERN.test(cleanPhone(formData.phone))) errors.phone = r.phoneInvalid;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        role: 'CUSTOMER',
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nicNumber: '',
        phone: cleanPhone(formData.phone),
      });

      // Log the new customer straight in
      saveSession(res.data.token, res.data.user);
      onRegistered();
    } catch (err) {
      if (!err.response) {
        setError(r.networkError);
      } else {
        setError(err.response.data?.message || r.genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <fieldset className="space-y-4">
        <SectionTitle number={1}>{r.sectionPersonal}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label={r.firstName} required>
            <input id="firstName" name="firstName" type="text" required autoComplete="given-name" value={formData.firstName} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="lastName" label={r.lastName} required>
            <input id="lastName" name="lastName" type="text" required autoComplete="family-name" value={formData.lastName} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="email" label={r.email} required>
              <input id="email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass(false)} placeholder="name@example.com" />
            </Field>
          </div>
          <Field id="password" label={r.password || 'Password'} required hint={r.passwordRule} error={fieldErrors.password}>
            <PasswordInput id="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} hasError={!!fieldErrors.password} placeholder="" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
          <Field id="confirmPassword" label={r.confirmPassword || 'Confirm password'} required error={fieldErrors.confirmPassword}>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} hasError={!!fieldErrors.confirmPassword} placeholder="Repeat your password" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
          <Field id="phone" label={r.phone} required error={fieldErrors.phone} className="sm:col-span-2">
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={formData.phone} onChange={handleChange} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} />
          </Field>
        </div>
        <p className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5 text-sm text-slate-700 ring-1 ring-brand-100">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          {r.loginInfo}
        </p>
      </fieldset>

      <div className="space-y-4">
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? r.submitting : c.submit}
        </button>
        <p className="text-center text-sm text-slate-500">
          {r.haveAccount}{' '}
          <Link href={`/login?as=customer${next ? `&next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700 hover:underline">
            {r.loginLink}
          </Link>
        </p>
      </div>
    </form>
  );
}

function Register() {
  const router = useRouter();
  const { t } = useLanguage();
  const r = t.register;
  const c = t.customer;
  const type = useAccountType();
  const [registered, setRegistered] = useState(null); // 'seller' | 'customer' once signed up

  // Customers sent here from the Store's checkout go back there after signing up
  const next = safeNextPath(useSearchParams().get('next'));
  const nextPage = registered === 'customer' ? next || '/account' : '/dashboard';

  // After a successful sign-up, move on to the dashboard (sellers) or account page (customers)
  useEffect(() => {
    if (!registered) return;
    const timer = setTimeout(() => router.push(nextPage), 2500);
    return () => clearTimeout(timer);
  }, [registered, nextPage, router]);

  const panel =
    type === 'customer'
      ? { title: c.registerTitle, subtitle: c.registerSubtitle, listTitle: c.benefitsTitle, items: c.benefits }
      : { title: r.title, subtitle: r.subtitle, listTitle: r.benefitsTitle, items: r.benefits };

  return (
    <main className="relative isolate flex-1 px-4 py-10 sm:py-14">
      <PageArt />
      <div className="mx-auto grid max-w-6xl animate-zoom-in overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel {...panel} />

        <section className="px-6 py-8 sm:px-10 sm:py-10">
          {registered ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center" role="status">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-8 ring-brand-50/50">
                <CircleCheck className="h-9 w-9 text-brand-600" />
              </span>
              <h2 className="mt-6 text-2xl font-extrabold text-slate-900">{r.successTitle}</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">{registered === 'customer' ? c.successSub : r.successSub}</p>
              <button
                type="button"
                onClick={() => router.push(nextPage)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
              >
                {registered === 'customer' ? c.goToAccount : r.goToDashboard}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <AccountTypeTabs basePath="/register" current={type} />
              </div>
              {type === 'customer' ? (
                <CustomerRegisterForm onRegistered={() => setRegistered('customer')} />
              ) : (
                <SellerRegisterForm onRegistered={() => setRegistered('seller')} />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

// The Seller/Customer choice comes from the URL (?as=customer), which needs a Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Register />
    </Suspense>
  );
}
