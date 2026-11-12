const prisma = require('../config/db');
const crypto = require('crypto');
const nicVault = require('../utils/nicVault');
const bcrypt = require('bcryptjs');

// Every route here is behind authmiddleware + requireAdmin (see routes/adminRoutes.js)

const SELLER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;
const NIC_PATTERN = /^(\d{9}[VX]|\d{12})$/;
const weekAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const serverError = (res, label, error) => {
  console.error(label, error);
  res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
};

// Admin accounts can only be created through this route, which is protected by requireAdmin.
exports.createAdmin = async (req, res) => {
  try {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').replace(/[\s-]/g, '');
    const nicNumber = String(req.body.nicNumber || '').trim().toUpperCase();

    if (!fullName || !email || !phone || !nicNumber) {
      return res.status(400).json({ code: 'MISSING_DETAILS', message: 'All admin details are required.' });
    }
    if (fullName.length > 120) {
      return res.status(400).json({ code: 'INVALID_NAME', message: 'Name must be 120 characters or fewer.' });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Enter a valid email address.' });
    }
    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ code: 'INVALID_PHONE', message: 'Enter a valid Sri Lankan phone number.' });
    }
    if (!NIC_PATTERN.test(nicNumber)) {
      return res.status(400).json({ code: 'INVALID_NIC', message: 'Enter a valid NIC number.' });
    }

    const [existingUser, existingAdminNic] = await Promise.all([
      prisma.user.findFirst({
        where: {
          OR: [
            { email: { equals: email, mode: 'insensitive' } },
            { phone }
          ]
        },
        select: { email: true, phone: true }
      }),
      prisma.adminProfile.findUnique({ where: { nicNumber }, select: { id: true } })
    ]);

    if (existingUser?.email.toLowerCase() === email) {
      return res.status(409).json({ code: 'EMAIL_TAKEN', message: 'This email is already registered.' });
    }
    if (existingUser?.phone === phone) {
      return res.status(409).json({ code: 'PHONE_TAKEN', message: 'This phone number is already registered.' });
    }
    if (existingAdminNic) {
      return res.status(409).json({ code: 'NIC_TAKEN', message: 'This NIC number is already registered to an admin.' });
    }

    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const admin = await prisma.user.create({
      data: {
        email,
        phone,
        role: 'SUPER_ADMIN',
        passwordHash,
        emailVerifiedAt: new Date(),
        adminProfile: { create: { fullName, nicNumber } }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        adminProfile: { select: { fullName: true } }
      }
    });

    res.status(201).json({
      message: 'Admin account created successfully.',
      admin: { id: admin.id, email: admin.email, phone: admin.phone, fullName: admin.adminProfile.fullName }
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(' ') : String(error.meta?.target || '');
      const code = target.includes('email')
        ? 'EMAIL_TAKEN'
        : target.includes('phone')
          ? 'PHONE_TAKEN'
          : 'NIC_TAKEN';
      return res.status(409).json({ code, message: 'An account with these details already exists.' });
    }
    serverError(res, 'ADMIN_CREATE_ADMIN_ERROR:', error);
  }
};

exports.listAdmins = async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        createdAt: true,
        adminProfile: { select: { fullName: true, isPrimary: true } },
        profilePhoto: { select: { updatedAt: true } }
      }
    });

    const viewer = admins.find((admin) => admin.id === req.user.userId);
    res.json({
      viewerIsPrimary: !!viewer?.adminProfile?.isPrimary,
      admins: admins.map(({ adminProfile, profilePhoto, ...user }) => ({
        ...user,
        fullName: adminProfile?.fullName || '',
        isPrimary: !!adminProfile?.isPrimary,
        photoVersion: profilePhoto ? profilePhoto.updatedAt.getTime() : null
      }))
    });
  } catch (error) {
    serverError(res, 'ADMIN_LIST_ADMINS_ERROR:', error);
  }
};

