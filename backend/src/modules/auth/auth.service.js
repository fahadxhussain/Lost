const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const config = require('../../config');
const emailService = require('../../services/email/emailService');
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NotFoundError,
} = require('../../shared/errors/AppError');

class AuthService {
  // Domain and pattern validation for COMSATS students
  validateUniversityEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new BadRequestError('A valid email address is required');
    }

    const normalized = email.trim().toLowerCase();
    const isDomainAllowed = config.university.allowedDomains.some((domain) =>
      normalized.endsWith(`@${domain}`)
    );

    if (!isDomainAllowed) {
      throw new BadRequestError(
        `Registration is restricted to COMSATS university email addresses (e.g. @${config.university.allowedDomains.join(
          ', @'
        )})`
      );
    }

    return normalized;
  }

  // Extract roll number if present (e.g., sp23-bse-011 -> SP23-BSE-011)
  extractRollNumber(email) {
    const localPart = email.split('@')[0];
    const match = localPart.match(/^([a-zA-Z]{2}\d{2}-[a-zA-Z]{2,4}-\d{3,4})$/i);
    return match ? match[1].toUpperCase() : null;
  }

  // Cryptographic OTP hashing (SHA-256)
  hashOtp(otp) {
    return crypto.createHash('sha256').update(otp.toString().trim()).digest('hex');
  }

  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        status: user.status,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  async register({ email, password, name, rollNumber }) {
    const normalizedEmail = this.validateUniversityEmail(email);

    if (!password || password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    const detectedRollNumber = rollNumber || this.extractRollNumber(normalizedEmail);
    const passwordHash = await bcrypt.hash(password, 10);

    // Check existing account
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let user;

    if (existingUser) {
      if (existingUser.status === 'ACTIVE') {
        throw new ConflictError('An active account already exists with this student email. Please log in.');
      }
      // Re-registering while unverified: update password and details
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name: name || existingUser.name,
          rollNumber: detectedRollNumber || existingUser.rollNumber,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name || normalizedEmail.split('@')[0],
          rollNumber: detectedRollNumber,
          status: 'PENDING_VERIFICATION',
        },
      });
    }

    // Invalidate prior unconsumed OTPs for this user
    await prisma.emailVerificationOtp.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    // Generate fresh OTP
    const rawOtp = this.generateOtp();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + config.university.otpExpiryMinutes * 60 * 1000);

    await prisma.emailVerificationOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        attemptCount: 0,
      },
    });

    // Dispatch email
    await emailService.sendVerificationOtp(user.email, rawOtp, user.name || 'Student');

    return {
      userId: user.id,
      email: user.email,
      ...(config.nodeEnv === 'development' && { devOtp: rawOtp }),
    };
  }

  async verifyOtp({ userId, email, otp }) {
    if (!otp) {
      throw new BadRequestError('Verification OTP code is required');
    }

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    }

    if (!user) {
      throw new NotFoundError('Student account not found');
    }

    if (user.status === 'ACTIVE') {
      return {
        alreadyActive: true,
        message: 'Account is already verified and active',
        user: { id: user.id, email: user.email, name: user.name },
      };
    }

    // Find the latest active OTP
    const otpRecord = await prisma.emailVerificationOtp.findFirst({
      where: {
        userId: user.id,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestError('No active verification OTP found. Please request a new code.');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestError('Verification code has expired. Please request a new code.');
    }

    if (otpRecord.attemptCount >= config.university.otpMaxAttempts) {
      await prisma.emailVerificationOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      });
      throw new BadRequestError(
        'Maximum verification attempts exceeded. Please request a new code.'
      );
    }

    const submittedHash = this.hashOtp(otp);

    if (submittedHash !== otpRecord.otpHash) {
      const updatedAttempts = otpRecord.attemptCount + 1;
      await prisma.emailVerificationOtp.update({
        where: { id: otpRecord.id },
        data: { attemptCount: updatedAttempts },
      });

      const remaining = config.university.otpMaxAttempts - updatedAttempts;
      throw new BadRequestError(
        `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Code invalidated.'}`
      );
    }

    // Mark OTP consumed and activate account in a transaction
    await prisma.$transaction([
      prisma.emailVerificationOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      }),
    ]);

    const activeUser = await prisma.user.findUnique({ where: { id: user.id } });
    const token = this.generateToken(activeUser);

    return {
      token,
      user: {
        id: activeUser.id,
        email: activeUser.email,
        name: activeUser.name,
        rollNumber: activeUser.rollNumber,
        status: activeUser.status,
      },
    };
  }

  async resendOtp({ email, userId }) {
    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    }

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.status === 'ACTIVE') {
      throw new BadRequestError('Account is already active. Please log in directly.');
    }

    // Invalidate older OTPs
    await prisma.emailVerificationOtp.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });

    const rawOtp = this.generateOtp();
    const otpHash = this.hashOtp(rawOtp);
    const expiresAt = new Date(Date.now() + config.university.otpExpiryMinutes * 60 * 1000);

    await prisma.emailVerificationOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
        attemptCount: 0,
      },
    });

    await emailService.sendVerificationOtp(user.email, rawOtp, user.name || 'Student');

    return {
      userId: user.id,
      email: user.email,
      ...(config.nodeEnv === 'development' && { devOtp: rawOtp }),
    };
  }

  async login({ email, password }) {
    const normalizedEmail = this.validateUniversityEmail(email);

    if (!password) {
      throw new BadRequestError('Password is required');
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid university email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid university email or password');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new ForbiddenError(
        'Account is not yet verified. Please enter the OTP sent to your university email.',
        { userId: user.id, email: user.email, needsVerification: true }
      );
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenError('Your account has been suspended. Please contact campus administration.');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        rollNumber: user.rollNumber,
        status: user.status,
      },
    };
  }
}

module.exports = new AuthService();
