const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { query } = require('../config/database');
const { protect, requireApprovedInstructor } = require('../middleware/auth');

const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "uploads/");
    },
    filename(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 * 1024
    }
});

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

// NOTE: I did not find an existing material-upload route/controller
// function in your codebase (only read-only GET /:lessonId existed).
// This is a placeholder showing where the gate goes — wire it to
// your actual upload controller function once you point me to it.
//
// router.post('/:lessonId/materials',
//   protect,
//   requireApprovedInstructor,
//   upload.single('file'),
//   ctrl.uploadMaterial
// );

module.exports = router;
