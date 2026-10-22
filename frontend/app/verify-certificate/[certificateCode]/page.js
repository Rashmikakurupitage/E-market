'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Award, ArrowLeft, BadgeCheck, LoaderCircle, Printer, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../../src/lib/i18n';
import API from '../../../src/lib/api';

export default function VerifyCertificatePage() {
  const { certificateCode } = useParams();
  const { t } = useLanguage();
  const copy = t.elearningHub;
  const [certificate, setCertificate] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (typeof certificateCode !== 'string') return;
    let active = true;
    API.get(`/learning/certificates/${encodeURIComponent(certificateCode)}`)
      .then((response) => {
        if (!active) return;
        setCertificate(response.data.certificate);
        setStatus('verified');
      })
      .catch((error) => {
        if (!active) return;
        if (error.response?.status >= 500) console.error('LEARNING_CERTIFICATE_VERIFY_ERROR:', error.response.status);
        setStatus(error.response?.status === 404 ? 'invalid' : 'error');
      });
    return () => {
      active = false;
    };
  }, [certificateCode]);

  const printCertificate = () => {
    document.body.classList.add('learning-certificate-print');
    window.addEventListener('afterprint', () => {
      document.body.classList.remove('learning-certificate-print');
    }, { once: true });
    window.print();
  };

  return (
    <main className="relative isolate flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-br from-brand-50 via-cream to-sand/60" />
      <section id="learning-certificate" className="w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-ink/10 print:rounded-none print:shadow-none print:ring-0">
        <div className="border-b border-brand-100 bg-linear-to-r from-brand-800 via-brand-700 to-saffron px-6 py-8 text-center text-white sm:px-12">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30">
            <Award className="h-9 w-9 text-turmeric" />
          </div>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.22em] text-white/75">{copy.certificateIssuer}</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-4xl">{copy.certificateTitle}</h1>
        </div>

        {status === 'loading' ? (
          <div className="flex min-h-64 items-center justify-center gap-3 p-8 text-sm font-semibold text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand-700" />{copy.certificateVerifying}
          </div>
        ) : certificate ? (
          <div className="relative p-6 text-center sm:p-12">
            <div aria-hidden="true" className="pointer-events-none absolute inset-4 rounded-[1.5rem] border border-dashed border-brand-200 sm:inset-6" />
            <div className="relative">
              <p className="text-sm font-medium text-slate-500">{copy.certificateAwardedTo}</p>
              <h2 className="mt-3 break-words font-display text-3xl font-extrabold text-brand-800 sm:text-5xl">{certificate.learnerName}</h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-slate-600">{copy.certificateCompleted}</p>
              <p className="mt-4 text-xl font-extrabold text-ink sm:text-2xl">{certificate.courseTitle}</p>

              <div className="mx-auto mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-cream p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{copy.completionLessons}</p>
                  <p className="mt-1 text-lg font-extrabold text-ink">{certificate.lessonCount}</p>
                </div>
                <div className="rounded-2xl bg-brand-50 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-brand-700">{copy.completionScore}</p>
                  <p className="mt-1 text-lg font-extrabold text-brand-800">{certificate.quizScore} / {certificate.quizQuestionCount}</p>
                </div>
                <div className="rounded-2xl bg-cream p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">{copy.certificateIssued}</p>
                  <p className="mt-1 text-sm font-bold text-ink">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(certificate.issuedAt))}</p>
                </div>
              </div>

              <div className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800 sm:flex-row sm:justify-center">
                <BadgeCheck className="h-6 w-6 shrink-0" />
                <div className="text-center sm:text-left">
                  <p className="text-sm font-extrabold">{copy.certificateVerified}</p>
                  <p className="mt-0.5 break-all font-mono text-xs">{certificate.certificateCode}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">{copy.certificateVerificationHint}</p>

              <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={printCertificate}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
                >
                  <Printer className="h-4 w-4" />{copy.certificatePrint}
                </button>
                <Link href="/e-learning" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50">
                  <ArrowLeft className="h-4 w-4" />{copy.backToCourses}
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <ShieldCheck className="h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-xl font-extrabold text-ink">{copy.certificateInvalid}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">{status === 'invalid' ? copy.certificateInvalidMessage : copy.certificateVerifyError}</p>
            <Link href="/e-learning" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white print:hidden">
              <ArrowLeft className="h-4 w-4" />{copy.backToCourses}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
