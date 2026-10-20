const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const MAX_COMMENT_LENGTH = 1000;

const getCustomer = (userId) => prisma.customerProfile.findUnique({
  where: { userId },
  select: { id: true }
});

// Reviews are public; an authenticated buyer also receives their review eligibility and existing review.
exports.getProductReviews = async (req, res) => {
  try {
    const productId = String(req.params.id);
    const reviews = await prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true }
    });
    const reviewCount = reviews.length;
    const averageRating = reviewCount
      ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount) * 10) / 10
      : 0;

    let canReview = false;
    let myReview = null;
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
        if (decoded.role === 'CUSTOMER') {
          const customer = await getCustomer(decoded.userId);
          if (customer) {
            const [deliveredPurchase, savedReview] = await Promise.all([
              prisma.orderItem.findFirst({
                where: { productId, order: { customerId: customer.id, status: 'DELIVERED' } },
                select: { id: true }
              }),
              prisma.productReview.findUnique({
                where: { productId_customerId: { productId, customerId: customer.id } },
                select: { id: true, rating: true, comment: true, createdAt: true, updatedAt: true }
              })
            ]);
            canReview = Boolean(deliveredPurchase);
            myReview = savedReview;
          }
        }
      } catch (error) {
        if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') throw error;
      }
    }

    res.json({ reviews, reviewCount, averageRating, canReview, myReview });
  } catch (error) {
    console.error('PRODUCT_REVIEWS_ERROR:', error);
    res.status(500).json({ message: 'Could not load product reviews.' });
  }
};

// Only a customer with a delivered order containing this product can create or update a review.
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
    const deliveredPurchase = await prisma.orderItem.findFirst({
      where: { productId, order: { customerId: customer.id, status: 'DELIVERED' } },
      select: { id: true }
    });
    if (!deliveredPurchase) {
      return res.status(403).json({ code: 'PURCHASE_REQUIRED', message: 'A delivered purchase is required to review this product.' });
    }

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
