const Bookmark = require('../models/Bookmark');
const Follower = require('../models/Follower');
const Startup = require('../models/Startup');
const AIReport = require('../models/AIReport');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');

// TOGGLE BOOKMARK
exports.toggleBookmark = async (req, res, next) => {
  try {
    const { startupId } = req.params;
    const userId = req.user.id;

    const startup = await Startup.findById(startupId);
    if (!startup) {
      return next(new AppError('Startup not found', 404));
    }

    const existing = await Bookmark.findOne({ user: userId, startup: startupId });

    let bookmarked = false;
    if (existing) {
      await Bookmark.findByIdAndDelete(existing._id);
    } else {
      await Bookmark.create({ user: userId, startup: startupId });
      bookmarked = true;
    }

    res.status(200).json({
      status: 'success',
      data: {
        bookmarked
      }
    });
  } catch (error) {
    next(error);
  }
};

// TOGGLE FOLLOW FOUNDER
exports.toggleFollow = async (req, res, next) => {
  try {
    const { userId: followingId } = req.params;
    const followerId = req.user.id;

    if (followerId === followingId) {
      return next(new AppError('You cannot follow yourself', 400));
    }

    const existing = await Follower.findOne({ follower: followerId, following: followingId });

    let followed = false;
    if (existing) {
      await Follower.findByIdAndDelete(existing._id);
    } else {
      await Follower.create({ follower: followerId, following: followingId });
      followed = true;
    }

    res.status(200).json({
      status: 'success',
      data: {
        followed
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET INVESTOR DASHBOARD METRICS
exports.getInvestorDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Fetch bookmarks
    const bookmarks = await Bookmark.find({ user: userId }).populate({
      path: 'startup',
      populate: [
        { path: 'category', select: 'name' },
        { path: 'founder', select: 'email' }
      ]
    });

    const startupIds = bookmarks.map(b => b.startup?._id).filter(Boolean);

    // 2. Fetch AI reports for bookmarked startups
    const reports = await AIReport.find({ startup: { $in: startupIds } });
    const reportMap = new Map(reports.map(r => [r.startup.toString(), r]));

    // Fetch profiles of founders of bookmarked startups
    const founderIds = bookmarks.map(b => b.startup?.founder?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: founderIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p]));

    const bookmarkedStartups = bookmarks.map(b => {
      if (!b.startup) return null;
      const sObj = b.startup.toObject();
      const report = reportMap.get(sObj._id.toString());
      const profile = profileMap.get(sObj.founder?._id?.toString());
      
      sObj.aiReport = report ? {
        validationScore: report.validationScore,
        feasibilityScore: report.feasibilityScore
      } : null;

      sObj.founder = {
        _id: sObj.founder?._id,
        email: sObj.founder?.email,
        fullName: profile?.fullName || 'Founder'
      };

      return sObj;
    }).filter(Boolean);

    // 3. Count followed founders
    const followingCount = await Follower.countDocuments({ follower: userId });

    res.status(200).json({
      status: 'success',
      data: {
        summary: {
          totalBookmarks: bookmarkedStartups.length,
          totalFollowing: followingCount
        },
        bookmarks: bookmarkedStartups
      }
    });
  } catch (error) {
    next(error);
  }
};

// STARTUP DISCOVERY ENGINE (AGGREGATED SEARCH & AI RATINGS FILTERING)
exports.getInvestorStartupDiscovery = async (req, res, next) => {
  try {
    const { minScore, category, sort } = req.query;

    const pipeline = [
      // Match only published startups
      { $match: { status: 'published' } },
      
      // Join AI reports
      {
        $lookup: {
          from: 'aireports',
          localField: '_id',
          foreignField: 'startup',
          as: 'aiReport'
        }
      },
      { $unwind: { path: '$aiReport', preserveNullAndEmptyArrays: true } },

      // Join categories
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDoc'
        }
      },
      { $unwind: '$categoryDoc' },

      // Join founder profiles to get names
      {
        $lookup: {
          from: 'profiles',
          localField: 'founder',
          foreignField: 'user',
          as: 'founderProfile'
        }
      },
      { $unwind: { path: '$founderProfile', preserveNullAndEmptyArrays: true } }
    ];

    // Filter by minScore if specified
    if (minScore) {
      pipeline.push({
        $match: { 'aiReport.validationScore': { $gte: parseInt(minScore, 10) } }
      });
    }

    // Filter by category slug if specified
    if (category) {
      pipeline.push({
        $match: { 'categoryDoc.slug': category }
      });
    }

    // Sorting
    const sortStage = {};
    if (sort === 'ai-score') {
      sortStage['aiReport.validationScore'] = -1;
    } else if (sort === 'votes') {
      sortStage['votesCount'] = -1;
    } else {
      // default: newest
      sortStage['createdAt'] = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Project output fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        tagline: 1,
        votesCount: 1,
        commentsCount: 1,
        metrics: 1,
        createdAt: 1,
        category: {
          name: '$categoryDoc.name',
          slug: '$categoryDoc.slug'
        },
        founder: {
          _id: '$founder',
          fullName: { $ifNull: ['$founderProfile.fullName', 'Anonymous Founder'] }
        },
        aiReport: {
          validationScore: '$aiReport.validationScore',
          feasibilityScore: '$aiReport.feasibilityScore'
        }
      }
    });

    const startups = await Startup.aggregate(pipeline);

    // Attach bookmark status if logged in
    let formatted = startups;
    if (req.user) {
      const userBookmarks = await Bookmark.find({ user: req.user.id });
      const bookmarkedIds = new Set(userBookmarks.map(b => b.startup.toString()));
      
      const userFollowings = await Follower.find({ follower: req.user.id });
      const followedFounderIds = new Set(userFollowings.map(f => f.following.toString()));

      formatted = startups.map(s => {
        s.isBookmarked = bookmarkedIds.has(s._id.toString());
        s.founder.isFollowed = followedFounderIds.has(s.founder._id?.toString());
        return s;
      });
    }

    res.status(200).json({
      status: 'success',
      results: formatted.length,
      data: {
        startups: formatted
      }
    });
  } catch (error) {
    next(error);
  }
};
