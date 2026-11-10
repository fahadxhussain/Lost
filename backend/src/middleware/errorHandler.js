const logger = require('../shared/logger');

function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ status: 'fail', message: 'Choose a photo of 10 MB or less.' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ status: 'fail', message: 'Choose one photo for this upload.' });
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack,
    details: err.details,
  });

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Generic or unhandled errors
  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

module.exports = errorHandler;
