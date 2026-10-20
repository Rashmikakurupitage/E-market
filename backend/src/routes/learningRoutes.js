const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const { getLearningProgress, saveLearningProgress } = require('../controllers/learningController');
const { listPublicCourses } = require('../controllers/learningCourseController');

router.get('/courses', listPublicCourses);
router.use(authMiddleware);
router.get('/progress', getLearningProgress);
router.put('/progress', saveLearningProgress);

module.exports = router;
