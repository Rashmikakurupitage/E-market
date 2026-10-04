const prisma = require('../config/db');

// 1. අලුත් Product එකක් එකතු කිරීම (Sellers Only)
exports.createProduct = async (req, res) => {
  try {
    const { title, description, category, images, price } = req.body;

    // Request එක එවන Seller ගේ SellerProfile ID එක සොයාගැනීම
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'භාණ්ඩ එකතු කළ හැක්කේ ලියාපදිංචි අලෙවිකරුවන්ට පමණි.' });
    }

    const product = await prisma.product.create({
      data: {
        sellerId: sellerProfile.id,
        title,
        description,
        category,
        images: images || [],
        price: price ? parseFloat(price) : null
      }
    });

    res.status(201).json({ message: 'භාණ්ඩය සාර්ථකව එකතු කරන ලදී!', product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 2. සියලුම Products ලබාගැනීම (Public Search/Filter)
exports.getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;

    const products = await prisma.product.findMany({
      where: {
        isPublished: true,
        // Only sellers approved by an admin appear on the website
        seller: { status: 'APPROVED' },
        ...(category && { category }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        seller: {
          select: {
            businessName: true,
            district: true,
            whatsappNo: true,
            facebookUrl: true,
            messengerUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 3. Log වී සිටින Seller ගේ Products ලබාගැනීම (Seller Dashboard)
exports.getMyProducts = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'මෙම පිටුව ලියාපදිංචි අලෙවිකරුවන්ට පමණි.' });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [products, recentClicks] = await Promise.all([
      prisma.product.findMany({
        where: { sellerId: sellerProfile.id },
        include: { _count: { select: { analytics: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.clickAnalytics.groupBy({
        by: ['productId'],
        where: { sellerId: sellerProfile.id, timestamp: { gte: weekAgo } },
        _count: { _all: true }
      })
    ]);

    const weekCounts = new Map(recentClicks.map((row) => [row.productId, row._count._all]));

    // Dashboard එක clickCount (මුළු) සහ clicksThisWeek (පසුගිය දින 7) පෙන්වයි
    res.json(
      products.map(({ _count, ...product }) => ({
        ...product,
        clickCount: _count.analytics,
        clicksThisWeek: weekCounts.get(product.id) || 0
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 4. Seller ගේ Product එකක් ඉවත් කිරීම (තමන්ගේ products පමණි)
exports.deleteProduct = async (req, res) => {
  try {
    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user.userId }
    });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'භාණ්ඩ ඉවත් කළ හැක්කේ ලියාපදිංචි අලෙවිකරුවන්ට පමණි.' });
    }

    // Only delete when the product belongs to this seller (deleteMany matches on both ids)
    const { count } = await prisma.product.deleteMany({
      where: { id: String(req.params.id), sellerId: sellerProfile.id }
    });

    if (count === 0) {
      return res.status(404).json({ message: 'භාණ්ඩය සොයාගත නොහැක.' });
    }

    // Its past WhatsApp click records stay in the database, with productId set to empty
    res.json({ message: 'භාණ්ඩය ඉවත් කරන ලදී.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server එකේ දෝෂයක් සිදුවිය.' });
  }
};

// 5. Social Media Redirection Tracking (WhatsApp/Messenger Click Track)
exports.trackClick = async (req, res) => {
  try {
    const { productId, platform = 'WHATSAPP' } = req.body; // platform: "WHATSAPP" or "MESSENGER"

    if (!['WHATSAPP', 'MESSENGER'].includes(platform)) {
      return res.status(400).json({ message: 'Unknown platform' });
    }

    // The seller is taken from the product, so clicks can't be credited to someone else
    // Only products that are actually on the website can be clicked
    const product = productId
      ? await prisma.product.findFirst({
          where: { id: String(productId), isPublished: true, seller: { status: 'APPROVED' } },
          select: { id: true, sellerId: true }
        })
      : null;

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await prisma.clickAnalytics.create({
      data: {
        sellerId: product.sellerId,
        productId: product.id,
        targetPlatform: platform
      }
    });

    res.json({ message: 'Click tracked successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Tracking error' });
  }
};