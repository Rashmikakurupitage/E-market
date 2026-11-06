const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
  requestSellerLoginCode,
  verifySellerLoginCode,
  requestCustomerLoginCode,
  verifyCustomerLoginCode,
  requestAdminLoginCode,
  verifyAdminLoginCode,
  me,
  updatePhone,
  requestEmailChangeCode,
  verifyEmailChange,
  scanNic
} = require('../controllers/authController');
const authMiddleware = require('../middlewares/authmiddleware');
const { clearSessionCookies, getCsrfToken } = require('../utils/authCookies');

const createAuthLimiter = (limit, windowMs) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' },
});
const authAttemptLimiter = createAuthLimiter(20, 15 * 60 * 1000);
const registerLimiter = createAuthLimiter(20, 60 * 60 * 1000);
const resendVerificationLimiter = createAuthLimiter(20, 60 * 60 * 1000);
const passwordResetLimiter = createAuthLimiter(20, 60 * 60 * 1000);
const sellerLoginCodeLimiter = createAuthLimiter(20, 60 * 60 * 1000);
const customerLoginCodeLimiter = createAuthLimiter(20, 60 * 60 * 1000);
const adminLoginCodeLimiter = createAuthLimiter(20, 60 * 60 * 1000);
const emailChangeCodeLimiter = createAuthLimiter(20, 60 * 60 * 1000);

router.get('/csrf', getCsrfToken);
router.post('/logout', (_req, res) => {
  clearSessionCookies(res);
  res.json({ message: 'Logged out.' });
});

router.post('/scan-nic', scanNic);
router.post('/register', registerLimiter, register);
router.post('/login', authAttemptLimiter, login);
router.post('/verify-email', authAttemptLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerification);
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);
router.post('/verify-reset-code', authAttemptLimiter, verifyPasswordResetCode);
router.post('/reset-password', authAttemptLimiter, resetPassword);

// Seller login: email + NIC, then the 6-digit code sent by email
router.post('/seller-login/request-code', sellerLoginCodeLimiter, requestSellerLoginCode);
router.post('/seller-login/verify-code', authAttemptLimiter, verifySellerLoginCode);

// Customer login works the same way
router.post('/customer-login/request-code', customerLoginCodeLimiter, requestCustomerLoginCode);
router.post('/customer-login/verify-code', authAttemptLimiter, verifyCustomerLoginCode);

// Admins log in like sellers. New admin accounts are added on the server with `npm run add-admin`.
router.post('/admin-login/request-code', adminLoginCodeLimiter, requestAdminLoginCode);
router.post('/admin-login/verify-code', authAttemptLimiter, verifyAdminLoginCode);

router.get('/me', authMiddleware, me);

router.patch('/update-phone', authMiddleware, updatePhone);
router.post('/request-email-change', authMiddleware, emailChangeCodeLimiter, requestEmailChangeCode);
router.post('/verify-email-change', authMiddleware, authAttemptLimiter, verifyEmailChange);

module.exports = router;
