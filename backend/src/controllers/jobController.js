const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');

exports.listJobs = async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['is_active = TRUE', '(expires_at IS NULL OR expires_at > NOW())'];
    const params = [];
    if (type)   { where.push('`type` = ?'); params.push(type); }
    if (search) {
      where.push('(title LIKE ? OR company_name LIKE ? OR description LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s);
    }
    const jobs = await query(
      `SELECT id, company_name, company_logo, title, \`type\`, location, salary_min, salary_max, currency, skills, apply_url, created_at
       FROM job_listings WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
};

exports.getJob = async (req, res, next) => {
  try {
    const [job] = await query('SELECT * FROM job_listings WHERE id = ? AND is_active = TRUE', [req.params.jobId]);
    if (!job) throw new AppError('Job not found', 404);
    await query('UPDATE job_listings SET view_count = view_count + 1 WHERE id = ?', [job.id]);
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
};

exports.createListing = async (req, res, next) => {
  try {
    const { companyName, companyLogo, title, description, type, location, salaryMin, salaryMax, currency = 'USD', skills, applyUrl, expiresAt } = req.body;
    const id = uuidv4();
    await query(
      'INSERT INTO job_listings (id, posted_by, company_name, company_logo, title, description, `type`, location, salary_min, salary_max, currency, skills, apply_url, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.userId, companyName, companyLogo, title, description, type, location, salaryMin, salaryMax, currency, JSON.stringify(skills || []), applyUrl, expiresAt || null]
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.updateListing = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const [job] = await query('SELECT posted_by FROM job_listings WHERE id = ?', [jobId]);
    if (!job) throw new AppError('Job not found', 404);
    if (job.posted_by !== req.user.userId && req.user.role !== 'admin') throw new AppError('Forbidden', 403);
    const { title, description, type, location, salaryMin, salaryMax, isActive } = req.body;
    await query(
      'UPDATE job_listings SET title=?, description=?, `type`=?, location=?, salary_min=?, salary_max=?, is_active=? WHERE id=?',
      [title, description, type, location, salaryMin, salaryMax, isActive ? 1 : 0, jobId]
    );
    res.json({ success: true, message: 'Listing updated' });
  } catch (err) { next(err); }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const [job] = await query('SELECT posted_by FROM job_listings WHERE id = ?', [req.params.jobId]);
    if (!job) throw new AppError('Job not found', 404);
    if (job.posted_by !== req.user.userId && req.user.role !== 'admin') throw new AppError('Forbidden', 403);
    await query('UPDATE job_listings SET is_active = FALSE WHERE id = ?', [req.params.jobId]);
    res.json({ success: true, message: 'Listing removed' });
  } catch (err) { next(err); }
};
