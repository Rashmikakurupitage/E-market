const express = require('express');
const router = express.Router();
const { getSettings, getWallpaper, getStats, getSellerMap } = require('../controllers/siteController');

// Public: the website reads these on every visit
router.get('/settings', getSettings);
router.get('/wallpaper/:id', getWallpaper);
router.get('/stats', getStats);
router.get('/seller-map', getSellerMap);

module.exports = router;
