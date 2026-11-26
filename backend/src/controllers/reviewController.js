const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const MAX_COMMENT_LENGTH = 1000;

const getCustomer = (userId) => prisma.customerProfile.findUnique({
  where: { userId },
  select: { id: true }
});

// Reviews are public, so these routes have no login middleware. When the visitor is logged in
// (session cookie, or a Bearer token from older clients), return their customer profile so the
// page can show the review form and their existing review. Revoked or removed sessions count as logged out.
const getOptionalCustomer = async (req) => {
  let token = req.cookies?.lw_session;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
  if (decoded.role !== 'CUSTOMER') return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { role: true, removedAt: true, sessionVersion: true }
  });
  if (
    !user ||
    user.role !== 'CUSTOMER' ||
    user.removedAt ||
    (decoded.sessionVersion !== undefined && decoded.sessionVersion !== user.sessionVersion)
  ) {
    return null;
  }
  return getCustomer(decoded.userId);
};

// Reviews are public; an authenticated customer receives their review eligibility and existing review.
exports.getProductReviews = async (req, res) => {
  try {
    const productId = String(req.params.id);
    const reviews = await prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            fullName: true,
            userId: true,
            user: { select: { profilePhoto: { select: { updatedAt: true } } } }
          }
        }
      }
    });
    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
      : 0;

    let canReview = false;
    let myReview = null;
    const customer = await getOptionalCustomer(req);
    if (customer) {
      canReview = true;
      myReview = await prisma.productReview.findUnique({
        where: { productId_customerId: { productId, customerId: customer.id } },
        select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true }
      });
    }

    const deliveredCustomerIds = new Set(
      (await prisma.orderItem.findMany({
        where: {
          productId,
          order: { status: 'DELIVERED' }
        },
        select: { order: { select: { customerId: true } } }
      })).map((item) => item.order?.customerId).filter(Boolean)
    );

    res.json({
      reviews: reviews.map((r) => {
        const isVerifiedBuyer = deliveredCustomerIds.has(r.customerId);
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          isVerifiedBuyer,
          reviewerName: r.customer?.fullName || (isVerifiedBuyer ? 'Verified Buyer' : 'Customer'),
          reviewerUserId: r.customer?.userId || null,
          reviewerPhotoVersion: r.customer?.user?.profilePhoto ? r.customer.user.profilePhoto.updatedAt.getTime() : null
        };
      }),
      reviewCount,
      averageRating,
      canReview,
      myReview
    });
  } catch (error) {
    console.error('PRODUCT_REVIEWS_ERROR:', error);
    res.status(500).json({ message: 'Could not load product reviews.' });
  }
};

// Any customer can create or update a review for a product.
exports.saveProductReview = async (req, res) => {
  try {
    const customer = await getCustomer(req.user.userId);
    if (!customer) {
      return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts can review products.' });
    }

    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ code: 'INVALID_RATING', message: 'Choose a rating from 1 to 5 stars.' });
    }
    if (!comment || comment.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({ code: 'INVALID_COMMENT', message: `Write a comment of up to ${MAX_COMMENT_LENGTH} characters.` });
    }

    const productId = String(req.params.id);

    const review = await prisma.productReview.upsert({
      where: { productId_customerId: { productId, customerId: customer.id } },
      create: { productId, customerId: customer.id, rating, comment },
      update: { rating, comment },
      select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true }
    });
    res.json({ review });
  } catch (error) {
    console.error('SAVE_PRODUCT_REVIEW_ERROR:', error);
    res.status(500).json({ message: 'Could not save product review.' });
  }
};

