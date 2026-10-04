import { ShieldCheck } from 'lucide-react';
import { EMBLEM_URL } from './SiteHeader';

// Dark card used by the admin login and admin registration pages
export default function AdminAuthCard({ title, subtitle, children }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-100 px-4 py-14">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="bg-slate-800 px-8 py-7 text-center text-white">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white">
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
