import { CircleCheck } from 'lucide-react';
import { HERO_IMAGE } from '../lib/catalog';
import { EMBLEM_URL } from './SiteHeader';

// Welcome panel (photo with a dark overlay) on the left of the register and login pages
export default function AuthPanel({ title, subtitle, listTitle, items, numbered = false }) {
  return (
    <aside className="relative isolate overflow-hidden px-6 py-10 text-white sm:px-10">
      <img src={HERO_IMAGE} alt="" className="absolute inset-0 -z-20 h-full w-full animate-ken-burns object-cover" />
      <div className="absolute inset-0 -z-10 bg-linear-to-br from-ink/95 via-ink/85 to-brand-700/80" />

      <span className="flex h-16 w-16 animate-fade-up items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-white/20">
        <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="h-11 w-11 object-contain" />
      </span>
      <h1 className="mt-6 animate-fade-up text-3xl font-extrabold tracking-tight [animation-delay:100ms]">{title}</h1>
      <span aria-hidden="true" className="mt-3 block h-1 w-14 animate-fade-up rounded-full bg-turmeric [animation-delay:150ms]" />
      <p className="mt-3 animate-fade-up text-sm leading-relaxed text-white/85 [animation-delay:200ms] sm:text-base">{subtitle}</p>

      <h2 className="font-sans mt-10 text-xs font-bold uppercase tracking-widest text-turmeric">{listTitle}</h2>
      <ul className="mt-4 space-y-3 lg:pb-24">
        {items.map((item, index) => (
          <li
            key={item}
            className="flex animate-fade-up items-start gap-3 rounded-xl bg-white/5 p-2.5 text-sm text-white/90 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/10"
            style={{ animationDelay: `${300 + index * 100}ms` }}
          >
            {numbered ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-turmeric text-[11px] font-bold text-brand-900">
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
