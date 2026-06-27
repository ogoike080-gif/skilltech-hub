const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');




// ── Verify JWT ─────────────────────────────────────────────

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new AppError('Token expired', 401);
      throw new AppError('Invalid token', 401);
    }

    // Light user check (not full DB hit — use Redis blacklist in production)
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
};

// ── Optional auth (attaches user if token present) ────────

exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { userId: payload.userId, role: payload.role };
      } catch {
        // Ignore invalid token for optional auth
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

// ── Role guards ────────────────────────────────────────────

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Insufficient permissions', 403));
  }
  next();
};

exports.requireAdmin     = exports.requireRole('admin');
exports.requireInstructor = exports.requireRole('instructor', 'admin');
exports.requireMentor    = exports.requireRole('mentor', 'instructor', 'admin');

// ── Check course ownership ─────────────────────────────────

exports.requireCourseOwner = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.params.id || req.body.courseId;
    if (!courseId) return next(new AppError('Course ID required', 400));

    if (req.user.role === 'admin') return next();

    const [course] = await query(
      'SELECT id FROM courses WHERE id = ? AND instructor_id = ?',
      [courseId, req.user.userId]
    );
    if (!course) throw new AppError('Course not found or access denied', 404);
    next();
  } catch (err) {
    next(err);
  }
};

// ── Check enrollment ───────────────────────────────────────

exports.requireEnrollment = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId;
    if (!courseId) return next(new AppError('Course ID required', 400));

    if (['instructor', 'admin'].includes(req.user.role)) return next();

    const [enrollment] = await query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.userId, courseId]
    );
    if (!enrollment) throw new AppError('Enrollment required to access this content', 403);
    next();
  } catch (err) {
    next(err);
  }
};

// ── Require an APPROVED instructor (not just role='instructor') ──
// Use this on every route that creates/modifies course content,
// live classes, or lesson materials. Admins always pass through.
//
// Must run AFTER `protect` (needs req.user.userId).

exports.requireApprovedInstructor = async (req, res, next) => {
  try {
    if (!req.user) return next(new AppError('Authentication required', 401));

    if (req.user.role === 'admin') return next();

    if (req.user.role !== 'instructor') {
      return next(new AppError('Instructor access required', 403));
    }

    const [user] = await query(
      'SELECT instructor_status FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (!user) return next(new AppError('User not found', 404));

    if (user.instructor_status !== 'approved') {
      return next(new AppError(
        user.instructor_status === 'rejected'
          ? 'Your instructor application was not approved. Contact support for details.'
          : 'Your instructor account is pending admin approval. You cannot create or manage content until approved.',
        403
      ));
    }

    next();
  } catch (err) {
    next(err);
  }
};
