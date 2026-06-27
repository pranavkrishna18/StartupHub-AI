const Message = require('../models/Message');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Startup = require('../models/Startup');
const Vote = require('../models/Vote');
const Waitlist = require('../models/Waitlist');
const Application = require('../models/Application');
const Category = require('../models/Category');
const emailService = require('./emailService');
const { userSocketMap } = require('../config/socket');

/**
 * Periodically check for unread messages sent to offline users,
 * batch them, and send summary emails.
 */
const checkOfflineMessages = async () => {
  try {
    console.log('⏰ Running Cron Job: Checking offline direct messages...');

    // Find all unread messages that haven't been emailed yet
    // Filter messages that are at least 2 minutes old to avoid email spam during active typing lag
    const cutOffTime = new Date(Date.now() - 2 * 60 * 1000);
    const unreadMessages = await Message.find({
      isRead: false,
      emailSent: false,
      createdAt: { $lte: cutOffTime }
    });

    if (unreadMessages.length === 0) {
      console.log('⏰ Cron: No unsent offline messages found.');
      return;
    }

    // Group unread messages by receiverId
    const messagesByReceiver = {};
    unreadMessages.forEach(msg => {
      const recId = msg.receiver.toString();
      if (!messagesByReceiver[recId]) {
        messagesByReceiver[recId] = [];
      }
      messagesByReceiver[recId].push(msg);
    });

    // Process each receiver
    for (const [receiverId, msgs] of Object.entries(messagesByReceiver)) {
      // 1. Skip if user is currently online
      if (userSocketMap.has(receiverId)) {
        console.log(`⏰ Cron: Receiver ${receiverId} is currently online. Skipping email batching.`);
        continue;
      }

      // 2. Load receiver details and preferences
      const receiverUser = await User.findById(receiverId);
      if (!receiverUser) continue;

      const prefs = receiverUser.notificationPreferences || { messages: true };
      if (!prefs.messages) {
        // Mark as sent so we don't check them again
        const msgIds = msgs.map(m => m._id);
        await Message.updateMany({ _id: { $in: msgIds } }, { emailSent: true });
        console.log(`⏰ Cron: Receiver ${receiverId} has messages email disabled. Marked messages as email-processed.`);
        continue;
      }

      // 3. Batch sender profiles
      const senderIds = [...new Set(msgs.map(m => m.sender.toString()))];
      const senderProfiles = await Profile.find({ user: { $in: senderIds } });
      const senderNames = senderProfiles.map(p => p.fullName || 'Anonymous User');
      
      // If profiles are missing (e.g. mock users without complete profile), add placeholders
      if (senderNames.length === 0) {
        senderNames.push('Another builder');
      }

      const receiverProfile = await Profile.findOne({ user: receiverId });
      const receiverName = receiverProfile ? receiverProfile.fullName : 'Founder';

      // 4. Send batch summary email
      try {
        await emailService.sendOfflineMessagesSummaryEmail(
          receiverUser.email,
          receiverName,
          msgs.length,
          senderNames
        );

        // 5. Update messages to prevent double emailing
        const msgIds = msgs.map(m => m._id);
        await Message.updateMany({ _id: { $in: msgIds } }, { emailSent: true });
        console.log(`⏰ Cron: Dispatched direct message summary to ${receiverUser.email} for ${msgs.length} unread texts.`);
      } catch (mailErr) {
        console.error(`❌ Cron offline message email error for user ${receiverId}:`, mailErr.message);
      }
    }
  } catch (error) {
    console.error('❌ Cron Job offline messages error:', error.message);
  }
};

/**
 * Aggregates statistics for the past week and dispatches digests to active founders,
 * and trending roundups to investors/co-founders. (Module 9)
 */
