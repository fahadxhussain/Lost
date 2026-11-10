const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate, requireActiveStudent } = require('../../middleware/auth');
const accountController = require('./account.controller');
const { upload } = require('../../services/storage/storageService');
const { authLimiter, otpResendLimiter, passwordResetLimiter } = require('../../middleware/rateLimiter');

router.post('/register', authLimiter, authController.register);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/resend-otp', otpResendLimiter, authController.resendOtp);
router.post('/login', authLimiter, authController.login);
router.get('/me', authenticate, authController.getMe);
router.patch('/me', authenticate, requireActiveStudent, upload.single('avatar'), accountController.updateProfile);
router.post('/forgot-password', passwordResetLimiter, accountController.requestPasswordReset);
router.post('/reset-password', authLimiter, accountController.resetPassword);

module.exports = router;
