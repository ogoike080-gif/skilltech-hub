// ── Require an APPROVED instructor (not just role='instructor') ──
// Use this on every route that creates/modifies course content,
// live classes, or lesson materials. Admins always pass through.
//
// Must run AFTER `protect` (needs req.user.userId) and pairs well
// with `requireInstructor` if you want both role + approval checked,
// though this alone is usually sufficient since it re-checks role too.

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
