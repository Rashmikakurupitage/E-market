const prisma = require('../config/db');
const { cleanMessengerUrl } = require('../utils/messengerUrl');
const DISTRICTS = require('../utils/districts');

// Profile photos are small square pictures kept in the database as data URLs.
const MAX_BYTES = 500 * 1024;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const UUID = /^[0-9a-f-]{36}$/i;

const serverError = (res, label, error) => {
  console.error(label, error);
  res.status(500).json({ message: 'Server error.' });
};

// The picture itself, shown next to the customer's name. The address contains the customer's random id.
exports.getPhoto = async (req, res) => {
  try {
    const id = String(req.params.userId);
    if (!UUID.test(id)) return res.status(404).json({ message: 'Not found.' });
    const row = await prisma.profilePhoto.findUnique({ where: { userId: id } });
    const match = row && DATA_URL.exec(row.data);
    if (!match) return res.status(404).json({ message: 'Not found.' });
    res.set('Content-Type', match[1]);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    serverError(res, 'PROFILE_PHOTO_GET_ERROR:', error);
  }
};

// A customer or seller sets or replaces their own photo
exports.setPhoto = async (req, res) => {
  try {
    if (!['CUSTOMER', 'SELLER'].includes(req.user.role)) {
      return res.status(403).json({ code: 'PROFILE_PHOTO_UNAVAILABLE', message: 'This account cannot have a profile photo.' });
    }
    const image = String(req.body?.image || '');
    const match = DATA_URL.exec(image);
    const bytes = match ? Buffer.from(match[2], 'base64') : null;
    if (!bytes || bytes.length === 0) {
      return res.status(400).json({ code: 'IMAGE_TYPE', message: 'Choose a JPG, PNG or WebP picture.' });
    }
    if (bytes.length > MAX_BYTES) {
      return res.status(413).json({ code: 'IMAGE_BIG', message: 'The picture is too large.' });
    }
    const saved = await prisma.profilePhoto.upsert({
      where: { userId: req.user.userId },
      create: { userId: req.user.userId, data: image },
      update: { data: image },
      select: { updatedAt: true }
    });
    res.json({ photoVersion: saved.updatedAt.getTime() });
  } catch (error) {
    serverError(res, 'PROFILE_PHOTO_SET_ERROR:', error);
  }
};

exports.removePhoto = async (req, res) => {
  try {
    await prisma.profilePhoto.deleteMany({ where: { userId: req.user.userId } });
    res.json({ photoVersion: null });
  } catch (error) {
    serverError(res, 'PROFILE_PHOTO_REMOVE_ERROR:', error);
  }
};

const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

const readOptionalUrl = (value) => {
  if (value === '' || value == null) return null;
  if (typeof value !== 'string' || value.length > 500) return undefined;
  try {
    const parsed = new URL(value.trim());
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
};

exports.updateSellerProfile = async (req, res) => {
  try {
    if (req.user.role !== 'SELLER') {
      return res.status(403).json({ code: 'NOT_SELLER', message: 'Only sellers can update a shop profile.' });
    }

    const businessName = typeof req.body?.businessName === 'string' ? req.body.businessName.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const district = typeof req.body?.district === 'string' ? req.body.district : '';
    const whatsappNo = String(req.body?.whatsappNo || '').replace(/[\s-]/g, '');
    const messengerUrl = req.body?.messengerUrl == null || req.body.messengerUrl === ''
      ? null
      : cleanMessengerUrl(req.body.messengerUrl);
    const facebookUrl = readOptionalUrl(req.body?.facebookUrl);

    if (!businessName || businessName.length > 120) {
      return res.status(400).json({ code: 'INVALID_BUSINESS_NAME', message: 'Enter a business name of up to 120 characters.' });
    }
    if (description.length > 1000) {
      return res.status(400).json({ code: 'INVALID_DESCRIPTION', message: 'The business description must be 1000 characters or fewer.' });
    }
    if (!DISTRICTS.has(district)) {
      return res.status(400).json({ code: 'INVALID_DISTRICT', message: 'Choose a valid district.' });
    }
    if (!PHONE_PATTERN.test(whatsappNo)) {
      return res.status(400).json({ code: 'INVALID_WHATSAPP', message: 'Enter a valid Sri Lankan WhatsApp number.' });
    }
    if (req.body?.messengerUrl && !messengerUrl) {
      return res.status(400).json({ code: 'INVALID_MESSENGER_URL', message: 'Enter a valid Facebook Messenger link.' });
    }
    if (req.body?.facebookUrl && !facebookUrl) {
      return res.status(400).json({ code: 'INVALID_FACEBOOK_URL', message: 'Enter a valid Facebook link.' });
    }

    const seller = await prisma.sellerProfile.update({
      where: { userId: req.user.userId },
      data: { businessName, description: description || null, district, whatsappNo, messengerUrl, facebookUrl },
      select: {
        businessName: true,
        description: true,
        district: true,
        firstName: true,
        lastName: true,
        status: true,
        whatsappNo: true,
        messengerUrl: true,
        facebookUrl: true,
      },
    });
    res.json({ profile: seller });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ code: 'SELLER_PROFILE_NOT_FOUND', message: 'Seller profile not found.' });
    }
    serverError(res, 'SELLER_PROFILE_UPDATE_ERROR:', error);
  }
};
