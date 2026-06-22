// ============================================================
// userController.js
// ============================================================

const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { uploadImage } = require('../services/cloudinary');
const { AppError } = require('../utils/errors');

const userController = {

  getMotivationVideos: async (req, res, next) => {
    try {
      const [user] = await query(
        'SELECT preferred_school_id FROM users WHERE id = ?',
        [req.user.userId]
      );

      if (!user || !user.preferred_school_id) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const videos = await query(
        `SELECT
            id,
            title,
            video_url,
            thumbnail_url,
            source
         FROM motivational_videos
         WHERE school_id = ?
         AND is_active = 1
         ORDER BY created_at DESC
         LIMIT 10`,
        [user.preferred_school_id]
      );

      return res.json({
        success: true,
        data: videos,
      });

    } catch (err) {
      next(err);
    }
  },

  dashboard: async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const [user] = await query(
        'SELECT id, first_name, last_name, avatar_url, role, subscription_tier FROM users WHERE id = ?',
        [userId]
      );

      const [[enrollStats], recentCourses, upcomingClasses, recentCerts, points] =
        await Promise.all([
          query(
            `SELECT COUNT(*) AS total,
                    SUM(progress_pct = 100) AS completed,
                    SUM(progress_pct)/NULLIF(COUNT(*),0) AS avg_progress
             FROM enrollments
             WHERE user_id = ?`,
            [userId]
          ),

          query(
            `SELECT c.id,c.title,c.slug,c.thumbnail_url,
                    e.progress_pct,
                    s.name AS school_name,
                    s.color
             FROM enrollments e
             JOIN courses c ON c.id=e.course_id
             JOIN schools s ON s.id=c.school_id
             WHERE e.user_id=?
             AND e.completed_at IS NULL
             ORDER BY e.enrolled_at DESC
             LIMIT 4`,
            [userId]
          ),

          query(
            `SELECT ls.id,
                    ls.title,
                    ls.scheduled_at,
                    ls.duration_min,
                    u.first_name,
                    u.last_name,
                    u.avatar_url
             FROM live_sessions ls
             JOIN enrollments e ON e.course_id=ls.course_id
             JOIN users u ON u.id=ls.instructor_id
             WHERE e.user_id=?
             AND ls.status='scheduled'
             AND ls.scheduled_at>NOW()
             ORDER BY ls.scheduled_at ASC
             LIMIT 5`,
            [userId]
          ),

          query(
            `SELECT c.id,
                    c.verify_token,
                    co.title,
                    s.name AS school_name,
                    s.color
             FROM certificates c
             JOIN courses co ON co.id=c.course_id
             JOIN schools s ON s.id=co.school_id
             WHERE c.user_id=?
             ORDER BY c.issued_at DESC
             LIMIT 4`,
            [userId]
          ),

          query(
            `SELECT SUM(points) AS total
             FROM user_points
             WHERE user_id=?`,
            [userId]
          ),
        ]);

      const streak = await calculateStreak(userId);

      res.json({
        success: true,
        data: {
          user,
          stats: {
            ...enrollStats,
            totalPoints: points[0]?.total || 0,
            streak,
          },
          recentCourses,
          upcomingClasses,
          recentCerts,
        },
      });

    } catch (err) {
      next(err);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const {
        firstName,
        lastName,
        bio,
        headline,
        websiteUrl,
        linkedinUrl,
        githubUrl,
      } = req.body;

      await query(
        `UPDATE users
         SET first_name=?,
             last_name=?,
             bio=?,
             headline=?,
             website_url=?,
             linkedin_url=?,
             github_url=?
         WHERE id=?`,
        [
          firstName,
          lastName,
          bio,
          headline,
          websiteUrl,
          linkedinUrl,
          githubUrl,
          req.user.userId,
        ]
      );

      res.json({
        success: true,
        message: 'Profile updated',
      });

    } catch (err) {
      next(err);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      const [user] = await query(
        'SELECT password_hash FROM users WHERE id=?',
        [req.user.userId]
      );

      const valid = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!valid)
        throw new AppError('Current password is incorrect', 400);

      const hash = await bcrypt.hash(newPassword, 12);

      await query(
        'UPDATE users SET password_hash=? WHERE id=?',
        [hash, req.user.userId]
      );

      res.json({
        success: true,
        message: 'Password changed',
      });

    } catch (err) {
      next(err);
    }
  },

  uploadAvatar: async (req, res, next) => {
    try {
      if (!req.file)
        throw new AppError('No file uploaded', 400);

      const url = await uploadImage(
        req.file.buffer,
        `avatars/${req.user.userId}`
      );

      await query(
        'UPDATE users SET avatar_url=? WHERE id=?',
        [url, req.user.userId]
      );

      res.json({
        success: true,
        data: { avatarUrl: url },
      });

    } catch (err) {
      next(err);
    }
  },

  leaderboard: async (req, res, next) => {
    try {
      const leaders = await query(`
        SELECT
          u.id,
          u.first_name,
          u.last_name,
          u.avatar_url,
          SUM(up.points) AS total_points,
          (
            SELECT COUNT(*)
            FROM certificates
            WHERE user_id=u.id
          ) AS cert_count
        FROM user_points up
        JOIN users u
          ON u.id=up.user_id
        GROUP BY u.id
        ORDER BY total_points DESC
        LIMIT 50
      `);

      res.json({
        success: true,
        data: leaders,
      });

    } catch (err) {
      next(err);
    }
  },

  publicProfile: async (req, res, next) => {
    try {
      const [user] = await query(
        `SELECT
          id,
          first_name,
          last_name,
          avatar_url,
          headline,
          bio,
          linkedin_url,
          github_url,
          website_url,
          created_at
         FROM users
         WHERE id=?
         AND is_active=TRUE`,
        [req.params.userId]
      );

      if (!user)
        throw new AppError('User not found', 404);

      const certs = await query(
        `SELECT
            co.title,
            s.name AS school_name,
            c.issued_at
         FROM certificates c
         JOIN courses co ON co.id=c.course_id
         JOIN schools s ON s.id=co.school_id
         WHERE c.user_id=?
         AND c.is_valid=TRUE`,
        [user.id]
      );

      res.json({
        success: true,
        data: {
          ...user,
          certificates: certs,
        },
      });

    } catch (err) {
      next(err);
    }
  },
};

async function calculateStreak(userId) {
  const rows = await query(
    `SELECT DISTINCT DATE(completed_at) AS d
     FROM lesson_progress
     WHERE user_id=?
     AND completed_at IS NOT NULL
     ORDER BY d DESC
     LIMIT 30`,
    [userId]
  );

  if (!rows.length) return 0;

  let streak = 0;

  let expected = new Date();
  expected.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const d = new Date(row.d);
    d.setHours(0, 0, 0, 0);

    if (d.getTime() === expected.getTime()) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

module.exports = userController;