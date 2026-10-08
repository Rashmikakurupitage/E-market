const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { isEmailConfigured } = require('./utils/mailer');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Lanka Women E-Market API is Running Smoothly!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, (error) => {
  if (error) {
    // e.g. EADDRINUSE: another backend is already running on this port
    console.error(`Could not start on port ${PORT}: ${error.message}`);
    process.exit(1);
  }
  console.log(`Server is running on port ${PORT}`);
  console.log(
    isEmailConfigured()
      ? `Email: login codes are sent through ${process.env.SMTP_HOST}`
      : 'Email: NOT set up - login codes will be printed here. Add SMTP settings to backend/.env to email them.'
  );
});