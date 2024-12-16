// const catchAsync = require('../utils/catchAsync');
// const ApiFeatures = require('../utils/apiFeatures');
// const AppError = require('../utils/appError');
const Review = require('../models/reviewModels');
const factory = require('./handlerFactory');
//endpoint to get reviews for a tour
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user._id;
  next();
};
exports.getAllReviews = factory.getAll(Review);

exports.getReview = factory.getOne(Review);
//endpoint to add a review
exports.createReview = factory.createOne(Review);
//delete review endpoint
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
