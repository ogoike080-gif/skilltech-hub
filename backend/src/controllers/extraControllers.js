// ============================================================
// adminController.js
// ============================================================
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');

const adminController = {
  platformStats: async (req, res, next) => {
    try {
      const [[users], [courses], [revenue], [sessions], [certs]] = await Promise.all([
        query('SELECT COUNT(*) AS total, SUM(is_active) AS active, SUM(role="instructor") AS instructors, SUM(role="student") AS students FROM users'),
        query('SELECT COUNT(*) AS total, SUM(is_published) AS published FROM courses'),
        query('SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS transactions FROM payments WHERE status="success"'),
        query('SELECT COUNT(*) AS total, SUM(status="live") AS live_now FROM live_sessions'),
        query('SELECT COUNT(*) AS total FROM certificates'),
      ]);
      const recentSignups = await query(
        'SELECT DATE(created_at) AS d, COUNT(*) AS n FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) GROUP BY DATE(created_at) ORDER BY d',
      );
      res.json({ success: true, data: { users: users[0], courses: courses[0], revenue: revenue[0], sessions: sessions[0], certs: certs[0], recentSignups } });
    } catch (err) { next(err); }
  },

  listUsers: async (req, res, next) => {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = [];
      const params = [];
      if (role) { where.push('role = ?'); params.push(role); }
      if (search) { where.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const users = await query(
        `SELECT id, email, first_name, last_name, role, is_active, is_verified, subscription_tier, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );
      res.json({ success: true, data: users });
    } catch (err) { next(err); }
  },

  updateUserRole: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      if (!['student','instructor','mentor','admin'].includes(role)) throw new AppError('Invalid role', 400);
      await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
      res.json({ success: true, message: 'Role updated' });
    } catch (err) { next(err); }
  },

  banUser: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { banned } = req.body;
      await query('UPDATE users SET is_active = ? WHERE id = ?', [banned ? 0 : 1, id]);
      res.json({ success: true, message: banned ? 'User banned' : 'User unbanned' });
    } catch (err) { next(err); }
  },

  listCourses: async (req, res, next) => {
    try {
      const courses = await query(`
        SELECT c.id, c.title, c.is_published, c.total_students, c.avg_rating, c.price,
               u.first_name, u.last_name, s.name AS school_name, c.created_at
        FROM courses c JOIN users u ON u.id = c.instructor_id JOIN schools s ON s.id = c.school_id
        ORDER BY c.created_at DESC LIMIT 100
      `);
      res.json({ success: true, data: courses });
    } catch (err) { next(err); }
  },

  publishCourse: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { published } = req.body;
      await query('UPDATE courses SET is_published = ?, published_at = IF(?, NOW(), NULL) WHERE id = ?', [published ? 1 : 0, published ? 1 : 0, id]);
      res.json({ success: true, message: published ? 'Course published' : 'Course unpublished' });
    } catch (err) { next(err); }
  },

  listPayments: async (req, res, next) => {
    try {
      const payments = await query(`
        SELECT p.id, p.amount, p.currency, p.status, p.provider, p.type, p.created_at,
               u.email, u.first_name, u.last_name, c.title AS course_title
        FROM payments p JOIN users u ON u.id = p.user_id
        LEFT JOIN courses c ON c.id = p.course_id
        ORDER BY p.created_at DESC LIMIT 200
      `);
      res.json({ success: true, data: payments });
    } catch (err) { next(err); }
  },

  listSessions: async (req, res, next) => {
    try {
      const sessions = await query(`
        SELECT ls.id, ls.title, ls.status, ls.scheduled_at, ls.current_participants,
               u.first_name, u.last_name
        FROM live_sessions ls JOIN users u ON u.id = ls.instructor_id
        ORDER BY ls.scheduled_at DESC LIMIT 100
      `);
      res.json({ success: true, data: sessions });
    } catch (err) { next(err); }
  },
};

module.exports = adminController;

// ============================================================
// jobController.js
// ============================================================
const { v4: uuidv4 } = require('uuid');

const jobController = {
  listJobs: async (req, res, next) => {
    try {
      const { type, search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const where = ['is_active = TRUE', '(expires_at IS NULL OR expires_at > NOW())'];
      const params = [];
      if (type) { where.push('type = ?'); params.push(type); }
      if (search) { where.push('(title LIKE ? OR company_name LIKE ? OR description LIKE ?)'); const s = `%${search}%`; params.push(s, s, s); }
      const jobs = await query(
        `SELECT id, company_name, company_logo, title, type, location, salary_min, salary_max, currency, skills, apply_url, created_at FROM job_listings WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, parseInt(limit), offset]
      );
      res.json({ success: true, data: jobs });
    } catch (err) { next(err); }
  },

  getJob: async (req, res, next) => {
    try {
      const [job] = await query('SELECT * FROM job_listings WHERE id = ? AND is_active = TRUE', [req.params.jobId]);
      if (!job) throw new AppError('Job not found', 404);
      await query('UPDATE job_listings SET view_count = view_count + 1 WHERE id = ?', [job.id]);
      res.json({ success: true, data: job });
    } catch (err) { next(err); }
  },

  createListing: async (req, res, next) => {
    try {
      const { companyName, companyLogo, title, description, type, location, salaryMin, salaryMax, currency = 'USD', skills, applyUrl, expiresAt } = req.body;
      const id = uuidv4();
      await query(
        'INSERT INTO job_listings (id, posted_by, company_name, company_logo, title, description, type, location, salary_min, salary_max, currency, skills, apply_url, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.user.userId, companyName, companyLogo, title, description, type, location, salaryMin, salaryMax, currency, JSON.stringify(skills || []), applyUrl, expiresAt || null]
      );
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  },

  updateListing: async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const [job] = await query('SELECT posted_by FROM job_listings WHERE id = ?', [jobId]);
      if (!job) throw new AppError('Job not found', 404);
      if (job.posted_by !== req.user.userId && req.user.role !== 'admin') throw new AppError('Forbidden', 403);
      const { title, description, type, location, salaryMin, salaryMax, isActive } = req.body;
      await query('UPDATE job_listings SET title=?, description=?, type=?, location=?, salary_min=?, salary_max=?, is_active=? WHERE id=?',
        [title, description, type, location, salaryMin, salaryMax, isActive ? 1 : 0, jobId]);
      res.json({ success: true, message: 'Listing updated' });
    } catch (err) { next(err); }
  },

  deleteListing: async (req, res, next) => {
    try {
      const [job] = await query('SELECT posted_by FROM job_listings WHERE id = ?', [req.params.jobId]);
      if (!job) throw new AppError('Job not found', 404);
      if (job.posted_by !== req.user.userId && req.user.role !== 'admin') throw new AppError('Forbidden', 403);
      await query('UPDATE job_listings SET is_active = FALSE WHERE id = ?', [req.params.jobId]);
      res.json({ success: true, message: 'Listing removed' });
    } catch (err) { next(err); }
  },
};

module.exports.jobController = jobController;

// ============================================================
// notificationController.js
// ============================================================
const notifController = {
  list: async (req, res, next) => {
    try {
      const notifs = await query(
        'SELECT id, type, title, body, data, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [req.user.userId]
      );
      const [[{ unread }]] = await Promise.all([
        query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.userId]),
      ]);
      res.json({ success: true, data: { notifications: notifs, unread } });
    } catch (err) { next(err); }
  },

  markRead: async (req, res, next) => {
    try {
      await query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
      res.json({ success: true });
    } catch (err) { next(err); }
  },

  markAllRead: async (req, res, next) => {
    try {
      await query('UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE', [req.user.userId]);
      res.json({ success: true });
    } catch (err) { next(err); }
  },
};

module.exports.notifController = notifController;
