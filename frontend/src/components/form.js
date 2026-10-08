// Shared form pieces for the register, login and dashboard pages

export const inputClass = (hasError) =>
  `w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm text-ink placeholder:text-ink/40 transition focus:bg-white focus:outline-none focus:ring-4 disabled:bg-cream disabled:text-ink/50 ${
    hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
      : 'border-ink/10 focus:border-ink/30 focus:ring-turmeric/30'
  }`;

export function Field({ id, label, required, hint, error, className = '', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink/55">{hint}</p>
      ) : null}
    </div>
  );
}

export const primaryButtonClass =
  'btn-shine flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition-colors hover:bg-magenta disabled:cursor-not-allowed disabled:opacity-60';
