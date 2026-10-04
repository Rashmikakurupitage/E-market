'use client';

import Link from 'next/link';
import { LifeBuoy, ShoppingBag, Store, MessageCircleQuestion, Phone, Printer, Lightbulb, BookOpen, Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../src/lib/i18n';
import { HERO_IMAGE } from '../../src/lib/catalog';

// Hides the site header/footer and on-screen buttons when the manual is printed or saved as PDF
const PRINT_STYLES = `@media print {
  header.sticky, footer#contact { display: none !important; }
  body { background: #fff !important; }
}`;

// Turns "Click {register}" into "Click <b>Register</b>", using the label the site actually shows
function WithLabels({ text, labels }) {
  return text.split(/(\{\w+\})/).map((part, index) => {
    const key = part.match(/^\{(\w+)\}$/)?.[1];
    if (key && labels[key]) {
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {labels[key]}
        </strong>
      );
    }
    return part;
  });
}

function QuickLink({ href, icon: Icon, title, text }) {
  const isPageLink = href.startsWith('/');
  const className =
    'group flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200';
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-brand-800">
          {title}
          <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
        <span className="mt-1 block text-sm text-slate-500">{text}</span>
      </span>
    </>
  );
  return isPageLink ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <a href={href} className={className}>
      {content}
    </a>
  );
}

function Guide({ id, icon: Icon, title, chapters, labels, tipLabel }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32">
      <h2 id={`${id}-title`} className="flex items-center gap-3 text-xl font-extrabold text-slate-900 sm:text-2xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white print:hidden">
          <Icon className="h-5 w-5" />
        </span>
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {chapters.map((chapter, index) => (
          <article
            key={chapter.title}
            id={`${id}-${index + 1}`}
            className="scroll-mt-32 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 print:break-inside-avoid print:shadow-none"
          >
            <h3 className="flex items-start gap-3 text-base font-bold text-slate-900 sm:text-lg">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-extrabold text-brand-700 ring-1 ring-brand-100">
                {index + 1}
              </span>
              <span className="pt-0.5">{chapter.title}</span>
            </h3>

            <ol className="mt-4 space-y-3 sm:pl-10">
              {chapter.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                    {stepIndex + 1}
                  </span>
                  <span>
                    <WithLabels text={step} labels={labels} />
                  </span>
                </li>
              ))}
            </ol>

            {chapter.tip && (
              <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-amber-200 sm:ml-10">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  <strong className="font-bold">{tipLabel}: </strong>
                  <WithLabels text={chapter.tip} labels={labels} />
                </span>
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Support() {
  const { t } = useLanguage();
  const s = t.support;

  // Button and section names exactly as the site shows them, in the chosen language
  const labels = {
    productsTitle: t.productsTitle,
    search: t.searchBtn,
    all: t.allCategories,
    priceOnRequest: t.priceOnRequest,
    verified: t.verifiedSeller,
    order: t.orderWhatsapp,
    noWhatsapp: t.whatsappUnavailable,
    register: t.registerBtn,
    login: t.login,
    logout: t.logout,
    myAccount: t.myAccount,
    seller: t.customer.seller,
    customer: t.customer.customer,
    customerSubmit: t.customer.submit,
    browse: t.customer.browse,
    sellerSubmit: t.register.submit,
    personal: t.register.sectionPersonal,
    business: t.register.sectionBusiness,
    contact: t.register.sectionContact,
    sameAsPhone: t.register.sameAsPhone,
    sendCode: t.loginPage.sendCode,
    verify: t.loginPage.verify,
    resend: t.loginPage.resend,
    pending: t.dash.status.PENDING,
    approved: t.dash.status.APPROVED,
    rejected: t.dash.status.REJECTED,
    addProduct: t.dash.addProduct,
    myProducts: t.dash.myProducts,
    remove: t.dash.remove,
    removeConfirm: t.dash.removeConfirm,
    statProducts: t.dash.statProducts,
    statClicks: t.dash.statClicks,
    statWeek: t.dash.statWeek,
    fName: t.dash.form.name,
    fPrice: t.dash.form.price,
    fCategory: t.dash.form.category,
    fImage: t.dash.form.imageUrl,
    fDescription: t.dash.form.description,
    save: t.dash.form.save,
    elearn: t.navElearn,
    contactTitle: t.contactEdit.title,
    change: t.contactEdit.change,
    emailSendCode: t.contactEdit.sendCode,
    emailConfirm: t.contactEdit.confirm,
    contactSave: t.contactEdit.save,
  };

  const guides = [
    { id: 'customer-guide', icon: ShoppingBag, title: s.customerGuide, chapters: s.customer },
    { id: 'seller-guide', icon: Store, title: s.sellerGuide, chapters: s.seller },
  ];

  return (
    <main className="flex-1 bg-slate-100 print:bg-white">
      <style>{PRINT_STYLES}</style>

      {/* Title */}
      <section className="relative isolate overflow-hidden px-4 py-12 text-white sm:py-16 print:hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-b from-brand-800/95 via-brand-800/90 to-brand-900/95" />
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <LifeBuoy className="h-7 w-7 text-amber-300" />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{s.title}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">{s.subtitle}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 print:max-w-none print:p-0">
        {/* Quick links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <QuickLink href="#customer-guide" icon={ShoppingBag} title={s.customerGuide} text={s.customerText} />
          <QuickLink href="#seller-guide" icon={Store} title={s.sellerGuide} text={s.sellerText} />
          <QuickLink href="/faq" icon={MessageCircleQuestion} title={s.faqTitle} text={s.faqText} />
          <QuickLink href="#contact" icon={Phone} title={s.contactTitle} text={s.contactText} />
        </div>

        {/* User manual */}
        <div className="mt-12 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between print:mt-0">
          <div>
            <h2 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              <BookOpen className="h-7 w-7 text-brand-600" />
              {s.manualTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{s.manualSub}</p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-600 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 print:hidden"
          >
            <Printer className="h-4 w-4" />
            {s.print}
          </button>
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
          {/* Contents (large screens) */}
          <nav aria-label={s.contents} className="hidden lg:block print:hidden">
            <div className="sticky top-32 space-y-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.contents}</p>
              {guides.map((guide) => (
                <div key={guide.id}>
                  <a href={`#${guide.id}`} className="text-sm font-bold text-slate-900 hover:text-brand-700">
                    {guide.title}
                  </a>
                  <ol className="mt-2 space-y-1.5 border-l border-slate-200">
                    {guide.chapters.map((chapter, index) => (
                      <li key={chapter.title}>
                        <a
                          href={`#${guide.id}-${index + 1}`}
                          className="-ml-px block border-l-2 border-transparent py-0.5 pl-3 text-sm text-slate-500 hover:border-brand-600 hover:text-brand-700"
                        >
                          {chapter.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </nav>

          <div className="space-y-14">
            {guides.map((guide) => (
              <Guide key={guide.id} {...guide} labels={labels} tipLabel={s.tip} />
            ))}
          </div>
        </div>

        {/* Still need help */}
        <section className="mt-14 flex flex-col items-center gap-5 rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:flex-row sm:p-8 sm:text-left print:hidden">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
            <LifeBuoy className="h-7 w-7 text-amber-600" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900">{s.helpTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{s.helpText}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-600 px-5 py-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
            >
              <MessageCircleQuestion className="h-4 w-4" />
              {s.faqBtn}
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-700"
            >
              <Mail className="h-4 w-4" />
              {s.contactBtn}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
