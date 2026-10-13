const prisma = require('../config/db');

// Home page wallpapers are stored in the database as data URLs, so no file storage is needed.
//   key "wallpaper:<id>"       one uploaded wallpaper (the old single "heroImage" counts as id "legacy")
//   key "wallpaperSettings"    { rotate, seconds, active, removed } as JSON (removed = built-in pictures an admin took away)
const WALLPAPER_PREFIX = 'wallpaper:';
const LEGACY_KEY = 'heroImage';
const SETTINGS_KEY = 'wallpaperSettings';
const MAX_WALLPAPERS = 8;
const MAX_BYTES = 1.5 * 1024 * 1024;
const SECONDS = [4, 6, 8, 10, 15, 20];
// The pictures that ship with the website (public/hero_main.jpg, public/artisan_carver.jpg and public/wallpapers/*)
const BUILTIN_IDS = ['builtin-collage-gold', 'builtin-hero', 'builtin-collage-teal', 'builtin-tea-pickers', 'builtin-collage-pink', 'builtin-collage-violet', 'builtin-artisan', 'builtin-collage-green', 'builtin-kitchen', 'builtin-collage-indigo', 'builtin-basketry', 'builtin-collage-earth', 'builtin-tea-woman', 'builtin-masks', 'builtin-cane-market', 'builtin-spices'];
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

const serverError = (res, label, error) => {
  console.error(label, error);
  res.status(500).json({ message: 'Server error.' });
};

const keyFor = (id) => (id === 'legacy' ? LEGACY_KEY : `${WALLPAPER_PREFIX}${id}`);
const idFor = (key) => (key === LEGACY_KEY ? 'legacy' : key.slice(WALLPAPER_PREFIX.length));

const readSettings = async () => {
  const row = await prisma.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  let saved = {};
  try {
    saved = row ? JSON.parse(row.value) : {};
  } catch {
    saved = {};
  }
  return {
    rotate: saved.rotate !== false, // rotating is the default
    seconds: SECONDS.includes(saved.seconds) ? saved.seconds : 6,
    active: typeof saved.active === 'string' ? saved.active : null,
    removed: Array.isArray(saved.removed) ? saved.removed.filter((id) => BUILTIN_IDS.includes(id)) : []
  };
};

const writeSettings = (settings) =>
  prisma.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) }
  });

// Built-in pictures that are still in use
const visibleBuiltins = (settings) => BUILTIN_IDS.filter((id) => !settings.removed.includes(id));

const listWallpapers = async () => {
  const rows = await prisma.siteSetting.findMany({
    where: { OR: [{ key: { startsWith: WALLPAPER_PREFIX } }, { key: LEGACY_KEY }] },
    select: { key: true, updatedAt: true },
    orderBy: { updatedAt: 'asc' }
  });
  return rows.map((row) => ({ id: idFor(row.key), version: row.updatedAt.getTime() }));
};

// Public: which wallpapers exist and whether they rotate (the version number makes browsers reload a changed picture)
exports.getSettings = async (req, res) => {
  try {
    const [custom, settings] = await Promise.all([listWallpapers(), readSettings()]);
    const { removed, ...shown } = settings;
    res.json({ custom, ...shown, builtin: visibleBuiltins(settings) });
  } catch (error) {
    serverError(res, 'SITE_SETTINGS_ERROR:', error);
  }
};

// Public: numbers and a few sellers for the home page
exports.getStats = async (req, res) => {
  try {
    const approved = { status: 'APPROVED', removedAt: null };
    const [sellers, products, districts, featured] = await Promise.all([
      prisma.sellerProfile.count({ where: approved }),
      prisma.product.count({ where: { isPublished: true, seller: approved } }),
      prisma.sellerProfile.findMany({ where: approved, distinct: ['district'], select: { district: true } }),
      prisma.sellerProfile.findMany({
        where: { ...approved, products: { some: { isPublished: true } } },
        select: {
          id: true,
          businessName: true,
          district: true,
          description: true,
          _count: { select: { products: { where: { isPublished: true } } } }
        },
        orderBy: { products: { _count: 'desc' } },
        take: 6
      })
    ]);
    res.json({
      sellers,
      products,
      districts: districts.length,
      featuredSellers: featured.map(({ _count, description, ...seller }) => ({
        ...seller,
        description: description ? description.slice(0, 110) : null,
        productCount: _count.products
      }))
    });
  } catch (error) {
    serverError(res, 'SITE_STATS_ERROR:', error);
  }
};

// Public: one wallpaper picture
exports.getWallpaper = async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!/^[a-z0-9-]{1,40}$/i.test(id)) return res.status(404).json({ message: 'Not found.' });
    const row = await prisma.siteSetting.findUnique({ where: { key: keyFor(id) } });
    const match = row && DATA_URL.exec(row.value);
    if (!match) return res.status(404).json({ message: 'Not found.' });
    res.set('Content-Type', match[1]);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    serverError(res, 'SITE_WALLPAPER_ERROR:', error);
  }
};

