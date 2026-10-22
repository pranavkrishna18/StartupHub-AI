const express = require('express');
const applicationController = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/startup/:startupId', applicationController.applyToStartup);
router.post('/apply', applicationController.applyToStartup);
router.get('/startup/:startupId', applicationController.getStartupApplications);
router.get('/me', applicationController.getMyApplications);
router.patch('/:applicationId', applicationController.respondToApplication);
router.patch('/:applicationId/stage', applicationController.updateApplicationStage);
router.post('/:applicationId/evaluate', applicationController.manuallyEvaluateApplication);



module.exports = router;
