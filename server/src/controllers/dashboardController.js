const Startup = require('../models/Startup');
const Waitlist = require('../models/Waitlist');
const Application = require('../models/Application');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');

exports.getFounderDashboardStats = async (req, res, next) => {
  try {
    // 1. Fetch all startups owned by founder
    const startups = await Startup.find({ founder: req.user.id });


    if (!startups || startups.length === 0) {
      return res.status(200).json({
        status: 'success',
        data: {
          summary: {
            totalStartups: 0,
            totalViews: 0,
            totalVotes: 0,
            totalComments: 0,
            totalWaitlist: 0
          },
          startups: [],
          recentWaitlist: [],
          pendingApplications: []
        }
      });
    }


    const startupIds = startups.map(s => s._id);

    // 2. Aggregate total stats
    const stats = startups.reduce((acc, startup) => {
      acc.totalViews += startup.metrics.views || 0;
      acc.totalVotes += startup.votesCount || 0;
      acc.totalComments += startup.commentsCount || 0;
      acc.totalWaitlist += startup.metrics.waitlistCount || 0;
      return acc;
    }, {
      totalViews: 0,
      totalVotes: 0,
      totalComments: 0,
      totalWaitlist: 0
    });

    // 3. Get recent waitlist submissions for founder's startups
    const recentSubmissions = await Waitlist.find({ startup: { $in: startupIds } })
      .populate('startup', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // 4. Get all applications for founder's startups
    const pendingApps = await Application.find({ startup: { $in: startupIds } })
      .populate('startup', 'name')
      .populate('user', 'email')
      .populate('jobOpening', 'title hiringStages')
      .sort({ createdAt: -1 });

    const appUserIds = pendingApps.map(app => app.user._id);
    const appProfiles = await Profile.find({ user: { $in: appUserIds } });
    const appProfileMap = new Map(appProfiles.map(p => [p.user.toString(), p]));

    const enrichedApps = pendingApps.map(app => {
      const doc = app.toObject();
      const profile = appProfileMap.get(app.user._id.toString());
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
      data: {
        summary: {
          totalStartups: startups.length,
          totalViews: stats.totalViews,
          totalVotes: stats.totalVotes,
          totalComments: stats.totalComments,
          totalWaitlist: stats.totalWaitlist
        },
        startups: startups.map(s => ({
          _id: s._id,
          name: s.name,
          tagline: s.tagline,
          status: s.status,
          votesCount: s.votesCount,
          commentsCount: s.commentsCount,
          views: s.metrics.views,
          waitlistCount: s.metrics.waitlistCount,
          createdAt: s.createdAt
        })),
        recentWaitlist: recentSubmissions,
        pendingApplications: enrichedApps
      }
    });
  } catch (error) {
    next(error);
  }
};
