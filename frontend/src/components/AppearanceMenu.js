'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { ACCENTS, PATTERNS, setAppearance, useAccent, usePattern } from '../lib/appearance';

const TEXT = {
  en: { button: 'Colours and patterns', colours: 'Colour theme', patterns: 'Background pattern', accents: { lotus: 'Lotus', ocean: 'Ocean', forest: 'Forest', royal: 'Royal', slate: 'Slate' }, pats: { none: 'Plain', dots: 'Dots', lattice: 'Lattice', waves: 'Waves' } },
  si: { button: 'වර්ණ සහ රටා', colours: 'වර්ණ තේමාව', patterns: 'පසුබිම් රටාව', accents: { lotus: 'නෙළුම්', ocean: 'සාගර', forest: 'වන', royal: 'රාජකීය', slate: 'අළු' }, pats: { none: 'සරල', dots: 'තිත්', lattice: 'දැල', waves: 'රැළි' } },
  ta: { button: 'நிறங்களும் வடிவங்களும்', colours: 'நிறத் தீம்', patterns: 'பின்னணி வடிவம்', accents: { lotus: 'தாமரை', ocean: 'கடல்', forest: 'காடு', royal: 'அரச', slate: 'சாம்பல்' }, pats: { none: 'சாதாரண', dots: 'புள்ளிகள்', lattice: 'கண்ணி', waves: 'அலைகள்' } },
};

function Choices({ s }) {
  const accent = useAccent();
  const pattern = usePattern();
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">{s.colours}</p>
        <div role="radiogroup" aria-label={s.colours} className="grid grid-cols-5 gap-1.5">
          {ACCENTS.map(({ value, swatch, swatch2 }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={accent === value}
              onClick={() => setAppearance('accent', value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-[11px] font-semibold ring-1 transition-colors ${accent === value ? 'bg-ink/5 text-ink ring-ink/30' : 'text-ink/60 ring-ink/10 hover:bg-ink/5'}`}
            >
              <span className="relative block h-9 w-9 overflow-hidden rounded-full ring-2 ring-white" style={{ background: `linear-gradient(135deg, ${swatch} 50%, ${swatch2} 50%)` }}>
                {accent === value && <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />}
              </span>
              {s.accents[value]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink/50">{s.patterns}</p>
        <div role="radiogroup" aria-label={s.patterns} className="grid grid-cols-4 gap-2">
          {PATTERNS.map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={pattern === value}
              onClick={() => setAppearance('pattern', value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-[11px] font-semibold ring-1 transition-colors ${pattern === value ? 'bg-ink/5 text-ink ring-ink/30' : 'text-ink/60 ring-ink/10 hover:bg-ink/5'}`}
            >
              <span data-pattern-preview={value} className="pattern-preview block h-9 w-full rounded-lg bg-cream ring-1 ring-ink/10" />
              {s.pats[value]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// The palette button. In headers it opens a small panel; with `inline` the choices are shown in place (sidebars).
export default function AppearanceMenu({ inline = false, className = '' }) {
  const { lang } = useLanguage();
  const s = TEXT[lang] || TEXT.en;
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : box.current && !box.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (inline) return <div className={className}><Choices s={s} /></div>;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={s.button}
        title={s.button}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-ink/10 transition-all duration-200 hover:bg-white hover:text-magenta ${className}`}
      >
        <Palette className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div role="dialog" aria-label={s.button} className="fixed inset-x-4 top-24 z-[70] mx-auto w-auto max-w-sm rounded-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white p-4 text-ink shadow-2xl ring-1 ring-ink/10">
          <Choices s={s} />
        </div>
      )}
    </div>
  );
}
