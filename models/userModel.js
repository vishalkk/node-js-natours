const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');
// eslint-disable-next-line import/no-extraneous-dependencies
const bcrypt = require('bcryptjs');
//name, email, password, photo, password confirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell your name']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    lowercase: true
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    minlength: 8,
    required: [true, 'Please provide your password'],
    select: false //this will not be returned in response
  },
  photo: { type: String, default: 'default.jpg' },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    //this only works on CREATE andSAVE !!!
    validate: {
      validator: function (v) {
        return v === this.password;
      },
      message: 'Passwords do not match'
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,

  active: {
    type: Boolean,
    default: true,
    select: false //this will not be returned in response
  }
});
userSchema.pre('/^find/', function () {
  //find document where active is true
  this.find({ active: { $ne: false } });
});
//hash password before saving
userSchema.pre('save', async function (next) {
  //only run this function if password is modified
  if (!this.isModified('password')) return next();
  // hash password
  this.password = await bcrypt.hash(this.password, 12);
  //delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// userSchema.pre('save', function(next) {
//   if (!this.isModified('password') || this.isNew) return next();
//   // manage delay by 1 second
//   this.passwordChangedAt = Date.now() - 1000;
//   next();
// });

// compare password instance method available on user model
userSchema.methods.comparePassword = async function (
  candidatePassword,
  userPassword
) {
  // return true if password is correct
  return await await bcrypt.compare(candidatePassword, userPassword);
};

//
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    return JWTTimestamp < this.passwordChangedAt;
  }
  return false;
};

//
userSchema.methods.createPasswordResetToken = function () {
  //generate random token
  const resetTOken = crypto.randomBytes(32).toString('hex');

  //hash token
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetTOken)
    .digest('hex');
  //set expiration
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return resetTOken;
};
const User = mongoose.model('User', userSchema);
module.exports = User;
