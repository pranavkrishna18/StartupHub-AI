const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/founder', protect, restrictTo('founder', 'admin'), dashboardController.getFounderDashboardStats);

module.exports = router;
