const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const router = express.Router();
// Protect all routes after this middleware
router.get(
  '/checkout-session/:tourId',
  bookingController.getCheckoutSession
);


router.route('/')
  .get(authController.protect, authController.restrictTo('admin', 'lead-guide', 'guide'), bookingController.getAllBookings)
  .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), bookingController.createBooking);
module.exports = router;
