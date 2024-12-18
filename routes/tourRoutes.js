const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');

const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// navigate to review route
router.use('/:tourId/reviews', reviewRouter);
// router.param('id', tourController.checkID);
router
  .route('/top-5-tours')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router.route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide','guide'),
    tourController.getMonthlyPlan
  );

router
  .route('/')
  .get( tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    tourController.createTour);

router
  .route('/:id')
  .get(tourController.getTour)
  .patch( authController.protect,
    authController.restrictTo('admin','lead-guide'),
    tourController.updateTour)
  .delete(
    authController.protect,
    authController.restrictTo('admin','lead-guide'), // restricting delete to admin only
    tourController.deleteTour
  );

module.exports = router;
