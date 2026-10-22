const express = require('express');
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', jobController.getAllJobs);
router.get('/:id', jobController.getJobDetails);
router.get('/startup/:startupId', jobController.getStartupJobs);

// Protected routes (Require authentication)
router.use(protect);
router.post('/', jobController.createJob);
router.patch('/:id', jobController.updateJobStatus);

module.exports = router;
