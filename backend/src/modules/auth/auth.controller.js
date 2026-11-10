const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const { email, password, name, rollNumber } = req.body;
    const result = await authService.register({ email, password, name, rollNumber });

    return res.status(201).json({
      status: 'success',
      message: 'Verification OTP sent to your university email',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const { userId, email, otp } = req.body;
    const result = await authService.verifyOtp({ userId, email, otp });

    return res.status(200).json({
      status: 'success',
      message: 'Account activated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function resendOtp(req, res, next) {
  try {
    const { email, userId } = req.body;
    const result = await authService.resendOtp({ email, userId });

    return res.status(200).json({
      status: 'success',
      message: 'New verification OTP sent to your university email',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });

    return res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  verifyOtp,
  resendOtp,
  login,
  getMe,
};
