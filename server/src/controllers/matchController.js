const User = require('../models/User');
const Profile = require('../models/Profile');
const Startup = require('../models/Startup');
const AppError = require('../utils/appError');

exports.getMatches = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Load current user profile
    const myProfile = await Profile.findOne({ user: userId });
    if (!myProfile) {
      return next(new AppError('Please complete your profile details first to find matches.', 400));
    }

    if (role === 'founder') {
      // 1. Fetch founder's startups
      const myStartups = await Startup.find({ founder: userId }).populate('category', 'name');
      const startupKeywords = new Set();
      myStartups.forEach(s => {
        startupKeywords.add(s.category?.name?.toLowerCase());
        s.tagline.split(' ').forEach(w => {
          if (w.length > 3) startupKeywords.add(w.toLowerCase().replace(/[^a-z]+/g, ''));
        });
      });

      // 2. Fetch all co-founders
      const cofounderUsers = await User.find({ role: 'cofounder' });
      const cofounderIds = cofounderUsers.map(u => u._id);
      
      const cofounderProfiles = await Profile.find({ user: { $in: cofounderIds } })
        .populate('user', 'email role');

      // 3. Score matches
      const matches = cofounderProfiles.map(profile => {
        let intersection = 0;
        const skillsAndInterests = [
          ...(profile.skills || []),
          ...(profile.interests || [])
        ].map(item => item.toLowerCase());

        skillsAndInterests.forEach(item => {
          if (startupKeywords.has(item)) intersection += 1;
        });

        // Compute Match Score (base 60% plus 10% per intersection up to 100%)
        const matchScore = Math.min(100, 60 + (intersection * 10));

        return {
          profile,
          matchScore,
          matchReasons: intersection > 0 
            ? `Matches focus areas of your startup ideas` 
            : `Compatible helper profile in focus ecosystem`
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      return res.status(200).json({
        status: 'success',
        results: matches.length,
        data: {
          matches
        }
      });
    } else {
      // Role is cofounder, investor, etc. -> Return matching startups
      const startups = await Startup.find({ status: 'published' })
        .populate('category', 'name')
        .populate('founder', 'email');

      const mySkillsAndInterests = [
        ...(myProfile.skills || []),
        ...(myProfile.interests || [])
      ].map(item => item.toLowerCase());

      const matches = startups.map(startup => {
        let intersection = 0;
        const startupKeywords = new Set();
        startupKeywords.add(startup.category?.name?.toLowerCase());
        startup.tagline.split(' ').forEach(w => {
          if (w.length > 3) startupKeywords.add(w.toLowerCase().replace(/[^a-z]+/g, ''));
        });

        mySkillsAndInterests.forEach(item => {
          if (startupKeywords.has(item)) intersection += 1;
        });

        const matchScore = Math.min(100, 55 + (intersection * 15));

        return {
          startup,
          matchScore,
          matchReasons: intersection > 0 
            ? `Aligns with your skills: ${mySkillsAndInterests.filter(s => startupKeywords.has(s)).join(', ')}` 
            : `General tech sector interest matches`
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      return res.status(200).json({
        status: 'success',
        results: matches.length,
        data: {
          matches
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
