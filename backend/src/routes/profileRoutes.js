const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const { getPhoto, setPhoto, removePhoto } = require('../controllers/profileController');

router.get('/photo/:userId', getPhoto); // shown as an image, so it cannot carry a login header
router.put('/photo', authMiddleware, setPhoto);
router.delete('/photo', authMiddleware, removePhoto);

module.exports = router;
