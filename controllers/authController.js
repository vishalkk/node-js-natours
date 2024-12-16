const jwt = require('jsonwebtoken');
const { promisify } = require('util');
// const { text } = require('stream/consumers');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  // generate token with user id
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
const cookieOptions = {
  expires: new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  ),
  httpOnly: true
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  // set cookie
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined; // remove password from response
  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: { user }
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  // creating new user from req.body data
  //
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role || 'user'
  });
  // generating token
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1.  Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  //2.Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password'); //select password to compare with hash

  // check user exists and password is correct
  if (!user || !(await user.comparePassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3. If everything ok, send token to client
  createSendToken(user, 200, res);
});

// Protect routes
// This middleware function checks if user has a valid JWT token in the request header.
// If token is valid, it decodes the token and sets the user id in the request object.
// If token is not valid or user does not exist, it returns an error.
// This middleware function is used on all routes that require authentication.
exports.protect = catchAsync(async (req, res, next) => {
  //1. Get token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('Please provide a token', 401));
  }

  //2. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3.Check if user exists
  // If someone use valid token but deleted user account,
  //token will be valid but user will not exist in database
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    return next(new AppError('User not found', 401));
  }

  //4.Check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again', 401)
    );
  }
  // GRANT ACCESS TO PROTECTED ROUTES
  req.user = freshUser;
  next();
});

// Restrict routes to specific roles
// This middleware function checks if the user role matches the required role.
// If role does not match, it returns an error.
// This middleware function is used on all routes that require specific roles.
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user by email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }
  // 2. Generate reset token
  const resetToken = user.createPasswordResetToken();

  // 3. Save token and expiration date in the database
  // We are using save() method to update the user document with the reset token and expiration date
  await user.save({ validateBeforeSave: false });
  // 3. Send reset token to user's email

  //
  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `You have requested to reset your password. Click on the following link to reset your password: ${resetUrl}`;
  try {
    console.log('Sending email to:', user.email);
    await sendEmail({
      email: user.email,
      subject: 'Password Reset Token (valid for 10 minutes)',
      text: message
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to email'
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error sending email. Try again later', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1.Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  //2. If token is not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  //3. Update changePasswordAt property for the  user
  //4. Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1. Get user from the database
  const user = await User.findById(req.user.id).select('+password');

  //2. Check if the old password is correct
  if (
    !user ||
    !(await user.comparePassword(req.body.passwordCurrent, user.password))
  ) {
    return next(new AppError('Incorrect old password', 401));
  }

  //3. Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});
