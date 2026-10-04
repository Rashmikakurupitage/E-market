'use client';

import Link from 'next/link';
import { Phone, Printer, Mail } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { EMBLEM_URL } from './SiteHeader';

// TODO: replace with the official contact details before going live
const CONTACT = {
  phone: '+94 11 XXX XXXX',
  fax: '+94 11 XXX XXXX',
  email: 'info@example.lk',
};

export default function SiteFooter() {
  const { t } = useLanguage();

  const usefulLinks = [
    { href: '#', label: t.privacy },
    { href: '#', label: t.terms },
    { href: '/register', label: t.sellerRegistration },
    { href: '/e-learning', label: t.navElearn },
    { href: '/faq', label: t.navFaq },
    { href: '/support', label: t.navSupport },
  ];

  return (
    <footer id="contact" className="mt-auto bg-slate-800 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
        {/* About */}
        <div id="about" className="flex gap-4">
          <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="h-16 w-16 shrink-0 object-contain" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sri Lanka</p>
            <p className="mt-0.5 text-base font-bold leading-snug text-white">{t.ministry}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">{t.footerAbout}</p>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{t.contact}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-brand-300" />
              <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white">
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Printer className="h-4 w-4 text-brand-300" />
              <span>{CONTACT.fax}</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-brand-300" />
              <a href={`mailto:${CONTACT.email}`} className="hover:text-white">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>

        {/* Links */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">{t.usefulLinks}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {usefulLinks.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-700 bg-slate-900">
        <p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {t.footerRights}
        </p>
      </div>
    </footer>
  );
}
