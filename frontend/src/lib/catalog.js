// Category values must match what sellers pick in the dashboard
export const CATEGORIES = [
  'Handicrafts',
  'Textiles',
  'Agri-Products',
  'Food & Spices',
  'Beauty & Personal Care',
];

const unsplash = (id) =>
  `https://images.unsplash.com/photo-${id}?w=640&h=520&fit=crop&auto=format&q=70`;

// Women artisans at work (public/hero_main.jpg)
export const HERO_IMAGE = '/hero_main.jpg';

// Shown on the home page and store until the API returns real products
export const SAMPLE_PRODUCTS = [
  {
    id: 'sample-1',
    title: 'Handwoven Wicker Basket',
    description: '100% eco-friendly traditional Sri Lankan cane basket, woven by hand.',
    price: 3500,
    discount: { percent: 20, endsAt: null, salePrice: 2800 },
    category: 'Handicrafts',
    images: [unsplash('1569356600296-427289cac2b9')],
    seller: { businessName: 'Lanka Eco Creations', district: 'Kalutara', whatsappNo: '94771234567' },
  },
  {
    id: 'sample-2',
    title: 'Ayurvedic Herbal Pack',
    description: 'Natural herbal remedies prepared using ancient Sri Lankan recipes.',
    price: 1800,
    category: 'Beauty & Personal Care',
    images: [unsplash('1652757359639-575cbb557a38')],
    seller: { businessName: "Soma's Herbal Care", district: 'Matara', whatsappNo: '94771234567' },
  },
  {
    id: 'sample-3',
    title: 'Handmade Batik Saree',
    description: 'Authentic cotton batik saree designed by women artisans in Kurunegala.',
    price: 12500,
    category: 'Textiles',
    images: [unsplash('1610030469983-98e550d6193c')],
    seller: { businessName: "Menaka's Crafts", district: 'Kurunegala', whatsappNo: '94771234567' },
  },
];

export function withSampleProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return SAMPLE_PRODUCTS;

  const productIds = new Set(products.map((product) => String(product.id)));
  return [...products, ...SAMPLE_PRODUCTS.filter((product) => !productIds.has(String(product.id)))];
}

// "Soma's Spice Hub" -> "SS"
export function initials(name = '') {
  return name
    .replace(/[^\p{L}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

// The API returns the seller as `seller`; older code used `sellerProfile`
export function getSeller(product) {
  return product.seller || product.sellerProfile || {};
}

// Turns 0771234567 / 771234567 / +94 77 123 4567 into 94771234567
export function toWhatsAppNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('94')) return digits;
  if (digits.startsWith('0')) return `94${digits.slice(1)}`;
  if (digits.length === 9) return `94${digits}`;
  return digits;
}

// Passwords: at least 8 characters, one capital letter, and one number or symbol
export function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[^A-Za-z]/.test(password);
}

export function formatPhone(number) {
  if (number.length === 11 && number.startsWith('94')) {
    return `+94 ${number.slice(2, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
  }
  return `+${number}`;
}

// What a customer pays: the sale price while the seller's discount is running, otherwise the normal price
export function effectivePrice(product) {
  return product?.discount ? product.discount.salePrice : product?.price;
}

export function formatPrice(price) {
  const value = Number(price);
  if (price === null || price === undefined || price === '' || Number.isNaN(value)) return null;
  return `LKR ${value.toLocaleString('en-LK')}`;
}

// The 25 districts of Sri Lanka (seller registration and delivery addresses)
export const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
  'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

// A WhatsApp chat with the seller about this product, or null when the seller has no number
export function whatsappOrderLink(product) {
  const number = toWhatsAppNumber(getSeller(product).whatsappNo);
  if (!number) return null;
  const text = `Hello! I'm interested in "${product.title}" on Lanka Women E-Market.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

// 6 Oct 2026, in the reader's language
export function formatDate(value, lang = 'en') {
  const locale = { si: 'si-LK', ta: 'ta-LK' }[lang] || 'en-GB';
  return new Date(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Facebook Messenger chat links: m.me/shopname, messenger.com/t/shopname or a Facebook page link.
// Returns the cleaned https link, '' when empty, or null when it is not a Messenger/Facebook link.
// (Same rules as the backend, backend/src/utils/messengerUrl.js)
const MESSENGER_HOSTS = new Set([
  'm.me', 'messenger.com', 'www.messenger.com',
  'facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com',
  'fb.me', 'fb.com', 'www.fb.com',
]);

export function cleanMessengerUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.length > 300 || /\s/.test(text)) return null;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (!MESSENGER_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.pathname.replace(/\//g, '') === '' && !url.search) return null; // just the home page

  url.protocol = 'https:';
  return url.toString();
}

// The Messenger chat for a product: the product's own link, else the seller's, else null
export function messengerLink(product) {
  return cleanMessengerUrl(product.messengerUrl) || cleanMessengerUrl(getSeller(product).messengerUrl) || null;
}
