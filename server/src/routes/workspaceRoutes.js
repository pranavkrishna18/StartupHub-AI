const express = require('express');
const workspaceController = require('../controllers/workspaceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// Workspace base batch data fetch
router.get('/:startupId', workspaceController.getWorkspaceData);

// Tasks management
router.post('/:startupId/tasks', workspaceController.createTask);
router.patch('/:startupId/tasks/:taskId', workspaceController.updateTask);

// Announcements management
router.post('/:startupId/announcements', workspaceController.createAnnouncement);
router.patch('/:startupId/announcements/:announcementId/pin', workspaceController.togglePinAnnouncement);

// Documents management
router.post('/:startupId/documents', workspaceController.createDocument);
router.patch('/:startupId/documents/:docId', workspaceController.updateDocument);

module.exports = router;
