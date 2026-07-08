// middleware/otpRateLimiter.js
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// OTP request: max 3 requests per phone per 15 minutes
const requestOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  keyGenerator: (req) =>
    req.body?.phone ? `phone:${req.body.phone}` : ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP verify: max 5 attempts per 15 minutes (prevents brute-force)
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    req.body?.phone ? `phone:${req.body.phone}` : ipKeyGenerator(req.ip),
  message: {
    success: false,
    message: 'Too many failed attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { requestOtpLimiter, verifyOtpLimiter };