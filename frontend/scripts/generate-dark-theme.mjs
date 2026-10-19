// Builds app/dark-theme.css: the dark-mode colours for every colour class the site uses.
//   node scripts/generate-dark-theme.mjs
// Run it again after you add new colour classes (bg-white, text-slate-700, ...) so they get a dark version too.
// The dark theme is switched on by <html data-theme="dark"> (see src/lib/theme.js).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIRS = ['app', 'src'];

// ---------- the colours of the dark theme ----------
const SURFACE = [24, 21, 32]; // cards, menus, dialogs
const PANEL = [33, 28, 42]; // panels inside cards (light "cream" in the light theme)
const SAND = [43, 37, 53]; // chips, tracks, hovers (light "sand" in the light theme)
const INK_SURFACE = '#3a3150'; // elements that are dark in the light theme (buttons, banners)
const TEXT = [246, 242, 250];

const rgba = ([r, g, b], a = 1) => (a >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${Math.round(a * 100) / 100})`);

const SLATE_TEXT = { 950: '#f8fafc', 900: '#f1f5f9', 800: '#e2e8f0', 700: '#cbd5e1', 600: '#b4bfd0', 500: '#94a3b8' };
const SLATE_BG = { 50: '#1b1826', 100: '#221e2f', 200: '#2c2739', 300: '#3a3449', 800: '#2b2640', 900: '#241f35', 950: '#1c1829' };
const SLATE_LINE = { 100: 0.08, 200: 0.12, 300: 0.18, 400: 0.25 };
const TINT = { red: [239, 68, 68], amber: [245, 158, 11], rose: [244, 63, 94], brand: [200, 51, 111] };
const TINT_TEXT = { red: '#fca5a5', amber: '#fcd34d', rose: '#fda4af', brand: 'var(--color-brand-100)' };

function darkValue(prefix, color, shade, alpha) {
  const a = alpha === undefined ? 1 : alpha / 100;
  const isBg = prefix === 'bg';
  const isText = prefix === 'text';
  const isLine = ['border', 'ring', 'divide', 'outline'].includes(prefix);
  const isStop = ['from', 'via', 'to'].includes(prefix);

  if (color === 'white') {
    if (isBg || isStop) return a <= 0.3 ? null : rgba(SURFACE, a); // low alpha = a light overlay on a dark panel: keep
    if (isLine) return a >= 0.5 ? rgba([255, 255, 255], 0.18) : null;
    return null;
  }
  if (color === 'cream') {
    if (isBg || isStop) return rgba(PANEL, a);
    if (isLine) return rgba([255, 255, 255], 0.1);
    return null;
  }
  if (color === 'sand') {
    if (isBg || isStop) return rgba(SAND, a);
    if (isLine) return rgba([255, 255, 255], 0.1);
    return null;
  }
  if (color === 'ink') {
    if (isText) return rgba(TEXT, a);
    if (isBg) {
      if (alpha === undefined) return INK_SURFACE;
      return a <= 0.2 ? rgba([255, 255, 255], a) : rgba([0, 0, 0], a);
    }
    if (isLine) return rgba([255, 255, 255], alpha === undefined ? 0.3 : Math.min(0.5, Math.max(0.07, a * 1.1)));
    return null;
  }
  if (color === 'slate') {
    if (isText) return SLATE_TEXT[shade] || null;
    if (isBg) return SLATE_BG[shade] || null;
    if (isLine) return SLATE_LINE[shade] ? rgba([255, 255, 255], SLATE_LINE[shade]) : null;
    return null;
  }
  if (TINT[color]) {
    const n = Number(shade);
    if (isText) return n >= 600 || (color === 'brand' && n >= 600) ? TINT_TEXT[color] : null;
    if (isBg) return n <= 100 ? rgba(TINT[color], n === 50 ? 0.14 : 0.22) : null;
    if (isLine) return n <= 300 ? rgba(TINT[color], n <= 50 ? 0.2 : n === 100 ? 0.28 : 0.35) : null;
    if (isStop) return n <= 100 ? rgba(TINT[color], 0.14) : null;
  }
  if (isText && alpha === undefined) {
    if (color === 'magenta') return 'color-mix(in srgb, var(--color-magenta) 62%, white)';
    if (color === 'magenta-dark') return 'color-mix(in srgb, var(--color-magenta) 48%, white)';
    if (color === 'saffron') return 'color-mix(in srgb, var(--color-saffron) 62%, white)';
    if (color === 'leaf') return '#86cf89';
  }
  return null;
}

// ---------- find every colour class in the source ----------
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) files.push(full);
  }
})(path.join(root, 'app'));
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (/\.(js|jsx|ts|tsx)$/.test(name)) files.push(full);
  }
})(path.join(root, 'src'));

const TOKEN = /(?:[a-z-]+:)*(?:bg|text|border|ring|divide|from|via|to|outline)-(?:ink|white|cream|sand|slate-\d{2,3}|brand-\d{2,3}|red-\d{2,3}|amber-\d{2,3}|rose-\d{2,3}|magenta-dark|magenta|saffron|leaf)(?:\/\d{1,3})?(?![\w-])/g;
const tokens = new Set();
for (const file of files) for (const match of fs.readFileSync(file, 'utf8').match(TOKEN) || []) tokens.add(match);

const escapeClass = (value) => value.replace(/([:/.[\]()%,#])/g, '\\$1');
const PROPERTY = {
  bg: 'background-color',
  text: 'color',
  border: 'border-color',
  ring: '--tw-ring-color',
  outline: 'outline-color',
  from: '--tw-gradient-from',
  via: '--tw-gradient-via',
  to: '--tw-gradient-to',
};

const rules = [];
for (const token of [...tokens].sort()) {
  const parts = token.split(':');
  const util = parts.pop();
  const variants = parts;
  const m = util.match(/^(bg|text|border|ring|divide|from|via|to|outline)-(ink|white|cream|sand|magenta-dark|magenta|saffron|leaf|(?:slate|brand|red|amber|rose)-(\d+))(?:\/(\d+))?$/);
  if (!m) continue;
  const [, prefix, colorPart, shade, alphaText] = m;
  const color = colorPart.includes('-') && !['magenta-dark'].includes(colorPart) ? colorPart.split('-')[0] : colorPart;
  const value = darkValue(prefix, color, shade, alphaText === undefined ? undefined : Number(alphaText));
  if (!value) continue;

  let selector = `.${escapeClass(token)}`;
  let supported = true;
  let pseudo = '';
  let groupHover = false;
  for (const variant of variants) {
    if (variant === 'hover') pseudo += ':hover';
    else if (variant === 'focus') pseudo += ':focus';
    else if (variant === 'focus-visible') pseudo += ':focus-visible';
    else if (variant === 'focus-within') pseudo += ':focus-within';
    else if (variant === 'active') pseudo += ':active';
    else if (variant === 'disabled') pseudo += ':disabled';
    else if (variant === 'placeholder') pseudo += '::placeholder';
    else if (variant === 'group-hover') groupHover = true;
    else supported = false;
  }
  if (!supported) continue;
  selector += pseudo;
  if (groupHover) selector = `.group:hover ${selector}`;

  if (prefix === 'divide') {
    rules.push(`[data-theme='dark'] ${selector} > :not(:last-child) { border-color: ${value}; }`);
  } else if (prefix === 'ring') {
    rules.push(`[data-theme='dark'] ${selector} { --tw-ring-color: ${value}; }`);
  } else {
    rules.push(`[data-theme='dark'] ${selector} { ${PROPERTY[prefix]}: ${value}; }`);
  }
}

const header = `/* GENERATED by scripts/generate-dark-theme.mjs. Do not edit by hand: run the script again instead.
   Dark mode is on when <html data-theme="dark"> (see src/lib/theme.js). */\n\n`;

const base = `
:root[data-theme='dark'] {
  color-scheme: dark;
}
[data-theme='dark'] body {
  background: #0e0c12;
  color: rgb(246 242 250);
}
/* The page background: the same warm glows, but on a deep plum instead of cream */
[data-theme='dark'] .bg-mesh {
  background-color: #0e0c12;
  background-image:
    radial-gradient(at 8% 12%, rgb(var(--accent2-rgb) / 0.11) 0, transparent 42%),
    radial-gradient(at 92% 6%, rgb(var(--accent-rgb) / 0.16) 0, transparent 44%),
    radial-gradient(at 62% 92%, rgb(244 185 62 / 0.06) 0, transparent 48%),
    radial-gradient(at 4% 88%, rgb(79 154 82 / 0.07) 0, transparent 42%);
}
[data-theme='dark'] .admin-surface {
  background-image: radial-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1.4px);
}
[data-theme='dark'] .glass {
  background: rgb(24 21 32 / 0.76);
  border-color: rgb(255 255 255 / 0.1);
  box-shadow: 0 12px 40px -14px rgb(0 0 0 / 0.6);
}
[data-theme='dark'] .skeleton {
  background: linear-gradient(100deg, rgb(255 255 255 / 0.05) 30%, rgb(255 255 255 / 0.12) 50%, rgb(255 255 255 / 0.05) 70%);
  background-size: 200% 100%;
}
[data-theme='dark'] ::selection {
  background: rgb(var(--accent-rgb) / 0.5);
}
/* Forms: dark fields with a soft border */
[data-theme='dark'] input:not([type='checkbox']):not([type='radio']):not([type='file']),
[data-theme='dark'] select,
[data-theme='dark'] textarea {
  background-color: rgb(33 28 42);
  color: rgb(246 242 250);
  border-color: rgb(255 255 255 / 0.16);
}
[data-theme='dark'] input::placeholder,
[data-theme='dark'] textarea::placeholder {
  color: rgb(246 242 250 / 0.42);
}
[data-theme='dark'] option {
  background-color: #181520;
  color: #f6f2fa;
}
/* Browser auto-fill keeps the dark look */
[data-theme='dark'] input:-webkit-autofill {
  -webkit-text-fill-color: rgb(246 242 250);
  box-shadow: 0 0 0 40px rgb(33 28 42) inset;
}
/* Pictures are a little softer so they do not glare */
[data-theme='dark'] img:not([src$='.svg']):not([data-keep-bright]) {
  filter: brightness(0.92);
}
/* Calendar and other native pickers */
[data-theme='dark'] ::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
`;

fs.writeFileSync(path.join(root, 'app', 'dark-theme.css'), header + base + '\n/* Colour classes */\n' + rules.join('\n') + '\n');
console.log(`dark-theme.css written: ${rules.length} colour rules from ${tokens.size} classes.`);
