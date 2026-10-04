const crypto = require('crypto');

// One-time login codes live in memory: they only last a few minutes, and if the
// backend restarts the seller simply asks for a new code.
// If you ever run more than one backend server, move this into the database or Redis.

const CODE_TTL_MS = 10 * 60 * 1000; // a code is valid for 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // wait 60 seconds before asking for another code
const MAX_ATTEMPTS = 5; // wrong guesses allowed per code
const MAX_SENDS_PER_HOUR = 5; // codes emailed to one account per hour

const codes = new Map(); // userId -> { hash, expiresAt, attempts, sentAt }
const sendLog = new Map(); // userId -> [timestamps of codes sent]

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest();

// Creates a new 6-digit code for this user, or explains why one can't be sent yet
function issue(userId) {
  const now = Date.now();
  const current = codes.get(userId);

  if (current && now - current.sentAt < RESEND_COOLDOWN_MS) {
    return { error: 'RESEND_TOO_SOON', retryAfter: Math.ceil((RESEND_COOLDOWN_MS - (now - current.sentAt)) / 1000) };
  }

  const recentSends = (sendLog.get(userId) || []).filter((sentAt) => now - sentAt < 60 * 60 * 1000);
  if (recentSends.length >= MAX_SENDS_PER_HOUR) {
    return { error: 'TOO_MANY_CODES' };
  }

  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  codes.set(userId, { hash: hashCode(code), expiresAt: now + CODE_TTL_MS, attempts: 0, sentAt: now });
  sendLog.set(userId, [...recentSends, now]);

  return { code, expiresInMinutes: CODE_TTL_MS / 60000, resendAfterSeconds: RESEND_COOLDOWN_MS / 1000 };
}

// Forget a code that could not be emailed, so the seller can try again straight away
function discard(userId) {
  codes.delete(userId);
  const sends = sendLog.get(userId);
  if (sends) sends.pop();
}

// Cancel a code that is no longer wanted (e.g. a login code sent to an email the user just replaced).
// The hourly limit still counts it.
function forget(userId) {
  codes.delete(userId);
}

// Returns 'OK', 'NO_CODE', 'CODE_EXPIRED', 'WRONG_CODE' or 'TOO_MANY_ATTEMPTS'
function verify(userId, code) {
  const entry = codes.get(userId);
  if (!entry) return 'NO_CODE';

  if (Date.now() > entry.expiresAt) {
    codes.delete(userId);
    return 'CODE_EXPIRED';
  }

  entry.attempts += 1;
  if (!crypto.timingSafeEqual(entry.hash, hashCode(code))) {
    if (entry.attempts >= MAX_ATTEMPTS) {
      codes.delete(userId);
      return 'TOO_MANY_ATTEMPTS';
    }
    return 'WRONG_CODE';
  }

  codes.delete(userId); // each code works only once
  return 'OK';
}

// Clean out old entries every 10 minutes so memory doesn't grow
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of codes) {
    if (now > entry.expiresAt) codes.delete(userId);
  }
  for (const [userId, sends] of sendLog) {
    const recent = sends.filter((sentAt) => now - sentAt < 60 * 60 * 1000);
    if (recent.length) sendLog.set(userId, recent);
    else sendLog.delete(userId);
  }
}, 10 * 60 * 1000).unref();

module.exports = { issue, discard, forget, verify };
