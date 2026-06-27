const express = require('express');
const matchController = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, matchController.getMatches);

module.exports = router;
