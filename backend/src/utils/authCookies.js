const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const SESSION_COOKIE = 'lw_session';
const CSRF_COOKIE = 'lw_csrf';
const CSRF_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_SAME_SITE = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase();

function cookieOptions(extra = {}) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: COOKIE_SAME_SITE,
    path: '/api',
    ...extra,
  };
}

function createCsrfToken() {
  const nonce = crypto.randomBytes(32).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(`csrf:${nonce}`)
    .digest('base64url');
  return `${nonce}.${signature}`;
}

function isValidCsrfToken(token) {
  if (typeof token !== 'string') return false;
  const [nonce, signature, extra] = token.split('.');
  if (
    !nonce ||
    !signature ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]{43}$/.test(nonce) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) return false;
  const expected = crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(`csrf:${nonce}`)
    .digest();
  let provided;
  try {
    provided = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

function setSessionCookie(res, user, expiresIn = '7d') {
  const token = jwt.sign(
    { userId: user.id, role: user.role, sessionVersion: user.sessionVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn, algorithm: 'HS256' }
  );
  const { exp } = jwt.decode(token);
  res.cookie(SESSION_COOKIE, token, cookieOptions({ expires: new Date(exp * 1000) }));
  res.set('Cache-Control', 'no-store');
}

function clearSessionCookies(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
  res.clearCookie(CSRF_COOKIE, cookieOptions());
}

function getCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE];
  if (!isValidCsrfToken(token)) {
    token = createCsrfToken();
    res.cookie(CSRF_COOKIE, token, cookieOptions({ maxAge: CSRF_TTL_MS }));
  }
  res.set('Cache-Control', 'no-store');
  res.json({ csrfToken: token });
}

module.exports = {
  SESSION_COOKIE,
  CSRF_COOKIE,
  COOKIE_SAME_SITE,
  createCsrfToken,
  isValidCsrfToken,
  setSessionCookie,
  clearSessionCookies,
  getCsrfToken,
};
