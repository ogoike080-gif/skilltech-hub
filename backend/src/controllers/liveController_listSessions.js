// Replace the existing `exports.listSessions` function in
// backend/src/controllers/liveController.js with this version.
// Same fix: limit/offset coerced to real integers via parseInt().

exports.listSessions = async (req, res, next) => {
  try {
    const { status = 'scheduled', page = 1 } = req.query;

    // ✅ FIX: always coerce to real numbers, with safe fallbacks
    const limit = parseInt(req.query.limit, 10) || 20;
    const pageNum = parseInt(page, 10) || 1;
    const offset = (pageNum - 1) * limit;

    const dataSql = `
      SELECT ls.id, ls.title, ls.description, ls.scheduled_at,
             ls.duration_min, ls.status, ls.is_recorded, ls.is_public,
             ls.max_participants, ls.current_participants, ls.price, ls.recording_url,
             u.id AS instructor_id, u.first_name, u.last_name, u.avatar_url,
             c.title AS course_title, c.slug AS course_slug
      FROM live_sessions ls
      JOIN users u ON u.id = ls.instructor_id
      LEFT JOIN courses c ON c.id = ls.course_id
      WHERE ls.status = ?
      ORDER BY ls.scheduled_at ASC
      LIMIT ? OFFSET ?
    `;
    const sessions = await query(dataSql, [status, limit, offset]);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};
