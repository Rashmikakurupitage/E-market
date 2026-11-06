const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { cleanMessengerUrl } = require('../utils/messengerUrl');
const { withDiscount, readDiscount } = require('../utils/discount');

// Up to 5 photos per product. Each one is a web link (https://...) or an uploaded picture sent as a data URL.
// Uploaded pictures are saved in the database and replaced by the address they are served from.
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 600 * 1024;
const MAX_STOCK = 1000000;
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

// 1. Add a new product (sellers only).
exports.createProduct = async (req, res) => {
  try {
    const { title, description, category, images, price } = req.body;
    const stockInput = req.body.stock;
    const stock = stockInput === '' || stockInput === undefined || stockInput === null ? null : Number(stockInput);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK)) {
      return res.status(400).json({ code: 'INVALID_STOCK', message: `Stock must be a whole number from 0 to ${MAX_STOCK}, or empty to leave tracking off.` });
    }

    // Optional Messenger chat link specific to this product
    const messengerUrl = cleanMessengerUrl(req.body.messengerUrl);
    if (req.body.messengerUrl && !messengerUrl) {
      return res.status(400).json({
        code: 'INVALID_MESSENGER_LINK',
        message: 'Enter a valid m.me link (e.g. m.me/yourpage) or a full Facebook / Messenger web address.'
      });
    }

    // Optional introductory discount
    const discount = readDiscount(req.body.discountPercent, req.body.discountEndsAt);
    if (discount.error) {
      return res.status(400).json(discount.error);
    }
    if (discount.percent && !price) {
      return res.status(400).json({
        code: 'DISCOUNT_NEEDS_PRICE',
        message: 'A product needs a price before you can give it a discount.'
      });
    }

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, Description සහ Category ඇතුළත් කිරීම අනිවාර්යයි.' });
    }

    // Photos: 0 to 5 links or uploaded pictures
    const photos = readPhotos(images, req);
    if (photos.error) {
      return res.status(400).json(photos.error);
    }

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(404).json({ message: 'Seller Profile එකක් හමු නොවීය.' });
    }

    // A seller an admin has removed can neither see nor add products
    if (sellerProfile.removedAt) {
      return res.status(403).json({
        code: 'ACCOUNT_REMOVED',
        message: 'This seller account has been removed.'
      });
    }

    // Only approved sellers can publish products
    if (sellerProfile.status !== 'APPROVED') {
      return res.status(403).json({
        code: 'SELLER_NOT_APPROVED',
        message: 'ඔබේ අලෙවිකරු ගිණුම තවමත් අනුමත වී නොමැත. අනුමැතිය ලැබීමෙන් පසු භාණ්ඩ එකතු කළ හැකිය.'
      });
    }

    const product = await prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        title,
        description,
        category,
        images: photos.urls,
        stock,
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

