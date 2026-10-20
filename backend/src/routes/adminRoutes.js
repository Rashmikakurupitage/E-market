const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const {
  createAdmin,
  getStats,
  getOverview,
  listSellers,
  getSellerProducts,
  setSellerStatus,
  removeSeller,
  listProducts,
  setProductPublished,
  deleteProduct
} = require('../controllers/adminController');
const { listComplaints, updateComplaint } = require('../controllers/complaintController');
const { addWallpaper, removeWallpaper, saveWallpaperSettings, resetWallpapers } = require('../controllers/siteController');
const {
  listAdminCourses,
  createCourse,
  updateCourse,
  setCoursePublished,
} = require('../controllers/learningCourseController');

// Every admin route needs a logged-in admin
router.use(authMiddleware, requireAdmin);

router.get('/stats', getStats);
router.get('/overview', getOverview);
router.post('/admins', createAdmin);

router.get('/sellers', listSellers);
router.get('/sellers/:id/products', getSellerProducts);
router.patch('/sellers/:id/status', setSellerStatus);
router.delete('/sellers/:id', removeSeller);

router.get('/products', listProducts);
router.patch('/products/:id', setProductPublished);
router.delete('/products/:id', deleteProduct);

router.get('/complaints', listComplaints);
router.patch('/complaints/:id', updateComplaint);

router.post('/site/wallpapers', addWallpaper);
router.delete('/site/wallpapers/:id', removeWallpaper);
router.put('/site/wallpaper-settings', saveWallpaperSettings);
router.delete('/site/wallpapers', resetWallpapers);

router.get('/learning-courses', listAdminCourses);
router.post('/learning-courses', createCourse);
router.put('/learning-courses/:courseId', updateCourse);
router.patch('/learning-courses/:courseId/published', setCoursePublished);

module.exports = router;
