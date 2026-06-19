const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  let {
    statusCode = 500,
    message = 'Something went wrong. Please try again.',
    isOperational = false,
  } = err;

  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with this value already exists';
    isOperational = true;
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced record not found';
    isOperational = true;
  }
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    isOperational = true;
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    isOperational = true;
  }
  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Always log full detail server-side
  console.error('========== ERROR HANDLER ==========');
  console.error('URL:', req.method, req.originalUrl);
  console.error('MESSAGE:', err.message);
  console.error('CODE:', err.code);
  console.error('SQL:', err.sql);
  console.error('STACK:', err.stack);
  console.error('====================================');

  if (!isOperational && logger?.error) {
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
    });
  }

  // TEMPORARY: expose real error message + code in the API response
  // so we can see the exact DB/SQL problem directly in the browser
  // without digging through Railway logs. Revert this once fixed.
  return res.status(statusCode).json({
    success: false,
    message: isOperational ? message : err.message || 'Something went wrong. Please try again.',
    code: err.code || null,
    ...(err.sqlMessage && { sqlMessage: err.sqlMessage }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = {
  errorHandler,
  AppError,
};
