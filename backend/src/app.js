const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const siteRoutes = require('./routes/siteRoutes');
const profileRoutes = require('./routes/profileRoutes');
const learningRoutes = require('./routes/learningRoutes');
const { getEmailProvider, isEmailConfigured } = require('./utils/mailer');

const app = express();

// Middlewares
app.use(cors());
// 3 MB: the admin's home page picture is sent as an image in the request
app.use(express.json({ limit: '6mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/learning', learningRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Lanka Women E-Market API is Running Smoothly!' });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(
    isEmailConfigured()
      ? `Email: login codes use the ${getEmailProvider()} provider`
      : 'Email: NOT set up - configure EMAIL_PROVIDER and its settings in backend/.env.'
  );
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.warn(`Port ${PORT} is temporarily busy. Waiting 1 second to retry...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error(`Could not start on port ${PORT}:`, error);
    process.exit(1);
  }
});

function gracefulShutdown() {
  server.close(() => {
    process.exit(0);
  });
}
process.once('SIGUSR2', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);