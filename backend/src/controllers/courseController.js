const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { cacheGet, cacheSet, cacheInvalidatePattern } = require('../config/redis');
const { uploadVideo, uploadImage } = require('../services/cloudinary');
const { AppError } = require('../utils/errors');

// ── List courses ───────────────────────────────────────────
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



// ── Get single course ──────────────────────────────────────

exports.getCourse = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const cacheKey = `course:${slug}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const [course] = await query(`
      SELECT c.*, s.name AS school_name, s.slug AS school_slug, s.color AS school_color,
             u.id AS instructor_id, u.first_name, u.last_name,
             u.avatar_url AS instructor_avatar, u.bio AS instructor_bio,
             u.headline AS instructor_headline
      FROM courses c
      JOIN schools s ON s.id = c.school_id
      JOIN users u   ON u.id = c.instructor_id
      WHERE c.slug = ? AND c.is_published = TRUE
    `, [slug]);
    if (!course) throw new AppError('Course not found', 404);

    // Fetch curriculum
    const sections = await query(`
      SELECT sec.id, sec.title, sec.sort_order,
             JSON_ARRAYAGG(JSON_OBJECT(
               'id',        l.id,
               'title',     l.title,
               'type',      l.type,
               'duration',  l.duration_sec,
               'preview',   l.is_preview,
               'order',     l.sort_order
             ) ORDER BY l.sort_order) AS lessons
      FROM sections sec
      JOIN lessons l ON l.section_id = sec.id AND l.is_published = TRUE
      WHERE sec.course_id = ?
      GROUP BY sec.id
      ORDER BY sec.sort_order
    `, [course.id]);

    const reviews = await query(`
      SELECT r.rating, r.review, r.created_at,
             u.first_name, u.last_name, u.avatar_url
      FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.course_id = ? AND r.is_visible = TRUE
      ORDER BY r.created_at DESC LIMIT 10
    `, [course.id]);

    const result = { ...course, sections, reviews };
    await cacheSet(cacheKey, result, 300);

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Create course (instructor) ─────────────────────────────

exports.createCourse = async (req, res, next) => {
  try {
    const {
      schoolId, title, description, shortDesc, level, type,
      price, currency = 'USD', isFree, tags, requirements, objectives, language
    } = req.body;

    const slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now();

    const courseId = uuidv4();

    let thumbnailUrl = null;
    if (req.file) {
      thumbnailUrl = await uploadImage(req.file.buffer, `courses/${courseId}/thumbnail`);
    }

    await query(`
      INSERT INTO courses
        (id, school_id, instructor_id, title, slug, description, short_desc,
         thumbnail_url, level, type, price, currency, is_free, tags,
         requirements, objectives, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      courseId, schoolId, req.user.userId, title, slug, description, shortDesc,
      thumbnailUrl, level, type || 'self_paced', parseFloat(price) || 0,
      currency, isFree ? 1 : 0,
      JSON.stringify(tags || []), JSON.stringify(requirements || []),
      JSON.stringify(objectives || []), language || 'en'
    ]);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { id: courseId, slug },
    });
  } catch (err) {
    next(err);
  }
};

// ── Enroll ─────────────────────────────────────────────────

exports.enroll = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;

    const [course] = await query(
      'SELECT id, price, is_free FROM courses WHERE id = ? AND is_published = TRUE',
      [courseId]
    );
    if (!course) throw new AppError('Course not found', 404);

    const [existing] = await query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (existing) throw new AppError('Already enrolled', 409);

    if (!course.is_free && course.price > 0) {
      throw new AppError('Payment required to enroll in this course', 402);
    }

    await query(
      'INSERT INTO enrollments (id, user_id, course_id) VALUES (?, ?, ?)',
      [uuidv4(), userId, courseId]
    );

    await query(
      'UPDATE courses SET total_students = total_students + 1 WHERE id = ?',
      [courseId]
    );

    res.status(201).json({ success: true, message: 'Enrolled successfully' });
  } catch (err) {
    next(err);
  }
};

// ── Update lesson progress ─────────────────────────────────

