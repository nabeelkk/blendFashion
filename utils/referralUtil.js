const crypto = require('crypto');

const generateReferralCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

const generateReferralToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

module.exports = { generateReferralCode, generateReferralToken };