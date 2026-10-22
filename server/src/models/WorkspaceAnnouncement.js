const mongoose = require('mongoose');

const workspaceAnnouncementSchema = new mongoose.Schema({
  startup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: [true, 'Announcement must belong to a startup workspace'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please specify the announcement title'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Please specify the announcement content'],
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound index for announcements lookup
workspaceAnnouncementSchema.index({ startup: 1, isPinned: -1 });

module.exports = mongoose.model('WorkspaceAnnouncement', workspaceAnnouncementSchema);
