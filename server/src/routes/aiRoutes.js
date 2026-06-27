const express = require('express');
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/:startupId', aiController.generateReport);
router.get('/:startupId', aiController.getReport);

module.exports = router;
