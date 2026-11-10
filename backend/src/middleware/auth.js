const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/prisma');
const { UnauthorizedError, ForbiddenError } = require('../shared/errors/AppError');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired, please log in again');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        rollNumber: true,
        status: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError('User account associated with this token no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireActiveStudent(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.status === 'PENDING_VERIFICATION') {
    return next(
      new ForbiddenError('Account is pending verification. Please verify your student email OTP first.')
    );
  }

  if (req.user.status === 'SUSPENDED') {
    return next(new ForbiddenError('Your account has been suspended. Please contact administration.'));
  }

  next();
}

module.exports = {
  authenticate,
  requireActiveStudent,
};
