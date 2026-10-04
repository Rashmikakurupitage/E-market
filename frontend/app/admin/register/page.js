'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LoaderCircle, CircleAlert, CircleCheck, ArrowRight } from 'lucide-react';
import API from '../../../src/lib/api';
import { useLanguage } from '../../../src/lib/i18n';
import AdminAuthCard from '../../../src/components/AdminAuthCard';
import { Field, inputClass, primaryButtonClass } from '../../../src/components/form';

// Same rules as the backend (authController.js)
const NIC_PATTERN = /^(\d{9}[VvXx]|\d{12})$/;
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;
const cleanPhone = (value) => value.replace(/[\s-]/g, '');

export default function AdminRegister() {
  const { t } = useLanguage();
  const a = t.admin;
  const r = t.register;

  const [form, setForm] = useState({ fullName: '', email: '', nic: '', phone: '', signupCode: '' });
  const [showCode, setShowCode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (fieldErrors[e.target.name]) setFieldErrors({ ...fieldErrors, [e.target.name]: undefined });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!NIC_PATTERN.test(form.nic.trim())) errors.nic = a.registerErrors.INVALID_NIC;
    if (!PHONE_PATTERN.test(cleanPhone(form.phone))) errors.phone = a.registerErrors.INVALID_PHONE;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    setLoading(true);
    try {
      await API.post('/auth/admin-register', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        nicNumber: form.nic.trim().toUpperCase(),
        phone: cleanPhone(form.phone),
        signupCode: form.signupCode.trim(),
      });
      setDone(true);
    } catch (err) {
      if (!err.response) setError(t.loginPage.networkError);
      else setError(a.registerErrors[err.response.data?.code] || err.response.data?.message || a.actionError);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AdminAuthCard title={a.registerTitle} subtitle={a.registerSubtitle}>
        <div className="py-4 text-center" role="status">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <CircleCheck className="h-8 w-8 text-brand-600" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-slate-900">{a.registeredTitle}</h2>
          <p className="mt-2 text-sm text-slate-500">{a.registeredText}</p>
          <Link
            href="/admin/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            {a.goToLogin}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AdminAuthCard>
    );
  }

  return (
    <AdminAuthCard title={a.registerTitle} subtitle={a.registerSubtitle}>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Field id="fullName" label={r.fullName} required>
          <input id="fullName" name="fullName" required autoComplete="name" value={form.fullName} onChange={update} className={inputClass(false)} />
        </Field>
        <Field id="email" label={a.email} required>
          <input id="email" name="email" type="email" required autoComplete="email" value={form.email} onChange={update} className={inputClass(false)} placeholder="name@example.com" />
        </Field>
        <Field id="nic" label={r.nic} required hint={r.nicHint} error={fieldErrors.nic}>
          <input id="nic" name="nic" required value={form.nic} onChange={update} aria-invalid={!!fieldErrors.nic} className={`${inputClass(fieldErrors.nic)} uppercase`} placeholder="198584700123" />
        </Field>
        <Field id="phone" label={r.phone} required error={fieldErrors.phone}>
          <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={form.phone} onChange={update} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} placeholder="0771234567" />
        </Field>
        <Field id="signupCode" label={a.signupCode} required hint={a.signupCodeHint}>
          <div className="relative">
            <input
              id="signupCode"
              name="signupCode"
              type={showCode ? 'text' : 'password'}
              required
              autoComplete="off"
              value={form.signupCode}
              onChange={update}
              className={`${inputClass(false)} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowCode((shown) => !shown)}
              aria-label={showCode ? a.hideCode : a.showCode}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
            >
              {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        <button type="submit" disabled={loading} className={`${primaryButtonClass} mt-2`}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? a.registering : a.register}
        </button>

        <p className="text-center text-sm text-slate-500">
          {a.haveAccount}{' '}
          <Link href="/admin/login" className="font-semibold text-brand-700 hover:underline">
            {a.loginLink}
          </Link>
        </p>
      </form>
    </AdminAuthCard>
  );
}
