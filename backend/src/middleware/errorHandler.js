// ============================================================
// middleware/errorHandler.js
// ============================================================

const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  // Default values
  let statusCode = err.statusCode || 500;
  let message =
    err.message || 'Something went wrong. Please try again.';
  let isOperational = err.isOperational || false;

  // ----------------------------------------------------------
  // MYSQL ERRORS
  // ----------------------------------------------------------

  // Duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with this value already exists';
    isOperational = true;
  }

  // Foreign key error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced record not found';
    isOperational = true;
  }

  // Missing table
  if (err.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    message = `Database table missing: ${err.sqlMessage}`;
    isOperational = true;
  }

  // Missing column
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    statusCode = 500;
    message = `Database column error: ${err.sqlMessage}`;
    isOperational = true;
  }

  // SQL syntax error
  if (err.code === 'ER_PARSE_ERROR') {
    statusCode = 500;
    message = `SQL syntax error: ${err.sqlMessage}`;
    isOperational = true;
  }

  // Collation mismatch
  if (err.code === 'ER_CANT_AGGREGATE_2COLLATIONS') {
    statusCode = 500;
    message = `Collation mismatch: ${err.sqlMessage}`;
    isOperational = true;
  }

  // ----------------------------------------------------------
  // JWT ERRORS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // VALIDATION ERRORS
  // ----------------------------------------------------------

  if (err.type === 'validation') {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // ----------------------------------------------------------
  // LOG EVERYTHING
  // ----------------------------------------------------------

  console.error('\n========== ERROR HANDLER ==========');
  console.error('TIME:', new Date().toISOString());
  console.error('METHOD:', req.method);
  console.error('URL:', req.originalUrl);
  console.error('MESSAGE:', err.message);
  console.error('STATUS:', statusCode);
  console.error('CODE:', err.code);
  console.error('SQL MESSAGE:', err.sqlMessage);
  console.error('SQL:', err.sql);
  console.error('STACK:', err.stack);
  console.error('===================================\n');

  if (logger?.error) {
    logger.error('Unhandled Error', {
      method: req.method,
      url: req.originalUrl,
      userId: req.user?.userId || null,
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
  }

  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  return res.status(statusCode).json({
    success: false,

    // During debugging show exact error
    message:
      process.env.NODE_ENV === 'production'
        ? message
        : err.message || message,

    code: err.code || null,

    ...(err.sqlMessage && {
      sqlMessage: err.sqlMessage,
    }),

    ...(process.env.NODE_ENV !== 'production' && {
      stack: err.stack,
    }),
  });
}

module.exports = {
  errorHandler,
  AppError,
};