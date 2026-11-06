'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'lw-recently-viewed';
const EMPTY = [];
const listeners = new Set();
let cachedRaw;
let cachedIds = EMPTY;

function getSnapshot() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return cachedIds;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const parsed = JSON.parse(raw || '[]');
      cachedIds = Array.isArray(parsed)
        ? parsed.filter((id) => typeof id === 'string').slice(0, 8)
        : EMPTY;
    } catch {
      cachedIds = EMPTY;
    }
  }
  return cachedIds;
}

function subscribe(listener) {
  listeners.add(listener);
  const onStorage = (event) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useRecentProducts() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function addRecentProduct(id) {
  const current = getSnapshot();
  const next = [String(id), ...current.filter((savedId) => savedId !== String(id))].slice(0, 8);
  const raw = JSON.stringify(next);
  cachedRaw = raw;
  cachedIds = next;
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Keep the updated recent list available for this page session.
  }
  listeners.forEach((listener) => listener());
}
