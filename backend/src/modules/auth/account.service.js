const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const config = require('../../config');
const emailService = require('../../services/email/emailService');
const { AppError, BadRequestError } = require('../../shared/errors/AppError');

const RESET_MESSAGE =
  'If an active account exists for this email, a password reset link will be sent. Check your inbox and spam folder.';
const INVALID_LINK =
  'This reset link is invalid, expired, or already used. Request a new link from the app.';
const profileFields = {
  id: true,
  email: true,
  name: true,
  rollNumber: true,
  status: true,
  avatarUrl: true,
};
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

function validateEmail(value) {
  if (
    typeof value !== 'string' ||
    value.length > 254 ||
    !/^[^\s@]+@isbstudent\.comsats\.edu\.pk$/i.test(value.trim())
  )
    throw new BadRequestError(
      'Enter your @isbstudent.comsats.edu.pk student email.',
    );
  return value.trim().toLowerCase();
}

function validatePassword(password) {
  if (
    typeof password !== 'string' ||
    !password.trim() ||
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    throw new BadRequestError(
      'Use at least 8 characters and no more than 72 UTF-8 bytes for your new password.',
    );
}

async function updateProfile(userId, { name }, avatarUrl) {
  if (
    name !== undefined &&
    (typeof name !== 'string' || !name.trim() || name.trim().length > 100)
  )
    throw new BadRequestError('Enter a username between 1 and 100 characters.');
  if (name === undefined && !avatarUrl)
    throw new BadRequestError(
      'Enter a username or choose a profile photo to update.',
    );
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(avatarUrl && { avatarUrl }),
    },
    select: profileFields,
  });
}

async function requestPasswordReset(value) {
  const email = validateEmail(value);
  // Fail consistently for all addresses if real delivery is unavailable.
  if (!emailService.transporter || config.email.provider !== 'smtp')
    throw new AppError(
      'Password reset email is temporarily unavailable. Please try again later.',
      503,
    );
  let origin;
  try {
    origin = new URL(config.publicApiUrl);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      (config.nodeEnv === 'production' && origin.protocol !== 'https:')
    )
      throw new Error();
  } catch {
    throw new AppError(
      'Password reset email is temporarily unavailable. Please try again later.',
      503,
    );
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') return { message: RESET_MESSAGE };
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // Serialize resets for this account so concurrent requests cannot leave two live links.
    await tx.user.update({ where: { id: user.id }, data: { updatedAt: now } });
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      },
    });
  });
  const link = new URL('/reset-password', origin);
  link.hash = `token=${token}`;
  try {
    await emailService.sendPasswordReset(user.email, link.toString());
  } catch {
    await prisma.passwordResetToken.updateMany({
      where: { tokenHash, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    // Same response prevents account discovery; operational delivery failure is logged by the mail service.
  }
  return { message: RESET_MESSAGE };
}

async function resetPassword({ token, password, confirmation }) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
    throw new BadRequestError(INVALID_LINK);
  validatePassword(password);
  if (password !== confirmation)
    throw new BadRequestError(
      'Passwords do not match. Enter the same password in both fields.',
    );
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!record || record.consumedAt || record.expiresAt <= new Date())
    throw new BadRequestError(INVALID_LINK);
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: record.userId },
      data: { updatedAt: new Date() },
    });
    if (user.status !== 'ACTIVE') throw new BadRequestError(INVALID_LINK);
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null, expiresAt: { gt: new Date() } },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new BadRequestError(INVALID_LINK);
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  });
  return {
    userId: record.userId,
    message:
      'Your password has been changed. Return to the app and sign in with your new password.',
  };
}

module.exports = {
  updateProfile,
  requestPasswordReset,
  resetPassword,
  validatePassword,
  profileFields,
};
