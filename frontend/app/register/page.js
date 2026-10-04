'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoaderCircle, CircleAlert, CircleCheck, ArrowRight, KeyRound } from 'lucide-react';
import API from '../../src/lib/api';
import { useLanguage } from '../../src/lib/i18n';
import { saveSession } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
  'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

// Same rules as the backend (authController.js)
const NIC_PATTERN = /^(\d{9}[VvXx]|\d{12})$/;
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

const cleanPhone = (value) => value.replace(/[\s-]/g, '');

function SectionTitle({ number, children }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{number}</span>
      {children}
    </h2>
  );
}

function SellerRegisterForm({ onRegistered }) {
  const { t } = useLanguage();
  const r = t.register;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    nic: '',
    businessName: '',
    district: 'Colombo',
    description: '',
    phone: '',
    whatsappNo: '',
  });
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
  };

  const validate = () => {
    const errors = {};
    if (!NIC_PATTERN.test(formData.nic.trim())) errors.nic = r.nicInvalid;
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
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        nicNumber: formData.nic.trim().toUpperCase(),
        businessName: formData.businessName.trim(),
        district: formData.district,
        description: formData.description.trim(),
        phone,
        whatsappNo: whatsappSameAsPhone ? phone : cleanPhone(formData.whatsappNo),
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
          <Field id="name" label={r.fullName} required>
            <input id="name" name="name" type="text" required autoComplete="name" value={formData.name} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="email" label={r.email} required>
            <input id="email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass(false)} placeholder="name@example.com" />
          </Field>
          <Field id="nic" label={r.nic} required hint={r.nicHint} error={fieldErrors.nic} className="sm:col-span-2">
            <input id="nic" name="nic" type="text" required value={formData.nic} onChange={handleChange} aria-invalid={!!fieldErrors.nic} className={`${inputClass(fieldErrors.nic)} uppercase`} placeholder="198584700123" />
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
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={formData.phone} onChange={handleChange} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} placeholder="0771234567" />
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
              placeholder="0771234567"
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

  const [formData, setFormData] = useState({ name: '', email: '', nic: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!NIC_PATTERN.test(formData.nic.trim())) errors.nic = r.nicInvalid;
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
        fullName: formData.name.trim(),
        email: formData.email.trim(),
        nicNumber: formData.nic.trim().toUpperCase(),
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
          <Field id="name" label={r.fullName} required>
            <input id="name" name="name" type="text" required autoComplete="name" value={formData.name} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="email" label={r.email} required>
            <input id="email" name="email" type="email" required autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass(false)} placeholder="name@example.com" />
          </Field>
          <Field id="nic" label={r.nic} required hint={r.nicHint} error={fieldErrors.nic}>
            <input id="nic" name="nic" type="text" required value={formData.nic} onChange={handleChange} aria-invalid={!!fieldErrors.nic} className={`${inputClass(fieldErrors.nic)} uppercase`} placeholder="198584700123" />
          </Field>
          <Field id="phone" label={r.phone} required error={fieldErrors.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={formData.phone} onChange={handleChange} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} placeholder="0771234567" />
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
          <Link href="/login?as=customer" className="font-semibold text-brand-700 hover:underline">
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

  const nextPage = registered === 'customer' ? '/account' : '/dashboard';

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
    <main className="flex-1 bg-slate-100 px-4 py-10 sm:py-14">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 lg:grid-cols-[2fr_3fr]">
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
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
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
    <Suspense fallback={<main className="flex-1 bg-slate-100" />}>
      <Register />
    </Suspense>
  );
}
