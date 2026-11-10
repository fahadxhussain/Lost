const account = require('./account.service');
const { getPublicImageUrl } = require('../../services/storage/storageService');
const { BadRequestError } = require('../../shared/errors/AppError');

exports.updateProfile = async (req, res, next) => {
  try {
    if (Object.keys(req.body).some((key) => key !== 'name'))
      throw new BadRequestError(
        'Only your username and profile photo can be changed.',
      );
    const avatarUrl = req.file
      ? await getPublicImageUrl(req, req.file.filename)
      : undefined;
    const user = await account.updateProfile(req.user.id, req.body, avatarUrl);
    res.json({
      status: 'success',
      message: 'Your profile has been updated.',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
exports.requestPasswordReset = async (req, res, next) => {
  try {
    res.json({
      status: 'success',
      ...(await account.requestPasswordReset(req.body.email)),
    });
  } catch (error) {
    next(error);
  }
};
exports.resetPassword = async (req, res, next) => {
  try {
    const { userId, ...result } = await account.resetPassword(req.body);
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${userId}`).emit('session_expired');
      io.in(`user_${userId}`).disconnectSockets(true);
    }
    res.json({ status: 'success', ...result });
  } catch (error) {
    next(error);
  }
};