// Only the super admin can remove another admin (never themselves, never the super admin)
exports.removeAdmin = async (req, res) => {
  try {
    const id = String(req.params.id);
    const viewer = await prisma.adminProfile.findUnique({ where: { userId: req.user.userId }, select: { isPrimary: true } });
    if (!viewer?.isPrimary) {
      return res.status(403).json({ code: 'NOT_PRIMARY_ADMIN', message: 'Only the super admin can remove admins.' });
    }
    if (id === req.user.userId) {
      return res.status(400).json({ code: 'CANNOT_REMOVE_SELF', message: 'You cannot remove your own account.' });
    }
    const target = await prisma.user.findFirst({ where: { id, role: 'SUPER_ADMIN' }, select: { id: true, adminProfile: { select: { isPrimary: true } } } });
    if (!target) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Admin not found.' });
    }
    if (target.adminProfile?.isPrimary) {
      return res.status(400).json({ code: 'CANNOT_REMOVE_PRIMARY', message: 'The super admin cannot be removed.' });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ removed: true });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(409).json({ code: 'ADMIN_IN_USE', message: 'This admin has records that must be kept.' });
    }
    serverError(res, 'ADMIN_REMOVE_ADMIN_ERROR:', error);
  }
};

// 1. Totals for the top of the admin dashboard
exports.getStats = async (req, res) => {
  try {
    const [sellersByStatus, totalProducts, productsOnSite, totalClicks, clicksThisWeek, complaintsByStatus] = await Promise.all([
      prisma.sellerProfile.groupBy({ by: ['status'], where: { removedAt: null }, _count: { _all: true } }),
      prisma.product.count({ where: { seller: { removedAt: null } } }),
      prisma.product.count({ where: { isPublished: true, seller: { status: 'APPROVED' } } }),
      prisma.clickAnalytics.count(),
      prisma.clickAnalytics.count({ where: { timestamp: { gte: weekAgo() } } }),
      prisma.complaint.groupBy({ by: ['status'], _count: { _all: true } })
    ]);

    const complaints = { OPEN: 0, IN_REVIEW: 0, RESOLVED: 0, DISMISSED: 0 };
    complaintsByStatus.forEach((row) => {
      complaints[row.status] = row._count._all;
    });

    const sellers = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    sellersByStatus.forEach((row) => {
      sellers[row.status] = row._count._all;
    });

    res.json({
      sellers,
      products: { total: totalProducts, onSite: productsOnSite },
      clicks: { total: totalClicks, thisWeek: clicksThisWeek },
      complaints
    });
  } catch (error) {
    serverError(res, 'ADMIN_STATS_ERROR:', error);
  }
};

// Everything the overview page needs in one call: totals, 14-day charts, and what needs attention
const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

