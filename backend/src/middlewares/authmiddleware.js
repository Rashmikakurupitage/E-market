const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'ඇතුළු වීමට අවසර නැත. Token එක නොමැත.' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'අවලංගු හෝ කල්ඉකුත් වූ Token එකකි.' });
  }

  // A seller an admin has removed can no longer use an earlier login
  if (decoded.role === 'SELLER') {
    try {
      const seller = await prisma.sellerProfile.findUnique({ where: { userId: decoded.userId }, select: { removedAt: true } });
      if (seller?.removedAt) {
        return res.status(403).json({ code: 'ACCOUNT_REMOVED', message: 'This seller account has been removed.' });
      }
    } catch (error) {
      console.error('AUTH_REMOVED_CHECK_ERROR:', error);
      return res.status(500).json({ message: 'Server error.' });
    }
  }

  if (decoded.role === 'CUSTOMER') {
    try {
      const customer = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { removedAt: true } });
      if (!customer || customer.removedAt) {
        return res.status(403).json({ code: 'ACCOUNT_REMOVED', message: 'This customer account has been removed.' });
      }
    } catch (error) {
      console.error('AUTH_REMOVED_CHECK_ERROR:', error);
      return res.status(500).json({ message: 'Server error.' });
    }
  }

  req.user = decoded; // { userId, role }
  next();
};
