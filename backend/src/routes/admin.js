

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

router.use(protect, requireAdmin);

router.get('/stats',               ctrl.platformStats);
router.get('/users',               ctrl.listUsers);
router.put('/users/:id/role',      ctrl.updateUserRole);
router.put('/users/:id/ban',       ctrl.banUser);
router.get('/courses',             ctrl.listCourses);
router.put('/courses/:id/publish', ctrl.publishCourse);
router.get('/payments',            ctrl.listPayments);
router.get('/sessions',            ctrl.listSessions);
router.get('/live-sessions',                ctrl.listLiveSessionsForAdmin);
router.post('/live-sessions/:id/force-end', ctrl.forceEndSession);
router.post('/users/:id/flag',              ctrl.flagUser);

router.post('/schools',                  ctrl.createSchool);
router.post('/jobs',                     ctrl.createJob);
router.delete('/jobs/:id',               ctrl.deleteJob);
router.post('/certificates',             ctrl.issueCertificate);
router.get('/students',                  ctrl.listStudentsSimple);
router.post('/videos',                   ctrl.addMotivationalVideo);
router.get('/videos',                    ctrl.listMotivationalVideos);
router.delete('/videos/:id',             ctrl.deleteMotivationalVideo);

module.exports = router;


// Protect all admin routes


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