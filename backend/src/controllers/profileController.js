const prisma = require('../config/db');

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

// A seller or customer sets or replaces their own photo
exports.setPhoto = async (req, res) => {
  try {
    if (!['CUSTOMER', 'SELLER'].includes(req.user.role)) {
      return res.status(403).json({ code: 'UNAUTHORIZED_ROLE', message: 'Only seller and customer accounts have a profile photo.' });
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
