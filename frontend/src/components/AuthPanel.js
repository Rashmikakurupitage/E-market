import { CircleCheck } from 'lucide-react';
import { HERO_IMAGE } from '../lib/catalog';
import { EMBLEM_URL } from './SiteHeader';

// Green welcome panel on the left of the register and login pages
export default function AuthPanel({ title, subtitle, listTitle, items, numbered = false }) {
  return (
    <aside className="relative isolate overflow-hidden px-6 py-10 text-white sm:px-10">
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-brand-800/95 via-brand-800/90 to-brand-900/95" />

      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg">
        <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="h-11 w-11 object-contain" />
      </span>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">{subtitle}</p>

      <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-amber-300">{listTitle}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={item} className="flex items-start gap-3 text-sm text-white/90">
            {numbered ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-300 text-[11px] font-bold text-brand-900">
                {index + 1}
              </span>
            ) : (
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
