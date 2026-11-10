const config = require('../../config');
const { BadRequestError } = require('../../shared/errors/AppError');
const logger = require('../../shared/logger');

// Email domain validation helper
function isValidUniversityEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return config.university.allowedDomains.some((domain) => normalized.endsWith(`@${domain}`));
}

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    if (!isValidUniversityEmail(email)) {
      throw new BadRequestError(
        `Registration is restricted to university emails (e.g. @${config.university.allowedDomains.join(', @')})`
      );
    }

    // In local development / mock mode, generate a mock OTP
    const mockOtp = '123456';
    logger.info(`[DEV OTP] Verification OTP for ${email}: ${mockOtp}`);

    return res.status(201).json({
      status: 'success',
      message: 'Verification OTP sent to your university email',
      userId: 'mock-user-uuid',
      ...(config.nodeEnv === 'development' && { devOtp: mockOtp }),
    });
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      throw new BadRequestError('User ID and OTP are required');
    }

    return res.status(200).json({
      status: 'success',
      message: 'Account activated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    if (!isValidUniversityEmail(email)) {
      throw new BadRequestError('Must provide a valid university email');
    }

    return res.status(200).json({
      status: 'success',
      token: 'mock-jwt-token-replace-with-database-record',
      user: {
        id: 'mock-user-uuid',
        email,
        name: email.split('@')[0],
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  verifyOtp,
  login,
  isValidUniversityEmail,
};