// Reviews of a seller are public; an authenticated customer also receives their review eligibility and existing review.
exports.getSellerReviews = async (req, res) => {
  try {
    const sellerId = String(req.params.id);
    const reviews = await prisma.sellerReview.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerId: true,
        rating: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            fullName: true,
            userId: true,
            user: { select: { profilePhoto: { select: { updatedAt: true } } } }
          }
        }
      }
    });

    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
      : 0;

    let canReview = false;
    let myReview = null;
    const customer = await getOptionalCustomer(req);
    if (customer) {
      canReview = true;
      myReview = await prisma.sellerReview.findUnique({
        where: { sellerId_customerId: { sellerId, customerId: customer.id } },
        select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true }
      });
    }

    const deliveredCustomerIds = new Set(
      (await prisma.order.findMany({
        where: { sellerId, status: 'DELIVERED' },
        select: { customerId: true }
      })).map((o) => o.customerId).filter(Boolean)
    );

    res.json({
      reviews: reviews.map((r) => {
        const isVerifiedBuyer = deliveredCustomerIds.has(r.customerId);
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          isVerifiedBuyer,
          reviewerName: r.customer?.fullName || (isVerifiedBuyer ? 'Verified Buyer' : 'Customer'),
          reviewerUserId: r.customer?.userId || null,
          reviewerPhotoVersion: r.customer?.user?.profilePhoto ? r.customer.user.profilePhoto.updatedAt.getTime() : null
        };
      }),
      reviewCount,
      averageRating,
      canReview,
      myReview
    });
  } catch (error) {
    console.error('SELLER_REVIEWS_ERROR:', error);
    res.status(500).json({ message: 'Could not load seller reviews.' });
  }
};

// Any customer can create or update a review for a seller.
exports.saveSellerReview = async (req, res) => {
  try {
    const customer = await getCustomer(req.user.userId);
    if (!customer) {
      return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customer accounts can review sellers.' });
    }

    const rating = Number(req.body?.rating);
    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ code: 'INVALID_RATING', message: 'Choose a rating from 1 to 5 stars.' });
    }
    if (!comment || comment.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({ code: 'INVALID_COMMENT', message: `Write a comment of up to ${MAX_COMMENT_LENGTH} characters.` });
    }

    const sellerId = String(req.params.id);

    const review = await prisma.sellerReview.upsert({
      where: { sellerId_customerId: { sellerId, customerId: customer.id } },
      create: { sellerId, customerId: customer.id, rating, comment },
      update: { rating, comment },
      select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true }
    });
    res.json({ review });
  } catch (error) {
    console.error('SAVE_SELLER_REVIEW_ERROR:', error);
    res.status(500).json({ message: 'Could not save seller review.' });
  }
};

// For a logged-in seller to view all reviews and ratings given to them.
exports.getMySellerReviews = async (req, res) => {
  try {
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    if (!seller) {
      return res.status(403).json({ message: 'Only seller accounts have this.' });
    }

    const reviews = await prisma.sellerReview.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        customer: { select: { fullName: true } }
      }
    });

    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
      : 0;

    res.json({
      reviews: reviews.map((r) => ({
        ...r,
        reviewerName: r.customer?.fullName || 'Customer',
        customer: undefined
      })),
      reviewCount,
      averageRating
    });
  } catch (error) {
    console.error('GET_MY_SELLER_REVIEWS_ERROR:', error);
    res.status(500).json({ message: 'Could not load your reviews.' });
  }
};

// For the logged-in seller's workspace: reviews customers left on her products, with a star breakdown.
exports.getMyProductReviews = async (req, res) => {
  try {
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true }
    });
    if (!seller) {
      return res.status(403).json({ code: 'NOT_SELLER', message: 'Only seller accounts have this.' });
    }

    const where = { product: { sellerId: seller.id } };
    const [summary, byRating, reviews] = await Promise.all([
      prisma.productReview.aggregate({ where, _avg: { rating: true }, _count: { _all: true } }),
      prisma.productReview.groupBy({ by: ['rating'], where, _count: { _all: true } }),
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          product: { select: { id: true, title: true } }
        }
      })
    ]);

    const ratingCounts = Object.fromEntries([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
    byRating.forEach(({ rating, _count }) => {
      ratingCounts[rating] = _count._all;
    });
    const reviewCount = summary._count._all;
    res.json({
      reviewCount,
      averageRating: reviewCount ? Math.round((summary._avg.rating || 0) * 10) / 10 : 0,
      ratingCounts,
      reviews
    });
  } catch (error) {
    console.error('MY_PRODUCT_REVIEWS_ERROR:', error);
    res.status(500).json({ message: 'Could not load your product reviews.' });
  }
};
