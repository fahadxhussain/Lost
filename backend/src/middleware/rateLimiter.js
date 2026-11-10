const rateLimit = require('express-rate-limit');
const config = require('../config');

// Pass-through when running automated tests
const isTestEnv = config.nodeEnv === 'test';

// General Auth Limiter: 15 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    status: 'error',
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

// Strict OTP Resend Limiter: 3 requests per 10 minutes per IP
const otpResendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  message: {
    status: 'error',
    message: 'Too many OTP requests. Please wait 10 minutes before requesting a new code.',
  },
});

module.exports = {
  authLimiter,
  otpResendLimiter,
};
