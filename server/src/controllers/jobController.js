const JobOpening = require('../models/JobOpening');
const Startup = require('../models/Startup');
const AppError = require('../utils/appError');

// CREATE JOB OPENING
exports.createJob = async (req, res, next) => {
  try {
    const {
      startupId,
      title,
      responsibilities,
      requiredSkills,
      preferredSkills,
      experience,
      compensation,
      equity,
      workMode,
      location,
      applicationDeadline,
      hiringStages
    } = req.body;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Verify user owns the startup
    if (startup.founder.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to post openings for this startup', 403));
    }

    const job = await JobOpening.create({
      startup: startupId,
      title,
      responsibilities,
      requiredSkills,
      preferredSkills,
      experience,
      compensation,
      equity,
      workMode,
      location,
      applicationDeadline,
      hiringStages
    });

    res.status(201).json({
      status: 'success',
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};

// GET STARTUP JOBS
exports.getStartupJobs = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const jobs = await JobOpening.find({ startup: startupId, status: 'active' });

    res.status(200).json({
      status: 'success',
      results: jobs.length,
      data: { jobs }
    });
  } catch (err) {
    next(err);
  }
};

// GET JOB DETAILS
exports.getJobDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await JobOpening.findById(id).populate('startup', 'name logo tagline founder');

    if (!job) {
      return next(new AppError('Job opening not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};

// GET ALL JOBS (CATALOG SEARCH)
exports.getAllJobs = async (req, res, next) => {
  try {
    const { title, workMode, skills, search } = req.query;
    const query = { status: 'active' };

    if (title) query.title = title;
    if (workMode) query.workMode = workMode;

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      query.requiredSkills = { $in: skillsArray };
    }

    // Populate startup to get brand details
    let jobs = await JobOpening.find(query).populate('startup', 'name logo description tagline');

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      jobs = jobs.filter(job => 
        (job.title && searchRegex.test(job.title)) || 
        (job.startup && searchRegex.test(job.startup.name))
      );
    }

    res.status(200).json({
      status: 'success',
      results: jobs.length,
      data: { jobs }
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE JOB STATUS (CLOSE/OPEN)
exports.updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const job = await JobOpening.findById(id).populate('startup');
    if (!job) {
      return next(new AppError('Job opening not found', 404));
    }

    // Check permissions
    if (job.startup.founder.toString() !== req.user.id) {
      return next(new AppError('You do not have permission to manage this opening', 403));
    }

    job.status = status;
    await job.save();

    res.status(200).json({
      status: 'success',
      data: { job }
    });
  } catch (err) {
    next(err);
  }
};
