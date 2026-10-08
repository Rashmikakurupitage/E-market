import { useId } from 'react';

// Decorative artwork drawn in code (no image downloads). Everything here is hidden from screen readers.

const PETAL = 'M120 140 C 97 104, 99 58, 120 20 C 141 58, 143 104, 120 140 Z';

// In the logo colours: magenta on light backgrounds ("green" is the older name for it), white on dark ones
const LOTUS_COLORS = {
  green: { tip: '#fadce8', base: '#c8336f' },
  white: { tip: '#ffffff', base: '#f3b8d0' },
};

// A water lily on its leaf
export function Lotus({ className = '', color = 'green' }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const { tip, base } = LOTUS_COLORS[color] || LOTUS_COLORS.green;

  return (
    <svg viewBox="0 0 240 160" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={`${id}-petal`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={base} />
          <stop offset="1" stopColor={tip} />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3d7c40" />
          <stop offset="0.5" stopColor="#4f9a52" />
          <stop offset="1" stopColor="#3d7c40" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="146" rx="100" ry="12" fill={`url(#${id}-leaf)`} />
      {[-64, 64].map((angle) => (
        <path key={angle} d={PETAL} transform={`rotate(${angle} 120 140)`} fill={`url(#${id}-petal)`} opacity="0.45" />
      ))}
      {[-40, 40].map((angle) => (
        <path key={angle} d={PETAL} transform={`rotate(${angle} 120 140)`} fill={`url(#${id}-petal)`} opacity="0.65" />
      ))}
      {[-18, 18].map((angle) => (
        <path key={angle} d={PETAL} transform={`rotate(${angle} 120 140)`} fill={`url(#${id}-petal)`} opacity="0.85" />
      ))}
      <path d={PETAL} fill={`url(#${id}-petal)`} />
      <circle cx="120" cy="126" r="6" fill="#f4b93e" />
    </svg>
  );
}

// A four-point sparkle. It takes the text colour, e.g. `text-turmeric`.
export function Sparkle({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={className}>
      <path fill="currentColor" d="M12 0 Q13.5 10.5 24 12 Q13.5 13.5 12 24 Q10.5 13.5 0 12 Q10.5 10.5 12 0Z" />
    </svg>
  );
}

// A small square grid of dots. It takes the text colour.
export function DotGrid({ className = '', rows = 5, cols = 5 }) {
  return (
    <svg viewBox={`0 0 ${cols * 16} ${rows * 16}`} aria-hidden="true" focusable="false" className={className}>
      {Array.from({ length: rows * cols }, (_, i) => (
        <circle key={i} cx={(i % cols) * 16 + 8} cy={Math.floor(i / cols) * 16 + 8} r="2.2" fill="currentColor" />
      ))}
    </svg>
  );
}

// A hand-drawn wavy underline in the logo gradient. It draws itself when its <Reveal> scrolls into view,
// or straight away inside an element with the `draw-now` class (see .draw-path in globals.css).
export function Squiggle({ className = '' }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="0 0 200 16" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#c8336f" />
          <stop offset="0.55" stopColor="#ee7d2b" />
          <stop offset="1" stopColor="#f4b93e" />
        </linearGradient>
      </defs>
      <path
        className="draw-path"
        pathLength="1"
        d="M3 10 C 28 2, 50 14, 75 7 S 122 3, 146 9 S 185 12, 197 5"
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Soft background art for whole pages: two slowly morphing colour blobs, dot grids, a turning dashed ring
// and twinkling sparkles. Put it as the first child of a `relative isolate` element; it stays behind the content.
export function PageArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden print:hidden">
      <div className="absolute -left-24 top-16 h-72 w-72 animate-morph bg-magenta/15 blur-2xl" />
      <div className="absolute -right-20 bottom-10 h-80 w-80 animate-morph bg-saffron/15 blur-2xl [animation-delay:-7s]" />
      <DotGrid className="absolute bottom-24 left-6 hidden w-28 text-magenta/25 lg:block" />
      <DotGrid className="absolute right-8 top-10 hidden w-24 text-saffron/35 lg:block" rows={4} cols={6} />
      <div className="absolute right-[6%] top-1/3 hidden h-28 w-28 animate-spin-slow rounded-full border-2 border-dashed border-magenta/25 lg:block" />
      <Sparkle className="absolute left-[4%] top-1/3 hidden h-6 w-6 animate-twinkle text-turmeric lg:block" />
      <Sparkle className="absolute bottom-[18%] right-[4%] hidden h-4 w-4 animate-twinkle text-magenta/70 [animation-delay:-1.5s] lg:block" />
    </div>
  );
}
