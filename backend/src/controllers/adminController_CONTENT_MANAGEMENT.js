// ADD these functions to backend/src/controllers/adminController.js
// (keep your existing functions — these are pure additions)

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
