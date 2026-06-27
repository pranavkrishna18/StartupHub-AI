const express = require('express');
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', messageController.sendMessage);
router.get('/recent', messageController.getRecentChats);
router.get('/conversation/:otherUserId', messageController.getConversation);

module.exports = router;
