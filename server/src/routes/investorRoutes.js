const express = require('express');
const investorController = require('../controllers/investorController');
const { protect, restrictTo, protectOptional } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/bookmark/:startupId', investorController.toggleBookmark);
router.post('/follow/:userId', investorController.toggleFollow);
router.get('/dashboard', restrictTo('investor', 'admin'), investorController.getInvestorDashboard);
router.get('/discovery', investorController.getInvestorStartupDiscovery);

module.exports = router;
