'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LifeBuoy, ShoppingBag, Store, MessageCircleQuestion, Phone, Printer, Lightbulb, BookOpen, Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../src/lib/i18n';
import { HERO_IMAGE } from '../../src/lib/catalog';
import Reveal from '../../src/components/Reveal';
import { PageArt } from '../../src/components/Art';

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

const TONES = {
  blue: { tile: 'from-brand-500 to-brand-700 shadow-brand-600/25', badge: 'bg-brand-50 text-brand-700 ring-brand-100', ring: 'ring-brand-200' },
  green: { tile: 'from-brand-500 to-brand-700 shadow-brand-600/25', badge: 'bg-brand-50 text-brand-700 ring-brand-100', ring: 'ring-brand-200' },
  amber: { tile: 'from-brand-500 to-brand-700 shadow-brand-600/25', badge: 'bg-brand-50 text-brand-700 ring-brand-100', ring: 'ring-brand-200' },
  pink: { tile: 'from-brand-500 to-brand-700 shadow-brand-600/25', badge: 'bg-brand-50 text-brand-700 ring-brand-100', ring: 'ring-brand-200' },
};

// The chapter crossing the middle of the screen, so the contents menu can highlight it
function useActiveChapter(content) {
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const chapters = document.querySelectorAll('[data-chapter]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-35% 0px -55% 0px' }
    );
    chapters.forEach((chapter) => observer.observe(chapter));
    return () => observer.disconnect();
  }, [content]); // the chapters are re-created when the language changes

  return activeId;
}

