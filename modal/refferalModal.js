const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referralCode: {
    type: String,
    required: true,
    unique: true,
  },
  referralToken: {
    type: String,
    required: true,
    unique: true,
  },
  referredUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  couponReward: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
}, { timestamps: true });

module.exports = mongoose.model('Referral', referralSchema);