// 2. Get all products (public search/filter).
// True when the request carries a valid login token of a registered customer. Everyone else gets no seller contact details.
const isCustomer = (req) => {
  let token = req.cookies?.lw_session;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return false;
  try {
    return jwt.verify(token, process.env.JWT_SECRET).role === 'CUSTOMER';
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
        seller: { status: 'APPROVED', removedAt: null },
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
            id: true,
            userId: true,
            businessName: true,
            description: true,
            district: true,
            status: true,
            whatsappNo: true,
            facebookUrl: true,
            messengerUrl: true,
            reviews: { select: { rating: true } },
            user: { select: { profilePhoto: { select: { updatedAt: true } } } }
          }
        },
        reviews: { select: { rating: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const isCust = isCustomer(req);
    const transformed = products.map((product) => {
      const pReviews = product.reviews || [];
      const pReviewCount = pReviews.length;
      const pAverageRating = pReviewCount
        ? Math.round((pReviews.reduce((sum, r) => sum + r.rating, 0) / pReviewCount) * 10) / 10
        : 0;

      let formattedSeller = null;
      if (product.seller) {
        const sReviews = product.seller.reviews || [];
        const sReviewCount = sReviews.length;
        const sAverageRating = sReviewCount
          ? Math.round((sReviews.reduce((sum, r) => sum + r.rating, 0) / sReviewCount) * 10) / 10
          : 0;
        const photoVersion = product.seller.user?.profilePhoto ? product.seller.user.profilePhoto.updatedAt.getTime() : null;

        formattedSeller = {
          id: product.seller.id,
          userId: product.seller.userId,
          businessName: product.seller.businessName,
          district: product.seller.district,
          status: product.seller.status,
          whatsappNo: isCust ? product.seller.whatsappNo : null,
          facebookUrl: isCust ? product.seller.facebookUrl : null,
          messengerUrl: isCust ? product.seller.messengerUrl : null,
          reviewCount: sReviewCount,
          averageRating: sAverageRating,
          photoVersion,
          ...(photoVersion ? { photoUrl: `${publicBase(req)}/api/profile/photo/${product.seller.userId}?v=${photoVersion}` } : {})
        };
      }

      const { reviews: _r, ...rest } = product;
      return withDiscount({
        ...rest,
        messengerUrl: isCust ? rest.messengerUrl : null,
        averageRating: pAverageRating,
        reviewCount: pReviewCount,
        seller: formattedSeller
      });
    });

    res.json(transformed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 3. Get products for the logged-in seller (seller dashboard).
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

    const [clicks, ordersByStatus, delivered, topRaw, recentOrders, allSellerReviews, reviewAgg] = await Promise.all([
      prisma.clickAnalytics.findMany({ where: { sellerId: seller.id, timestamp: { gte: start } }, select: { timestamp: true }, take: 20000 }),
      prisma.order.groupBy({ by: ['status'], where: { sellerId: seller.id }, _count: { _all: true } }),
      prisma.order.aggregate({ where: { sellerId: seller.id, status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.clickAnalytics.groupBy({ by: ['productId'], where: { sellerId: seller.id, productId: { not: null } }, _count: { _all: true }, orderBy: { _count: { productId: 'desc' } }, take: 5 }),
      prisma.order.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, reference: true, status: true, total: true, createdAt: true, deliveryName: true, items: { select: { quantity: true } } }
      }),
      prisma.sellerReview.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { fullName: true } } }
      }),
      prisma.sellerReview.aggregate({
        where: { sellerId: seller.id },
        _count: { id: true },
        _avg: { rating: true }
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

    const sReviewCount = reviewAgg._count.id || 0;
    const sAverageRating = sReviewCount ? Math.round((reviewAgg._avg.rating || 0) * 10) / 10 : 0;

    res.json({
      clicksByDay,
      topProducts,
      orders: { byStatus, total: Object.values(byStatus).reduce((a, b) => a + b, 0), deliveredValue: Number(delivered._sum.total || 0) },
      recentOrders: recentOrders.map(({ items, total, ...order }) => ({ ...order, total: Number(total), itemCount: items.reduce((sum, item) => sum + item.quantity, 0) })),
      reviews: {
        averageRating: sAverageRating,
        reviewCount: sReviewCount,
        recent: allSellerReviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          reviewerName: r.customer?.fullName || 'Verified Buyer'
        }))
      }
    });
  } catch (error) {
    console.error('SELLER_OVERVIEW_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// All products belonging to the logged-in seller, including their view and enquiry counts
exports.getMyProducts = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(404).json({ message: 'Seller Profile එකක් හමු නොවීය.' });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [products, recentClicks] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId: sellerProfile.id },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { analytics: true } }
        }
      }),
      prisma.clickAnalytics.groupBy({
        by: ['productId'],
        where: { sellerId: sellerProfile.id, timestamp: { gte: weekAgo } },
        _count: { _all: true }
      })
    ]);

    const weekCounts = new Map(recentClicks.map((row) => [row.productId, row._count._all]));

    // The dashboard shows clickCount (total) and clicksThisWeek (last 7 days).
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
    if (sellerProfile.status !== 'APPROVED') {
      return res.status(403).json({ code: 'SELLER_NOT_APPROVED', message: 'Only approved sellers can set a discount.' });
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

// Sellers can opt into inventory tracking for one of their own products. Null turns tracking off.
exports.setStock = async (req, res) => {
  try {
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: req.user.userId }, select: { id: true } });
    if (!seller) return res.status(403).json({ code: 'NOT_SELLER', message: 'Only sellers can update stock.' });
    const input = req.body?.stock;
    const stock = input === null || input === '' ? null : Number(input);
    if (stock !== null && (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK)) {
      return res.status(400).json({ code: 'INVALID_STOCK', message: `Stock must be a whole number from 0 to ${MAX_STOCK}, or empty to leave tracking off.` });
    }
    const updated = await prisma.product.updateMany({ where: { id: String(req.params.id), sellerId: seller.id }, data: { stock } });
    if (updated.count === 0) return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found.' });
    const product = await prisma.product.findUnique({ where: { id: String(req.params.id) } });
    res.json({ product: withDiscount(product) });
  } catch (error) {
    console.error('SET_PRODUCT_STOCK_ERROR:', error);
    res.status(500).json({ message: 'Could not update product stock.' });
  }
};

// 4. Delete a seller's product (only their own products).
exports.deleteProduct = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(404).json({ message: 'Seller Profile එකක් හමු නොවීය.' });
    }

    // A seller an admin has removed cannot delete products
    if (sellerProfile.removedAt) {
      return res.status(403).json({
        code: 'ACCOUNT_REMOVED',
        message: 'This seller account has been removed.'
      });
    }

    // A seller can only delete a product they own
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        sellerId: sellerProfile.id
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'භාණ්ඩය හමු නොවීය, නැතහොත් එය මකා දැමීමට ඔබට අවසර නැත.' });
    }

    await prisma.product.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'භාණ්ඩය සාර්ථකව ඉවත් කරන ලදී.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// Track when a customer clicks on a product or enquiry button
exports.trackClick = async (req, res) => {
  try {
    const { productId, sellerId, type } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Click type is required.' });
    }

    await prisma.clickAnalytics.create({
      data: {
        productId: productId || null,
        sellerId: sellerId || null,
        type
      }
    });

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('TRACK_CLICK_ERROR:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