exports.updateProgress = async (req, res, next) => {
  try {
    const { lessonId } = req.params;
    const { watchPct, isCompleted, notes } = req.body;
    const userId = req.user.userId;

    const [lesson] = await query('SELECT course_id FROM lessons WHERE id = ?', [lessonId]);
    if (!lesson) throw new AppError('Lesson not found', 404);

    await query(`
      INSERT INTO lesson_progress (id, user_id, lesson_id, course_id, watch_pct, is_completed, notes, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        watch_pct = GREATEST(watch_pct, VALUES(watch_pct)),
        is_completed = IF(VALUES(is_completed), TRUE, is_completed),
        notes = COALESCE(VALUES(notes), notes),
        completed_at = IF(VALUES(is_completed) AND completed_at IS NULL, NOW(), completed_at)
    `, [
      uuidv4(), userId, lessonId, lesson.course_id,
      watchPct || 0, isCompleted ? 1 : 0, notes || null,
      isCompleted ? new Date() : null
    ]);

    // Recalculate course progress
    const [progress] = await query(`
      SELECT
        COUNT(*) AS total_lessons,
        SUM(lp.is_completed) AS completed_lessons
      FROM lessons l
      LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = ?
      WHERE l.course_id = ? AND l.is_published = TRUE
    `, [userId, lesson.course_id]);

    const pct = progress.total_lessons > 0
      ? Math.round((progress.completed_lessons / progress.total_lessons) * 100)
      : 0;

    await query(
      `UPDATE enrollments SET progress_pct = ?, last_lesson_id = ?,
       completed_at = IF(? >= 100 AND completed_at IS NULL, NOW(), completed_at)
       WHERE user_id = ? AND course_id = ?`,
      [pct, lessonId, pct, userId, lesson.course_id]
    );

    res.json({ success: true, data: { progressPct: pct } });
  } catch (err) {
    next(err);
  }
};

// ── My courses ─────────────────────────────────────────────

exports.myCourses = async (req, res, next) => {
  try {
    const courses = await query(`
      SELECT c.id, c.title, c.slug, c.thumbnail_url, c.type,
             s.name AS school_name, s.color AS school_color,
             e.progress_pct, e.enrolled_at, e.completed_at,
             u.first_name, u.last_name
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      JOIN schools s ON s.id = c.school_id
      JOIN users u   ON u.id = c.instructor_id
      WHERE e.user_id = ?
      ORDER BY e.enrolled_at DESC
    `, [req.user.userId]);

    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
};

// ── Instructor: my courses ─────────────────────────────────

exports.instructorCourses = async (req, res, next) => {
  try {
    const courses = await query(`
      SELECT c.id, c.title, c.slug, c.thumbnail_url, c.type, c.level,
             c.price, c.is_published, c.is_free,
             c.total_students, c.avg_rating, c.total_reviews,
             s.name AS school_name,
             (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.course_id = c.id AND p.status = 'success') AS revenue
      FROM courses c JOIN schools s ON s.id = c.school_id
      WHERE c.instructor_id = ?
      ORDER BY c.created_at DESC
    `, [req.user.userId]);

    res.json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
};

// ── Submit review ──────────────────────────────────────────

exports.submitReview = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.userId;

    const [enrolled] = await query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (!enrolled) throw new AppError('You must be enrolled to review this course', 403);

    await query(
      `INSERT INTO reviews (id, course_id, user_id, rating, review)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?, review = ?, updated_at = NOW()`,
      [uuidv4(), courseId, userId, rating, review, rating, review]
    );

    // Recalculate avg rating
    const [stats] = await query(
      'SELECT AVG(rating) AS avg_r, COUNT(*) AS total FROM reviews WHERE course_id = ? AND is_visible = TRUE',
      [courseId]
    );
    await query(
      'UPDATE courses SET avg_rating = ?, total_reviews = ? WHERE id = ?',
      [parseFloat(stats.avg_r).toFixed(2), stats.total, courseId]
    );

    await cacheInvalidatePattern(`course:*`);
    res.json({ success: true, message: 'Review submitted' });
  } catch (err) {
    next(err);
  }
};
