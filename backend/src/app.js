const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  if (process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET must be configured with a random value of at least 32 bytes.');
    process.exit(1);
  } else {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_jwt_secret_32bytes_long_minimum!';
  }
}

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const siteRoutes = require('./routes/siteRoutes');
const profileRoutes = require('./routes/profileRoutes');
const customerRoutes = require('./routes/customerRoutes');
const sellerRoutes = require('./routes/sellerRoutes');
const learningRoutes = require('./routes/learningRoutes');
const { getEmailProvider, isEmailConfigured } = require('./utils/mailer');
const nicVault = require('./utils/nicVault');

const app = express();
try {
  nicVault.validateKey();
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    console.error(error.message);
    process.exit(1);
  } else {
    console.warn('NIC Vault warning:', error.message);
  }
}

const { COOKIE_SAME_SITE } = require('./utils/authCookies');
if (!['lax', 'strict', 'none'].includes(COOKIE_SAME_SITE)) {
  console.error('AUTH_COOKIE_SAME_SITE must be lax, strict, or none.');
  process.exit(1);
}
if (COOKIE_SAME_SITE === 'none' && process.env.NODE_ENV !== 'production') {
  console.error('AUTH_COOKIE_SAME_SITE=none requires NODE_ENV=production and HTTPS.');
  process.exit(1);
}
const proxyHops = process.env.TRUST_PROXY_HOPS;
if (proxyHops) {
  if (!/^[1-5]$/.test(proxyHops)) {
    console.error('TRUST_PROXY_HOPS must be a number from 1 to 5.');
    process.exit(1);
  }
  app.set('trust proxy', Number(proxyHops));
}

const allowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://localhost:3001');
} else {
  for (const origin of allowedOrigins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      console.error('CORS_ALLOWED_ORIGINS must contain exact HTTPS origins.');
      process.exit(1);
    }
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
      console.error('CORS_ALLOWED_ORIGINS must contain exact HTTPS origins without paths or wildcards.');
      process.exit(1);
    }
  }
}

const createRateLimiter = (limit, windowMs) => rateLimit({
  windowMs,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
});

// Middlewares
app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: { action: 'deny' },
  hsts: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
// 15 MB: support NIC card photos, 3D face scans, and home page media
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());

// Routes
app.use('/api', createRateLimiter(600, 15 * 60 * 1000));
app.use('/api/auth', createRateLimiter(60, 15 * 60 * 1000));
app.use('/api', require('./middlewares/csrfProtection'));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/learning', learningRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Lanka Women E-Market API is Running Smoothly!' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'API route not found.' });
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status === 413 ? 413 : error.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error('API_REQUEST_ERROR:', error?.name || 'Unknown error');
  res.status(status).json({
    code: status === 413 ? 'REQUEST_TOO_LARGE' : status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_ERROR',
    message: status === 413 ? 'Request body is too large.' : status === 400 ? 'Request body is invalid.' : 'Request could not be processed.',
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production' && allowedOrigins.size === 0) {
    console.warn('CORS: CORS_ALLOWED_ORIGINS is empty; browser requests from other origins are blocked.');
  }
  console.log(
    isEmailConfigured()
      ? `Email: login codes use the ${getEmailProvider()} provider`
      : 'Email: NOT set up - configure EMAIL_PROVIDER and its settings in backend/.env.'
  );
});

module.exports = { app, server };