exports.getOverview = async (req, res) => {
  try {
    const yearNum = req.query.year ? Number(req.query.year) : null;
    const monthNum = req.query.month ? Number(req.query.month) : null;
    const dayNum = req.query.day ? Number(req.query.day) : null;

    let start;
    let end;
    let DAYS;

    if (yearNum && yearNum >= 2000 && yearNum <= 2100) {
      if (dayNum && dayNum >= 1 && dayNum <= 31 && monthNum && monthNum >= 1 && monthNum <= 12) {
        start = new Date(yearNum, monthNum - 1, dayNum, 0, 0, 0, 0);
        end = new Date(yearNum, monthNum - 1, dayNum, 23, 59, 59, 999);
        DAYS = 1;
      } else if (monthNum && monthNum >= 1 && monthNum <= 12) {
        start = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0);
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        end = new Date(yearNum, monthNum - 1, daysInMonth, 23, 59, 59, 999);
        DAYS = daysInMonth;
      } else {
        start = new Date(yearNum, 0, 1, 0, 0, 0, 0);
        end = new Date(yearNum, 11, 31, 23, 59, 59, 999);
        const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || yearNum % 400 === 0;
        DAYS = isLeap ? 366 : 365;
      }
    } else {
      const requestedDays = Number(req.query.days);
      DAYS = Number.isInteger(requestedDays) && requestedDays >= 1 && requestedDays <= 365 ? requestedDays : 14;
      start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (DAYS - 1));
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    const [customers, sellers, newRegistrations, orders, ordersByStatus, delivered, clicks, topRaw, pendingSellers, recentComplaints] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER', removedAt: null } }),
      prisma.user.count({ where: { role: 'SELLER', removedAt: null, sellerProfile: { is: { removedAt: null } } } }),
      prisma.user.findMany({
        where: { role: { in: ['CUSTOMER', 'SELLER'] }, removedAt: null, createdAt: { gte: start, lte: end } },
        select: { role: true, createdAt: true }
      }),
      prisma.order.count(),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.clickAnalytics.findMany({ where: { timestamp: { gte: start, lte: end } }, select: { timestamp: true }, take: 50000 }),
      prisma.clickAnalytics.groupBy({ by: ['sellerId'], _count: { _all: true }, orderBy: { _count: { sellerId: 'desc' } }, take: 8 }),
      prisma.sellerProfile.findMany({
        where: { status: 'PENDING', removedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, businessName: true, district: true, createdAt: true }
      }),
      prisma.complaint.findMany({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          reference: true,
          reason: true,
          message: true,
          status: true,
          createdAt: true,
          customer: { select: { fullName: true } },
          seller: { select: { businessName: true } }
        }
      })
    ]);

    // The same number of days just before this period, so the dashboard can show whether things are up or down
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - DAYS);
    const [previousRegistrations, previousClicks, recentSignups] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['CUSTOMER', 'SELLER'] }, createdAt: { gte: previousStart, lt: start } } }),
      prisma.clickAnalytics.count({ where: { timestamp: { gte: previousStart, lt: start } } }),
      prisma.user.findMany({
        where: { role: { in: ['CUSTOMER', 'SELLER'] }, removedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          role: true,
          createdAt: true,
          customerProfile: { select: { fullName: true } },
          sellerProfile: { select: { businessName: true, firstName: true, lastName: true, district: true } }
        }
      })
    ]);

    // One entry per day, oldest first, including days with no enquiries
    const perDay = new Map();
    clicks.forEach((click) => perDay.set(dayKey(click.timestamp), (perDay.get(dayKey(click.timestamp)) || 0) + 1));
    const clicksByDay = Array.from({ length: DAYS }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return { date: dayKey(day), count: perDay.get(dayKey(day)) || 0 };
    });

    const registrationsPerDay = new Map();
    newRegistrations.forEach((user) => {
      const key = dayKey(user.createdAt);
      const counts = registrationsPerDay.get(key) || { customers: 0, sellers: 0 };
      counts[user.role === 'CUSTOMER' ? 'customers' : 'sellers'] += 1;
      registrationsPerDay.set(key, counts);
    });
    const registrationsByDay = Array.from({ length: DAYS }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return {
        date: dayKey(day),
        ...(registrationsPerDay.get(dayKey(day)) || { customers: 0, sellers: 0 })
      };
    });

    const names = await prisma.sellerProfile.findMany({
      where: { id: { in: topRaw.map((row) => row.sellerId) }, removedAt: null },
      select: { id: true, businessName: true, district: true }
    });
    const topSellers = topRaw
      .map((row) => {
        const seller = names.find((item) => item.id === row.sellerId);
        return seller && { id: seller.id, businessName: seller.businessName, district: seller.district, count: row._count._all };
      })
      .filter(Boolean)
      .slice(0, 5);

    const orderStatus = { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    ordersByStatus.forEach((row) => {
      orderStatus[row.status] = row._count._all;
    });

    res.json({
      days: DAYS,
      range: { start: dayKey(start), end: dayKey(end) },
      previous: { registrations: previousRegistrations, clicks: previousClicks },
      recentSignups: recentSignups.map((user) => ({
        id: user.id,
        role: user.role,
        createdAt: user.createdAt,
        name:
          user.role === 'SELLER'
            ? [user.sellerProfile?.firstName, user.sellerProfile?.lastName].filter(Boolean).join(' ') || user.sellerProfile?.businessName || ''
            : user.customerProfile?.fullName || '',
        detail: user.role === 'SELLER' ? [user.sellerProfile?.businessName, user.sellerProfile?.district].filter(Boolean).join(' · ') : ''
      })),
      customers,
      registrations: { customers, sellers, byDay: registrationsByDay },
      orders: { total: orders, byStatus: orderStatus, deliveredValue: Number(delivered._sum.total || 0) },
      clicksByDay,
      topSellers,
      pendingSellers,
      recentComplaints
    });
  } catch (error) {
    serverError(res, 'ADMIN_OVERVIEW_ERROR:', error);
  }
};

