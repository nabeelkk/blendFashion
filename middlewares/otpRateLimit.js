const otpRateLimiter = require('express-rate-limit')({
    windowMs: 15 * 60 * 1000, 
    max: 3, 
    message: 'Too many OTP requests from this IP, please try again later'
});
module.exports = otpRateLimiter
