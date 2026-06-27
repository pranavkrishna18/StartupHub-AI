const Report = require('../models/Report');
const Startup = require('../models/Startup');
const AppError = require('../utils/appError');

exports.createReport = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const { reason, description } = req.body;

    if (!reason || !description) {
      return next(new AppError('Please provide a reason and description for your report.', 400));
    }

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found.', 404));
    }

    // Check if the user has already reported this startup (pending status)
    const existingReport = await Report.findOne({
      reporter: req.user.id,
      startup: startupId,
      status: 'pending'
    });

    if (existingReport) {
      return next(new AppError('You have already submitted a pending report for this startup.', 400));
    }

    const report = await Report.create({
      reporter: req.user.id,
      startup: startupId,
      reason,
      description
    });

    res.status(201).json({
      status: 'success',
      data: {
        report
      }
    });
  } catch (error) {
    next(error);
  }
};
