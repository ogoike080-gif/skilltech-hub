// Replace the existing `exports.listCourses` function in
// backend/src/controllers/courseController.js with this version.
// The fix: limit/offset are now explicitly parsed as integers with
// parseInt() before being passed to the SQL query. mysql2's prepared
// statements require true Number types for LIMIT/OFFSET placeholders —
// passing a string like "4" (which is what req.query.limit actually is)
// causes "Incorrect arguments to mysql_stmt_execute".

exports.listCourses = async (req, res, next) => {
  try {
    const {
      school,
      level,
      type,
      search,
      sort = 'newest',
      published,
      page = 1,
    } = req.query;

    // ✅ FIX: always coerce to real numbers, with safe fallbacks
    const limit = parseInt(req.query.limit, 10) || 20;
    const pageNum = parseInt(page, 10) || 1;
    const offset = (pageNum - 1) * limit;

    let whereClauses = [];
    let params = [];

    if (published === 'true') {
      whereClauses.push('c.is_published = TRUE');
    }
    if (school) {
      whereClauses.push('s.slug = ?');
      params.push(school);
    }
    if (level) {
      whereClauses.push('c.level = ?');
      params.push(level);
    }
    if (type) {
      whereClauses.push('c.type = ?');
      params.push(type);
    }
    if (search) {
      whereClauses.push('(c.title LIKE ? OR c.short_desc LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderBy = 'c.created_at DESC';
    if (sort === 'popular') orderBy = 'c.total_students DESC';
    if (sort === 'rating') orderBy = 'c.avg_rating DESC';
    if (sort === 'price_low') orderBy = 'c.price ASC';
    if (sort === 'price_high') orderBy = 'c.price DESC';

    // Count total (for pagination)
    const countSql = `
      SELECT COUNT(*) AS total
      FROM courses c
      JOIN schools s ON s.id = c.school_id
      ${whereSQL}
    `;
    const [{ total }] = await query(countSql, params);

    // Main query — limit/offset are now guaranteed integers
    const dataSql = `
      SELECT c.id, c.title, c.slug, c.short_desc, c.thumbnail_url,
             c.level, c.type, c.price, c.currency, c.is_free,
             c.duration_hours, c.total_lessons, c.total_students,
             c.avg_rating, c.total_reviews,
             s.name AS school_name, s.slug AS school_slug, s.color AS school_color,
             u.first_name, u.last_name, u.avatar_url AS instructor_avatar
      FROM courses c
      JOIN schools s ON s.id = c.school_id
      JOIN users u   ON u.id = c.instructor_id
      ${whereSQL}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];

    const courses = await query(dataSql, dataParams);

    res.json({
      success: true,
      data: courses,
      pagination: {
        total,
        page: pageNum,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};