function QuickLink({ href, icon: Icon, title, text, tone = 'green' }) {
  const isPageLink = href.startsWith('/');
  const className =
    'group flex items-start gap-4 rounded-[28px] bg-white p-5 shadow-lg shadow-ink/5 ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-brand-200';
  const content = (
    <>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 ${TONES[tone].tile}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-bold text-slate-900 transition-colors group-hover:text-brand-800">
          {title}
          <ArrowRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
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

function Guide({ id, icon: Icon, title, chapters, labels, tipLabel, tone = 'green', activeId }) {
  const colors = TONES[tone];
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-32">
      <Reveal as="h2" animation="fade-right" id={`${id}-title`} className="group flex items-center gap-3 text-xl font-extrabold text-slate-900 sm:text-2xl">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-lg transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 print:hidden ${colors.tile}`}>
          <Icon className="h-5 w-5" />
        </span>
        {title}
      </Reveal>

      <div className="mt-5 space-y-4">
        {chapters.map((chapter, index) => {
          const chapterId = `${id}-${index + 1}`;
          const active = activeId === chapterId;
          return (
            <Reveal key={chapter.title} className="grid">
              <article
                id={chapterId}
                data-chapter
                className={`group relative scroll-mt-32 overflow-hidden rounded-[28px] bg-white p-5 transition-all duration-500 hover:-translate-y-0.5 hover:shadow-lg sm:p-6 print:break-inside-avoid print:shadow-none ${
                  active ? `shadow-md ring-2 ${colors.ring}` : 'shadow-sm ring-1 ring-ink/5'
                }`}
              >
                {/* Coloured bar that grows down the side on hover, and stays on the chapter being read */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 w-1 origin-top bg-linear-to-b transition-transform duration-500 print:hidden ${colors.tile} ${
                    active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100'
                  }`}
                />

                <h3 className="flex items-start gap-3 text-base font-bold text-slate-900 sm:text-lg">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ring-1 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 ${colors.badge}`}>
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{chapter.title}</span>
                </h3>

                <ol className="mt-4 space-y-3 sm:pl-10">
                  {chapter.steps.map((step, stepIndex) => (
                    <Reveal
                      as="li"
                      key={stepIndex}
                      animation="fade-left"
                      delay={stepIndex * 90}
                      className="flex items-start gap-3 text-sm leading-relaxed text-slate-600"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sand/60 text-[11px] font-bold text-slate-500 transition-colors duration-300 group-hover:bg-amber-100 group-hover:text-amber-800">
                        {stepIndex + 1}
                      </span>
                      <span>
                        <WithLabels text={step} labels={labels} />
                      </span>
                    </Reveal>
                  ))}
                </ol>

                {chapter.tip && (
                  <Reveal
                    as="p"
                    animation="zoom-in"
                    delay={chapter.steps.length * 90 + 100}
                    className="group/tip mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-amber-200 sm:ml-10"
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 transition-transform duration-300 group-hover/tip:-rotate-12 group-hover/tip:scale-125" />
                    <span>
                      <strong className="font-bold">{tipLabel}: </strong>
                      <WithLabels text={chapter.tip} labels={labels} />
                    </span>
                  </Reveal>
                )}
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export default function Support() {
  const { t } = useLanguage();
  const s = t.support;
  const activeId = useActiveChapter(s);

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
    { id: 'customer-guide', icon: ShoppingBag, title: s.customerGuide, chapters: s.customer, tone: 'blue' },
    { id: 'seller-guide', icon: Store, title: s.sellerGuide, chapters: s.seller, tone: 'green' },
  ];

  const quickLinks = [
    { href: '#customer-guide', icon: ShoppingBag, title: s.customerGuide, text: s.customerText, tone: 'blue' },
    { href: '#seller-guide', icon: Store, title: s.sellerGuide, text: s.sellerText, tone: 'green' },
    { href: '/faq', icon: MessageCircleQuestion, title: s.faqTitle, text: s.faqText, tone: 'amber' },
    { href: '#contact', icon: Phone, title: s.contactTitle, text: s.contactText, tone: 'pink' },
  ];

  return (
    <main className="relative isolate flex-1 print:bg-white">
      <PageArt />
      <style>{PRINT_STYLES}</style>

      {/* Title */}
      <section className="relative isolate mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-7xl rounded-[40px] sm:mt-6 sm:w-[calc(100%-3rem)] overflow-hidden px-4 pb-28 pt-12 text-white sm:pb-36 sm:pt-16 print:hidden">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-20 h-full w-full animate-ken-burns object-cover" />
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-ink/95 via-ink/85 to-brand-700/80" />
        <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-6 -z-10 h-64 w-64 animate-float rounded-full bg-turmeric/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 bottom-10 -z-10 h-72 w-72 animate-float rounded-full bg-brand-300/20 blur-3xl [animation-delay:-4s]" />

        <div className="mx-auto max-w-3xl text-center">
          <span className="relative mx-auto flex h-16 w-16 animate-zoom-in items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-turmeric/25" />
            <LifeBuoy className="relative h-8 w-8 text-turmeric" />
          </span>
          <h1 className="mt-5 animate-fade-up text-3xl font-extrabold tracking-tight [animation-delay:120ms] sm:text-4xl">{s.title}</h1>
          <span aria-hidden="true" className="mx-auto mt-4 block h-1 w-20 origin-center animate-grow-x rounded-full bg-turmeric [animation-delay:250ms]" />
          <p className="mx-auto mt-4 max-w-xl animate-fade-up text-sm text-white/85 [animation-delay:350ms] sm:text-base">{s.subtitle}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-10 print:max-w-none print:p-0">
        {/* Quick links, rising over the edge of the banner */}
        <div className="relative z-10 -mt-20 grid gap-4 sm:-mt-24 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          {quickLinks.map((link, index) => (
            <Reveal key={link.href} animation="zoom-in" delay={300 + index * 100} className="grid">
              <QuickLink {...link} />
            </Reveal>
          ))}
        </div>

        {/* User manual */}
        <div className="mt-14 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between print:mt-0">
          <Reveal animation="fade-right">
            <h2 className="group flex items-center gap-2.5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
              <BookOpen className="h-7 w-7 text-brand-600 transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
              {s.manualTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{s.manualSub}</p>
          </Reveal>
          <Reveal animation="fade-left" delay={150} className="print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-600 bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md active:translate-y-0"
            >
              <Printer className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              {s.print}
            </button>
          </Reveal>
        </div>

        <div className="mt-8 lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
          {/* Contents (large screens), highlighting the chapter being read */}
          <Reveal as="nav" animation="fade-right" aria-label={s.contents} className="hidden lg:block print:hidden">
            <div className="sticky top-32 space-y-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{s.contents}</p>
              {guides.map((guide) => {
                const guideActive = activeId.startsWith(`${guide.id}-`);
                return (
                  <div key={guide.id}>
                    <a
                      href={`#${guide.id}`}
                      className={`text-sm font-bold transition-colors hover:text-brand-700 ${guideActive ? 'text-brand-700' : 'text-slate-900'}`}
                    >
                      {guide.title}
                    </a>
                    <ol className="mt-2 space-y-1 border-l border-slate-200">
                      {guide.chapters.map((chapter, index) => {
                        const chapterId = `${guide.id}-${index + 1}`;
                        const active = activeId === chapterId;
                        return (
                          <li key={chapter.title}>
                            <a
                              href={`#${chapterId}`}
                              aria-current={active ? 'true' : undefined}
                              className={`-ml-px block border-l-2 py-1 pl-3 text-sm transition-all duration-300 ${
                                active
                                  ? 'translate-x-1 border-brand-600 font-semibold text-brand-700'
                                  : 'border-transparent text-slate-500 hover:translate-x-1 hover:border-brand-300 hover:text-brand-700'
                              }`}
                            >
                              {chapter.title}
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          </Reveal>

          <div className="space-y-14">
            {guides.map((guide) => (
              <Guide key={guide.id} {...guide} labels={labels} tipLabel={s.tip} activeId={activeId} />
            ))}
          </div>
        </div>

        {/* Still need help */}
        <Reveal as="section" animation="zoom-in" className="mt-14 flex flex-col items-center gap-5 rounded-[28px] bg-white p-6 text-center shadow-sm ring-1 ring-ink/5 sm:flex-row sm:p-8 sm:text-left print:hidden">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
            <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-turmeric/30" />
            <LifeBuoy className="relative h-7 w-7 text-amber-600" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold text-slate-900">{s.helpTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{s.helpText}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <Link
              href="/faq"
              className="group inline-flex items-center gap-2 rounded-xl border border-brand-600 px-5 py-3 text-sm font-bold text-brand-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-md"
            >
              <MessageCircleQuestion className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              {s.faqBtn}
            </Link>
            <a
              href="#contact"
              className="group inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg"
            >
              <Mail className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
              {s.contactBtn}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
