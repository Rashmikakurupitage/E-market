const crypto = require('crypto');

// Sellers' NIC numbers are kept encrypted (AES-256-GCM). The key lives in backend/.env as NIC_ENCRYPTION_KEY
// (64 hex characters). Keep a safe copy of it: without it the stored NICs cannot be read.
// Admins only ever see the last 5 characters (nicLast5); nothing in the website shows the full number.

const NIC_PATTERN = /^(\d{9}[VX]|\d{12})$/;

const getKey = () => {
  const raw = String(process.env.NIC_ENCRYPTION_KEY || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('NIC_ENCRYPTION_KEY is missing or not 64 hex characters. Add it to backend/.env.');
  }
  return Buffer.from(raw, 'hex');
};

const normalize = (nic) => String(nic || '').trim().toUpperCase();
const isValidNic = (nic) => NIC_PATTERN.test(normalize(nic));

// Same NIC -> same hash, so duplicates can be found. The hash cannot be turned back into the NIC without the key.
const hash = (nic) => crypto.createHmac('sha256', getKey()).update(normalize(nic)).digest('hex');

const encrypt = (nic) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const data = Buffer.concat([cipher.update(normalize(nic), 'utf8'), cipher.final()]);
  return `v1:${Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64')}`;
};

const decrypt = (payload) => {
  const raw = Buffer.from(String(payload).replace(/^v1:/, ''), 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
};

// Everything to save for a NIC: { nicHash, nicEncrypted, nicLast5 }
const protect = (nic) => ({ nicHash: hash(nic), nicEncrypted: encrypt(nic), nicLast5: normalize(nic).slice(-5) });

// What an admin sees: *****4255V
const mask = (last5) => (last5 ? `*****${last5}` : null);

module.exports = { NIC_PATTERN, isValidNic, normalize, hash, encrypt, decrypt, protect, mask };
