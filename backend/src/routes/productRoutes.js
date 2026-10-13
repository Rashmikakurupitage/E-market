const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getMyProducts, getSellerOverview, getProductImage, deleteProduct, trackClick } = require('../controllers/productController');
const authMiddleware = require('../middlewares/authmiddleware');

// Public routes
router.get('/', getAllProducts);
router.post('/track-click', trackClick);
router.get('/images/:id', getProductImage);

// Protected routes (Seller only)
router.get('/my-products', authMiddleware, getMyProducts);
router.get('/seller-overview', authMiddleware, getSellerOverview);
router.post('/', authMiddleware, createProduct);
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;