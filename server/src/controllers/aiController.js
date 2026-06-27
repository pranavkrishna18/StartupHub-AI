const Startup = require('../models/Startup');
const AIReport = require('../models/AIReport');
const aiService = require('../services/aiService');
const AppError = require('../utils/appError');

// GENERATE OR REGENERATE AI REPORT
exports.generateReport = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { regenerate } = req.query;

    const startup = await Startup.findById(startupId).populate('category', 'name');
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Permission Guard: Only the founder of this startup can generate/regenerate reports
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You are not authorized to generate validation reports for this startup', 403));
    }

    // Check if report already exists and regenerate is not requested
    const existingReport = await AIReport.findOne({ startup: startupId });
    if (existingReport && regenerate !== 'true') {
      return res.status(200).json({
        status: 'success',
        source: 'cache',
        data: {
          report: existingReport
        }
      });
    }

    // Call service to run LLM rotation prompts
    const aiData = await aiService.generateValidationReport(
      startup.name,
      startup.tagline,
      startup.description,
      startup.category?.name || 'SaaS'
    );

    // Save report to database (update if exists, else insert)
    const report = await AIReport.findOneAndUpdate(
      { startup: startupId },
      {
        startup: startupId,
        validationScore: aiData.validationScore,
        feasibilityScore: aiData.feasibilityScore,
        swot: aiData.swot,
        businessModel: aiData.businessModel,
        competitors: aiData.competitors,
        roadmap: aiData.roadmap,
        pitchDeck: aiData.pitchDeck
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      source: 'llm',
      data: {
        report
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET CACHED REPORT
exports.getReport = async (req, res, next) => {
  try {
    const { startupId } = req.params;

    const report = await AIReport.findOne({ startup: startupId });
    if (!report) {
      return next(new AppError('No validation report generated for this startup yet. Request validation first.', 404));
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
