import { ShieldCheck } from 'lucide-react';
import { EMBLEM_URL } from './SiteHeader';
import { PageArt } from './Art';

// Dark card used by the admin login and admin registration pages
export default function AdminAuthCard({ title, subtitle, children }) {
  return (
    <main className="relative isolate flex flex-1 items-center justify-center px-4 py-14">
      <PageArt />
      <div className="w-full max-w-md animate-zoom-in overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5">
        <div className="relative isolate overflow-hidden bg-linear-to-br from-ink via-brand-800 to-brand-700 px-8 py-7 text-center text-white">
          <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 -z-10 h-40 w-40 animate-float rounded-full bg-brand-500/25 blur-2xl" />
          <span className="mx-auto flex h-14 w-14 animate-fade-up items-center justify-center rounded-full bg-white ring-4 ring-white/15">
            <img src={EMBLEM_URL} alt="State Emblem of Sri Lanka" className="h-10 w-10 object-contain" />
          </span>
          <h1 className="mt-4 flex items-center justify-center gap-2 text-2xl font-extrabold">
            <ShieldCheck className="h-6 w-6 text-brand-300" />
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        </div>
        <div className="px-8 py-8">{children}</div>
      </div>
    </main>
  );
}
