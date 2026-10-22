const express = require('express');
const fundraisingController = require('../controllers/fundraisingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Investor dashboard
router.get('/dashboard/investor', fundraisingController.getInvestorDashboard);

// Base startup profiles
router.get('/:startupId', fundraisingController.getFundraisingProfile);
router.patch('/:startupId', fundraisingController.updateFundraisingConfig);

// NDA and VDR compliance
router.post('/:startupId/nda/sign', fundraisingController.signNDA);
router.get('/:startupId/vdr', fundraisingController.getVdrDocuments);

// Term sheets management
router.post('/:startupId/term-sheet/generate', fundraisingController.generateTermSheet);
router.patch('/term-sheet/:sheetId/respond', fundraisingController.respondToTermSheet);

module.exports = router;