// 2. Active customer accounts, searchable without exposing NIC numbers
exports.listCustomers = async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const contains = { contains: search, mode: 'insensitive' };
    const customers = await prisma.customerProfile.findMany({
      where: {
        user: { is: { role: 'CUSTOMER', removedAt: null } },
        ...(search && {
          OR: [
            { fullName: contains },
            { user: { is: { email: contains } } },
            { user: { is: { phone: { contains: search } } } }
          ]
        })
      },
      select: {
        id: true,
        fullName: true,
        user: { select: { id: true, email: true, phone: true, createdAt: true } }
      },
      orderBy: { user: { createdAt: 'desc' } },
      take: 200
    });

    res.json(customers.map(({ user, ...profile }) => ({
      ...profile,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt
    })));
  } catch (error) {
    serverError(res, 'ADMIN_CUSTOMERS_ERROR:', error);
  }
};

// Deactivate customer access without deleting orders, reviews, or complaints.
exports.removeCustomer = async (req, res) => {
  try {
    const id = String(req.params.id);
    const result = await prisma.user.updateMany({
      where: { id, role: 'CUSTOMER', removedAt: null },
      data: { removedAt: new Date() }
    });
    if (!result.count) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Customer not found.' });
    }
    res.json({ removed: true });
  } catch (error) {
    serverError(res, 'ADMIN_REMOVE_CUSTOMER_ERROR:', error);
  }
};