const runWeeklyPerformanceDigest = async () => {
  try {
    console.log('⏰ Running Cron Job: Generating weekly performance digests and roundups...');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 1. Identify all users with digest enabled
    const digestUsers = await User.find({ 'notificationPreferences.digest': true });
    if (digestUsers.length === 0) {
      console.log('⏰ Cron Digest: No users have weekly digest enabled.');
      return { status: 'success', founderCount: 0, roundupCount: 0 };
    }

    // Load all profiles to fetch names
    const userIds = digestUsers.map(u => u._id);
    const profiles = await Profile.find({ user: { $in: userIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p.fullName]));

    // 2. Fetch trending startups of the week (Top 3 by new votes in last 7 days)
    const recentVotes = await Vote.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$startup', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    const trendingStartups = [];
    for (const voteGroup of recentVotes) {
      const startup = await Startup.findById(voteGroup._id).populate('category');
      if (startup) {
        trendingStartups.push({
          startupId: startup._id.toString(),
          startupName: startup.name,
          tagline: startup.tagline,
          category: startup.category ? startup.category.name : 'General',
          newVotes: voteGroup.count
        });
      }
    }

    // Fallback: If no votes in last 7 days, get top 3 by cumulative votesCount
    if (trendingStartups.length === 0) {
      const fallbackStartups = await Startup.find({ status: { $ne: 'draft' } })
        .sort({ votesCount: -1 })
        .limit(3)
        .populate('category');
      
      fallbackStartups.forEach(startup => {
        trendingStartups.push({
          startupId: startup._id.toString(),
          startupName: startup.name,
          tagline: startup.tagline,
          category: startup.category ? startup.category.name : 'General',
          newVotes: startup.votesCount
        });
      });
    }

    let founderCount = 0;
    let roundupCount = 0;

    // 3. Process each user
    for (const user of digestUsers) {
      const name = profileMap.get(user._id.toString()) || 'Builder';

      // Find startups owned by this user
      const ownedStartups = await Startup.find({ founder: user._id });

      if (ownedStartups.length > 0) {
        // Aggregation for founder
        const startupsStats = [];
        for (const startup of ownedStartups) {
          // New votes in the last 7 days
          const newVotes = await Vote.countDocuments({
            startup: startup._id,
            createdAt: { $gte: sevenDaysAgo }
          });

          // New waitlist signups in the last 7 days
          const newWaitlist = await Waitlist.countDocuments({
            startup: startup._id,
            createdAt: { $gte: sevenDaysAgo }
          });

          // New applications/matches in the last 7 days
          const newApplications = await Application.countDocuments({
            startup: startup._id,
            createdAt: { $gte: sevenDaysAgo }
          });

          startupsStats.push({
            startupName: startup.name,
            views: startup.metrics?.views || 0,
            newVotes,
            newWaitlist,
            newApplications
          });
        }

        try {
          await emailService.sendFounderWeeklyDigestEmail(user.email, name, startupsStats);
          founderCount++;
        } catch (err) {
          console.error(`❌ Failed to send weekly founder digest to ${user.email}:`, err.message);
        }
      } else {
        // Send platform roundup (trending startups) to non-founders
        if (trendingStartups.length > 0) {
          try {
            await emailService.sendPlatformWeeklyRoundupEmail(user.email, name, trendingStartups);
            roundupCount++;
          } catch (err) {
            console.error(`❌ Failed to send weekly platform roundup to ${user.email}:`, err.message);
          }
        }
      }
    }

    console.log(`⏰ Cron Digest: Completed dispatch. Sent ${founderCount} founder digests and ${roundupCount} platform roundups.`);
    return {
      status: 'success',
      founderCount,
      roundupCount
    };
  } catch (error) {
    console.error('❌ Cron Job weekly performance digest error:', error.message);
    throw error;
  }
};

exports.runWeeklyPerformanceDigest = runWeeklyPerformanceDigest;

/**
 * Initialize all platform cron checks
 */
exports.initCronJobs = () => {
  // Check every 10 minutes (for testing/demo: check every 2 minutes)
  const intervalMs = 2 * 60 * 1000;
  setInterval(checkOfflineMessages, intervalMs);

  // Weekly performance digest (Check every 7 days)
  const weeklyMs = 7 * 24 * 60 * 60 * 1000;
  setInterval(runWeeklyPerformanceDigest, weeklyMs);

  console.log(`⏰ Periodic cron checkers initialized (Offline Msg Interval: ${intervalMs / 1000 / 60}m, Digest Interval: 7 days)`);
};
