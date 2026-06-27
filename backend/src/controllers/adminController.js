const { query } = require('../config/database');
const { AppError } = require('../utils/errors');


const { v4: uuidv4 } = require('uuid');

// ── Schools ──────────────────────────────────────────────
exports.createSchool = async (req, res, next) => {
  try {
    const { name, description, color } = req.body;
    if (!name) throw new AppError('School name is required', 400);

    const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const id = uuidv4();

    await query(
      `INSERT INTO schools (id, name, slug, description, color) VALUES (?, ?, ?, ?, ?)`,
      [id, name, slug, description || null, color || '#6366f1']
    );

    res.status(201).json({ success: true, data: { id, slug } });
  } catch (err) { next(err); }
};

// ── Jobs ─────────────────────────────────────────────────
exports.createJob = async (req, res, next) => {
  try {
    const {
      companyName, companyLogo, title, description, requirements,
      location, type, salaryMin, salaryMax, currency, applyUrl,
    } = req.body;
    if (!companyName || !title) throw new AppError('Company name and title are required', 400);

    const id = uuidv4();
    await query(`
      INSERT INTO jobs
        (id, company_name, company_logo, title, description, requirements,
         location, type, salary_min, salary_max, currency, apply_url, posted_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, companyName, companyLogo || null, title, description || null, requirements || null,
      location || null, type || 'full_time', salaryMin || null, salaryMax || null,
      currency || 'USD', applyUrl || null, req.user.userId,
    ]);

    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.deleteJob = async (req, res, next) => {
  try {
    await query('UPDATE jobs SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Job removed' });
  } catch (err) { next(err); }
};

// ── Certificates (manual issue by admin) ───────────────────
exports.issueCertificate = async (req, res, next) => {
  try {
    const { userId, courseId } = req.body;
    if (!userId || !courseId) throw new AppError('userId and courseId are required', 400);

    const [existing] = await query(
      'SELECT id FROM certificates WHERE user_id = ? AND course_id = ?',
      [userId, courseId]
    );
    if (existing) throw new AppError('Certificate already issued for this user/course', 409);

    const id = uuidv4();
    const certNumber = `STH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

    await query(
      `INSERT INTO certificates (id, user_id, course_id, certificate_number) VALUES (?, ?, ?, ?)`,
      [id, userId, courseId, certNumber]
    );

    res.status(201).json({ success: true, data: { id, certificateNumber: certNumber } });
  } catch (err) { next(err); }
};

// ── Motivational Videos ─────────────────────────────────────
exports.addMotivationalVideo = async (req, res, next) => {
  try {
    const { schoolId, title, videoUrl, thumbnailUrl } = req.body;
    if (!schoolId || !title || !videoUrl) throw new AppError('schoolId, title and videoUrl are required', 400);

    const id = uuidv4();
    await query(
      `INSERT INTO motivational_videos (id, school_id, title, video_url, thumbnail_url, source)
       VALUES (?, ?, ?, ?, ?, 'curated')`,
      [id, schoolId, title, videoUrl, thumbnailUrl || null]
    );

    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.listMotivationalVideos = async (req, res, next) => {
  try {
    const videos = await query(`
      SELECT mv.id, mv.title, mv.video_url, mv.thumbnail_url, mv.source, mv.is_active,
             s.name AS school_name
      FROM motivational_videos mv
      JOIN schools s ON s.id = mv.school_id
      ORDER BY mv.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: videos });
  } catch (err) { next(err); }
};

exports.deleteMotivationalVideo = async (req, res, next) => {
  try {
    await query('UPDATE motivational_videos SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Video removed' });
  } catch (err) { next(err); }
};

// ── List all students (for certificate issuing dropdown) ───
exports.listStudentsSimple = async (req, res, next) => {
  try {
    const students = await query(
      `SELECT id, email, first_name, last_name FROM users WHERE role = 'student' ORDER BY first_name LIMIT 500`
    );
    res.json({ success: true, data: students });
  } catch (err) { next(err); }
};

// ADD these functions to backend/src/controllers/adminController.js
// (keep your existing platformStats/listUsers/etc — these are additions)

// ── Live monitoring: all sessions happening right now ──────────────
// Mount as: GET /api/admin/live-sessions
exports.listLiveSessionsForAdmin = async (req, res, next) => {
  try {
    const sessions = await query(`
      SELECT ls.id, ls.title, ls.status, ls.scheduled_at, ls.started_at,
             ls.duration_min, ls.current_participants, ls.max_participants,
             ls.meeting_code,
             u.id AS instructor_id, u.first_name, u.last_name, u.email,
             c.title AS course_title
      FROM live_sessions ls
      JOIN users u ON u.id = ls.instructor_id
      LEFT JOIN courses c ON c.id = ls.course_id
      WHERE ls.status IN ('live', 'scheduled')
      ORDER BY ls.status = 'live' DESC, ls.scheduled_at ASC
      LIMIT 200
    `);
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
};

// ── Force-end any session (abuse, technical issue, policy violation) ──
// Mount as: POST /api/admin/live-sessions/:id/force-end
exports.forceEndSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [session] = await query('SELECT * FROM live_sessions WHERE id = ?', [id]);
    if (!session) throw new AppError('Session not found', 404);
    if (session.status === 'ended') throw new AppError('Session already ended', 400);

    await query(
      `UPDATE live_sessions SET status = 'ended', ended_at = NOW() WHERE id = ?`,
      [id]
    );

    // Log the moderation action
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uuidv4(), session.instructor_id,
        'Your live class was ended by an administrator',
        reason || 'This session was force-ended due to a policy violation or technical issue.',
        'warning',
      ]
    ).catch(() => {}); // notifications table optional, don't crash if missing

    // Notify any connected participants via socket so their screen updates instantly
    const io = req.app.get('io');
    if (io) {
      io.to(`session:${id}`).emit('session:force-ended', {
        sessionId: id,
        reason: reason || 'Ended by administrator',
      });
    }

    res.json({ success: true, message: 'Session force-ended' });
  } catch (err) { next(err); }
};

// ── Flag/ban an instructor for repeated abuse ──────────────────────
// Mount as: POST /api/admin/users/:id/flag
exports.flagUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);

    // End all of their live/scheduled sessions immediately
    await query(
      `UPDATE live_sessions SET status = 'cancelled' WHERE instructor_id = ? AND status IN ('live','scheduled')`,
      [id]
    );

    res.json({ success: true, message: 'User flagged and all their sessions cancelled' });
  } catch (err) { next(err); }
};


exports.platformStats = async (req, res, next) => {
  try {
    const [[users], [courses], [revenue], [sessions], [certs]] = await Promise.all([
      query('SELECT COUNT(*) AS total, SUM(is_active) AS active, SUM(role="instructor") AS instructors, SUM(role="student") AS students FROM users'),
      query('SELECT COUNT(*) AS total, SUM(is_published) AS published FROM courses'),
      query('SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS transactions FROM payments WHERE status="success"'),
      query('SELECT COUNT(*) AS total, SUM(status="live") AS live_now FROM live_sessions'),
      query('SELECT COUNT(*) AS total FROM certificates'),
    ]);
    const recentSignups = await query(
      'SELECT DATE(created_at) AS d, COUNT(*) AS n FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY d'
    );
    res.json({ success: true, data: { users: users[0], courses: courses[0], revenue: revenue[0], sessions: sessions[0], certs: certs[0], recentSignups } });
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
const { role, search, page = 1 } = req.query;

const safeLimit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
const safePage = Math.max(1, parseInt(page, 10) || 1);
const offset = (safePage - 1) * safeLimit;

    const where = [];
    const params = [];

    if (role) {
      where.push('role = ?');
      params.push(role);
    }

    if (search) {
      where.push(
        '(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'
      );

      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = where.length
      ? `WHERE ${where.join(' AND ')}`
      : '';

    const users = await query(
      `SELECT id,
              email,
              first_name,
              last_name,
              role,
              is_active,
              is_verified,
              subscription_tier,
              created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    next(err);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['student','instructor','mentor','admin'].includes(role)) throw new AppError('Invalid role', 400);
    await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ success: true, message: 'Role updated' });
  } catch (err) { next(err); }
};

exports.banUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { banned } = req.body;
    await query('UPDATE users SET is_active = ? WHERE id = ?', [banned ? 0 : 1, id]);
    res.json({ success: true, message: banned ? 'User banned' : 'User unbanned' });
  } catch (err) { next(err); }
};

