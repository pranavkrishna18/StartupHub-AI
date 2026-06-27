const Profile = require('../models/Profile');
const User = require('../models/User');
const AppError = require('../utils/appError');

// GET CURRENT PROFILE
exports.getMe = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate('user', 'email role isEmailVerified notificationPreferences');

    if (!profile) {
      return next(new AppError('No profile found for this user', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE CURRENT PROFILE
exports.updateMe = async (req, res, next) => {
  try {
    const { fullName, bio, headline, skills, interests, experience, socialLinks, notificationPreferences } = req.body;

    // Update user notification preference subdocument if provided
    if (notificationPreferences) {
      await User.findByIdAndUpdate(
        req.user.id,
        { notificationPreferences },
        { runValidators: true }
      );
    }

    // Build update object
    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (bio !== undefined) updateFields.bio = bio;
    if (headline !== undefined) updateFields.headline = headline;
    if (skills) updateFields.skills = skills;
    if (interests) updateFields.interests = interests;
    if (experience) updateFields.experience = experience;
    if (socialLinks) updateFields.socialLinks = socialLinks;

    // Use runValidators to make sure fields align with schema restrictions
    const profile = await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('user', 'email role isEmailVerified notificationPreferences');

    if (!profile) {
      return next(new AppError('No profile found for this user', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET PUBLIC PROFILE BY USER ID
exports.getProfile = async (req, res, next) => {
  try {
    const profile = await Profile.findOne({ user: req.params.userId }).populate('user', 'email role');

    if (!profile) {
      return next(new AppError('Profile not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};
