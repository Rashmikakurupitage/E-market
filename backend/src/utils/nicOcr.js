const Tesseract = require('tesseract.js');
const { parseNic } = require('./nicInfo');

/**
 * Extracts Sri Lankan NIC number from OCR text.
 * Sri Lankan NIC format:
 * - Old format: 9 digits followed by 'V' or 'X' (e.g. 858470123V)
 * - New format: 12 digits (e.g. 199275401234 or 200171203456)
 */
function extractNicFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  // Replace newlines and extra spaces
  const text = rawText.replace(/[\r\n]+/g, ' ');

  // 1. Direct regex for 12-digit (19xx / 20xx / general 12 digits)
  const matches12 = text.match(/\b(19\d{10}|20\d{10}|\d{12})\b/g) || [];
  for (const m of matches12) {
    const clean = m.replace(/\D/g, '');
    const info = parseNic(clean);
    if (info && info.valid) {
      return { nic: clean, info };
    }
  }

  // 12-digit with spaces or dashes: e.g. "1995 8470 0123" or "1995-8470-0123"
  const spaced12 = text.match(/\b(19\d{2}|20\d{2})[\s\-]+(\d{3,4})[\s\-]+(\d{4,5})\b/g) || [];
  for (const m of spaced12) {
    const clean = m.replace(/[\s\-]/g, '');
    if (clean.length === 12) {
      const info = parseNic(clean);
      if (info && info.valid) {
        return { nic: clean, info };
      }
    }
  }

  // 2. Direct regex for 9-digit old NIC (e.g. "858470123V" or "858470123 V" or "858470123v")
  const matches9 = text.match(/\b(\d{9})\s*([VvXx])\b/g) || [];
  for (const m of matches9) {
    const clean = m.replace(/\s+/g, '').toUpperCase();
    const info = parseNic(clean);
    if (info && info.valid) {
      return { nic: clean, info };
    }
  }

  // 3. Fallback: Search for tokens with OCR misreads (O->0, I/L->1, S->5, Z->2)
  const tokens = text.split(/[^A-Za-z0-9]/).filter((t) => t.length >= 9 && t.length <= 13);
  for (let token of tokens) {
    let candidate = token.toUpperCase();
    if (candidate.endsWith('V') || candidate.endsWith('X')) {
      const digits = candidate
        .slice(0, -1)
        .replace(/[O]/g, '0')
        .replace(/[IL]/g, '1')
        .replace(/[S]/g, '5')
        .replace(/[Z]/g, '2');
      candidate = digits + candidate.slice(-1);
    } else {
      candidate = candidate
        .replace(/[O]/g, '0')
        .replace(/[IL]/g, '1')
        .replace(/[S]/g, '5')
        .replace(/[Z]/g, '2');
    }
    const info = parseNic(candidate);
    if (info && info.valid) {
      return { nic: candidate, info };
    }
  }

  return null;
}

/**
 * Perform OCR on an image data URL or Buffer and extract NIC details.
 */
async function scanNicImage(imageInput) {
  if (!imageInput) {
    throw new Error('No image provided for scanning.');
  }

  let buffer;
  if (Buffer.isBuffer(imageInput)) {
    buffer = imageInput;
  } else if (typeof imageInput === 'string') {
    const base64Data = imageInput.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    throw new Error('Invalid image format.');
  }

  // Perform recognition
  const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
  const extracted = extractNicFromText(text);

  return {
    rawText: text,
    extracted
  };
}

module.exports = {
  extractNicFromText,
  scanNicImage
};
