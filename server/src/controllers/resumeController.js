const Profile = require('../models/Profile');
const JobOpening = require('../models/JobOpening');
const aiService = require('../services/aiService');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');

// ANALYZE RESUME
exports.analyzeResume = async (req, res, next) => {
  try {
    const { resumeText, resumeFile } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return next(new AppError('Please provide resume text content to analyze', 400));
    }

    // Retrieve candidate profile
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return next(new AppError('Profile not found. Please complete basic onboarding first.', 404));
    }

    // Save Base64 file locally if provided
    const { saveBase64Pdf } = require('../utils/uploadUtil');
    const savedFilePath = await saveBase64Pdf(resumeFile);

    // Fetch active job openings for matching
    const activeJobs = await JobOpening.find({ status: 'active' })
      .populate('startup', 'name')
      .limit(15); // Top 15 jobs

    console.log(`[RESUME ANALYZER] Running parser. Matching against ${activeJobs.length} active roles...`);

    // Call LLM
    const analysis = await aiService.generateResumeAnalysisReport(resumeText, activeJobs);

    // Save report to candidate's profile
    profile.resumeAnalysis = {
      resumeText,
      resumeFile: savedFilePath,
      extractedSkills: analysis.extractedSkills || [],
      extractedExperience: analysis.extractedExperience || [],
      extractedEducation: analysis.extractedEducation || [],
      extractedProjects: analysis.extractedProjects || [],
      extractedCertifications: analysis.extractedCertifications || [],
      extractedInterests: analysis.extractedInterests || [],
      resumeScore: analysis.resumeScore || 0,
      atsScore: analysis.atsScore || 0,
      compatibility: analysis.compatibility || 0,
      missingSkills: analysis.missingSkills || [],
      learningRoadmap: analysis.learningRoadmap || [],
      recommendedStartups: analysis.recommendedStartups || [],
      recommendedRoles: analysis.recommendedRoles || [],
      personalizedSuggestions: analysis.personalizedSuggestions || [],
      analyzedAt: new Date()
    };

    await profile.save();

    console.log(`[RESUME ANALYZER] Resume successfully parsed & saved for user ${req.user.id}`);

    // Send notifications to the user
    try {
      await notificationService.sendNotification({
        senderId: req.user.id, // System loop fallback
        receiverId: req.user.id,
        type: 'announcement',
        title: 'Resume Vetting Completed! 📄',
        message: `Your resume has been analyzed. ATS Compliance Score: ${profile.resumeAnalysis.atsScore}%. We found matches for your skills!`,
        resourceType: 'User',
        resourceId: req.user.id,
        triggerEmail: true
      });
    } catch (notiErr) {
      console.error('[RESUME ANALYZER NOTIFICATION ERROR]', notiErr.message);
    }

    res.status(200).json({
      status: 'success',
      data: {
        resumeAnalysis: profile.resumeAnalysis
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET CURRENT USER ANALYSIS REPORT
exports.getResumeReport = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id });
    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        resumeAnalysis: profile.resumeAnalysis || null
      }
    });
  } catch (err) {
    next(err);
  }
};
