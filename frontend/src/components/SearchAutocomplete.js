'use client';

import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { getSeller } from '../lib/catalog';

// Suggestions are derived from the already-loaded catalog; choosing one only fills the existing search.
export default function SearchAutocomplete({
  id,
  value,
  products = [],
  onChange,
  onSelect,
  placeholder,
  ariaLabel,
  inputClassName = '',
}) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const query = String(value || '').trim().toLocaleLowerCase();

  const candidates = useMemo(() => {
    const candidateMap = new Map();
    products.forEach((product) => {
      const seller = getSeller(product);
      [
        product.title,
        product.category,
        seller.businessName,
        seller.district,
        ...(Array.isArray(product.tags) ? product.tags : []),
      ].forEach((item) => {
        if (typeof item !== 'string' || !item.trim()) return;
        const label = item.trim();
        const key = label.toLocaleLowerCase();
        const entry = candidateMap.get(key) || { label, count: 0 };
        entry.count += 1;
        candidateMap.set(key, entry);
      });
    });

    return [...candidateMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [products]);

  const suggestions = useMemo(() => {
    if (!query) return [];
    const ranked = candidates.map((candidate) => {
      const normalized = candidate.label.toLocaleLowerCase();
      const startsWith = normalized.startsWith(query);
      const startsWord = normalized.split(/[\s,&/-]+/).some((word) => word.startsWith(query));
      return { ...candidate, rank: startsWith ? 0 : startsWord ? 1 : normalized.includes(query) ? 2 : -1 };
    });

    return ranked
      .filter((item) => item.rank >= 0)
      .sort((a, b) => a.rank - b.rank || b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 6);
  }, [candidates, query]);

  const isOpen = focused && suggestions.length > 0;
  const listId = `${id}-suggestions`;
  const optionId = (index) => `${listId}-option-${index}`;

  const choose = (suggestion) => {
    onChange(suggestion.label);
    onSelect?.(suggestion.label);
    setFocused(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocused(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocused(true);
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <input
        id={id}
        type="search"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setFocused(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${inputClassName} search-autocomplete-input`}
      />
      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-[calc(100%+0.7rem)] z-[70] min-w-72 max-w-[calc(100vw-1.5rem)] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 text-ink shadow-2xl shadow-slate-900/15 animate-page-in"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.label} role="presentation">
              <button
                id={optionId(index)}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onPointerDown={(event) => {
                  event.preventDefault();
                  choose(suggestion);
                }}
                onClick={() => choose(suggestion)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${index === activeIndex ? 'bg-brand-50 text-brand-800' : 'text-ink/80 hover:bg-slate-50'}`}
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${index === activeIndex ? 'bg-magenta' : 'bg-ink/25'}`} />
                <span className="min-w-0 flex-1 truncate font-medium">{suggestion.label}</span>
                <ArrowRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${index === activeIndex ? 'translate-x-0.5 text-magenta' : 'text-ink/30'}`} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
