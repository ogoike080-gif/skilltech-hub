const { query } = require('../config/database');
const { AppError } = require('../utils/errors');

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
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = []; const params = [];
    if (role)   { where.push('role = ?'); params.push(role); }
    if (search) { where.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const users = await query(
      `SELECT id, email, first_name, last_name, role, is_active, is_verified, subscription_tier, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
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
