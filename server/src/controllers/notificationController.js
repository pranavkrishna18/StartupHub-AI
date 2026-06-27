const Notification = require('../models/Notification');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');

/**
 * Get all notifications for the current logged-in user
 */
exports.getMyNotifications = async (req, res, next) => {
  try {
    const filter = { receiver: req.user._id };
    
    // Allow filtering by read/unread status
    if (req.query.isRead !== undefined) {
      filter.isRead = req.query.isRead === 'true';
    }

    const notifications = await Notification.find(filter)
      .populate('sender', 'email role')
      .sort('-createdAt')
      .limit(100); // safety cap

    // Batch load sender profiles to attach names/avatars in response
    const senderIds = [...new Set(notifications.map(n => n.sender?._id?.toString()).filter(Boolean))];
    const profiles = await Profile.find({ user: { $in: senderIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p]));

    const mappedNotifications = notifications.map(notification => {
      const plainObj = notification.toObject();
      if (plainObj.sender) {
        const profile = profileMap.get(plainObj.sender._id.toString());
        plainObj.senderProfile = profile ? {
          fullName: profile.fullName,
          avatar: profile.avatar || ''
        } : {
          fullName: 'System User',
          avatar: ''
        };
      }
      return plainObj;
    });

    res.status(200).json({
      status: 'success',
      results: mappedNotifications.length,
      data: {
        notifications: mappedNotifications
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a specific notification as read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, receiver: req.user._id },
      { isRead: true },
      { new: true, runValidators: true }
    );

    if (!notification) {
      return next(new AppError('No notification found with that ID belonging to you', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for current user
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { receiver: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a specific notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      receiver: req.user._id
    });

    if (!notification) {
      return next(new AppError('No notification found with that ID belonging to you', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
