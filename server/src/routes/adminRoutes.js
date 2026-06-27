const express = require('express');
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Verification request creation (Founder / Admin)
router.post('/verifications', restrictTo('founder', 'admin'), adminController.createVerificationRequest);

// Admin-only management endpoints
router.use(restrictTo('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/verifications', adminController.getVerificationRequests);
router.patch('/verifications/:id', adminController.updateVerificationStatus);
router.get('/reports', adminController.getReports);
router.patch('/reports/:id', adminController.updateReportStatus);
router.get('/logs', adminController.getAuditLogs);
router.post('/announcements', adminController.createAnnouncement);
router.post('/trigger-weekly-digest', adminController.triggerWeeklyDigest);

module.exports = router;