// 2. Sellers, filtered by status and a search word
exports.listSellers = async (req, res) => {
  try {
    const status = SELLER_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const search = req.query.search?.trim();
    const contains = { contains: search, mode: 'insensitive' };
    // A NIC can be searched by its last characters, or by the full number (matched without ever storing it in plain text)
    const nicMatches = [];
    if (search) {
      if (search.length >= 3) nicMatches.push({ nicLast5: { contains: search.toUpperCase().slice(-5) } });
      if (nicVault.isValidNic(search)) { nicMatches.push({ nicHash: nicVault.hash(search) }); nicMatches.push({ nicNumber: search.toUpperCase() }); }
    }

    const sellers = await prisma.sellerProfile.findMany({
      where: {
        removedAt: null,
        ...(status && { status }),
        ...(search && {
          OR: [
            { businessName: contains },
            { district: contains },
            ...nicMatches,
            { user: { email: contains } },
            { user: { phone: { contains: search } } }
          ]
        })
      },
      include: {
        user: { select: { email: true, phone: true, profilePhoto: { select: { data: true, updatedAt: true } } } },
        _count: { select: { products: true, analytics: true, reviews: true } },
        reviews: { select: { rating: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    res.json(
      sellers.map(({ user, _count, reviews, nicNumber, nicHash, nicEncrypted, nicLast5, ...seller }) => {
        const sReviews = reviews || [];
        const reviewCount = _count.reviews || sReviews.length;
        const averageRating = sReviews.length
          ? Math.round((sReviews.reduce((sum, r) => sum + r.rating, 0) / sReviews.length) * 10) / 10
          : 0;

        const isApproved = seller.status === 'APPROVED';
        let decryptedNic = null;
        if (!isApproved) {
          if (nicNumber && nicVault.isValidNic(nicNumber)) {
            decryptedNic = nicNumber;
          } else if (nicEncrypted) {
            try {
              decryptedNic = nicVault.decrypt(nicEncrypted);
            } catch (err) {
              decryptedNic = null;
            }
          }
        }

        const maskedNic = nicVault.mask(nicLast5) || (nicLast5 ? `••••••${nicLast5}` : null);
        const resolvedLast5 = nicLast5 || (decryptedNic ? decryptedNic.slice(-5) : null);

        return {
          ...seller,
          nicDisplay: isApproved ? (maskedNic || (resolvedLast5 ? `••••••${resolvedLast5}` : '—')) : (decryptedNic || maskedNic || '—'),
          nicFull: isApproved ? undefined : decryptedNic,
          nicMasked: maskedNic || (resolvedLast5 ? `••••••${resolvedLast5}` : '—'),
          nicLast5: resolvedLast5,
          isNicEncrypted: isApproved,
          email: user?.email,
          phone: user?.phone,
          facePhoto: user?.profilePhoto?.data || null,
          faceVerified: !!user?.profilePhoto?.data,
          productCount: _count.products,
          clickCount: _count.analytics,
          reviewCount,
          averageRating
        };
      })
    );
  } catch (error) {
    serverError(res, 'ADMIN_SELLERS_ERROR:', error);
  }
};

// 3. One seller's products (to check them before approving)
exports.getSellerProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { sellerId: String(req.params.id) },
      include: { _count: { select: { analytics: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.json(products.map(({ _count, ...product }) => ({ ...product, clickCount: _count.analytics })));
  } catch (error) {
    serverError(res, 'ADMIN_SELLER_PRODUCTS_ERROR:', error);
  }
};

// Get single seller details with verification data
exports.getSellerVerification = async (req, res) => {
  try {
    const id = String(req.params.id);
    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            profilePhoto: { select: { data: true, updatedAt: true } }
          }
        },
        _count: { select: { products: true, analytics: true, reviews: true } }
      }
    });

    if (!seller || seller.removedAt) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    const isApproved = seller.status === 'APPROVED';
    let decryptedNic = null;
    if (!isApproved) {
      if (seller.nicNumber && nicVault.isValidNic(seller.nicNumber)) {
        decryptedNic = seller.nicNumber;
      } else if (seller.nicEncrypted) {
        try {
          decryptedNic = nicVault.decrypt(seller.nicEncrypted);
        } catch (err) {
          decryptedNic = null;
        }
      }
    }

    const maskedNic = nicVault.mask(seller.nicLast5) || (seller.nicLast5 ? `••••••${seller.nicLast5}` : null);
    const resolvedLast5 = seller.nicLast5 || (decryptedNic ? decryptedNic.slice(-5) : null);
    const { nicNumber, nicHash, nicEncrypted, nicLast5, ...sellerPayload } = seller;

    res.json({
      ...sellerPayload,
      nicDisplay: isApproved ? (maskedNic || (resolvedLast5 ? `••••••${resolvedLast5}` : '—')) : (decryptedNic || maskedNic || '—'),
      nicFull: isApproved ? undefined : decryptedNic,
      nicMasked: maskedNic || (resolvedLast5 ? `••••••${resolvedLast5}` : '—'),
      nicLast5: resolvedLast5,
      isNicEncrypted: isApproved,
      email: seller.user?.email,
      phone: seller.user?.phone,
      facePhoto: seller.user?.profilePhoto?.data || null,
      faceVerified: !!seller.user?.profilePhoto?.data,
      faceVerifiedAt: seller.user?.profilePhoto?.updatedAt || null,
      productCount: seller._count?.products || 0,
      clickCount: seller._count?.analytics || 0
    });
  } catch (error) {
    serverError(res, 'ADMIN_SELLER_VERIFICATION_ERROR:', error);
  }
};

// Admin update or upload seller verification photos (NIC front, NIC back, or profile photo / 3D face photo)
exports.updateSellerPhotos = async (req, res) => {
  try {
    const id = String(req.params.id);
    const { nicFront, nicBack, profilePhoto, facePhoto } = req.body;
    const photoToSave = facePhoto !== undefined ? facePhoto : profilePhoto;

    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!seller || seller.removedAt) {
      return res.status(404).json({ message: 'Seller not found.' });
    }

    const updateData = {};
    if (nicFront !== undefined) updateData.nicFront = nicFront;
    if (nicBack !== undefined) updateData.nicBack = nicBack;

    let updatedSeller = seller;
    if (Object.keys(updateData).length > 0) {
      updatedSeller = await prisma.sellerProfile.update({
        where: { id },
        data: updateData
      });
    }

    if (photoToSave !== undefined) {
      if (!photoToSave) {
        await prisma.profilePhoto.deleteMany({ where: { userId: seller.userId } });
      } else if (typeof photoToSave === 'string' && photoToSave.startsWith('data:image/')) {
        await prisma.profilePhoto.upsert({
          where: { userId: seller.userId },
          create: { userId: seller.userId, data: photoToSave },
          update: { data: photoToSave }
        });
      }
    }

    res.json({
      success: true,
      nicFront: updatedSeller.nicFront,
      nicBack: updatedSeller.nicBack,
      facePhoto: photoToSave || null,
      message: 'Seller photos updated successfully.'
    });
  } catch (error) {
    serverError(res, 'ADMIN_SELLER_PHOTOS_ERROR:', error);
  }
};

