'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { inputClass } from './form';

export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  hasError = false,
  placeholder,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        aria-invalid={hasError}
        className={`${inputClass(hasError)} pr-12`}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-ink/55 transition hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-brand-600"
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}
