const crypto = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../config/db');

// Errors carry a `code` so the website can show the message in Sinhala, Tamil or English.

const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;
const MAX_QUANTITY = 99;
const MAX_LINES = 50;

// What a seller may change an order to, from each status
const SELLER_NEXT_STATUS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: []
};

// Order reference shown to customers and sellers, e.g. LW-7K3Q9P (no 0/O or 1/I to avoid mix-ups)
const REFERENCE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeReference() {
  const bytes = crypto.randomBytes(6);
  return 'LW-' + Array.from(bytes, (b) => REFERENCE_LETTERS[b % REFERENCE_LETTERS.length]).join('');
}

const ITEMS = { items: { orderBy: { title: 'asc' } } };

const findCustomer = (userId) => prisma.customerProfile.findUnique({ where: { userId } });
const findSeller = (userId) => prisma.sellerProfile.findUnique({ where: { userId } });

// 1. Customer places an order from the cart (one order per seller, all with the same reference)
exports.placeOrder = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) {
      return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts can place orders.' });
    }

    const { items, delivery = {}, note } = req.body || {};
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
      return res.status(400).json({ code: 'EMPTY_CART', message: 'The cart is empty.' });
    }

    // Same product twice in the request counts as one line
    const quantities = new Map();
    for (const item of items) {
      const productId = String(item?.productId || '');
      const quantity = Number(item?.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
        return res.status(400).json({ code: 'BAD_QUANTITY', message: `Quantities must be whole numbers from 1 to ${MAX_QUANTITY}.` });
      }
      quantities.set(productId, Math.min(MAX_QUANTITY, (quantities.get(productId) || 0) + quantity));
    }

    const name = String(delivery.name || '').trim();
    const phone = String(delivery.phone || '').replace(/[\s-]/g, '');
    const address = String(delivery.address || '').trim();
    const district = String(delivery.district || '').trim();
    const cleanNote = String(note || '').trim();

    if (!name || name.length > 100) return res.status(400).json({ code: 'NAME', message: 'Enter the name for delivery.' });
    if (!PHONE_PATTERN.test(phone)) return res.status(400).json({ code: 'PHONE', message: 'Enter a valid phone number.' });
    if (!address || address.length > 500) return res.status(400).json({ code: 'ADDRESS', message: 'Enter the delivery address.' });
    if (!district || district.length > 60) return res.status(400).json({ code: 'DISTRICT', message: 'Choose the district.' });
    if (cleanNote.length > 500) return res.status(400).json({ code: 'NOTE', message: 'The note is too long.' });

    // Only products that are on the website now, with a price, can be ordered
    const products = await prisma.product.findMany({
      where: { id: { in: [...quantities.keys()] }, isPublished: true, seller: { status: 'APPROVED' } },
      select: { id: true, title: true, images: true, price: true, sellerId: true }
    });

    const available = new Set(products.filter((p) => p.price !== null).map((p) => p.id));
    const unavailable = [...quantities.keys()].filter((id) => !available.has(id));
    if (unavailable.length > 0) {
      return res.status(409).json({
        code: 'UNAVAILABLE',
        productIds: unavailable,
        message: 'Some products in the cart are no longer available.'
      });
    }

    const bySeller = new Map();
    for (const product of products) {
      if (!bySeller.has(product.sellerId)) bySeller.set(product.sellerId, []);
      bySeller.get(product.sellerId).push(product);
    }

    const reference = makeReference();
    const orders = await prisma.$transaction(
      [...bySeller.entries()].map(([sellerId, list]) => {
        const lines = list.map((product) => ({
          productId: product.id,
          title: product.title,
          image: product.images[0] || null,
          price: product.price,
          quantity: quantities.get(product.id)
        }));
        const total = lines.reduce((sum, line) => sum.add(line.price.mul(line.quantity)), new Prisma.Decimal(0));

        return prisma.order.create({
          data: {
            reference,
            customerId: customer.id,
            sellerId,
            total,
            deliveryName: name,
            deliveryPhone: phone,
            deliveryAddress: address,
            deliveryDistrict: district,
            note: cleanNote || null,
            items: { create: lines }
          },
          include: { ...ITEMS, seller: { select: { businessName: true, district: true, whatsappNo: true } } }
        });
      })
    );

    res.status(201).json({ reference, orders });
  } catch (error) {
    console.error('PLACE_ORDER_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// 2. The logged-in customer's orders (newest first)
exports.getMyOrders = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts have orders.' });

    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      include: { ...ITEMS, seller: { select: { businessName: true, district: true, whatsappNo: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('MY_ORDERS_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// 3. A customer can cancel their own order while the seller hasn't confirmed it yet
exports.cancelMyOrder = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts have orders.' });

    const order = await prisma.order.findFirst({ where: { id: String(req.params.id), customerId: customer.id } });
    if (!order) return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found.' });
    if (order.status !== 'PENDING') {
      return res.status(409).json({ code: 'TOO_LATE', message: 'This order can no longer be cancelled.' });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: { ...ITEMS, seller: { select: { businessName: true, district: true, whatsappNo: true } } }
    });
    res.json(updated);
  } catch (error) {
    console.error('CANCEL_ORDER_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// 4. Orders for the logged-in seller's products (newest first)
exports.getSellerOrders = async (req, res) => {
  try {
    const seller = await findSeller(req.user.userId);
    if (!seller) return res.status(403).json({ code: 'NOT_SELLER', message: 'Only sellers have this page.' });

    const orders = await prisma.order.findMany({
      where: { sellerId: seller.id },
      include: { ...ITEMS, customer: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('SELLER_ORDERS_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// 5. The seller moves an order along: confirm, ship, mark delivered, or cancel
exports.updateOrderStatus = async (req, res) => {
  try {
    const seller = await findSeller(req.user.userId);
    if (!seller) return res.status(403).json({ code: 'NOT_SELLER', message: 'Only sellers can update orders.' });

    const order = await prisma.order.findFirst({ where: { id: String(req.params.id), sellerId: seller.id } });
    if (!order) return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found.' });

    const status = String(req.body?.status || '');
    if (!SELLER_NEXT_STATUS[order.status].includes(status)) {
      return res.status(409).json({ code: 'BAD_STATUS', message: `A ${order.status} order cannot be changed to ${status || 'that'}.` });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status },
      include: { ...ITEMS, customer: { select: { fullName: true } } }
    });
    res.json(updated);
  } catch (error) {
    console.error('UPDATE_ORDER_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