exports.listCourses = async (req, res, next) => {
  try {
    const courses = await query(`
      SELECT c.id, c.title, c.is_published, c.total_students, c.avg_rating, c.price,
             u.first_name, u.last_name, s.name AS school_name, c.created_at
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      JOIN schools s ON s.id = c.school_id
      ORDER BY c.created_at DESC LIMIT 100
    `);
    res.json({ success: true, data: courses });
  } catch (err) { next(err); }
};

exports.publishCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { published } = req.body;
    await query(
      'UPDATE courses SET is_published = ?, published_at = IF(?, NOW(), NULL) WHERE id = ?',
      [published ? 1 : 0, published ? 1 : 0, id]
    );
    res.json({ success: true, message: published ? 'Course published' : 'Course unpublished' });
  } catch (err) { next(err); }
};

exports.listPayments = async (req, res, next) => {
  try {
    const payments = await query(`
      SELECT p.id, p.amount, p.currency, p.status, p.provider, p.type, p.created_at,
             u.email, u.first_name, u.last_name, c.title AS course_title
      FROM payments p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN courses c ON c.id = p.course_id
      ORDER BY p.created_at DESC LIMIT 200
    `);
    res.json({ success: true, data: payments });
  } catch (err) { next(err); }
};

exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await query(`
      SELECT ls.id, ls.title, ls.status, ls.scheduled_at, ls.current_participants,
             u.first_name, u.last_name
      FROM live_sessions ls
      JOIN users u ON u.id = ls.instructor_id
      ORDER BY ls.scheduled_at DESC LIMIT 100
    `);
    res.json({ success: true, data: sessions });
  } catch (err) { next(err); }
};

