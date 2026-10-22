const Application = require('../models/Application');
const Startup = require('../models/Startup');
const Profile = require('../models/Profile');
const JobOpening = require('../models/JobOpening');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');
const aiMatchingService = require('../services/aiMatchingService');

// SUBMIT REQUEST TO JOB OPENING
exports.applyToStartup = async (req, res, next) => {
  try {
    const { jobId, message, resumeText, resumeFile } = req.body;

    if (!jobId) {
      return next(new AppError('Please specify the jobId you are applying for', 400));
    }

    const job = await JobOpening.findById(jobId).populate('startup');
    if (!job) {
      return next(new AppError('Job opening not found', 404));
    }

    if (job.status === 'closed') {
      return next(new AppError('This job opening is closed', 400));
    }

    const startup = job.startup;
    if (!startup) {
      return next(new AppError('Startup associated with this job not found', 404));
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
    const existing = await Application.findOne({ jobOpening: jobId, user: req.user.id });
    if (existing) {
      return next(new AppError('You have already applied to this job opening', 400));
    }

    // Save Base64 file locally if provided
    const { saveBase64Pdf } = require('../utils/uploadUtil');
    const savedFilePath = await saveBase64Pdf(resumeFile);

    const initialStage = job.hiringStages[0] || 'Screening';

    const application = await Application.create({
      startup: startup._id,
      jobOpening: jobId,
      user: req.user.id,
      message,
      resumeText,
      resumeFile: savedFilePath,
      currentStage: initialStage,
      historicalStages: [{
        stage: initialStage,
        updatedBy: req.user.id
      }]
    });


    // Trigger AI Matching evaluation asynchronously in the background
    aiMatchingService.evaluateApplicant(application._id).catch(err => {
      console.error('[AI MATCH ENGINE BACKGROUND ERROR]', err.message);
    });

    // Send notification to the founder
    try {
      const applicantProfile = await Profile.findOne({ user: req.user.id });

      const applicantName = applicantProfile ? applicantProfile.fullName : 'A builder';

      await notificationService.sendNotification({
        senderId: req.user.id,
        receiverId: startup.founder,
        type: 'apply_cofounder',
        title: `New applicant for ${job.title} 🤝`,
        message: `${applicantName} has applied to join your team as ${job.title}.`,
        resourceType: 'Startup',
        resourceId: startup._id,
        triggerEmail: true,
        extraContext: {
          roleProposed: job.title,
          messageText: message
        }
      });
    } catch (notiErr) {
      console.error('Application notification dispatch failed:', notiErr.message);
    }

    res.status(201).json({
      status: 'success',
      data: { application }
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
      .populate('jobOpening', 'title hiringStages')
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
      .populate('jobOpening', 'title')
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

// UPDATE APPLICANT STAGE (FOUNDER PIPELINE CONTROL)
exports.updateApplicationStage = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { stage } = req.body; // e.g. 'Technical Evaluation'

    if (!stage) {
      return next(new AppError('Please specify the target stage', 400));
    }

    const application = await Application.findById(applicationId).populate('jobOpening');
    if (!application) {
      return next(new AppError('Application not found', 404));
    }

    const startup = await Startup.findById(application.startup);
    if (!startup) {
      return next(new AppError('Startup associated with this application not found', 404));
    }

    // Validate ownership
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to manage this application pipeline', 403));
    }

    // Verify stage exists in the JobOpening's stages
    const stages = application.jobOpening.hiringStages;
    if (!stages.includes(stage)) {
      return next(new AppError(`The stage "${stage}" is not defined for this job opening`, 400));
    }

    // Update current stage and append to audit history
    application.currentStage = stage;
    application.historicalStages.push({
      stage,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    // Auto-update high level status mappings
    if (stage === 'Hired') {
      application.status = 'accepted';

      // Push candidate to startup team
      const alreadyInTeam = startup.team.some(t => t.user.toString() === application.user.toString());
      if (!alreadyInTeam) {
        startup.team.push({
          user: application.user,
          role: application.jobOpening.title
        });
        await startup.save();
      }
    } else if (stage === 'Rejected') {
      application.status = 'rejected';
    } else {
      application.status = 'pending';
    }

    await application.save();

    // Trigger notification cascade
    try {
      if (stage === 'Hired') {
        await notificationService.sendNotification({
          senderId: req.user.id,
          receiverId: application.user,
          type: 'accept_application',
          title: `Welcome to the team of ${startup.name}! 🎉`,
          message: `Congratulations! You have been Hired as a ${application.jobOpening.title}.`,
          resourceType: 'Startup',
          resourceId: startup._id,
          triggerEmail: true,
          extraContext: { role: application.jobOpening.title }
        });
      } else {
        await notificationService.sendNotification({
          senderId: req.user.id,
          receiverId: application.user,
          type: 'application_stage_update',
          title: `Application update for ${startup.name} 📋`,
          message: `Your application status for ${application.jobOpening.title} has updated to: ${stage}.`,
          resourceType: 'Startup',
          resourceId: startup._id,
          triggerEmail: true
        });
      }
    } catch (notiErr) {
      console.error('Application stage notification dispatch failed:', notiErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: { application }
    });
  } catch (err) {
    next(err);
  }
};

// RESPOND TO REQUEST (DEPRECATED - REMAINS FOR COMPATIBILITY)
exports.respondToApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body; // 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(status)) {
      return next(new AppError('Status must be either accepted or rejected', 400));
    }

    const application = await Application.findById(applicationId).populate('jobOpening');
    if (!application) {
      return next(new AppError('Application not found', 404));
    }

    const stage = status === 'accepted' ? 'Hired' : 'Rejected';
    req.body.stage = stage;
    return exports.updateApplicationStage(req, res, next);
  } catch (error) {
    next(error);
  }
};

// MANUALLY TRIGGER EVALUATION (FOUNDER/ADMIN ONLY)
exports.manuallyEvaluateApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

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
      return next(new AppError('You do not have permission to trigger evaluations', 403));
    }

    // Trigger matching engine synchronously
    await aiMatchingService.evaluateApplicant(applicationId);

    const updatedApplication = await Application.findById(applicationId).populate('jobOpening');

    res.status(200).json({
      status: 'success',
      data: {
        application: updatedApplication
      }
    });
  } catch (err) {
    next(err);
  }
};

