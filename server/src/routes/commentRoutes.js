const express = require('express');
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(commentController.getComments)
  .post(protect, commentController.createComment);

router.delete('/:commentId', protect, commentController.deleteComment);

module.exports = router;