// Remove a seller. The account is closed and the products are hidden, but nothing is deleted, so past orders
// (and the payments made on them) and complaints stay on record. A seller with orders that are not finished
// (customers may already have paid) or with open complaints cannot be removed until those are settled.
exports.removeSeller = async (req, res) => {
  try {
    const id = String(req.params.id);
    const seller = await prisma.sellerProfile.findUnique({ where: { id }, select: { id: true, status: true, removedAt: true } });
    if (!seller || seller.removedAt) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Seller not found.' });
    }
    if (seller.status !== 'APPROVED') {
      return res.status(409).json({ code: 'SELLER_NOT_APPROVED', message: 'Only approved sellers can be removed.' });
    }

    const [activeOrders, openComplaints] = await Promise.all([
      prisma.order.count({ where: { sellerId: id, status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED'] } } }),
      prisma.complaint.count({ where: { sellerId: id, status: { in: ['OPEN', 'IN_REVIEW'] } } })
    ]);
    if (activeOrders > 0) {
      return res.status(409).json({ code: 'HAS_ACTIVE_ORDERS', count: activeOrders, message: 'This seller has orders that are not delivered or cancelled yet.' });
    }
    if (openComplaints > 0) {
      return res.status(409).json({ code: 'HAS_OPEN_COMPLAINTS', count: openComplaints, message: 'This seller has complaints that are not settled yet.' });
    }

    const note = String(req.body?.note || '').trim().slice(0, 500) || null;
    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id }, data: { status: 'REJECTED', removedAt: new Date(), removalNote: note } }),
      prisma.product.updateMany({ where: { sellerId: id }, data: { isPublished: false } })
    ]);
    res.json({ removed: true });
  } catch (error) {
    serverError(res, 'ADMIN_REMOVE_SELLER_ERROR:', error);
  }
};

