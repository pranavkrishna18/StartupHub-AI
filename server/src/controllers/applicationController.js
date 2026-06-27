const Application = require('../models/Application');
const Startup = require('../models/Startup');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');

// SUBMIT REQUEST
exports.applyToStartup = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { roleProposed, message } = req.body;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Founders cannot apply to their own startups
    if (startup.founder.toString() === req.user.id) {
      return next(new AppError('You cannot apply to your own startup', 400));
    }

    // Check if user is already a team member
    const isTeamMember = startup.team?.some(t => t.user.toString() === req.user.id);
    if (isTeamMember) {
      return next(new AppError('You are already a team member of this startup', 400));
    }

    // Check if duplicate application
    const existing = await Application.findOne({ startup: startupId, user: req.user.id });
    if (existing) {
      return next(new AppError('You have already applied to this startup', 400));
    }

    const application = await Application.create({
      startup: startupId,
      user: req.user.id,
      roleProposed,
      message
    });

    // Send notification to the founder
    try {
      const applicantProfile = await Profile.findOne({ user: req.user.id });
      const applicantName = applicantProfile ? applicantProfile.fullName : 'A builder';

      await notificationService.sendNotification({
        senderId: req.user.id,
        receiverId: startup.founder,
        type: 'apply_cofounder',
        title: `New co-founder application for ${startup.name} 🤝`,
        message: `${applicantName} has applied to join your team as ${roleProposed}.`,
        resourceType: 'Startup',
        resourceId: startupId,
        triggerEmail: true,
        extraContext: {
          roleProposed,
          messageText: message
        }
      });
    } catch (notiErr) {
      console.error('Co-founder application submission notification failed:', notiErr.message);
    }

    res.status(201).json({
      status: 'success',
      data: {
        application
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET APPLICATIONS FOR A STARTUP (FOUNDER ONLY)
exports.getStartupApplications = async (req, res, next) => {
  try {
    const { startupId } = req.params;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Validate ownership
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to view this startup\'s applications', 403));
    }

    const applications = await Application.find({ startup: startupId })
      .populate('user', 'email')
      .sort({ createdAt: -1 });

    // Fetch candidate profiles to enrich details
    const userIds = applications.map(app => app.user._id);
    const profiles = await Profile.find({ user: { $in: userIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p]));

    const enriched = applications.map(app => {
      const doc = app.toObject();
      const profile = profileMap.get(app.user._id.toString());
      doc.user = {
        _id: app.user._id,
        email: app.user.email,
        fullName: profile?.fullName || 'Anonymous Candidate',
        headline: profile?.headline || '',
        skills: profile?.skills || [],
        avatar: profile?.avatar || ''
      };
      return doc;
    });

    res.status(200).json({
      status: 'success',
      results: enriched.length,
      data: {
        applications: enriched
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET LOGGED IN USER APPLICATIONS
exports.getMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ user: req.user.id })
      .populate('startup', 'name tagline category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: applications.length,
      data: {
        applications
      }
    });
  } catch (error) {
    next(error);
  }
};

// RESPOND TO REQUEST (ACCEPT OR REJECT)
exports.respondToApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return next(new AppError('Status must be either accepted or rejected', 400));
    }

    const application = await Application.findById(applicationId);
    if (!application) {
      return next(new AppError('Application not found', 404));
    }

    const startup = await Startup.findById(application.startup);
    if (!startup) {
      return next(new AppError('Startup associated with this application not found', 404));
    }

    // Owner checks
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to respond to this application', 403));
    }

    // Update status
    application.status = status;
    await application.save();

    // If accepted, add to startup team
    if (status === 'accepted') {
      // Check if already in team
      const alreadyInTeam = startup.team.some(t => t.user.toString() === application.user.toString());
      
      if (!alreadyInTeam) {
        startup.team.push({
          user: application.user,
          role: application.roleProposed
        });
        await startup.save();
      }
    }

    // Send status update notification to the candidate applicant
    try {
      if (status === 'accepted') {
        await notificationService.sendNotification({
          senderId: req.user.id,
          receiverId: application.user,
          type: 'accept_application',
          title: `Welcome to the team of ${startup.name}! 🎉`,
          message: `Congratulations! The founder accepted your application to join as ${application.roleProposed}.`,
          resourceType: 'Startup',
          resourceId: startup._id,
          triggerEmail: true,
          extraContext: { role: application.roleProposed }
        });
      } else {
        await notificationService.sendNotification({
          senderId: req.user.id,
          receiverId: application.user,
          type: 'reject_application',
          title: `Application update for ${startup.name} 📋`,
          message: `The founder has reviewed your application to join as ${application.roleProposed} and decided not to proceed at this time.`,
          resourceType: 'Startup',
          resourceId: startup._id,
          triggerEmail: true
        });
      }
    } catch (notiErr) {
      console.error('Application response status notification failed:', notiErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: {
        application
      }
    });
  } catch (error) {
    next(error);
  }
};
