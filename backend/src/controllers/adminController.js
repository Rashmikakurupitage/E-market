const prisma = require('../config/db');

// Every route here is behind authmiddleware + requireAdmin (see routes/adminRoutes.js)

const SELLER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const weekAgo = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const serverError = (res, label, error) => {
  console.error(label, error);
  res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
};

// 1. Totals for the top of the admin dashboard
exports.getStats = async (req, res) => {
  try {
    const [sellersByStatus, totalProducts, productsOnSite, totalClicks, clicksThisWeek] = await Promise.all([
      prisma.sellerProfile.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.product.count(),
      prisma.product.count({ where: { isPublished: true, seller: { status: 'APPROVED' } } }),
      prisma.clickAnalytics.count(),
      prisma.clickAnalytics.count({ where: { timestamp: { gte: weekAgo() } } })
    ]);

    const sellers = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    sellersByStatus.forEach((row) => {
      sellers[row.status] = row._count._all;
    });

    res.json({
      sellers,
      products: { total: totalProducts, onSite: productsOnSite },
      clicks: { total: totalClicks, thisWeek: clicksThisWeek }
    });
  } catch (error) {
    serverError(res, 'ADMIN_STATS_ERROR:', error);
  }
};

// 2. Sellers, filtered by status and a search word
exports.listSellers = async (req, res) => {
  try {
    const status = SELLER_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const search = req.query.search?.trim();
    const contains = { contains: search, mode: 'insensitive' };

    const sellers = await prisma.sellerProfile.findMany({
      where: {
        ...(status && { status }),
        ...(search && {
          OR: [
            { businessName: contains },
            { district: contains },
            { nicNumber: contains },
            { user: { email: contains } },
            { user: { phone: { contains: search } } }
          ]
        })
      },
      include: {
        user: { select: { email: true, phone: true } },
        _count: { select: { products: true, analytics: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    res.json(
      sellers.map(({ user, _count, ...seller }) => ({
        ...seller,
        email: user.email,
        phone: user.phone,
        productCount: _count.products,
        clickCount: _count.analytics
      }))
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

// 4. Approve or reject a seller. Only APPROVED sellers' products are shown on the website.
exports.setSellerStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!SELLER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'අවලංගු තත්ත්වයකි.' });
    }

    const seller = await prisma.sellerProfile.update({
      where: { id: String(req.params.id) },
      data: { status }
    });

    res.json({ message: 'තත්ත්වය යාවත්කාලීන කරන ලදී.', seller });
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
