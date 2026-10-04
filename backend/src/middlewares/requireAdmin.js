const prisma = require('../config/db');

// Use after authmiddleware. Checks the database (not just the token) that the user is still an admin,
// so a removed admin loses access straight away.
module.exports = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ code: 'NOT_ADMIN', message: 'මෙම කොටසට පිවිසිය හැක්කේ පරිපාලකයින්ට පමණි.' });
    }

    next();
  } catch (error) {
    console.error('ADMIN_CHECK_ERROR:', error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};
