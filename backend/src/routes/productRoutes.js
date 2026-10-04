const express = require('express');
const router = express.Router();
const { createProduct, getAllProducts, getMyProducts, deleteProduct, trackClick } = require('../controllers/productController');
const authMiddleware = require('../middlewares/authmiddleware');

// Public routes
router.get('/', getAllProducts);
router.post('/track-click', trackClick);

// Protected routes (Seller only)
router.get('/my-products', authMiddleware, getMyProducts);
router.post('/', authMiddleware, createProduct);
router.delete('/:id', authMiddleware, deleteProduct);

module.exports = router;