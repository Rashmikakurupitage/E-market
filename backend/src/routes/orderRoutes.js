const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const {
  placeOrder,
  getMyOrders,
  cancelMyOrder,
  getSellerOrders,
  updateOrderStatus
} = require('../controllers/orderController');

// Every order route needs a login; each handler checks it is a customer or a seller account
router.use(authMiddleware);

// Customers
router.post('/', placeOrder);
router.get('/mine', getMyOrders);
router.patch('/:id/cancel', cancelMyOrder);

// Sellers
router.get('/seller', getSellerOrders);
router.patch('/:id/status', updateOrderStatus);

module.exports = router;
