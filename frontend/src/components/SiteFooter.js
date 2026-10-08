'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Printer, Mail } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { EMBLEM_URL } from './SiteHeader';
import Reveal from './Reveal';

// TODO: replace with the official contact details before going live
const CONTACT = {
  phone: '+94 11 XXX XXXX',
  fax: '+94 11 XXX XXXX',
  email: 'info@example.lk',
};

export default function SiteFooter() {
  const { t } = useLanguage();
  // On the home page the footer slides 48px up over the end of the white section, so its rounded corners show white
  const edge = usePathname() === '/' ? '-mt-12' : 'mt-auto';

  const usefulLinks = [
    { href: '#', label: t.privacy },
    { href: '#', label: t.terms },
    { href: '/register', label: t.sellerRegistration },
    { href: '/e-learning', label: t.navElearn },
    { href: '/faq', label: t.navFaq },
    { href: '/support', label: t.navSupport },
  ];

  return (
    <footer id="contact" className={`relative isolate overflow-hidden rounded-t-[48px] bg-ink text-white/70 ${edge}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 -z-10 h-80 w-80 rounded-full bg-magenta/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-16 -z-10 h-72 w-72 rounded-full bg-saffron/20 blur-3xl" />

      <Reveal className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr]">
        {/* About */}
        <div id="about" className="flex gap-4">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white shadow-lg shadow-black/20 ring-4 ring-white/10">
            <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="h-14 w-14 object-contain" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-turmeric">Sri Lanka</p>
            <p className="mt-0.5 text-base font-bold leading-snug text-white">{t.ministry}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/60">{t.footerAbout}</p>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-white">{t.contact}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-magenta/25 ring-1 ring-white/10"><Phone className="h-4 w-4 text-brand-300" /></span>
              <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`} className="transition-colors hover:text-white">
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saffron/20 ring-1 ring-white/10"><Printer className="h-4 w-4 text-saffron" /></span>
              <span>{CONTACT.fax}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf/25 ring-1 ring-white/10"><Mail className="h-4 w-4 text-[#8fd18f]" /></span>
              <a href={`mailto:${CONTACT.email}`} className="transition-colors hover:text-white">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-white">{t.usefulLinks}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {usefulLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="group inline-flex items-center gap-2 transition-colors hover:text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-300 transition-transform duration-300 group-hover:scale-150 group-hover:bg-turmeric" />
                  <span className="transition-transform duration-300 group-hover:translate-x-1">{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div aria-hidden="true" className="h-1 rounded-full bg-linear-to-r from-magenta via-saffron to-turmeric" />
        <p className="py-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} {t.footerRights}
        </p>
      </div>
    </footer>
  );
}
