const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const {
  getLearningProgress,
  saveLearningProgress,
  issueLearningCertificate,
  verifyLearningCertificate,
} = require('../controllers/learningController');
const { listPublicCourses, getCourseMedia } = require('../controllers/learningCourseController');

router.get('/courses', listPublicCourses);
router.get('/media/:courseId/:slot', getCourseMedia);
router.get('/certificates/:certificateCode', verifyLearningCertificate);
router.use(authMiddleware);
router.get('/progress', getLearningProgress);
router.put('/progress', saveLearningProgress);
router.post('/certificates', issueLearningCertificate);

module.exports = router;
