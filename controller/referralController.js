const User = require('../modal/userModal');
const Referral = require('../modal/refferalModal');
const Coupon = require('../modal/coupenModel');
const { generateReferralCode, generateReferralToken } = require('../utils/referralUtil');

const createReferral = async (userId) => {
  try {
    const referralCode = generateReferralCode();
    const referralToken = generateReferralToken();

    const referral = new Referral({
      userId,
      referralCode,
      referralToken,
      referredUsers: [],
    });

    await referral.save();
    await User.findByIdAndUpdate(userId, { referralCode });
    return referral;
  } catch (error) {
    console.error('Create Referral Error:', error);
    throw error;
  }
};

const handleReferralSignup = async (req, res) => {
  try {
    const { referralCode, referralToken } = req.body;
    const { userId } = req.session; 

    let referrer = null;
    if (referralCode) {
      referrer = await Referral.findOne({ referralCode }).populate('userId');
    } else if (referralToken) {
      referrer = await Referral.findOne({ referralToken }).populate('userId');
    }

    if (referrer) {
      await User.findByIdAndUpdate(userId, { referredBy: referrer.userId._id });

      referrer.referredUsers.push(userId);
      const coupon = new Coupon({
        code: `REF${Date.now()}`,
        discount: 10, 
        discountType: 'percentage',
        maxDiscount: 500,
        minPurchase: 1000,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 
        usageLimit: 1,
        applicableTo: 'all',
      });

      await coupon.save();
      referrer.couponReward = coupon._id;
      await referrer.save();

      res.json({ message: 'Referral processed successfully' });
    } else {
      res.status(400).json({ error: 'Invalid referral code or token' });
    }
  } catch (error) {
    console.error('Handle Referral Signup Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReferralLink = async (req, res) => {
  try {
    const referral = await Referral.findOne({ userId: req.session.user._id });
    if (!referral) {
      return res.status(404).json({ error: 'Referral not found' });
    }
    const referralLink = `${process.env.BASE_URL}/signup?token=${referral.referralToken}`;
    res.json({ referralCode: referral.referralCode, referralLink });
  } catch (error) {
    console.error('Get Referral Link Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createReferral, handleReferralSignup, getReferralLink };