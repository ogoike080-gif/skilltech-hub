// ============================================================
// routes/courses.js
// ============================================================
// ============================================================
// routes/courses.js
// ============================================================
const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/courseController');
const { protect, requireInstructor, requireEnrollment, optionalAuth } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/',                            optionalAuth, ctrl.listCourses);
router.get('/my-courses',                  protect, ctrl.myCourses);
router.get('/instructor',                  protect, requireInstructor, ctrl.instructorCourses);
router.get('/:slug',                       optionalAuth, ctrl.getCourse);
router.post('/',                           protect, requireInstructor, upload.single('thumbnail'), ctrl.createCourse);
router.post('/:courseId/enroll',           protect, ctrl.enroll);
router.post('/:courseId/reviews',          protect, ctrl.submitReview);
router.post('/lessons/:lessonId/progress', protect, ctrl.updateProgress);

module.exports = router;
