const express = require('express');
const router = express.Router();

const { protect, requireRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');


router.post('/schools',                  ctrl.createSchool);
router.post('/jobs',                     ctrl.createJob);
router.delete('/jobs/:id',               ctrl.deleteJob);
router.post('/certificates',             ctrl.issueCertificate);
router.get('/students',                  ctrl.listStudentsSimple);
router.post('/videos',                   ctrl.addMotivationalVideo);
router.get('/videos',                    ctrl.listMotivationalVideos);
router.delete('/videos/:id',             ctrl.deleteMotivationalVideo);

// Protect all admin routes
router.use(protect, requireRole('admin'));

// Dashboard / platform
router.get('/stats', adminController.platformStats);

// Users
router.get('/users', adminController.listUsers);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/ban', adminController.banUser);
router.post('/users/:id/flag', adminController.flagUser);

// Courses
router.get('/courses', adminController.listCourses);
router.put('/courses/:id/publish', adminController.publishCourse);

// Payments
router.get('/payments', adminController.listPayments);

// Sessions
router.get('/sessions', adminController.listSessions);

// Live sessions
router.get(
  '/live-sessions',
  adminController.listLiveSessionsForAdmin
);

router.post(
  '/live-sessions/:id/force-end',
  adminController.forceEndSession
);

module.exports = router;