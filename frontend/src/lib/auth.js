'use client';

import { useSyncExternalStore } from 'react';

// The login token lives in localStorage under 'token' (api.js sends it with every request)
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const listeners = new Set();
let cached = { raw: undefined, session: null };

// Returns { token, user } or null. Cached so React gets the same object until something changes.
function readSession() {
  let token = null;
  let userJson = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
    userJson = localStorage.getItem(USER_KEY);
  } catch {}

  const raw = `${token}|${userJson}`;
  if (raw !== cached.raw) {
    let user = null;
    try {
      user = userJson ? JSON.parse(userJson) : null;
    } catch {}
    cached = { raw, session: token ? { token, user } : null };
  }
  return cached.session;
}

function subscribe(callback) {
  listeners.add(callback);
  window.addEventListener('storage', callback); // logins/logouts in other tabs
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

const notify = () => listeners.forEach((listener) => listener());

// The page each kind of account lands on after logging in
export function homePathFor(role) {
  if (role === 'SUPER_ADMIN') return '/admin';
  if (role === 'CUSTOMER') return '/account';
  return '/dashboard';
}

// A page on this site from a ?next= link (e.g. /store/checkout), or null.
// Anything that isn't a plain path here is ignored, so links can't send people to another website.
export function safeNextPath(value) {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : null;
}

// Where to send someone after they log out
export function loginPathFor(role) {
  if (role === 'SUPER_ADMIN') return '/admin/login';
  if (role === 'CUSTOMER') return '/login?as=customer';
  return '/login';
}

export function saveSession(token, user) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  notify();
}

export function updateSessionUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
  notify();
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
  notify();
}

// The current session, or null when logged out (always null during server rendering)
export function useSession() {
  return useSyncExternalStore(subscribe, readSession, () => null);
}

const noopSubscribe = () => () => {};

// False on the server and during hydration, true afterwards.
// Use it before redirecting, so a logged-in seller isn't bounced while the page loads.
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
