const express = require('express');
const resumeController = require('../controllers/resumeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/analyze', resumeController.analyzeResume);
router.get('/report', resumeController.getResumeReport);

module.exports = router;
