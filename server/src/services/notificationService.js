const Notification = require('../models/Notification');
const Profile = require('../models/Profile');
const User = require('../models/User');
const Startup = require('../models/Startup');
const emailService = require('./emailService');
const { getIO, getUserSocketId } = require('../config/socket');

/**
 * Dispatcher: Saves a notification to database, attempts real-time Socket.IO emit,
 * and handles background Resend email dispatch based on preferences.
 */
exports.sendNotification = async ({
  senderId,
  receiverId,
  type,
  title,
  message,
  resourceType,
  resourceId,
  triggerEmail = false,
  extraContext = {}
}) => {
  try {
    // 1. Save Notification in MongoDB
    const notification = await Notification.create({
      sender: senderId,
      receiver: receiverId,
      type,
      title,
      message,
      relatedResource: {
        resourceType,
        resourceId
      }
    });

    console.log(`🔔 In-app notification created. Type: ${type}, ID: ${notification._id}`);

    // 2. Fetch sender profile to enrich socket payload
    const senderProfile = await Profile.findOne({ user: senderId });
    const notificationPayload = notification.toObject();
    notificationPayload.senderProfile = senderProfile ? {
      fullName: senderProfile.fullName,
      avatar: senderProfile.avatar || ''
    } : {
      fullName: 'System User',
      avatar: ''
    };

    // 3. Emit real-time WebSocket if user is online
    const io = getIO();
    if (io) {
      const recipientSocketId = getUserSocketId(receiverId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', notificationPayload);
        console.log(`🔌 Broadcasted real-time notification socket event to user ${receiverId}`);
      } else {
        console.log(`💤 Recipient ${receiverId} is currently offline. Socket event skipped.`);
      }
    }

    // 4. Send background transactional email if required
    if (triggerEmail) {
      // Run email sending asynchronously so we do not block request response
      setImmediate(async () => {
        try {
          // Look up details needed for email templates
          const receiverUser = await User.findById(receiverId);
          if (!receiverUser) return;
          const receiverEmail = receiverUser.email;

          // Check user notification preferences before sending
          const prefs = receiverUser.notificationPreferences || {
            messages: true,
            applications: true,
            comments: true,
            waitlist: true,
            aiReports: true,
            digest: true,
            marketing: false
          };

          let shouldSendEmail = true;
          if (type === 'comment' && !prefs.comments) shouldSendEmail = false;
          if (type === 'vote' && !prefs.waitlist) shouldSendEmail = false;
          if (type === 'waitlist' && !prefs.waitlist) shouldSendEmail = false;
          if (type === 'apply_cofounder' && !prefs.applications) shouldSendEmail = false;
          if (type === 'accept_application' && !prefs.applications) shouldSendEmail = false;
          if (type === 'reject_application' && !prefs.applications) shouldSendEmail = false;
          if (type === 'chat_message' && !prefs.messages) shouldSendEmail = false;

          if (!shouldSendEmail) {
            console.log(`🔇 User ${receiverId} has disabled email alerts for type: ${type}`);
            return;
          }

          const receiverProfile = await Profile.findOne({ user: receiverId });
          const receiverName = receiverProfile ? receiverProfile.fullName : 'Founder';

          const senderName = senderProfile ? senderProfile.fullName : 'Collaborator';

          let startupName = 'Your Startup Concept';
          if (resourceType === 'Startup') {
            const startup = await Startup.findById(resourceId);
            if (startup) startupName = startup.name;
          }

          // Trigger email service functions based on notification type
          switch (type) {
            case 'comment':
              await emailService.sendNewCommentEmail(
                receiverEmail,
                receiverName,
                startupName,
                senderName,
                extraContext.commentContent || ''
              );
              break;

            case 'vote':
              await emailService.sendNewUpvoteEmail(
                receiverEmail,
                receiverName,
                startupName,
                senderName,
                extraContext.totalVotes || 1
              );
              break;

            case 'waitlist':
              await emailService.sendNewWaitlistEmail(
                receiverEmail,
                receiverName,
                startupName,
                extraContext.subscriberEmail || 'An early adopter',
                extraContext.totalWaitlist || 1
              );
              break;

            case 'apply_cofounder':
              await emailService.sendApplicationSubmittedEmail(
                receiverEmail,
                receiverName,
                startupName,
                senderName,
                extraContext.roleProposed || 'Co-founder',
                extraContext.messageText || ''
              );
              break;

            case 'accept_application':
              await emailService.sendApplicationAcceptedEmail(
                receiverEmail,
                receiverName,
                startupName,
                extraContext.role || 'Co-founder'
              );
              break;

            case 'reject_application':
              await emailService.sendApplicationRejectedEmail(
                receiverEmail,
                receiverName,
                startupName
              );
              break;

            default:
              console.log(`No matching template logic for notification type: ${type}`);
          }
        } catch (mailError) {
          console.error(`❌ Background notification email failed for user ${receiverId}:`, mailError.message);
        }
      });
    }

    return notification;
  } catch (err) {
    console.error('❌ Failed to dispatch notification:', err.message);
  }
};
