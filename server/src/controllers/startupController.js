const Startup = require('../models/Startup');
const Vote = require('../models/Vote');
const Waitlist = require('../models/Waitlist');
const Category = require('../models/Category');
const AppError = require('../utils/appError');
const notificationService = require('../services/notificationService');

// CREATE STARTUP
exports.createStartup = async (req, res, next) => {
  try {
    const { name, tagline, description, website, pitchDeckUrl, categoryId } = req.body;

    // Verify category exists
    const categoryExists = await Category.findById(categoryId);
    if (!categoryExists) {
      return next(new AppError('Invalid category ID', 400));
    }

    const startup = await Startup.create({
      founder: req.user.id,
      name,
      tagline,
      description,
      website,
      pitchDeckUrl,
      category: categoryId,
      status: 'published' // Auto-publish for now during Phase 1
    });

    res.status(201).json({
      status: 'success',
      data: {
        startup
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET ALL STARTUPS (FEED WITH SORTING, SEARCHING, FILTERING)
exports.getAllStartups = async (req, res, next) => {
  try {
    const { search, category, sort } = req.query;
    const query = { status: 'published' };

    // 1. Category Filtering
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    // 2. Text Search
    if (search) {
      query.$text = { $search: search };
    }

    let queryBuilder = Startup.find(query)
      .populate('founder', 'email')
      .populate('category', 'name slug');

    // 3. Sorting
    if (sort === 'votes') {
      queryBuilder = queryBuilder.sort({ votesCount: -1, createdAt: -1 });
    } else if (sort === 'newest') {
      queryBuilder = queryBuilder.sort({ createdAt: -1 });
    } else {
      // Default: sort by votes then newest
      queryBuilder = queryBuilder.sort({ votesCount: -1, createdAt: -1 });
    }

    const startups = await queryBuilder;

    // If user is logged in, attach whether they voted for each startup
    let formattedStartups = startups;
    if (req.user) {
      const userVotes = await Vote.find({ user: req.user.id });
      const votedStartupIds = new Set(userVotes.map(v => v.startup.toString()));
      
      formattedStartups = startups.map(s => {
        const doc = s.toObject();
        doc.hasVoted = votedStartupIds.has(s._id.toString());
        return doc;
      });
    }

    res.status(200).json({
      status: 'success',
      results: startups.length,
      data: {
        startups: formattedStartups
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET SINGLE STARTUP
exports.getStartup = async (req, res, next) => {
  try {
    // Populate founder, category and team users
    let startup = await Startup.findById(req.params.id)
      .populate('founder', 'email')
      .populate('category', 'name slug')
      .populate('team.user', 'email');

    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Increment view count
    startup.metrics.views += 1;
    await startup.save({ validateBeforeSave: false });

    // Check if current user has voted
    const hasVoted = req.user ? 
      !!(await Vote.findOne({ user: req.user.id, startup: startup._id })) : 
      false;

    // Fetch profiles of team members to attach full names and avatars
    const Profile = require('../models/Profile');
    const teamUserIds = startup.team.map(t => t.user._id || t.user);
    const teamProfiles = await Profile.find({ user: { $in: teamUserIds } });
    const profileMap = new Map(teamProfiles.map(p => [p.user.toString(), p]));

    const startupObj = startup.toObject();
    
    // Map populated team details
    startupObj.team = startup.team.map(t => {
      const uId = t.user?._id?.toString() || t.user?.toString();
      const p = profileMap.get(uId);
      return {
        user: {
          _id: uId,
          email: t.user?.email || '',
          fullName: p?.fullName || 'Active Partner',
          avatar: p?.avatar || ''
        },
        role: t.role,
        _id: t._id
      };
    });

    const Bookmark = require('../models/Bookmark');
    const Follower = require('../models/Follower');

    const isBookmarked = req.user ?
      !!(await Bookmark.findOne({ user: req.user.id, startup: startup._id })) :
      false;

    const isFollowed = req.user ?
      !!(await Follower.findOne({ follower: req.user.id, following: startup.founder._id })) :
      false;

    startupObj.isBookmarked = isBookmarked;
    startupObj.founder.isFollowed = isFollowed;
    startupObj.hasVoted = hasVoted;

    res.status(200).json({
      status: 'success',
      data: {
        startup: startupObj
      }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE STARTUP
exports.updateStartup = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Check permissions (Only owner founder or admin can edit)
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to edit this startup', 403));
    }

    const { name, tagline, description, website, pitchDeckUrl, categoryId } = req.body;

    if (categoryId) {
      const categoryExists = await Category.findById(categoryId);
      if (!categoryExists) return next(new AppError('Invalid category ID', 400));
      startup.category = categoryId;
    }

    if (name) startup.name = name;
    if (tagline) startup.tagline = tagline;
    if (description) startup.description = description;
    if (website) startup.website = website;
    if (pitchDeckUrl) startup.pitchDeckUrl = pitchDeckUrl;

    const updatedStartup = await startup.save();

    res.status(200).json({
      status: 'success',
      data: {
        startup: updatedStartup
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE STARTUP
exports.deleteStartup = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Check permissions
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('You do not have permission to delete this startup', 403));
    }

    await Startup.findByIdAndDelete(req.params.id);
    // Cleanup votes & comments associated
    await Vote.deleteMany({ startup: req.params.id });
    await Waitlist.deleteMany({ startup: req.params.id });

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// TOGGLE VOTE
exports.toggleVote = async (req, res, next) => {
  try {
    const startupId = req.params.id;
    const userId = req.user.id;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    const existingVote = await Vote.findOne({ user: userId, startup: startupId });

    let voted = false;
    if (existingVote) {
      // Remove vote
      await Vote.findByIdAndDelete(existingVote._id);
      startup.votesCount = Math.max(0, startup.votesCount - 1);
      await startup.save({ validateBeforeSave: false });
    } else {
      // Add vote
      await Vote.create({ user: userId, startup: startupId });
      startup.votesCount += 1;
      await startup.save({ validateBeforeSave: false });
      voted = true;
    }

    // Send notification if upvoted
    if (voted && startup.founder.toString() !== userId) {
      try {
        const Profile = require('../models/Profile');
        const voterProfile = await Profile.findOne({ user: userId });
        const voterName = voterProfile ? voterProfile.fullName : 'A builder';

        await notificationService.sendNotification({
          senderId: userId,
          receiverId: startup.founder,
          type: 'vote',
          title: `New upvote on ${startup.name}! 🔺`,
          message: `${voterName} upvoted your startup idea. You now have a total of ${startup.votesCount} upvotes.`,
          resourceType: 'Startup',
          resourceId: startupId,
          triggerEmail: true,
          extraContext: { totalVotes: startup.votesCount }
        });
      } catch (notiErr) {
        console.error('Vote notification failed:', notiErr.message);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        voted,
        votesCount: startup.votesCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// JOIN WAITLIST
exports.joinWaitlist = async (req, res, next) => {
  try {
    const startupId = req.params.id;
    const { email } = req.body;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    if (!email) {
      return next(new AppError('Please provide an email address', 400));
    }

    // Check if already on waitlist
    const existingEntry = await Waitlist.findOne({ startup: startupId, email });
    if (existingEntry) {
      return next(new AppError('This email is already on the waitlist!', 400));
    }

    // Save entry
    await Waitlist.create({
      startup: startupId,
      email,
      user: req.user ? req.user.id : null
    });

    // Increment waitlist metrics
    startup.metrics.waitlistCount += 1;
    await startup.save({ validateBeforeSave: false });

    // Send waitlist notification
    const senderId = req.user ? req.user.id : startup.founder;
    if (startup.founder.toString() !== (req.user ? req.user.id : null)) {
      try {
        await notificationService.sendNotification({
          senderId,
          receiverId: startup.founder,
          type: 'waitlist',
          title: `New waitlist join for ${startup.name} 🌟`,
          message: `Someone (${email}) just joined the waitlist for your startup concept. You now have ${startup.metrics.waitlistCount} subscribers.`,
          resourceType: 'Startup',
          resourceId: startupId,
          triggerEmail: true,
          extraContext: { subscriberEmail: email, totalWaitlist: startup.metrics.waitlistCount }
        });
      } catch (notiErr) {
        console.error('Waitlist notification failed:', notiErr.message);
      }
    }

    res.status(201).json({
      status: 'success',
      message: 'Successfully joined the waitlist!'
    });
  } catch (error) {
    next(error);
  }
};

// GET WAITLIST (FOUNDER ONLY)
exports.getWaitlist = async (req, res, next) => {
  try {
    const startup = await Startup.findById(req.params.id);

    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    // Check owner
    if (startup.founder.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new AppError('Access denied. Only the founder can view the waitlist.', 403));
    }

    const waitlist = await Waitlist.find({ startup: req.params.id })
      .populate('user', 'email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: waitlist.length,
      data: {
        waitlist
      }
    });
  } catch (error) {
    next(error);
  }
};