/* ---------- admins (behind authmiddleware + requireAdmin, see routes/adminRoutes.js) ---------- */

const currentState = async () => {
  const [custom, settings] = await Promise.all([listWallpapers(), readSettings()]);
  const { removed, ...shown } = settings;
  return { custom, ...shown, builtin: visibleBuiltins(settings) };
};

exports.addWallpaper = async (req, res) => {
  try {
    const image = String(req.body?.image || '');
    const match = DATA_URL.exec(image);
    const bytes = match ? Buffer.from(match[2], 'base64') : null;
    if (!bytes || bytes.length === 0) {
      return res.status(400).json({ code: 'IMAGE_TYPE', message: 'Choose a JPG, PNG or WebP picture.' });
    }
    if (bytes.length > MAX_BYTES) {
      return res.status(413).json({ code: 'IMAGE_BIG', message: 'The picture is too large.' });
    }
    const existing = await prisma.siteSetting.count({ where: { OR: [{ key: { startsWith: WALLPAPER_PREFIX } }, { key: LEGACY_KEY }] } });
    if (existing >= MAX_WALLPAPERS) {
      return res.status(409).json({ code: 'TOO_MANY', message: `At most ${MAX_WALLPAPERS} uploaded wallpapers.` });
    }
    const id = require('crypto').randomBytes(6).toString('hex');
    await prisma.siteSetting.create({ data: { key: keyFor(id), value: image } });
    res.status(201).json({ ...(await currentState()), added: id });
  } catch (error) {
    serverError(res, 'SITE_ADD_WALLPAPER_ERROR:', error);
  }
};

// Take a wallpaper away: an uploaded one is deleted, a built-in one is hidden. At least one always stays.
exports.removeWallpaper = async (req, res) => {
  try {
    const id = String(req.params.id);
    if (!/^[a-z0-9-]{1,40}$/i.test(id)) return res.status(404).json({ code: 'NOT_FOUND', message: 'Not found.' });

    const [custom, settings] = await Promise.all([listWallpapers(), readSettings()]);
    const builtin = visibleBuiltins(settings);
    const isBuiltin = BUILTIN_IDS.includes(id);
    const exists = isBuiltin ? builtin.includes(id) : custom.some((item) => item.id === id);
    if (!exists) return res.status(404).json({ code: 'NOT_FOUND', message: 'Not found.' });
    if (builtin.length + custom.length <= 1) {
      return res.status(409).json({ code: 'LAST_ONE', message: 'At least one wallpaper must stay on the home page.' });
    }

    if (isBuiltin) {
      settings.removed = [...settings.removed, id];
    } else {
      await prisma.siteSetting.deleteMany({ where: { key: keyFor(id) } });
    }
    // If the wallpaper that was being kept is gone, fall back to the first one
    if (settings.active === id) settings.active = null;
    await writeSettings(settings);
    res.json(await currentState());
  } catch (error) {
    serverError(res, 'SITE_REMOVE_WALLPAPER_ERROR:', error);
  }
};

// Rotate on or off, how often, and which single wallpaper stays when rotation is off
exports.saveWallpaperSettings = async (req, res) => {
  try {
    const current = await readSettings();
    const body = req.body || {};
    const next = {
      ...current,
      rotate: typeof body.rotate === 'boolean' ? body.rotate : current.rotate,
      seconds: SECONDS.includes(Number(body.seconds)) ? Number(body.seconds) : current.seconds
    };
    if (body.active !== undefined) {
      if (body.active === null) {
        next.active = null;
      } else {
        const id = String(body.active);
        const known = visibleBuiltins(current).includes(id) || (!BUILTIN_IDS.includes(id) && /^[a-z0-9-]{1,40}$/i.test(id) && (await prisma.siteSetting.count({ where: { key: keyFor(id) } })) > 0);
        if (!known) return res.status(400).json({ code: 'UNKNOWN_WALLPAPER', message: 'Unknown wallpaper.' });
        next.active = id;
      }
    }
    await writeSettings(next);
    res.json(await currentState());
  } catch (error) {
    serverError(res, 'SITE_SAVE_WALLPAPER_SETTINGS_ERROR:', error);
  }
};

// Back to the pictures that ship with the website, rotating
exports.resetWallpapers = async (req, res) => {
  try {
    await prisma.siteSetting.deleteMany({ where: { OR: [{ key: { startsWith: WALLPAPER_PREFIX } }, { key: LEGACY_KEY }, { key: SETTINGS_KEY }] } });
    res.json(await currentState());
  } catch (error) {
    serverError(res, 'SITE_RESET_WALLPAPERS_ERROR:', error);
  }
};
