const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { cleanMessengerUrl } = require('../utils/messengerUrl');
const { withDiscount, readDiscount } = require('../utils/discount');

// Up to 5 photos per product. Each one is a web link (https://...) or an uploaded picture sent as a data URL.
// Uploaded pictures are saved in the database and replaced by the address they are served from.
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 600 * 1024;
const PHOTO_DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

const publicBase = (req) => (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// Returns { urls, uploads } or { error }
const readPhotos = (input, req) => {
  const list = Array.isArray(input) ? input.map((item) => String(item || '').trim()).filter(Boolean) : [];
  if (list.length > MAX_PHOTOS) return { error: { code: 'TOO_MANY_IMAGES', message: `At most ${MAX_PHOTOS} photos for one product.` } };
  const urls = [];
  const uploads = [];
  for (const item of list) {
    const match = PHOTO_DATA_URL.exec(item);
    if (match) {
      const bytes = Buffer.from(match[2], 'base64');
      if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
        return { error: { code: 'INVALID_IMAGE', message: 'A photo is too large or not a valid picture.' } };
      }
      const id = crypto.randomUUID();
      uploads.push({ id, data: item });
      urls.push(`${publicBase(req)}/api/products/images/${id}`);
      continue;
    }
    let parsed;
    try {
      parsed = new URL(item);
    } catch {
      return { error: { code: 'INVALID_IMAGE', message: 'A photo link is not a valid web address.' } };
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || item.length > 1000) {
      return { error: { code: 'INVALID_IMAGE', message: 'A photo link must start with http:// or https://.' } };
    }
    urls.push(item);
  }
  return { urls, uploads };
};

