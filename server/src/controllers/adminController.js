const User = require('../models/User');
const Startup = require('../models/Startup');
const Report = require('../models/Report');
const VerificationRequest = require('../models/VerificationRequest');
const AuditLog = require('../models/AuditLog');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const { logAudit } = require('../middleware/auditMiddleware');

// Get overall stats for Admin dashboard
exports.getAdminStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStartups = await Startup.countDocuments();
    const verifiedStartups = await Startup.countDocuments({ status: 'verified' });
    const pendingVerifications = await VerificationRequest.countDocuments({ status: 'pending' });
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          totalUsers,
          totalStartups,
          verifiedStartups,
          pendingVerifications,
          pendingReports
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create a verification request (Founder only)
exports.createVerificationRequest = async (req, res, next) => {
  try {
    const { startupId, documentUrl } = req.body;

    if (!startupId || !documentUrl) {
      return next(new AppError('Please provide startupId and documentUrl', 400));
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Check ownership
    if (startup.founder.toString() !== req.user.id) {
      return next(new AppError('You are not the owner of this startup', 403));
    }

    // Check if there is already a pending verification request
    const existingRequest = await VerificationRequest.findOne({ startup: startupId, status: 'pending' });
    if (existingRequest) {
      return next(new AppError('Verification request is already pending for this startup', 400));
    }

    const request = await VerificationRequest.create({
      founder: req.user.id,
      startup: startupId,
      documentUrl
    });

    res.status(201).json({
      status: 'success',
      data: {
        request
      }
    });
  } catch (error) {
    next(error);
  }
};

// Fetch verification requests list (Admin only)
exports.getVerificationRequests = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const requests = await VerificationRequest.find({ status })
      .populate('founder', 'email')
      .populate('startup', 'name tagline status')
      .sort({ createdAt: -1 });

    const founderIds = requests.map(r => r.founder?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: founderIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p.fullName]));

    const enrichedRequests = requests.map(r => {
      const doc = r.toObject();
      if (doc.founder) {
        doc.founder.fullName = profileMap.get(doc.founder._id.toString()) || 'Anonymous Founder';
      }
      return doc;
    });

    res.status(200).json({
      status: 'success',
      data: {
        requests: enrichedRequests
      }
    });
  } catch (error) {
    next(error);
  }
};

// Approve or Reject verification requests (Admin only)
exports.updateVerificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return next(new AppError('Invalid status. Choose approved or rejected.', 400));
    }

    const verificationReq = await VerificationRequest.findById(id);
    if (!verificationReq) {
      return next(new AppError('Verification request not found', 404));
    }

    verificationReq.status = status;
    verificationReq.adminNotes = adminNotes || '';
    await verificationReq.save();

    const startup = await Startup.findById(verificationReq.startup);
    if (startup) {
      if (status === 'approved') {
        startup.status = 'verified';
        await startup.save();
      }
      // Log the admin action in the audit trail
      await logAudit(req, `STARTUP_VERIFY_${status.toUpperCase()}`, 'Startup', startup._id, {
        verificationRequestId: id,
        adminNotes
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        request: verificationReq
      }
    });
  } catch (error) {
    next(error);
  }
};

// Fetch reported startups list (Admin only)
exports.getReports = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const reports = await Report.find({ status })
      .populate('reporter', 'email')
      .populate('startup', 'name tagline status founder')
      .sort({ createdAt: -1 });

    const reporterIds = reports.map(r => r.reporter?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: reporterIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p.fullName]));

    const enrichedReports = reports.map(r => {
      const doc = r.toObject();
      if (doc.reporter) {
        doc.reporter.fullName = profileMap.get(doc.reporter._id.toString()) || 'Anonymous Reporter';
      }
      return doc;
    });

    res.status(200).json({
      status: 'success',
      data: {
        reports: enrichedReports
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update status of reported startups (Admin only)
exports.updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, actionTaken, resolutionDetails } = req.body; // status: 'resolved' or 'dismissed'. actionTaken: 'none' or 'takedown'

    if (!['resolved', 'dismissed'].includes(status)) {
      return next(new AppError('Invalid status. Choose resolved or dismissed.', 400));
    }

    const report = await Report.findById(id);
    if (!report) {
      return next(new AppError('Report not found', 404));
    }

    report.status = status;
    report.resolutionDetails = resolutionDetails || '';
    report.resolvedBy = req.user.id;
    await report.save();

    if (status === 'resolved' && actionTaken === 'takedown') {
      const startup = await Startup.findById(report.startup);
      if (startup) {
        // Change status to draft to hide it from feed or delete it. Let's make it draft (take down).
        startup.status = 'draft';
        await startup.save();
        
        await logAudit(req, 'STARTUP_TAKEDOWN', 'Startup', startup._id, {
          reportId: id,
          resolutionDetails
        });
      }
    } else {
      await logAudit(req, `REPORT_${status.toUpperCase()}`, 'Report', report._id, {
        actionTaken,
        resolutionDetails
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        report
      }
    });
  } catch (error) {
    next(error);
  }
};

