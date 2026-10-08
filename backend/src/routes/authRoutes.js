const express = require('express');
const router = express.Router();
const {
  register,
  login,
  requestSellerLoginCode,
  verifySellerLoginCode,
  requestCustomerLoginCode,
  verifyCustomerLoginCode,
  requestAdminLoginCode,
  verifyAdminLoginCode,
  me,
  updatePhone,
  requestEmailChangeCode,
  verifyEmailChange
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authmiddleware');

router.post('/register', register);
router.post('/login', login);

// Seller login: email + NIC, then the 6-digit code sent by email
router.post('/seller-login/request-code', requestSellerLoginCode);
router.post('/seller-login/verify-code', verifySellerLoginCode);

// Customer login works the same way
router.post('/customer-login/request-code', requestCustomerLoginCode);
router.post('/customer-login/verify-code', verifyCustomerLoginCode);

// Admins log in like sellers. New admin accounts are added on the server with `npm run add-admin`.
router.post('/admin-login/request-code', requestAdminLoginCode);
router.post('/admin-login/verify-code', verifyAdminLoginCode);

router.get('/me', authMiddleware, me);

// Logged-in users change their own contact details (a new email must be confirmed with a code sent to it)
router.patch('/me/phone', authMiddleware, updatePhone);
router.post('/me/email/request-code', authMiddleware, requestEmailChangeCode);
router.post('/me/email/verify-code', authMiddleware, verifyEmailChange);

module.exports = router;
