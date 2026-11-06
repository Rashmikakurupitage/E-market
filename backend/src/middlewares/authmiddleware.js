const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

module.exports = async (req, res, next) => {
  let token = req.cookies?.lw_session;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'ඇතුළු වීමට අවසර නැත. Session එක නොමැත.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'අවලංගු හෝ කල්ඉකුත් වූ Token එකකි.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, removedAt: true, sessionVersion: true },
    });
    if (
      !user ||
      user.role !== decoded.role ||
      (decoded.sessionVersion !== undefined && user.sessionVersion !== undefined && decoded.sessionVersion !== user.sessionVersion) ||
      user.removedAt
    ) {
      return res.status(401).json({ message: 'Your session is no longer valid. Please log in again.' });
    }

    // A seller removed by an administrator cannot keep using an earlier session.
    if (decoded.role === 'SELLER') {
      const seller = await prisma.sellerProfile.findUnique({ where: { userId: decoded.userId }, select: { removedAt: true } });
      if (seller?.removedAt) {
        return res.status(403).json({ code: 'ACCOUNT_REMOVED', message: 'This seller account has been removed.' });
      }
    }

    if (decoded.role === 'CUSTOMER') {
      if (user.removedAt) {
        return res.status(403).json({ code: 'ACCOUNT_REMOVED', message: 'This customer account has been removed.' });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('AUTH_REMOVED_CHECK_ERROR:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};
