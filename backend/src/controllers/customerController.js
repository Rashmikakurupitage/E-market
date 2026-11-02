const prisma = require('../config/db');
const DISTRICTS = require('../utils/districts');

const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

async function findCustomer(userId) {
  return prisma.customerProfile.findUnique({ where: { userId } });
}

exports.getSavedDeliveryDetails = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers have saved delivery details.' });
    res.json({
      name: customer.savedDeliveryName || customer.fullName,
      phone: customer.savedDeliveryPhone || '',
      address: customer.savedDeliveryAddress || '',
      district: customer.savedDeliveryDistrict || '',
    });
  } catch (error) {
    console.error('GET_SAVED_DELIVERY_DETAILS_ERROR:', error);
    res.status(500).json({ message: 'Could not load saved delivery details.' });
  }
};

exports.saveDeliveryDetails = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers can save delivery details.' });

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/[\s-]/g, '') : '';
    const address = typeof req.body?.address === 'string' ? req.body.address.trim() : '';
    const district = typeof req.body?.district === 'string' ? req.body.district.trim() : '';
    if (!name || name.length > 100) return res.status(400).json({ code: 'NAME', message: 'Enter a valid delivery name.' });
    if (!PHONE_PATTERN.test(phone)) return res.status(400).json({ code: 'PHONE', message: 'Enter a valid phone number.' });
    if (!address || address.length > 500) return res.status(400).json({ code: 'ADDRESS', message: 'Enter a valid delivery address.' });
    if (!DISTRICTS.has(district)) return res.status(400).json({ code: 'DISTRICT', message: 'Choose a valid district.' });

    await prisma.customerProfile.update({
      where: { id: customer.id },
      data: {
        savedDeliveryName: name,
        savedDeliveryPhone: phone,
        savedDeliveryAddress: address,
        savedDeliveryDistrict: district,
      },
    });
    res.json({ name, phone, address, district });
  } catch (error) {
    console.error('SAVE_DELIVERY_DETAILS_ERROR:', error);
    res.status(500).json({ message: 'Could not save delivery details.' });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers have a wishlist.' });
    const items = await prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      select: { productId: true },
    });
    res.json({ productIds: items.map(({ productId }) => productId) });
  } catch (error) {
    console.error('GET_CUSTOMER_WISHLIST_ERROR:', error);
    res.status(500).json({ message: 'Could not load your wishlist.' });
  }
};

exports.addWishlistItem = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers have a wishlist.' });
    const productId = String(req.params.productId || '');
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        isPublished: true,
        seller: { status: { not: 'REJECTED' }, removedAt: null },
      },
      select: { id: true },
    });
    if (!product) return res.status(404).json({ code: 'PRODUCT_UNAVAILABLE', message: 'This product is no longer available.' });

    await prisma.wishlistItem.upsert({
      where: { customerId_productId: { customerId: customer.id, productId } },
      create: { customerId: customer.id, productId },
      update: {},
    });
    res.status(204).end();
  } catch (error) {
    console.error('ADD_CUSTOMER_WISHLIST_ITEM_ERROR:', error);
    res.status(500).json({ message: 'Could not save this product to your wishlist.' });
  }
};

exports.removeWishlistItem = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers have a wishlist.' });
    await prisma.wishlistItem.deleteMany({
      where: { customerId: customer.id, productId: String(req.params.productId || '') },
    });
    res.status(204).end();
  } catch (error) {
    console.error('REMOVE_CUSTOMER_WISHLIST_ITEM_ERROR:', error);
    res.status(500).json({ message: 'Could not remove this product from your wishlist.' });
  }
};

// Cart contents are stored by product ID and quantity; product details are always refreshed from the catalog.
exports.syncCart = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers can sync a cart.' });
    const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
    if (incoming.length > 100) return res.status(400).json({ code: 'CART_TOO_LARGE', message: 'The cart has too many items.' });

    const merged = new Map();
    const saved = Array.isArray(customer.cart) ? customer.cart : [];
    for (const entry of [...saved, ...incoming]) {
      const productId = String(entry?.productId || entry?.id || '');
      const quantity = Number(entry?.quantity);
      if (productId && Number.isInteger(quantity) && quantity > 0) {
        merged.set(productId, Math.min(99, Math.max(merged.get(productId) || 0, quantity)));
      }
    }
    const productIds = [...merged.keys()];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isPublished: true, price: { not: null }, seller: { status: 'APPROVED', removedAt: null } },
      select: { id: true, title: true, images: true, category: true, price: true, discountPercent: true, discountEndsAt: true, sellerId: true, seller: { select: { businessName: true, district: true, whatsappNo: true } } },
    });
    const { discountOf } = require('../utils/discount');
    const found = new Set(products.map((product) => product.id));
    const clean = [...merged].filter(([id]) => found.has(id)).map(([productId, quantity]) => ({ productId, quantity }));
    await prisma.customerProfile.update({ where: { id: customer.id }, data: { cart: clean } });
    const byId = new Map(products.map((product) => [product.id, product]));
    res.json({ items: clean.map(({ productId, quantity }) => {
      const product = byId.get(productId);
      const discount = discountOf(product);
      return {
        id: product.id, title: product.title, price: discount ? discount.salePrice : Number(product.price),
        image: product.images[0] || null, category: product.category, sellerId: product.sellerId,
        sellerName: product.seller.businessName || '', district: product.seller.district || '',
        whatsappNo: product.seller.whatsappNo || '', quantity,
      };
    }) });
  } catch (error) {
    console.error('SYNC_CUSTOMER_CART_ERROR:', error);
    res.status(500).json({ message: 'Could not sync your cart.' });
  }
};

exports.saveCart = async (req, res) => {
  try {
    const customer = await findCustomer(req.user.userId);
    if (!customer) return res.status(403).json({ code: 'NOT_CUSTOMER', message: 'Only customers can sync a cart.' });
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (items.length > 100) return res.status(400).json({ code: 'CART_TOO_LARGE', message: 'The cart has too many items.' });
    const clean = [];
    const quantities = new Map();
    for (const item of items) {
      const id = String(item?.id || item?.productId || '');
      const qty = Number(item?.quantity);
      if (!id || !Number.isInteger(qty) || qty < 1 || qty > 99) return res.status(400).json({ code: 'BAD_CART_ITEM', message: 'Cart items are invalid.' });
      quantities.set(id, Math.min(99, (quantities.get(id) || 0) + qty));
    }
    for (const [productId, quantity] of quantities) clean.push({ productId, quantity });
    await prisma.customerProfile.update({ where: { id: customer.id }, data: { cart: clean } });
    res.status(204).end();
  } catch (error) {
    console.error('SAVE_CUSTOMER_CART_ERROR:', error);
    res.status(500).json({ message: 'Could not save your cart.' });
  }
};
