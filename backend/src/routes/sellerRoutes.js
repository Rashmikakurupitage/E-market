const express = require('express');
const router = express.Router();
const { getSellerReviews, saveSellerReview, getMySellerReviews } = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authmiddleware');

// Seller reviews
router.get('/my-reviews', authMiddleware, getMySellerReviews);
router.get('/:id/reviews', getSellerReviews);
router.post('/:id/reviews', authMiddleware, saveSellerReview);

module.exports = router;
