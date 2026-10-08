'use client';

import { useSyncExternalStore } from 'react';
import { getSeller } from './catalog';

// The shopping cart. It is kept in this browser (localStorage 'cart'), so it survives page reloads and logging in.
// Each item: { id, title, price, image, category, sellerId, sellerName, district, whatsappNo, quantity }
const KEY = 'cart';
export const MAX_QUANTITY = 99;

const EMPTY = [];
const listeners = new Set();
let memoryRaw = null; // used when the browser blocks storage (e.g. some private windows)
let cached = { raw: undefined, items: EMPTY };

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return memoryRaw;
  }
}

function readItems() {
  const raw = readRaw();
  if (raw !== cached.raw) {
    let items = EMPTY;
    try {
      const parsed = JSON.parse(raw || '[]');
      if (Array.isArray(parsed)) items = parsed.filter((item) => item && item.id && Number(item.quantity) > 0);
    } catch {}
    cached = { raw, items };
  }
  return cached.items;
}

function writeItems(items) {
  memoryRaw = JSON.stringify(items);
  try {
    localStorage.setItem(KEY, memoryRaw);
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  // Keep tabs in step: adding to the cart in one tab updates the others
  const onStorage = (event) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

const clampQuantity = (quantity) => Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(quantity) || 1)));

export function useCartItems() {
  return useSyncExternalStore(subscribe, readItems, () => EMPTY);
}

// { items, count (all units), total (LKR) }
export function useCart() {
  const items = useCartItems();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.quantity * Number(item.price || 0), 0);
  return { items, count, total };
}

export function addToCart(product, quantity = 1) {
  const items = readItems();
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    writeItems(items.map((item) => (item.id === product.id ? { ...item, quantity: clampQuantity(item.quantity + quantity) } : item)));
    return;
  }
  const seller = getSeller(product);
  writeItems([
    ...items,
    {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      image: product.images?.[0] || null,
      category: product.category,
      sellerId: product.sellerId,
      sellerName: seller.businessName || '',
      district: seller.district || '',
      whatsappNo: seller.whatsappNo || '',
      quantity: clampQuantity(quantity),
    },
  ]);
}

export function setCartQuantity(id, quantity) {
  writeItems(readItems().map((item) => (item.id === id ? { ...item, quantity: clampQuantity(quantity) } : item)));
}

export function removeFromCart(ids) {
  const remove = new Set([].concat(ids));
  writeItems(readItems().filter((item) => !remove.has(item.id)));
}

export function clearCart() {
  writeItems([]);
}

// Items grouped by seller, in the order they were first added: [{ sellerId, sellerName, district, items, subtotal }]
export function groupBySeller(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.sellerId)) {
      groups.set(item.sellerId, { sellerId: item.sellerId, sellerName: item.sellerName, district: item.district, items: [], subtotal: 0 });
    }
    const group = groups.get(item.sellerId);
    group.items.push(item);
    group.subtotal += item.quantity * Number(item.price || 0);
  }
  return [...groups.values()];
}

// The cart panel (CartDrawer) is opened from the header, product cards and the Store page
let drawerOpen = false;
const drawerListeners = new Set();
const setDrawer = (open) => {
  drawerOpen = open;
  drawerListeners.forEach((listener) => listener());
};
export const openCart = () => setDrawer(true);
export const closeCart = () => setDrawer(false);
export function useCartOpen() {
  return useSyncExternalStore(
    (listener) => {
      drawerListeners.add(listener);
      return () => drawerListeners.delete(listener);
    },
    () => drawerOpen,
    () => false
  );
}
