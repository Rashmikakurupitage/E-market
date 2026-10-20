const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getMyProducts, getSellerOverview, getProductImage, setDiscount, deleteProduct, trackClick } = require('../controllers/productController');
const { getProductReviews, saveProductReview } = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authmiddleware');

// Public routes
router.get('/', getAllProducts);
router.post('/track-click', trackClick);
router.get('/images/:id', getProductImage);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', authMiddleware, saveProductReview);

// Protected routes (Seller only)
router.get('/my-products', authMiddleware, getMyProducts);
router.get('/seller-overview', authMiddleware, getSellerOverview);
router.post('/', authMiddleware, createProduct);
router.patch('/:id/discount', authMiddleware, setDiscount);
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;