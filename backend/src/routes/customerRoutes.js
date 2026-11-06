const express = require('express');
const authMiddleware = require('../middlewares/authmiddleware');
const {
  getSavedDeliveryDetails,
  saveDeliveryDetails,
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  syncCart,
  saveCart,
} = require('../controllers/customerController');

const router = express.Router();
router.use(authMiddleware);
router.get('/delivery-details', getSavedDeliveryDetails);
router.put('/delivery-details', saveDeliveryDetails);
router.get('/wishlist', getWishlist);
router.put('/wishlist/:productId', addWishlistItem);
router.delete('/wishlist/:productId', removeWishlistItem);
router.post('/cart/sync', syncCart);
router.put('/cart', saveCart);

module.exports = router;
