const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');

exports.listJobs = async (req, res, next) => {
  try {
    const { type, search } = req.query;

    // Safe pagination values
    const safeLimit = Math.max(
      1,
      Math.min(100, parseInt(req.query.limit, 10) || 20)
    );

    const safePage = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    );

    const offset = (safePage - 1) * safeLimit;

    const where = [
      'is_active = TRUE',
      '(expires_at IS NULL OR expires_at > NOW())'
    ];

    const params = [];

    if (type) {
      where.push('`type` = ?');
      params.push(type);
    }

    if (search) {
      where.push(
        '(title LIKE ? OR company_name LIKE ? OR description LIKE ?)'
      );
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const jobs = await query(
      `SELECT id,
              company_name,
              company_logo,
              title,
              \`type\`,
              location,
              salary_min,
              salary_max,
              currency,
              skills,
              apply_url,
              created_at
       FROM job_listings
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ${safeLimit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page: safePage,
        limit: safeLimit
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getJob = async (req, res, next) => {
  try {
    const [job] = await query(
      'SELECT * FROM job_listings WHERE id = ? AND is_active = TRUE',
      [req.params.jobId]
    );

    if (!job) throw new AppError('Job not found', 404);

    await query(
      'UPDATE job_listings SET view_count = view_count + 1 WHERE id = ?',
      [job.id]
    );

    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
};

exports.createListing = async (req, res, next) => {
  try {
    const {
      companyName,
      companyLogo,
      title,
      description,
      type,
      location,
      salaryMin,
      salaryMax,
      currency = 'USD',
      skills,
      applyUrl,
      expiresAt
    } = req.body;

    const id = uuidv4();

    await query(
      'INSERT INTO job_listings (id, posted_by, company_name, company_logo, title, description, `type`, location, salary_min, salary_max, currency, skills, apply_url, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        req.user.userId,
        companyName,
        companyLogo,
        title,
        description,
        type,
        location,
        salaryMin,
        salaryMax,
        currency,
        JSON.stringify(skills || []),
        applyUrl,
        expiresAt || null
      ]
    );

    res.status(201).json({
      success: true,
      data: { id }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateListing = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const [job] = await query(
      'SELECT posted_by FROM job_listings WHERE id = ?',
      [jobId]
    );

    if (!job) throw new AppError('Job not found', 404);

    if (
      job.posted_by !== req.user.userId &&
      req.user.role !== 'admin'
    ) {
      throw new AppError('Forbidden', 403);
    }

    const {
      title,
      description,
      type,
      location,
      salaryMin,
      salaryMax,
      isActive
    } = req.body;

    await query(
      'UPDATE job_listings SET title=?, description=?, `type`=?, location=?, salary_min=?, salary_max=?, is_active=? WHERE id=?',
      [
        title,
        description,
        type,
        location,
        salaryMin,
        salaryMax,
        isActive ? 1 : 0,
        jobId
      ]
    );

    res.json({
      success: true,
      message: 'Listing updated'
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteListing = async (req, res, next) => {
  try {
    const [job] = await query(
      'SELECT posted_by FROM job_listings WHERE id = ?',
      [req.params.jobId]
    );

    if (!job) throw new AppError('Job not found', 404);

    if (
      job.posted_by !== req.user.userId &&
      req.user.role !== 'admin'
    ) {
      throw new AppError('Forbidden', 403);
    }

    await query(
      'UPDATE job_listings SET is_active = FALSE WHERE id = ?',
      [req.params.jobId]
    );

    res.json({
      success: true,
      message: 'Listing removed'
    });
  } catch (err) {
    next(err);
  }
};


// ============================================================
// ADD TO jobController.js — paste at the bottom
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');

function getAnthropic() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Apply for a job ────────────────────────────────────────
// POST /api/jobs/:jobId/apply
exports.applyForJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { coverLetter } = req.body;
    const studentId = req.user.userId;

    const [job] = await query(
      'SELECT * FROM job_listings WHERE id = ? AND is_active = TRUE',
      [jobId]
    );
    if (!job) throw new AppError('Job not found or no longer active', 404);

    // Check if already applied
    const [existing] = await query(
      'SELECT id FROM job_applications WHERE job_id = ? AND student_id = ?',
      [jobId, studentId]
    );
    if (existing) throw new AppError('You have already applied for this job', 409);

    const applicationId = uuidv4();
    await query(
      `INSERT INTO job_applications (id, job_id, student_id, cover_letter)
       VALUES (?, ?, ?, ?)`,
      [applicationId, jobId, studentId, coverLetter || null]
    );

    // Trigger AI match score in background (non-blocking)
    generateAiMatchScore(applicationId, jobId, studentId).catch(err =>
      console.warn('AI match score failed:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { applicationId },
    });
  } catch (err) { next(err); }
};

// ── Get my applications (student) ─────────────────────────
// GET /api/jobs/my-applications
exports.myApplications = async (req, res, next) => {
  try {
    const studentId = req.user.userId;
    const applications = await query(
      `SELECT ja.*, jl.title, jl.company_name, jl.type, jl.location,
              jl.salary_min, jl.salary_max
       FROM job_applications ja
       JOIN job_listings jl ON jl.id = ja.job_id
       WHERE ja.student_id = ?
       ORDER BY ja.created_at DESC`,
      [studentId]
    );
    res.json({ success: true, data: applications });
  } catch (err) { next(err); }
};

// ── Get applicants for a job (admin/poster) ───────────────
// GET /api/jobs/:jobId/applicants
exports.getApplicants = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const applicants = await query(
      `SELECT ja.*, u.first_name, u.last_name, u.email, u.avatar_url
       FROM job_applications ja
       JOIN users u ON u.id = ja.student_id
       WHERE ja.job_id = ?
       ORDER BY ja.ai_match_score DESC, ja.created_at ASC`,
      [jobId]
    );
    res.json({ success: true, data: applicants });
  } catch (err) { next(err); }
};

// ── Update application status (admin) ────────────────────
// PUT /api/jobs/:jobId/applicants/:applicationId
exports.updateApplicationStatus = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending','reviewed','shortlisted','rejected','hired'];
    if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

    await query(
      'UPDATE job_applications SET status = ? WHERE id = ?',
      [status, applicationId]
    );
    res.json({ success: true, message: 'Status updated' });
  } catch (err) { next(err); }
};

// ── AI Job Match ───────────────────────────────────────────
// GET /api/jobs/:jobId/match — get AI match score for current user
exports.getAiMatch = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const studentId = req.user.userId;

    // Check if already scored
    const [existing] = await query(
      'SELECT ai_match_score, ai_match_reason FROM job_applications WHERE job_id = ? AND student_id = ?',
      [jobId, studentId]
    );
    if (existing?.ai_match_score !== null) {
      return res.json({ success: true, data: existing });
    }

    const score = await generateAiMatchScore(null, jobId, studentId);
    res.json({ success: true, data: score });
  } catch (err) { next(err); }
};

// ── AI Match Score Generator ───────────────────────────────
async function generateAiMatchScore(applicationId, jobId, studentId) {
  const [job] = await query('SELECT * FROM job_listings WHERE id = ?', [jobId]);
  if (!job) return null;

  // Get student's courses and skills
  const courses = await query(
    `SELECT c.title, c.level, s.name AS school
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN schools s ON s.id = c.school_id
     WHERE e.user_id = ?
     LIMIT 20`,
    [studentId]
  );

  const [student] = await query(
    'SELECT first_name, last_name FROM users WHERE id = ?',
    [studentId]
  );

  const prompt = `You are a job matching AI. Score how well this student matches this job.

JOB:
Title: ${job.title}
Company: ${job.company_name}
Type: ${job.type}
Description: ${job.description}
Requirements: ${job.requirements || 'Not specified'}

STUDENT BACKGROUND:
Name: ${student?.first_name} ${student?.last_name}
Courses completed: ${courses.map(c => `${c.title} (${c.level})`).join(', ') || 'None yet'}

Respond with ONLY valid JSON in this exact format:
{"score": 75, "reason": "Brief 2-sentence explanation of the match"}

Score 0-100. Be honest and concise.`;

  const response = await getAnthropic().messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  let score = 50;
  let reason = 'Match score calculated based on your profile.';

  try {
    const parsed = JSON.parse(response.content[0].text.trim());
    score  = Math.max(0, Math.min(100, parseInt(parsed.score)));
    reason = parsed.reason;
  } catch {}

  // Save to application if we have an applicationId
  if (applicationId) {
    await query(
      'UPDATE job_applications SET ai_match_score = ?, ai_match_reason = ? WHERE id = ?',
      [score, reason, applicationId]
    ).catch(() => {});
  }

  return { ai_match_score: score, ai_match_reason: reason };
}
