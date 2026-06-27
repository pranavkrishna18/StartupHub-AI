const express = require('express');
const applicationController = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/startup/:startupId', applicationController.applyToStartup);
router.get('/startup/:startupId', applicationController.getStartupApplications);
router.get('/me', applicationController.getMyApplications);
router.patch('/:applicationId', applicationController.respondToApplication);

module.exports = router;
