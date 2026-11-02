const express = require('express');
const router = express.Router();
const { rateLimit } = require('express-rate-limit');
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
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
  verifyEmailChange
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
const authAttemptLimiter = createAuthLimiter(10, 15 * 60 * 1000);
const registerLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const resendVerificationLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const passwordResetLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const sellerLoginCodeLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const customerLoginCodeLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const adminLoginCodeLimiter = createAuthLimiter(8, 60 * 60 * 1000);
const emailChangeCodeLimiter = createAuthLimiter(8, 60 * 60 * 1000);

router.get('/csrf', getCsrfToken);
router.post('/logout', (_req, res) => {
  clearSessionCookies(res);
  res.json({ message: 'Logged out.' });
});

router.post('/register', registerLimiter, register);
router.post('/login', authAttemptLimiter, login);
router.post('/verify-email', authAttemptLimiter, verifyEmail);
router.post('/resend-verification', resendVerificationLimiter, resendVerification);
router.post('/forgot-password', passwordResetLimiter, requestPasswordReset);
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

// Logged-in users change their own contact details (a new email must be confirmed with a code sent to it)
router.patch('/me/phone', authMiddleware, updatePhone);
router.post('/me/email/request-code', authMiddleware, emailChangeCodeLimiter, requestEmailChangeCode);
router.post('/me/email/verify-code', authMiddleware, authAttemptLimiter, verifyEmailChange);

module.exports = router;
