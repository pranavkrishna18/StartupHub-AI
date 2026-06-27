const Comment = require('../models/Comment');
const Startup = require('../models/Startup');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');

// CREATE COMMENT / REPLY
exports.createComment = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { content, parentCommentId } = req.body;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    if (!content) {
      return next(new AppError('Comment content is required', 400));
    }

    // Verify parent comment if replying
    if (parentCommentId) {
      const parentExists = await Comment.findById(parentCommentId);
      if (!parentExists) {
        return next(new AppError('Parent comment not found', 400));
      }
    }

    const comment = await Comment.create({
      user: req.user.id,
      startup: startupId,
      content,
      parentComment: parentCommentId || null
    });

    // Increment comment count on startup
    startup.commentsCount += 1;
    await startup.save({ validateBeforeSave: false });

    // Populate user and profile details for the response
    const profile = await Profile.findOne({ user: req.user.id });

    // Send notifications
    try {
      const commenterName = profile ? profile.fullName : 'A builder';
      if (parentCommentId) {
        const parentComment = await Comment.findById(parentCommentId);
        if (parentComment && parentComment.user.toString() !== req.user.id) {
          await notificationService.sendNotification({
            senderId: req.user.id,
            receiverId: parentComment.user,
            type: 'comment',
            title: `New reply on your comment on ${startup.name}`,
            message: `${commenterName} replied to your comment: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
            resourceType: 'Startup',
            resourceId: startupId,
            triggerEmail: true,
            extraContext: { commentContent: content }
          });
        }
      } else {
        if (startup.founder.toString() !== req.user.id) {
          await notificationService.sendNotification({
            senderId: req.user.id,
            receiverId: startup.founder,
            type: 'comment',
            title: `New comment on ${startup.name}`,
            message: `${commenterName} commented on your startup idea: "${content.substring(0, 60)}${content.length > 60 ? '...' : ''}"`,
            resourceType: 'Startup',
            resourceId: startupId,
            triggerEmail: true,
            extraContext: { commentContent: content }
          });
        }
      }
    } catch (notificationErr) {
      console.error('Comment notification failed:', notificationErr.message);
    }

    const commentObj = comment.toObject();
    commentObj.user = {
      _id: req.user.id,
      email: req.user.email,
      fullName: profile ? profile.fullName : 'Anonymous',
      avatar: profile ? profile.avatar : ''
    };

    res.status(201).json({
      status: 'success',
      data: {
        comment: commentObj
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL COMMENTS FOR STARTUP (HIERARCHICAL STRUCTURING AVAILABLE ON FRONTEND)
exports.getComments = async (req, res, next) => {
  try {
    const { startupId } = req.params;

    const comments = await Comment.find({ startup: startupId })
      .populate('user', 'email')
      .sort({ createdAt: 1 });

    // Fetch profiles of commenters to attach names/avatars
    const userIds = comments.map(c => c.user._id);
    const profiles = await Profile.find({ user: { $in: userIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p]));

    const formattedComments = comments.map(c => {
      const doc = c.toObject();
      const profile = profileMap.get(c.user._id.toString());
      doc.user = {
        _id: c.user._id,
        email: c.user.email,
        fullName: profile ? profile.fullName : 'Anonymous',
        avatar: profile ? profile.avatar : ''
      };
      return doc;
    });

    res.status(200).json({
      status: 'success',
      results: formattedComments.length,
      data: {
        comments: formattedComments
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE A COMMENT
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return next(new AppError('Comment not found', 404));
    }

    // Auth validation
    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to delete this comment', 403));
    }

    // Decrement count on startup
    const startup = await Startup.findById(comment.startup);
    if (startup) {
      startup.commentsCount = Math.max(0, startup.commentsCount - 1);
      await startup.save({ validateBeforeSave: false });
    }

    // Delete comment (and optionally children, or just leave children orphaned or handle cascade)
    await Comment.findByIdAndDelete(commentId);
    // Cascade delete replies
    await Comment.deleteMany({ parentComment: commentId });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};
