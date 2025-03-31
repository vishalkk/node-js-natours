// const fs = require('fs');
const express = require('express');


//routes
const router = express.Router();

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
//to protect all routes below this using authController.protect middleware
// router.use(authController.protect);
router.patch(
  '/updatePassword',
  authController.protect,
  authController.updatePassword
);
router.get(
  '/me',
  authController.protect,
  userController.getMe,
  userController.getUser
);
router.patch('/updateMe', authController.protect, userController.userPhotoUpload,  userController.resizeUserPhoto,userController.updateMe);

router.delete('/deleteMe', authController.protect, userController.deleteMe);
8
//permanently delete user
router.delete('/deleteUser', authController.protect, userController.deleteUser);
// route below this requires admin role
// router.use(authController.restrictTo('admin'));
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
