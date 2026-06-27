const express = require('express');
const startupController = require('../controllers/startupController');
const commentRouter = require('./commentRoutes');
const { protect, restrictTo, protectOptional } = require('../middleware/authMiddleware');

const router = express.Router();

// Forward to nested comments router
router.use('/:startupId/comments', commentRouter);

// Public Routes (Optional authentication to attach voting status)
router.get('/', protectOptional, startupController.getAllStartups);
router.get('/:id', protectOptional, startupController.getStartup);
router.post('/:id/waitlist', protectOptional, startupController.joinWaitlist); // Waitlist signup can be public

// Protected Routes (Required authentication)
router.use(protect);

router.post('/', restrictTo('founder', 'admin'), startupController.createStartup);
router.patch('/:id', restrictTo('founder', 'admin'), startupController.updateStartup);
router.delete('/:id', restrictTo('founder', 'admin'), startupController.deleteStartup);

router.post('/:id/vote', startupController.toggleVote);
router.get('/:id/waitlist', restrictTo('founder', 'admin'), startupController.getWaitlist);

module.exports = router;
