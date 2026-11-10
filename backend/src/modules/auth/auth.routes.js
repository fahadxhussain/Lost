const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');
const { authLimiter, otpResendLimiter } = require('../../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/resend-otp', otpResendLimiter, authController.resendOtp);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.getMe);

module.exports = router;
