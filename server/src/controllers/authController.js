const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Profile = require('../models/Profile');
const AppError = require('../utils/appError');
const emailService = require('../services/emailService');

// Helper to sign JWT tokens
const signToken = (id, role, secret, expiresIn) => {
  return jwt.sign({ id, role }, secret, { expiresIn });
};

// Generate and send tokens in HTTP-only cookies
const sendTokensResponse = (user, statusCode, res) => {
  const accessToken = signToken(user._id, user.role, process.env.JWT_SECRET, process.env.JWT_EXPIRES_IN);
  const refreshToken = signToken(user._id, user.role, process.env.JWT_REFRESH_SECRET, process.env.JWT_REFRESH_EXPIRES_IN);

  // Secure cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  };

  // Set cookies
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: accessToken, // Also send access token in body for convenience
    data: {
      user
    }
  });
};

// SIGNUP
exports.signup = async (req, res, next) => {
  try {
    const { email, password, role, fullName } = req.body;

    if (!fullName) {
      return next(new AppError('Please provide your full name', 400));
    }

    // 1. Create User
    const newUser = await User.create({
      email,
      password,
      role
    });

    // 2. Create Profile associated with User
    const profile = await Profile.create({
      user: newUser._id,
      fullName
    });

    // 3. Generate verification token
    const verificationToken = newUser.createEmailVerificationToken();
    await newUser.save({ validateBeforeSave: false });

    // 4. Send Welcome and Verification Emails (handled asynchronously to not block response)
    try {
      await emailService.sendWelcomeEmail(newUser.email, fullName);
      await emailService.sendVerificationEmail(newUser.email, fullName, verificationToken);
    } catch (err) {
      console.error(`Email sending failed during signup for ${newUser.email}:`, err.message);
    }

    sendTokensResponse(newUser, 201, res);
  } catch (error) {
    next(error);
  }
};

// LOGIN
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user and select password
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password, user.password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    sendTokensResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// REFRESH TOKEN
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      return next(new AppError('No refresh token provided', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Send new tokens
    sendTokensResponse(currentUser, 200, res);
  } catch (error) {
    next(new AppError('Invalid or expired refresh token. Please login again.', 401));
  }
};

// LOGOUT
exports.logout = (req, res) => {
  res.cookie('accessToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// FORGOT PASSWORD
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError('There is no user with that email address.', 404));
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Fetch user profile to get their name
    const profile = await Profile.findOne({ user: user._id });
    const name = profile ? profile.fullName : 'Founder';

    // Send reset link email using Resend
    try {
      await emailService.sendForgotPasswordEmail(user.email, name, resetToken);
    } catch (err) {
      console.error(`Email sending failed during forgotPassword for ${user.email}:`, err.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to your email!',
      resetToken // keeping for easy client integrations during testing
    });
  } catch (error) {
    next(error);
  }
};

// RESET PASSWORD
exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Send reset confirmation email
    try {
      const profile = await Profile.findOne({ user: user._id });
      const name = profile ? profile.fullName : 'User';
      await emailService.sendPasswordResetSuccessEmail(user.email, name);
    } catch (err) {
      console.error(`Email sending failed during resetPassword confirmation for ${user.email}:`, err.message);
    }

    sendTokensResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// VERIFY EMAIL
exports.verifyEmail = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return next(new AppError('Verification link is invalid or has expired', 400));
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save({ validateBeforeSave: false });

    // Send verification success confirmation email
    try {
      const profile = await Profile.findOne({ user: user._id });
      const name = profile ? profile.fullName : 'User';
      await emailService.sendVerificationSuccessEmail(user.email, name);
    } catch (err) {
      console.error(`Email sending failed during verifyEmail confirmation for ${user.email}:`, err.message);
    }

    res.status(200).json({
      status: 'success',
      message: 'Email successfully verified!'
    });
  } catch (error) {
    next(error);
  }
};
