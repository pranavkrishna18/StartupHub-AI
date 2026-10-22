const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: {
      values: [
        'comment',
        'vote',
        'waitlist',
        'follow',
        'apply_cofounder',
        'accept_application',
        'reject_application',
        'application_stage_update',
        'chat_message',

        'announcement'
      ],
      message: 'Invalid notification type'
    },
    required: true
  },
  title: {
    type: String,
    required: [true, 'Notification must have a title'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification must have a body message'],
    trim: true
  },
  relatedResource: {
    resourceType: {
      type: String,
      enum: ['Startup', 'Message', 'Application', 'User'],
      required: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    }
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index to query user notifications fast
notificationSchema.index({ receiver: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
