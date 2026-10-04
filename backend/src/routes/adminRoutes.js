const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const {
  getStats,
  listSellers,
  getSellerProducts,
  setSellerStatus,
  listProducts,
  setProductPublished,
  deleteProduct
} = require('../controllers/adminController');

// Every admin route needs a logged-in admin
router.use(authMiddleware, requireAdmin);

router.get('/stats', getStats);

router.get('/sellers', listSellers);
router.get('/sellers/:id/products', getSellerProducts);
router.patch('/sellers/:id/status', setSellerStatus);

router.get('/products', listProducts);
router.patch('/products/:id', setProductPublished);
router.delete('/products/:id', deleteProduct);

module.exports = router;
