'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Phone, Mail, ArrowRight } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { EMBLEM_URL } from './SiteHeader';
import Reveal from './Reveal';

const CONTACT = {
  address: 'Ministry of Women, Child Affairs and Social Empowerment, 3rd floor, Stage 2, Sethsiripaya, Battaramulla',
  phone: '+94 11 346 3096',
  email: 'mwca.itunit@gmail.com',
  // What Google Maps searches for (the pin and the map in the footer)
  mapQuery: 'Sethsiripaya Stage II, Battaramulla, Sri Lanka',
  // Paste the Ministry's page links here and the matching round icon appears under the contact details
  social: { facebook: '', twitter: '', linkedin: '' },
};

const SOCIAL_ICONS = {
  facebook: { label: 'Facebook', path: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z' },
  twitter: { label: 'X (Twitter)', path: 'M18.9 2H22l-7.3 8.35L23 22h-6.7l-5.25-6.86L5 22H1.9l7.8-8.9L1.5 2h6.85l4.75 6.27L18.9 2zm-1.17 18h1.84L7.37 3.9H5.4L17.73 20z' },
  linkedin: { label: 'LinkedIn', path: 'M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z' },
};

export default function SiteFooter() {
  const { t } = useLanguage();
  const [showMap, setShowMap] = useState(false);
  // On the home page the footer slides 48px up over the end of the white section, so its rounded corners show white
  const edge = usePathname() === '/' ? '-mt-12' : 'mt-auto';

  const usefulLinks = [
    { href: '/about', label: t.navAbout },
    { href: '/privacy', label: t.privacy },
    { href: '/terms', label: t.terms },
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
            <Link href="/about" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-turmeric transition-colors hover:text-white hover:underline">
              <span>{t.navAbout}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-white">{t.contact}</h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron/20 ring-1 ring-white/10"><MapPin className="h-4 w-4 text-saffron" /></span>
              <address className="pt-1 not-italic leading-relaxed">
                <button
                  type="button"
                  onClick={() => setShowMap((open) => !open)}
                  aria-expanded={showMap}
                  aria-controls="footer-map"
                  title="Show on map"
                  className="text-left underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-turmeric"
                >
                  {CONTACT.address}
                </button>
              </address>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-magenta/25 ring-1 ring-white/10"><Phone className="h-4 w-4 text-brand-300" /></span>
              <a href={`tel:${CONTACT.phone.replace(/[^\d+]/g, '')}`} className="transition-colors hover:text-white">
                {CONTACT.phone}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf/25 ring-1 ring-white/10"><Mail className="h-4 w-4 text-[#8fd18f]" /></span>
              <a href={`mailto:${CONTACT.email}`} className="transition-colors hover:text-white">
                {CONTACT.email}
              </a>
            </li>
          </ul>

          {/* Map of the Ministry's office: only shown after the address is clicked */}
          {showMap && (
            <div id="footer-map" className="mt-5 animate-fade-up overflow-hidden rounded-2xl ring-1 ring-white/15">
              <iframe
                title="Map: Ministry of Women, Child Affairs and Social Empowerment, Sethsiripaya, Battaramulla"
                src={`https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&hl=en&z=16&output=embed`}
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-52 w-full border-0"
              />
              <div className="flex items-center justify-between gap-3 bg-white/5 px-3 py-2 text-xs">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapQuery)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-turmeric hover:underline"
                >
                  Open in Google Maps
                </a>
                <button type="button" onClick={() => setShowMap(false)} className="font-semibold text-white/70 hover:text-white">
                  Close map
                </button>
              </div>
            </div>
          )}

          {Object.values(CONTACT.social).some(Boolean) && (
            <ul className="mt-5 flex gap-3">
              {Object.entries(CONTACT.social).map(([key, url]) =>
                url ? (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_ICONS[key].label}
                      className="flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-white/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
                        <path d={SOCIAL_ICONS[key].path} />
                      </svg>
                    </a>
                  </li>
                ) : null
              )}
            </ul>
          )}
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
