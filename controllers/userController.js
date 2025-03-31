const User = require('../models/userModel');
// const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');
// upload destination
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
// const multerStorage = multer.diskStorage({
  // destination: (req, file, cb) => {
      // console.log('multerStorage');
//
    // cb(null, 'public/img/users');
  // },
  // filename: (req, file, cb) => {
    // console.log('multerFilename');
    // const ext = file.mimetype.split('/')[1];
    // cb(null, `${req.user.id}-${Date.now()}.${ext}`);
  // },
// });

const multerStorage = multer.memoryStorage();
//Add description here
const multerFilter = (req, file, cb) => {
  console.log(file.mimetype);
      console.log('filter');

  // This function is used as a filter for multer middleware to accept only image files.
  // It checks the mimetype of the uploaded file and uses a callback to determine if the file should be accepted or rejected.
  if (file.mimetype.startsWith('image')) {
        console.log('filetter pass');

    cb(null, true);
  } else {
            console.log('filetter failed');

    cb(new AppError('Only image files are allowed!'), false);
  }
};
// const upload = multer({ dest: 'public/img/users' });

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// middleware to upload user photo
exports.userPhotoUpload = upload.single('photo');
//
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next;

  req.file.filename = `${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

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

  if (req.file) filteredBody.photo = req.file.filename;

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
