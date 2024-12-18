const mongoose = require('mongoose');
const Tour = require('./tourModels');
const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review is required']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'A review must belong to a tour']
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user']
    }
  },
  {
    toJSON: {
      virtuals: true,
      toObject: {
        virtuals: true
      }
    }
  }
);
//need the index to to get user review in tour quickly
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name'
  });
  next();
});
// this function in available in the model as Review.calcAverageRatings(tourId)
reviewSchema.statics.calcAverageRatings = async function (tourId) {

  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        averageRating: { $avg: '$rating' },
        numRating: { $sum: 1 }
      }
    }
  ]);
  if (stats.length === 0) {
    Tour.findByIdAndUpdate(tourId, {
      averageRating: 4.5, //default rating
      ratingsQuantity: 0
    });
  } else
  {
    Tour.findByIdAndUpdate(tourId, {
      averageRating: stats[0].averageRating,
      ratingsQuantity: stats[0].numRating
    });

  }
console.log(stats);
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
  // next(); we cant have next in post hook
});


reviewSchema.pre(/^findOneAnd/, async function (next) {
  //find the current document
//store it in a variable which can be accessed later in the post hook
  this.r = await this.findOne().clone();
  console.log(this.r);
next();
});

reviewSchema.post(/^findOneAnd/, async function (next) {
  //update the average rating and ratings quantity of the tour
  if (this.r) {
       await this.r.constructor.calcAverageRatings(this.r.tour);
  }
});


const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
