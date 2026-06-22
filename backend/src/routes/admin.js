const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(protect, requireAdmin);

// Dashboard / Platform
router.get('/stats', ctrl.platformStats);

// Users
router.get('/users', ctrl.listUsers);
router.put('/users/:id/role', ctrl.updateUserRole);
router.put('/users/:id/ban', ctrl.banUser);
router.post('/users/:id/flag', ctrl.flagUser);

// Courses
router.get('/courses', ctrl.listCourses);
router.put('/courses/:id/publish', ctrl.publishCourse);

// Payments
router.get('/payments', ctrl.listPayments);

// Sessions
router.get('/sessions', ctrl.listSessions);

// Live Sessions
router.get('/live-sessions', ctrl.listLiveSessionsForAdmin);
router.post('/live-sessions/:id/force-end', ctrl.forceEndSession);

// Schools
router.post('/schools', ctrl.createSchool);

// Jobs
router.post('/jobs', ctrl.createJob);
router.delete('/jobs/:id', ctrl.deleteJob);

// Certificates
router.post('/certificates', ctrl.issueCertificate);

// Students
router.get('/students', ctrl.listStudentsSimple);

// Motivational Videos
router.post('/videos', ctrl.addMotivationalVideo);
router.get('/videos', ctrl.listMotivationalVideos);
router.delete('/videos/:id', ctrl.deleteMotivationalVideo);

module.exports = router;