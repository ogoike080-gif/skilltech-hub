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


router.get('/live-sessions',                  protect, requireRole('admin'), adminController.listLiveSessionsForAdmin);
router.post('/live-sessions/:id/force-end',   protect, requireRole('admin'), adminController.forceEndSession);
router.post('/users/:id/flag',                protect, requireRole('admin'), adminController.flagUser);
module.exports = router;
