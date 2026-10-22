const Application = require('../models/Application');
const Profile = require('../models/Profile');
const JobOpening = require('../models/JobOpening');
const Startup = require('../models/Startup');
const aiService = require('./aiService');
const { getIO, getUserSocketId } = require('../config/socket');

exports.evaluateApplicant = async (applicationId) => {
  try {
    console.log(`[AI MATCH ENGINE] Starting evaluation for application ID: ${applicationId}`);

    const application = await Application.findById(applicationId)
      .populate('user')
      .populate('jobOpening')
      .populate('startup');

    if (!application) {
      console.error(`[AI MATCH ENGINE ERROR] Application ${applicationId} not found`);
      return;
    }

    const { user, jobOpening, startup } = application;
    if (!user || !jobOpening || !startup) {
      console.error(`[AI MATCH ENGINE ERROR] Application detail references are missing`);
      return;
    }

    // Retrieve applicant profile
    const profile = await Profile.findOne({ user: user._id });
    if (!profile) {
      console.error(`[AI MATCH ENGINE ERROR] Candidate profile not found for user ${user._id}`);
      return;
    }

    const candidateData = {
      fullName: profile.fullName || 'Anonymous Candidate',
      bio: profile.bio || '',
      skills: profile.skills || [],
      interests: profile.interests || [],
      role: profile.role || 'Contributor',
      message: application.message || '',
      resumeText: application.resumeText || ''
    };

    const jobData = {
      title: jobOpening.title,
      responsibilities: jobOpening.responsibilities,
      requiredSkills: jobOpening.requiredSkills,
      preferredSkills: jobOpening.preferredSkills || [],
      experience: jobOpening.experience,
      compensation: jobOpening.compensation,
      workMode: jobOpening.workMode
    };

    // Call LLM parser
    const evaluationResult = await aiService.generateTalentMatchReport(candidateData, jobData);

    // Save evaluation to application
    application.evaluation = {
      compatibilityScore: evaluationResult.compatibilityScore || 0,
      atsScore: evaluationResult.atsScore || 0,
      skillMatch: evaluationResult.skillMatch || 0,
      experienceMatch: evaluationResult.experienceMatch || 0,
      cultureMatch: evaluationResult.cultureMatch || 0,
      communicationScore: evaluationResult.communicationScore || 0,
      missingSkills: evaluationResult.missingSkills || [],
      strengths: evaluationResult.strengths || [],
      weaknesses: evaluationResult.weaknesses || [],
      growthSuggestions: evaluationResult.growthSuggestions || [],
      recommendedRole: evaluationResult.recommendedRole || jobOpening.title,
      evaluatedAt: new Date()
    };

    await application.save();

    console.log(`[AI MATCH ENGINE] Successfully evaluated applicant. Score: ${evaluationResult.compatibilityScore}%`);

    // Broadcast live WebSocket reload request to founder
    const io = getIO();
    if (io) {
      const founderSocketId = getUserSocketId(startup.founder);
      if (founderSocketId) {
        io.to(founderSocketId).emit('application_evaluated', {
          applicationId,
          compatibilityScore: evaluationResult.compatibilityScore,
          startupId: startup._id
        });
        console.log(`[AI MATCH ENGINE] Socket reload signal sent to founder ${startup.founder}`);
      }
    }
  } catch (err) {
    console.error(`[AI MATCH ENGINE ERROR] Failed applicant evaluation for application ${applicationId}:`, err.message);
  }
};
