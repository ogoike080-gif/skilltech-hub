// ============================================================
// routes/live.js
// ============================================================
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/liveController');
const { protect, requireInstructor, requireApprovedInstructor } = require('../middleware/auth');
const liveController = require('../controllers/liveController');

router.get('/lookup/:meetingCode', liveController.lookupByCode);
router.post('/join', protect, liveController.joinByCode);

router.get('/',                      protect, ctrl.listSessions);
router.post('/',                     protect, requireApprovedInstructor, ctrl.schedule);
router.get('/:sessionId/token',      protect, ctrl.getJoinToken);
router.post('/:sessionId/start',     protect, requireInstructor, ctrl.startSession);
router.post('/:sessionId/end',       protect, requireInstructor, ctrl.endSession);
router.post('/webhook/livekit',      ctrl.livekitWebhook);

module.exports = router;

// ============================================================
// routes/ai.js
// ============================================================
const aiRouter  = express.Router();
const aiCtrl    = require('../controllers/aiController');

aiRouter.post('/chat',          protect, aiCtrl.chat);
aiRouter.post('/generate-quiz', protect, aiCtrl.generateQuiz);
aiRouter.post('/study-plan',    protect, aiCtrl.getStudyPlan);
aiRouter.post('/explain-code',  protect, aiCtrl.explainCode);
aiRouter.get('/conversations',  protect, aiCtrl.getConversations);

// ============================================================
// routes/payments.js
// ============================================================
const payRouter  = express.Router();
const payCtrl    = require('../controllers/paymentController');

payRouter.post('/stripe/checkout',        protect, payCtrl.stripeCheckout);
payRouter.post('/webhook/stripe',         payCtrl.stripeWebhook);
payRouter.post('/paystack/initialize',    protect, payCtrl.paystackInitialize);
payRouter.post('/webhook/paystack',       payCtrl.paystackWebhook);
payRouter.get('/my-payments',             protect, payCtrl.myPayments);
payRouter.get('/revenue-stats',           protect, payCtrl.revenueStats);

// ============================================================
// routes/certificates.js
// ============================================================
const certRouter = express.Router();
const certCtrl   = require('../controllers/certificateController');

certRouter.post('/',             protect, certCtrl.issue);
certRouter.get('/my',            protect, certCtrl.myCertificates);
certRouter.get('/verify/:token', certCtrl.verify);

// ============================================================
// routes/streaming.js
// ============================================================
const streamRouter = express.Router();
const streamCtrl   = require('../controllers/streamingController');

streamRouter.get('/connections',                    protect, streamCtrl.myConnections);
streamRouter.post('/connections',                   protect, streamCtrl.connectPlatform);
streamRouter.post('/start',                         protect, streamCtrl.startMultistream);
streamRouter.post('/:sessionId/stop',               protect, streamCtrl.stopMultistream);
streamRouter.get('/:sessionId/analytics',           protect, streamCtrl.streamAnalytics);
streamRouter.get('/:sessionId/rtmp',                protect, streamCtrl.getRtmpIngest);

// ============================================================
// routes/community.js
// ============================================================
const communityRouter = express.Router();
const communityCtrl   = require('../controllers/communityController');

communityRouter.get('/categories',          communityCtrl.listCategories);
communityRouter.get('/posts',               optionalAuth, communityCtrl.listPosts);
communityRouter.get('/posts/:postId',       optionalAuth, communityCtrl.getPost);
communityRouter.post('/posts',              protect, communityCtrl.createPost);
communityRouter.post('/posts/:postId/vote', protect, communityCtrl.votePost);
communityRouter.post('/posts/:postId/reply',protect, communityCtrl.replyPost);
communityRouter.delete('/posts/:postId',    protect, communityCtrl.deletePost);

// ============================================================
// routes/mentors.js
// ============================================================
const mentorRouter = express.Router();
const mentorCtrl   = require('../controllers/mentorController');

mentorRouter.get('/',                    optionalAuth, mentorCtrl.listMentors);
mentorRouter.get('/:mentorId',           optionalAuth, mentorCtrl.getMentor);
mentorRouter.post('/profile',            protect, mentorCtrl.createProfile);
mentorRouter.put('/availability',        protect, mentorCtrl.setAvailability);
mentorRouter.get('/:mentorId/slots',     protect, mentorCtrl.getAvailableSlots);
mentorRouter.post('/book',               protect, mentorCtrl.bookSession);
mentorRouter.get('/bookings/my',         protect, mentorCtrl.myBookings);
mentorRouter.post('/bookings/:id/complete', protect, mentorCtrl.completeSession);