// 4. Approve or reject a seller. Only APPROVED sellers' products are shown on the website.
// When approving, the seller's ID is encrypted in the database and masked (showing only last 5 digits).
exports.setSellerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!SELLER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'අවලංගු තත්ත්වයකි.' });
    }

    const sellerId = String(req.params.id);
    const existingSeller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      include: {
        user: { select: { email: true, phone: true } },
        _count: { select: { products: true, analytics: true, reviews: true } }
      }
    });

    if (!existingSeller) {
      return res.status(404).json({ message: 'අලෙවිකරු සොයාගත නොහැක.' });
    }

    let updateData = { status };

    // When approving, ensure the NIC is encrypted and never plain
    if (status === 'APPROVED') {
      let plaintextNic = null;
      if (existingSeller.nicNumber && nicVault.isValidNic(existingSeller.nicNumber)) {
        plaintextNic = existingSeller.nicNumber;
      } else if (existingSeller.nicEncrypted) {
        try {
          plaintextNic = nicVault.decrypt(existingSeller.nicEncrypted);
        } catch (e) {
          plaintextNic = null;
        }
      }

      if (plaintextNic) {
        const protectedNic = nicVault.protect(plaintextNic);
        updateData = {
          ...updateData,
          nicEncrypted: protectedNic.nicEncrypted,
          nicHash: protectedNic.nicHash,
          nicLast5: protectedNic.nicLast5,
          nicNumber: `SELF-SELLER-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
        };
      }
    }

    const updatedSeller = await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: updateData,
      include: {
        user: { select: { email: true, phone: true } },
        _count: { select: { products: true, analytics: true, reviews: true } }
      }
    });

    if (status === 'REJECTED') {
      await prisma.product.updateMany({
        where: { sellerId },
        data: { isPublished: false }
      });
    } else if (status === 'APPROVED') {
      await prisma.product.updateMany({
        where: { sellerId },
        data: { isPublished: true }
      });
    }

    const isApproved = updatedSeller.status === 'APPROVED';
    const resolvedLast5 = updatedSeller.nicLast5;
    const maskedNic = nicVault.mask(resolvedLast5) || (resolvedLast5 ? `••••••${resolvedLast5}` : null);
    let decryptedNic = null;

    if (!isApproved) {
      if (updatedSeller.nicNumber && nicVault.isValidNic(updatedSeller.nicNumber)) {
        decryptedNic = updatedSeller.nicNumber;
      } else if (updatedSeller.nicEncrypted) {
        try {
          decryptedNic = nicVault.decrypt(updatedSeller.nicEncrypted);
        } catch (err) {
          decryptedNic = null;
        }
      }
    }

    const { nicNumber, nicHash, nicEncrypted, nicLast5, ...sellerPayload } = updatedSeller;

    res.json({
      message: status === 'APPROVED' ? 'අලෙවිකරු අනුමත කරන ලදී. හැඳුනුම්පත් අංකය සංකේතනය කරන ලදී.' : 'තත්ත්වය යාවත්කාලීන කරන ලදී.',
      seller: {
        ...sellerPayload,
        nicDisplay: isApproved ? (maskedNic || (resolvedLast5 ? `••••••${resolvedLast5}` : '—')) : (decryptedNic || maskedNic || '—'),
        nicFull: isApproved ? undefined : decryptedNic,
        nicMasked: maskedNic,
        nicLast5: resolvedLast5,
        isNicEncrypted: isApproved,
        email: updatedSeller.user?.email,
        phone: updatedSeller.user?.phone,
        productCount: updatedSeller._count?.products || 0,
        clickCount: updatedSeller._count?.analytics || 0
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'අලෙවිකරු සොයාගත නොහැක.' });
    }
    serverError(res, 'ADMIN_SELLER_STATUS_ERROR:', error);
  }
};

// 5. All products. visibility: 'onSite' | 'waiting' (seller not approved yet) | 'hidden' (hidden by an admin)
exports.listProducts = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const contains = { contains: search, mode: 'insensitive' };
    const visibilityFilters = {
      onSite: { isPublished: true, seller: { status: 'APPROVED' } },
      waiting: { isPublished: true, seller: { status: { not: 'APPROVED' } } },
      hidden: { isPublished: false }
    };

    const products = await prisma.product.findMany({
      where: {
        seller: { removedAt: null },
        ...(visibilityFilters[req.query.visibility] || {}),
        ...(search && {
          OR: [{ title: contains }, { category: contains }, { seller: { businessName: contains } }]
        })
      },
      include: {
        seller: { select: { id: true, businessName: true, district: true, status: true } },
        _count: { select: { analytics: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 300
    });

    res.json(products.map(({ _count, ...product }) => ({ ...product, clickCount: _count.analytics })));
  } catch (error) {
    serverError(res, 'ADMIN_PRODUCTS_ERROR:', error);
  }
};

// 6. Hide a product from the website, or show it again
exports.setProductPublished = async (req, res) => {
  try {
    if (typeof req.body.isPublished !== 'boolean') {
      return res.status(400).json({ message: 'isPublished must be true or false.' });
    }

    const product = await prisma.product.update({
      where: { id: String(req.params.id) },
      data: { isPublished: req.body.isPublished }
    });

    res.json({ message: 'යාවත්කාලීන කරන ලදී.', product });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'භාණ්ඩය සොයාගත නොහැක.' });
    }
    serverError(res, 'ADMIN_PRODUCT_PUBLISH_ERROR:', error);
  }
};

// 7. Remove any product (its click records stay, with productId set to empty)
exports.deleteProduct = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'භාණ්ඩය ඉවත් කරන ලදී.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'භාණ්ඩය සොයාගත නොහැක.' });
    }
    serverError(res, 'ADMIN_PRODUCT_DELETE_ERROR:', error);
  }
};