// Fetch audit logs stream (Admin only)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'email')
      .sort({ createdAt: -1 })
      .limit(100);

    const actorIds = logs.map(l => l.actor?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: actorIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p.fullName]));

    const enrichedLogs = logs.map(l => {
      const doc = l.toObject();
      if (doc.actor) {
        doc.actor.fullName = profileMap.get(doc.actor._id.toString()) || 'System/Unknown';
      }
      return doc;
    });

    res.status(200).json({
      status: 'success',
      data: {
        logs: enrichedLogs
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create and broadcast an admin announcement (Admin only) (Module 8)
exports.createAnnouncement = async (req, res, next) => {
  try {
    const { target, userIds, title, message, deliveryMethod } = req.body;

    if (!target || !title || !message || !deliveryMethod) {
      return next(new AppError('Please provide target, title, message, and deliveryMethod', 400));
    }

    if (!['everyone', 'founders', 'investors', 'cofounders', 'specific'].includes(target)) {
      return next(new AppError('Invalid announcement target audience', 400));
    }

    if (!['in-app', 'email', 'both'].includes(deliveryMethod)) {
      return next(new AppError('Invalid delivery method', 400));
    }

    // 1. Resolve targeted users
    let query = {};
    if (target === 'founders') query.role = 'founder';
    else if (target === 'investors') query.role = 'investor';
    else if (target === 'cofounders') query.role = 'cofounder';
    else if (target === 'specific') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return next(new AppError('Please provide userIds array for specific target', 400));
      }
      query._id = { $in: userIds };
    }

    const targetUsers = await User.find(query);
    if (targetUsers.length === 0) {
      return next(new AppError('No target users found matching selection criteria', 404));
    }

    const notificationService = require('../services/notificationService');
    const emailService = require('../services/emailService');

    // Load profiles of the targeted users to fetch names for emails
    const targetUserIds = targetUsers.map(u => u._id);
    const profiles = await Profile.find({ user: { $in: targetUserIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p.fullName]));

    // 2. Broadcast loop
    let successes = 0;
    for (const targetUser of targetUsers) {
      const name = profileMap.get(targetUser._id.toString()) || 'Builder';

      // Send In-App notification
      if (deliveryMethod === 'in-app' || deliveryMethod === 'both') {
        try {
          await notificationService.sendNotification({
            senderId: req.user.id,
            receiverId: targetUser._id,
            type: 'announcement',
            title: `Announcement: ${title} 📢`,
            message: message.substring(0, 200),
            resourceType: 'User',
            resourceId: targetUser._id
          });
        } catch (err) {
          console.error(`Failed to send announcement in-app to ${targetUser._id}:`, err.message);
        }
      }

      // Send Email notification
      if (deliveryMethod === 'email' || deliveryMethod === 'both') {
        try {
          await emailService.sendAnnouncementEmail(targetUser.email, name, title, message);
        } catch (err) {
          console.error(`Failed to send announcement email to ${targetUser.email}:`, err.message);
        }
      }

      successes++;
    }

    // Log the announcement action in the audit logs
    await logAudit(req, 'ADMIN_BROADCAST_ANNOUNCEMENT', 'User', req.user.id, {
      target,
      deliveryMethod,
      title,
      successCount: successes
    });

    res.status(200).json({
      status: 'success',
      message: `Announcement broadcasted successfully to ${successes} users!`
    });
  } catch (error) {
    next(error);
  }
};

// Trigger the weekly performance digest aggregation and dispatch manually (Admin only) (Module 9)
exports.triggerWeeklyDigest = async (req, res, next) => {
  try {
    const cronService = require('../services/cronService');
    const result = await cronService.runWeeklyPerformanceDigest();

    res.status(200).json({
      status: 'success',
      message: `Weekly Performance Digest aggregates compiled and dispatched! Sent ${result.founderCount} founder digests and ${result.roundupCount} platform roundups.`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};