// ============================================================
// routes/schools.js
// ============================================================
const schoolRouter = express.Router();
const { query } = require('../config/database');

schoolRouter.get('/', async (req, res, next) => {
  try {
    const schools = await query('SELECT * FROM schools WHERE is_active = TRUE ORDER BY sort_order');
    res.json({ success: true, data: schools });
  } catch (err) { next(err); }
});

schoolRouter.get('/:slug', async (req, res, next) => {
  try {
    const [school] = await query('SELECT * FROM schools WHERE slug = ? AND is_active = TRUE', [req.params.slug]);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    const courses = await query(
      'SELECT c.id, c.title, c.slug, c.thumbnail_url, c.level, c.type, c.price, c.is_free, c.avg_rating, c.total_students FROM courses c WHERE c.school_id = ? AND c.is_published = TRUE ORDER BY c.total_students DESC',
      [school.id]
    );
    res.json({ success: true, data: { ...school, courses } });
  } catch (err) { next(err); }
});

// ============================================================
// routes/users.js
// ============================================================
const userRouter = express.Router();
const userCtrl   = require('../controllers/userController');

userRouter.get('/dashboard',      protect, userCtrl.dashboard);
userRouter.put('/profile',        protect, userCtrl.updateProfile);
userRouter.put('/password',       protect, userCtrl.changePassword);
userRouter.post('/avatar',        protect, userCtrl.uploadAvatar);
userRouter.get('/leaderboard',    userCtrl.leaderboard);
userRouter.get('/:userId/public', userCtrl.publicProfile);

// ============================================================
// routes/jobs.js
// ============================================================
const jobRouter = express.Router();
const jobCtrl   = require('../controllers/jobController');

jobRouter.get('/',           optionalAuth, jobCtrl.listJobs);
jobRouter.get('/:jobId',     optionalAuth, jobCtrl.getJob);
jobRouter.post('/',          protect, jobCtrl.createListing);
jobRouter.put('/:jobId',     protect, jobCtrl.updateListing);
jobRouter.delete('/:jobId',  protect, jobCtrl.deleteListing);

// ============================================================
// routes/admin.js
// ============================================================
const adminRouter = express.Router();
const adminCtrl   = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

adminRouter.use(protect, requireAdmin);
adminRouter.get('/stats',              adminCtrl.platformStats);
adminRouter.get('/users',              adminCtrl.listUsers);
adminRouter.put('/users/:id/role',     adminCtrl.updateUserRole);
adminRouter.put('/users/:id/ban',      adminCtrl.banUser);
adminRouter.get('/courses',            adminCtrl.listCourses);
adminRouter.put('/courses/:id/publish',adminCtrl.publishCourse);
adminRouter.get('/payments',           adminCtrl.listPayments);
adminRouter.get('/sessions',           adminCtrl.listSessions);

adminRouter.get('/instructors/pending',        adminCtrl.listPendingInstructors);
adminRouter.put('/instructors/:id/approve',    adminCtrl.approveInstructor);
adminRouter.put('/instructors/:id/reject',     adminCtrl.rejectInstructor);
adminRouter.get('/teacher-codes',              adminCtrl.listTeacherCodes);
adminRouter.post('/teacher-codes',             adminCtrl.createTeacherCode);
adminRouter.put('/teacher-codes/:id/deactivate', adminCtrl.deactivateTeacherCode);

// ============================================================
// routes/notifications.js
// ============================================================
const notifRouter = express.Router();
const notifCtrl   = require('../controllers/notificationController');

notifRouter.get('/',          protect, notifCtrl.list);
notifRouter.put('/:id/read',  protect, notifCtrl.markRead);
notifRouter.put('/read-all',  protect, notifCtrl.markAllRead);

// ── Export all routers ─────────────────────────────────────
const { protect: _protect, optionalAuth: _optAuth } = require('../middleware/auth');

module.exports = {
  aiRouter,
  payRouter,
  certRouter,
  streamRouter,
  communityRouter,
  mentorRouter,
  schoolRouter,
  userRouter,
  jobRouter,
  adminRouter,
  notifRouter,
  liveRouter: router,
};
