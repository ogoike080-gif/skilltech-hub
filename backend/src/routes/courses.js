// ============================================================
// backend/src/routes/courses.js — complete replacement
// ============================================================
const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/courseController');
const { protect, requireInstructor, requireEnrollment, optionalAuth } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for video uploads
});

// ── Public / student routes ────────────────────────────────
router.get('/',                             optionalAuth, ctrl.listCourses);
router.get('/my-courses',                   protect, ctrl.myCourses);
router.get('/instructor',                   protect, requireInstructor, ctrl.instructorCourses);
router.get('/:slug',                        optionalAuth, ctrl.getCourse);
router.post('/:courseId/enroll',            protect, ctrl.enroll);
router.post('/:courseId/reviews',           protect, ctrl.submitReview);
router.post('/lessons/:lessonId/progress',  protect, ctrl.updateProgress);

// ── Course builder (instructor) ────────────────────────────
router.post('/',                            protect, requireInstructor, upload.single('thumbnail'), ctrl.createCourse);
router.get('/:courseId/builder',            protect, requireInstructor, ctrl.getCourseBuilder);
router.put('/:courseId',                    protect, requireInstructor, upload.single('thumbnail'), ctrl.updateCourse);
router.put('/:courseId/publish',            protect, requireInstructor, ctrl.togglePublish);

// Sections
router.post('/:courseId/sections',                          protect, requireInstructor, ctrl.createSection);
router.put('/:courseId/sections/:sectionId',                protect, requireInstructor, ctrl.updateSection);
router.delete('/:courseId/sections/:sectionId',             protect, requireInstructor, ctrl.deleteSection);
router.put('/:courseId/sections/reorder',                   protect, requireInstructor, ctrl.reorderSections);

// Lessons
router.post('/:courseId/sections/:sectionId/lessons',       protect, requireInstructor, upload.single('video'), ctrl.createLesson);
router.put('/:courseId/lessons/:lessonId',                  protect, requireInstructor, upload.single('video'), ctrl.updateLesson);
router.delete('/:courseId/lessons/:lessonId',               protect, requireInstructor, ctrl.deleteLesson);
router.put('/:courseId/sections/:sectionId/lessons/reorder', protect, requireInstructor, ctrl.reorderLessons);

module.exports = router;
