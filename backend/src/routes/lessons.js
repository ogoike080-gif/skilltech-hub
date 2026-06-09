const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');
const { protect } = require('../middleware/auth');

router.get('/:lessonId', protect, async (req, res, next) => {
  try {
    const [lesson] = await query('SELECT * FROM lessons WHERE id = ? AND is_published = TRUE', [req.params.lessonId]);
    if (!lesson) return res.status(404).json({ success: false, message: 'Lesson not found' });
    res.json({ success: true, data: lesson });
  } catch (err) { next(err); }
});

router.get('/:lessonId/progress', protect, async (req, res, next) => {
  try {
    const [progress] = await query(
      'SELECT * FROM lesson_progress WHERE lesson_id = ? AND user_id = ?',
      [req.params.lessonId, req.user.userId]
    );
    res.json({ success: true, data: progress || null });
  } catch (err) { next(err); }
});

module.exports = router;
