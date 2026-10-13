const crypto = require('crypto');
const prisma = require('../config/db');

// Errors carry a `code` so the website can show the message in Sinhala, Tamil or English.

const REASONS = ['NOT_DELIVERED', 'NOT_AS_DESCRIBED', 'POOR_QUALITY', 'OVERCHARGED', 'RUDE_BEHAVIOUR', 'OTHER'];
const STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED'];
const MIN_MESSAGE = 20;
const MAX_MESSAGE = 1500;
const MAX_NOTE = 1000;
const MAX_PER_DAY = 5;

// Complaint number shown to customers and admins, e.g. CP-7K3Q9P
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeReference = () => 'CP-' + Array.from(crypto.randomBytes(6), (b) => LETTERS[b % LETTERS.length]).join('');

const serverError = (res, label, error) => {
  console.error(label, error);
  res.status(500).json({ message: 'Server error.' });
};

const forCustomer = {
  seller: { select: { businessName: true, district: true } },
  order: { select: { reference: true } }
};

/* ---------- customers ---------- */

// A customer complains about a seller (from one of their orders, or by choosing the seller)
exports.createComplaint = async (req, res) => {
  try {
    const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!customer) {
      return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts can send complaints.' });
    }

    const reason = String(req.body?.reason || '');
    const message = String(req.body?.message || '').trim();
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ code: 'REASON', message: 'Choose what went wrong.' });
    }
    if (message.length < MIN_MESSAGE) {
      return res.status(400).json({ code: 'MESSAGE_SHORT', message: `Please write at least ${MIN_MESSAGE} characters.` });
    }
    if (message.length > MAX_MESSAGE) {
      return res.status(400).json({ code: 'MESSAGE_LONG', message: `The message is too long (${MAX_MESSAGE} characters at most).` });
    }

    // About the seller of one of the customer's own orders, or about any approved seller
    let sellerId;
    let orderId = null;
    if (req.body?.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: String(req.body.orderId), customerId: customer.id },
        select: { id: true, sellerId: true }
      });
      if (!order) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Order not found.' });
      }
      sellerId = order.sellerId;
      orderId = order.id;
    } else {
      const seller = await prisma.sellerProfile.findFirst({
        where: { id: String(req.body?.sellerId || ''), status: { not: 'REJECTED' } },
        select: { id: true }
      });
      if (!seller) {
        return res.status(404).json({ code: 'SELLER_NOT_FOUND', message: 'Choose the seller you are complaining about.' });
      }
      sellerId = seller.id;
    }

    const [stillOpen, today] = await Promise.all([
      prisma.complaint.count({
        where: { customerId: customer.id, status: { in: ['OPEN', 'IN_REVIEW'] }, ...(orderId ? { orderId } : { sellerId, orderId: null }) }
      }),
      prisma.complaint.count({ where: { customerId: customer.id, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    ]);
    if (stillOpen > 0) {
      return res.status(409).json({ code: 'ALREADY_OPEN', message: 'You already have an open complaint about this.' });
    }
    if (today >= MAX_PER_DAY) {
      return res.status(429).json({ code: 'TOO_MANY', message: 'You have sent too many complaints today. Please try again tomorrow.' });
    }

    const complaint = await prisma.complaint.create({
      data: { reference: makeReference(), customerId: customer.id, sellerId, orderId, reason, message },
      include: forCustomer
    });
    res.status(201).json(complaint);
  } catch (error) {
    serverError(res, 'CREATE_COMPLAINT_ERROR:', error);
  }
};

// Sellers a customer can complain about (every seller except rejected ones)
exports.listSellers = async (req, res) => {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: { not: 'REJECTED' } },
      select: { id: true, businessName: true, district: true },
      orderBy: { businessName: 'asc' }
    });
    res.json(sellers);
  } catch (error) {
    serverError(res, 'LIST_COMPLAINT_SELLERS_ERROR:', error);
  }
};

