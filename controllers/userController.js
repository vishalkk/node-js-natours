const User = require('../models/userModel');
// const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// exports.getAllUsers = catchAsync(async (req, res) => {
//   const query = User.find({ active: { $ne: false } });

//   const features = new ApiFeatures(query, req.query).limitFields();

//   const users = await features.query;

//   res.status(200).json({
//     result: users.length,
//     status: 'success',
//     data: { users }
//   });
// });

const filterUser = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

// update the user by id
exports.updateMe = catchAsync(async (req, res, next) => {
  //1. check password is not part of request body
  if (req.body.password) {
    return next(
      new AppError(
        'This route is not for password update. Please use /updatePassword route',
        400
      )
    );
  }
  // filter the allowed fields from request body
  const filteredBody = filterUser(req.body, 'name', 'email', 'age', 'gender');
  //2. update the user according to user id
  await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // return the updated user instead of the old one
    runValidators: true
  }).then((user) => {
    if (!user) {
      return next(new AppError('No user found with that ID', 404));
    }
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  });
});

// soft delete delete the user by id
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    message: 'User deleted'
  });
});

// delete the user by id

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'Route not available use signup instead'
  });
};
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
exports.deleteUser = factory.deleteOne(User);
exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
