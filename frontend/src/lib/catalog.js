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

export const HERO_IMAGE =
  'https://images.unsplash.com/photo-1638310533874-6c124c012e1d?w=1920&fit=crop&auto=format&q=70';

// Shown on the home page until the API returns real products
export const SAMPLE_PRODUCTS = [
  {
    id: 'sample-1',
    title: 'Handwoven Wicker Basket',
    description: '100% eco-friendly traditional Sri Lankan cane basket, woven by hand.',
    price: 3500,
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
  {
    id: 'sample-4',
    title: 'Coconut Shell Crafts Set',
    description: 'Polished kitchenware handcrafted from organic coconut shells.',
    price: 2200,
    category: 'Handicrafts',
    images: [unsplash('1634082982564-a818875c7cb5')],
    seller: { businessName: 'Aadhya Handicrafts', district: 'Galle', whatsappNo: '94771234567' },
  },
  {
    id: 'sample-5',
    title: 'Pure Ceylon Cinnamon',
    description: 'Hand-peeled true cinnamon quills from home gardens in Matale.',
    price: 1500,
    category: 'Food & Spices',
    images: [unsplash('1622798337764-259682f03741')],
    seller: { businessName: "Soma's Spice Hub", district: 'Matale', whatsappNo: '94771234567' },
  },
  {
    id: 'sample-6',
    title: 'Handmade Clay Pottery Set',
    description: 'Traditional terracotta pots shaped and fired by village potters.',
    price: 4800,
    category: 'Handicrafts',
    images: [unsplash('1749518295706-dc15ca3b5fd5')],
    seller: { businessName: 'Kumari Clay Works', district: 'Kegalle', whatsappNo: '94771234567' },
  },
  {
    id: 'sample-7',
    title: 'Batik Wall Hanging',
    description: 'Hand-waxed and dyed batik art piece with traditional motifs.',
    price: 6500,
    category: 'Textiles',
    images: [unsplash('1761515315375-1315503bb3ce')],
    seller: { businessName: 'Nilmini Batiks', district: 'Kandy', whatsappNo: '94771234567' },
  },
  {
    id: 'sample-8',
    title: 'Traditional Spice Collection',
    description: 'Chilli, turmeric, curry powder and more, freshly ground in small batches.',
    price: 2900,
    category: 'Food & Spices',
    images: [unsplash('1635355995448-77b02d33621d')],
    seller: { businessName: "Soma's Spice Hub", district: 'Matale', whatsappNo: '94771234567' },
  },
];

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

export function formatPhone(number) {
  if (number.length === 11 && number.startsWith('94')) {
    return `+94 ${number.slice(2, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
  }
  return `+${number}`;
}

export function formatPrice(price) {
  const value = Number(price);
  if (price === null || price === undefined || price === '' || Number.isNaN(value)) return null;
  return `LKR ${value.toLocaleString('en-LK')}`;
}
