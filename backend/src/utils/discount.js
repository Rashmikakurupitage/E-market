// A seller's discount on a product: a percent off, running until the end of a chosen day (or with no end date).
const MIN_PERCENT = 1;
const MAX_PERCENT = 90;

// { percent, endsAt, salePrice } while the discount is running, otherwise null
const discountOf = (product, now = Date.now()) => {
  const percent = product.discountPercent;
  if (!Number.isInteger(percent) || percent < MIN_PERCENT || percent > MAX_PERCENT) return null;
  if (product.price === null || product.price === undefined) return null;
  if (product.discountEndsAt && new Date(product.discountEndsAt).getTime() <= now) return null;
  const salePrice = Math.round(Number(product.price) * (100 - percent)) / 100;
  return { percent, endsAt: product.discountEndsAt || null, salePrice };
};

// The product as the website receives it, with its running discount (if any) as "discount"
const withDiscount = (product) => ({ ...product, discount: discountOf(product) });

// Reads the percent and end day a seller typed. Returns { percent, endsAt } (both may be null) or { error }.
const readDiscount = (percentInput, endInput) => {
  const empty = (value) => value === undefined || value === null || value === '';
  if (empty(percentInput)) return { percent: null, endsAt: null };
  const percent = Number(percentInput);
  if (!Number.isInteger(percent) || percent < MIN_PERCENT || percent > MAX_PERCENT) {
    return { error: { code: 'INVALID_DISCOUNT', message: `The discount must be a whole number from ${MIN_PERCENT} to ${MAX_PERCENT}.` } };
  }
  if (empty(endInput)) return { percent, endsAt: null };
  const day = String(endInput).slice(0, 10);
  const endsAt = /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T23:59:59`) : null;
  if (!endsAt || Number.isNaN(endsAt.getTime())) {
    return { error: { code: 'INVALID_DISCOUNT_END', message: 'Choose a valid end date for the discount.' } };
  }
  if (endsAt.getTime() <= Date.now()) {
    return { error: { code: 'DISCOUNT_END_PAST', message: 'The end date must be today or later.' } };
  }
  return { percent, endsAt };
};

module.exports = { discountOf, withDiscount, readDiscount };
