const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const requireAdmin = require('../middlewares/requireAdmin');
const {
  createAdmin,
  listAdmins,
  removeAdmin,
  getStats,
  getOverview,
  listCustomers,
  removeCustomer,
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
  uploadCourseMedia,
  deleteCourseMedia,
} = require('../controllers/learningCourseController');

// Every admin route needs a logged-in admin
router.use(authMiddleware, requireAdmin);

router.get('/stats', getStats);
router.get('/overview', getOverview);
router.get('/admins', listAdmins);
router.post('/admins', createAdmin);
router.delete('/admins/:id', removeAdmin);

router.get('/customers', listCustomers);
router.delete('/customers/:id', removeCustomer);

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
router.put(
  '/learning-courses/:courseId/media/:slot',
  express.raw({
    type: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'],
    limit: '100mb',
  }),
  uploadCourseMedia
);
router.delete('/learning-courses/:courseId/media/:slot', deleteCourseMedia);

module.exports = router;