// A customer corrects the reason or message of their own complaint, until the Ministry starts reviewing it
exports.editComplaint = async (req, res) => {
  try {
    const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!customer) {
      return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts can edit complaints.' });
    }

    const existing = await prisma.complaint.findFirst({ where: { id: String(req.params.id), customerId: customer.id } });
    if (!existing) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Complaint not found.' });
    }
    if (existing.status !== 'OPEN') {
      return res.status(409).json({ code: 'NOT_EDITABLE', message: 'This complaint is already being handled and can no longer be edited.' });
    }

    const reason = String(req.body?.reason || '');
    const message = String(req.body?.message || '').trim();
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ code: 'REASON', message: 'Choose what went wrong.' });
    }
    if (message.length < MIN_MESSAGE) {
      return res.status(400).json({ code: 'MESSAGE_SHORT', message: `Please write at least ${MIN_MESSAGE} characters.` });
    }
    if (message.length > MAX_MESSAGE) {
      return res.status(400).json({ code: 'MESSAGE_LONG', message: `The message is too long (${MAX_MESSAGE} characters at most).` });
    }

    // Only while it is still open, so an admin who just picked it up is never overwritten
    const result = await prisma.complaint.updateMany({ where: { id: existing.id, status: 'OPEN' }, data: { reason, message } });
    if (result.count === 0) {
      return res.status(409).json({ code: 'NOT_EDITABLE', message: 'This complaint is already being handled and can no longer be edited.' });
    }
    const complaint = await prisma.complaint.findUnique({ where: { id: existing.id }, include: forCustomer });
    res.json(complaint);
  } catch (error) {
    serverError(res, 'EDIT_COMPLAINT_ERROR:', error);
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const customer = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!customer) {
      return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts have complaints.' });
    }
    const complaints = await prisma.complaint.findMany({
      where: { customerId: customer.id },
      include: forCustomer,
      orderBy: { createdAt: 'desc' }
    });
    res.json(complaints);
  } catch (error) {
    serverError(res, 'MY_COMPLAINTS_ERROR:', error);
  }
};

/* ---------- admins (behind authmiddleware + requireAdmin, see routes/adminRoutes.js) ---------- */

const forAdmin = {
  customer: {
    select: {
      id: true,
      fullName: true,
      user: { select: { email: true, phone: true, createdAt: true } },
      _count: { select: { orders: true, complaints: true } }
    }
  },
  seller: {
    select: {
      id: true,
      businessName: true,
      district: true,
      status: true,
      whatsappNo: true,
      firstName: true,
      lastName: true,
      facebookUrl: true,
      messengerUrl: true,
      user: { select: { email: true, phone: true } },
      _count: { select: { complaints: true, products: true } }
    }
  },
  order: { select: { reference: true, status: true, total: true } }
};

exports.listComplaints = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const contains = { contains: search, mode: 'insensitive' };
    const status = STATUSES.includes(req.query.status) ? req.query.status : undefined;

    const complaints = await prisma.complaint.findMany({
      where: {
        ...(status && { status }),
        ...(search && {
          OR: [
            { reference: contains },
            { message: contains },
            { customer: { fullName: contains } },
            { customer: { user: { email: contains } } },
            { customer: { user: { phone: contains } } },
            { seller: { businessName: contains } },
            { order: { reference: contains } }
          ]
        })
      },
      include: forAdmin,
      orderBy: { createdAt: 'desc' },
      take: 300
    });
    res.json(complaints);
  } catch (error) {
    serverError(res, 'ADMIN_COMPLAINTS_ERROR:', error);
  }
};

// Change the status and/or write the reply the customer will see
exports.updateComplaint = async (req, res) => {
  try {
    const { status, adminNote } = req.body || {};
    const data = {};

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ code: 'BAD_STATUS', message: 'Unknown status.' });
      }
      data.status = status;
      data.resolvedAt = ['RESOLVED', 'DISMISSED'].includes(status) ? new Date() : null;
    }
    if (adminNote !== undefined) {
      const note = String(adminNote).trim();
      if (note.length > MAX_NOTE) {
        return res.status(400).json({ code: 'NOTE_LONG', message: `The reply is too long (${MAX_NOTE} characters at most).` });
      }
      data.adminNote = note || null;
    }
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ code: 'NOTHING_TO_UPDATE', message: 'Nothing to update.' });
    }

    const { count } = await prisma.complaint.updateMany({ where: { id: String(req.params.id) }, data });
    if (count === 0) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Complaint not found.' });
    }
    const complaint = await prisma.complaint.findUnique({ where: { id: String(req.params.id) }, include: forAdmin });
    res.json(complaint);
  } catch (error) {
    serverError(res, 'ADMIN_UPDATE_COMPLAINT_ERROR:', error);
  }
};