// 1. අලුත් Product එකක් එකතු කිරීම (Sellers Only)
exports.createProduct = async (req, res) => {
  try {
    const { title, description, category, images, price } = req.body;

    // Optional Facebook Messenger chat link, so customers can also chat there instead of only on WhatsApp
    const messengerUrl = cleanMessengerUrl(req.body.messengerUrl);
    if (messengerUrl === null) {
      return res.status(400).json({ code: 'INVALID_MESSENGER_URL', message: 'Enter a Facebook Messenger link, e.g. m.me/yourshop.' });
    }

    const photos = readPhotos(images, req);
    if (photos.error) {
      return res.status(400).json(photos.error);
    }

    // Optional discount (a seller can also add or change it later)
    const discount = readDiscount(req.body.discountPercent, req.body.discountEndsAt);
    if (discount.error) {
      return res.status(400).json(discount.error);
    }
    if (discount.percent && !price) {
      return res.status(400).json({ code: 'DISCOUNT_NEEDS_PRICE', message: 'Set a price before giving a discount.' });
    }

    // Request එක එවන Seller ගේ SellerProfile ID එක සොයාගැනීම
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'භාණ්ඩ එකතු කළ හැක්කේ ලියාපදිංචි අලෙවිකරුවන්ට පමණි.' });
    }

    const product = await prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        title,
        description,
        category,
        images: photos.urls,
        productImages: { create: photos.uploads },
        price: price ? parseFloat(price) : null,
        messengerUrl: messengerUrl || null,
        discountPercent: discount.percent,
        discountEndsAt: discount.endsAt
      }
    });

    const { productImages, ...saved } = product;
    res.status(201).json({ message: 'භාණ්ඩය සාර්ථකව එකතු කරන ලදී!', product: withDiscount(saved) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 2. සියලුම Products ලබාගැනීම (Public Search/Filter)
// True when the request carries a valid login token of a registered customer. Everyone else gets no seller contact details.
const isCustomer = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return false;
  try {
    return jwt.verify(header.split(' ')[1], process.env.JWT_SECRET).role === 'CUSTOMER';
  } catch {
    return false;
  }
};

// A product photo that was uploaded (links to other websites are not stored here)
exports.getProductImage = async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(404).json({ message: 'Not found.' });
    const row = await prisma.productImage.findUnique({ where: { id } });
    const match = row && PHOTO_DATA_URL.exec(row.data);
    if (!match) return res.status(404).json({ message: 'Not found.' });
    res.set('Content-Type', match[1]);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;

    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        seller: { status: { not: 'REJECTED' }, removedAt: null },
        ...(category && { category }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        seller: {
          select: {
            businessName: true,
            district: true,
            status: true,
            whatsappNo: true,
            facebookUrl: true,
            messengerUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Contact options are for registered customers only, so nobody else ever receives them
    if (!isCustomer(req)) {
      return res.json(
        products.map((product) =>
          withDiscount({
            ...product,
            messengerUrl: null,
            seller: product.seller && { ...product.seller, whatsappNo: null, facebookUrl: null, messengerUrl: null }
          })
        )
      );
    }

    res.json(products.map(withDiscount));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 3. Log වී සිටින Seller ගේ Products ලබාගැනීම (Seller Dashboard)
// Numbers for the seller dashboard's overview: 14 days of enquiries, orders, and the most contacted products
const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

exports.getSellerOverview = async (req, res) => {
  try {
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: req.user.userId }, select: { id: true } });
    if (!seller) return res.status(403).json({ message: 'Only seller accounts have this.' });

    const DAYS = 14;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (DAYS - 1));

    const [clicks, ordersByStatus, delivered, topRaw, recentOrders] = await Promise.all([
      prisma.clickAnalytics.findMany({ where: { sellerId: seller.id, timestamp: { gte: start } }, select: { timestamp: true }, take: 20000 }),
      prisma.order.groupBy({ by: ['status'], where: { sellerId: seller.id }, _count: { _all: true } }),
      prisma.order.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.clickAnalytics.groupBy({ by: ['productId'], where: { sellerId: seller.id, productId: { not: null } }, _count: { _all: true }, orderBy: { _count: { productId: 'desc' } }, take: 5 }),
      prisma.order.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, reference: true, status: true, total: true, createdAt: true, deliveryName: true, items: { select: { quantity: true } } }
      })
    ]);

    const perDay = new Map();
    clicks.forEach((click) => perDay.set(dayKey(click.timestamp), (perDay.get(dayKey(click.timestamp)) || 0) + 1));
    const clicksByDay = Array.from({ length: DAYS }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return { date: dayKey(day), count: perDay.get(dayKey(day)) || 0 };
    });

    const titles = await prisma.product.findMany({ where: { id: { in: topRaw.map((row) => row.productId) } }, select: { id: true, title: true } });
    const topProducts = topRaw
      .map((row) => {
        const product = titles.find((item) => item.id === row.productId);
        return product && { id: product.id, title: product.title, count: row._count._all };
      })
      .filter(Boolean);

    const byStatus = { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    ordersByStatus.forEach((row) => {
      byStatus[row.status] = row._count._all;
    });

    res.json({
      clicksByDay,
      topProducts,
      orders: { byStatus, total: Object.values(byStatus).reduce((a, b) => a + b, 0), deliveredValue: Number(delivered._sum.total || 0) },
      recentOrders: recentOrders.map(({ items, total, ...order }) => ({ ...order, total: Number(total), itemCount: items.reduce((sum, item) => sum + item.quantity, 0) }))
    });
  } catch (error) {
    console.error('SELLER_OVERVIEW_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

exports.getMyProducts = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'මෙම පිටුව ලියාපදිංචි අලෙවිකරුවන්ට පමණි.' });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [products, recentClicks] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId: sellerProfile.id },
        include: { _count: { select: { analytics: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clickAnalytics.groupBy({
        by: ['productId'],
        where: { sellerId: sellerProfile.id, timestamp: { gte: weekAgo } },
        _count: { _all: true }
      })
    ]);

    const weekCounts = new Map(recentClicks.map((row) => [row.productId, row._count._all]));

    // Dashboard එක clickCount (මුළු) සහ clicksThisWeek (පසුගිය දින 7) පෙන්වයි
    res.json(
      products.map(({ _count, ...product }) =>
        withDiscount({
          ...product,
          clickCount: _count.analytics,
          clicksThisWeek: weekCounts.get(product.id) || 0
        })
      )
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// A seller sets, changes or removes the discount on one of their own products ({ percent: null } removes it)
exports.setDiscount = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: req.user.userId } });
    if (!sellerProfile) {
      return res.status(403).json({ message: 'Only seller accounts can set a discount.' });
    }

    const product = await prisma.product.findFirst({ where: { id: String(req.params.id), sellerId: sellerProfile.id } });
    if (!product) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found.' });
    }

    const discount = readDiscount(req.body?.percent, req.body?.endsAt);
    if (discount.error) {
      return res.status(400).json(discount.error);
    }
    if (discount.percent && product.price === null) {
      return res.status(400).json({ code: 'DISCOUNT_NEEDS_PRICE', message: 'Set a price before giving a discount.' });
    }

    const saved = await prisma.product.update({
      where: { id: product.id },
      data: { discountPercent: discount.percent, discountEndsAt: discount.endsAt }
    });
    res.json({ product: withDiscount(saved) });
  } catch (error) {
    console.error('SET_DISCOUNT_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// 4. Seller ගේ Product එකක් ඉවත් කිරීම (තමන්ගේ products පමණි)
exports.deleteProduct = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'භාණ්ඩ ඉවත් කළ හැක්කේ ලියාපදිංචි අලෙවිකරුවන්ට පමණි.' });
    }

    // Only delete when the product belongs to this seller (deleteMany matches on both ids)
    const { count } = await prisma.product.deleteMany({
      where: { id: String(req.params.id), sellerId: sellerProfile.id }
    });

    if (count === 0) {
      return res.status(404).json({ message: 'භාණ්ඩය සොයාගත නොහැක.' });
    }

    // Its past WhatsApp click records stay in the database, with productId set to empty
    res.json({ message: 'භාණ්ඩය ඉවත් කරන ලදී.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 5. Social Media Redirection Tracking (WhatsApp/Messenger Click Track)
exports.trackClick = async (req, res) => {
  try {
    const { productId, platform = 'WHATSAPP' } = req.body; // platform: "WHATSAPP" or "MESSENGER"

    if (!['WHATSAPP', 'MESSENGER'].includes(platform)) {
      return res.status(400).json({ message: 'Unknown platform' });
    }

    // The seller is taken from the product, so clicks can't be credited to someone else
    // Only products that are actually on the website can be clicked
    const product = productId
      ? await prisma.product.findFirst({
          where: { id: String(productId), isPublished: true, seller: { status: 'APPROVED' } },
          select: { id: true, sellerId: true }
        })
      : null;

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await prisma.clickAnalytics.create({
      data: {
        sellerId: product.sellerId,
        productId: product.id,
        targetPlatform: platform
      }
    });

    res.json({ message: 'Click tracked successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Tracking error' });
  }
};