exports.listPendingInstructors = async (req, res, next) => {
  try {
    const pending = await query(`
      SELECT id, email, first_name, last_name, teacher_code, created_at
      FROM users
      WHERE role = 'instructor' AND instructor_status = 'pending'
      ORDER BY created_at ASC
    `);
    res.json({ success: true, data: pending });
  } catch (err) { next(err); }
};

exports.approveInstructor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [user] = await query(
      `SELECT id, role, instructor_status FROM users WHERE id = ?`,
      [id]
    );
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'instructor') throw new AppError('User is not an instructor applicant', 400);

    await query(
      `UPDATE users SET instructor_status = 'approved' WHERE id = ?`,
      [id]
    );

    // Best-effort notification — don't fail the approval if this errors
    await query(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uuidv4(), id,
        'Instructor application approved',
        'You can now create courses, schedule live classes, and upload materials.',
        'success',
      ]
    ).catch(() => {});

    res.json({ success: true, message: 'Instructor approved' });
  } catch (err) { next(err); }
};

exports.rejectInstructor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const [user] = await query(
      `SELECT id, role FROM users WHERE id = ?`,
      [id]
    );
    if (!user) throw new AppError('User not found', 404);
    if (user.role !== 'instructor') throw new AppError('User is not an instructor applicant', 400);

    await query(
      `UPDATE users SET instructor_status = 'rejected' WHERE id = ?`,
      [id]
    );

    await query(
      `INSERT INTO notifications (id, user_id, title, message, type)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uuidv4(), id,
        'Instructor application not approved',
        reason || 'Your instructor application was not approved at this time.',
        'warning',
      ]
    ).catch(() => {});

    res.json({ success: true, message: 'Instructor rejected' });
  } catch (err) { next(err); }
};

// ── Teacher invite codes management ──────────────────────────
// Mount as:
//   GET  /api/admin/teacher-codes
//   POST /api/admin/teacher-codes

exports.listTeacherCodes = async (req, res, next) => {
  try {
    const codes = await query(`
      SELECT id, code, label, max_uses, used_count, is_active, expires_at, created_at
      FROM teacher_codes
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: codes });
  } catch (err) { next(err); }
};

exports.createTeacherCode = async (req, res, next) => {
  try {
    const { code, label, maxUses, expiresAt } = req.body;
    if (!code || !code.trim()) throw new AppError('Code is required', 400);

    const id = uuidv4();
    await query(
      `INSERT INTO teacher_codes (id, code, label, max_uses, used_count, is_active, expires_at, created_by)
       VALUES (?, ?, ?, ?, 0, 1, ?, ?)`,
      [id, code.trim(), label || null, maxUses || 1, expiresAt || null, req.user.userId]
    );

    res.status(201).json({ success: true, data: { id, code: code.trim() } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return next(new AppError('That code already exists', 409));
    }
    next(err);
  }
};

exports.deactivateTeacherCode = async (req, res, next) => {
  try {
    await query('UPDATE teacher_codes SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Code deactivated' });
  } catch (err) { next(err); }
};
