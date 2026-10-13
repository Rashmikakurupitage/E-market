const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authmiddleware');
const { createComplaint, getMyComplaints, listSellers, editComplaint } = require('../controllers/complaintController');

// Customers only (the handlers check the account type)
router.use(authMiddleware);
router.post('/', createComplaint);
router.get('/mine', getMyComplaints);
router.get('/sellers', listSellers);
router.patch('/:id', editComplaint);

module.exports = router;
