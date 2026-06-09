const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let { statusCode = 500, message, isOperational } = err;

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409; message = 'A record with this value already exists'; isOperational = true;
  }
  // MySQL foreign key
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400; message = 'Referenced record not found'; isOperational = true;
  }
  // JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401; message = 'Invalid authentication token'; isOperational = true;
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401; message = 'Authentication token expired'; isOperational = true;
  }
  // express-validator
  if (err.type === 'validation') {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: err.errors });
  }

  if (!isOperational) {
    logger.error('Unexpected error:', {
      message: err.message, stack: err.stack,
      url: req.originalUrl, method: req.method, userId: req.user?.userId,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? message : 'Something went wrong. Please try again.',
    ...(process.env.NODE_ENV === 'development' && !isOperational && { stack: err.stack }),
  });
}

module.exports = { errorHandler, AppError };
