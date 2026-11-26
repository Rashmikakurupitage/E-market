const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getMyProducts,
  getSellerOverview,
  getProductImage,
  setDiscount,
  setStock,
  deleteProduct,
  trackClick
} = require('../controllers/productController');
const { getProductReviews, saveProductReview, getMyProductReviews } = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authmiddleware');

// Public routes
router.get('/', getAllProducts);
router.post('/track-click', trackClick);
router.get('/images/:id', getProductImage);
// Reviews on the logged-in seller's products (Seller workspace > Reviews)
router.get('/seller/reviews', authMiddleware, getMyProductReviews);
router.get('/:id/reviews', getProductReviews);
router.post('/:id/reviews', authMiddleware, saveProductReview);

// Seller dashboard routes
router.get('/my-products', authMiddleware, getMyProducts);
router.get('/seller-overview', authMiddleware, getSellerOverview);
router.post('/', authMiddleware, createProduct);
router.patch('/:id/discount', authMiddleware, setDiscount);
router.patch('/:id/stock', authMiddleware, setStock);
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;
