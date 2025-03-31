const Tour = require('../models/tourModels');
// const ApiFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
// const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');
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


exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name:'images', maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files) {
    return next();
  }
  const files = req.files;
  //1.Coverimage
  const imageCoverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(files.imageCover[0].buffer)
  .resize(2000, 1333)
  .toFormat('jpeg')
  .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFilename}`);
    //2.Images

  req.body.images = [];
  await Promise.all(
    // req.body.imageCover = imageCoverFilename;

  req.files.images.map(async (file, i) => {
    const filename = `tour-${req.params.id}-${Date.now()}=${i + 1}.jpeg`;
    await sharp(file.buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${imageCoverFilename}`);

    req.body.images.push(filename);
  })
);
    next();
});

exports.aliasTopTours = async (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);
// post tour data
exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    {
      $match: {
        ratingAverage: { $gte: 4.5 }
      }
    },
    {
      $group: {
        _id: '$difficulty',
        num: { $sum: 1 },
        averageRating: { $avg: '$ratingAverage' },
        numRatings: { $sum: '$ratingsQuantity' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },

    {
      $sort: { price: -1 }
    },

    {
      $match: {
        _id: { $ne: 'easy' }
      }
    }
  ]);

  res.status(201).json({
    message: 'Stats fetched  successfully',
    data: {
      tour: stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: {
        month: '$_id'
      }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: {
        numTourStarts: -1
      }
    },
    {
      $limit: 12
    }
  ]);

  res.status(201).json({
    message: 'Stats fetched  successfully',
    data: {
      tour: plan
    }
  });
});


exports.getToursWithin = catchAsync(async (req, res) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
// converting  to radiant
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  const distances = [];
  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng', 400));
  }
  for (let i = -100; i <= 100; i++) {
    distances.push(i);
  }
  const radii = distances.map((distance) => {
    return distance * multiplier;
  }
  );
  const tours = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
        spherical: true
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }]);
  res.status(200).json({ status: 'success', data: { data: tours } });
});