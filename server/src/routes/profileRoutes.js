const express = require('express');
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected profile actions
router.get('/me', protect, profileController.getMe);
router.put('/me', protect, profileController.updateMe);

// Get public profile
router.get('/:userId', profileController.getProfile);

module.exports = router;
