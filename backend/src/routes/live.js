const liveController = require('../controllers/liveController');
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/liveController');
const { protect, requireInstructor, requireApprovedInstructor } = require('../middleware/auth');

router.get('/',                      ctrl.listSessions);
router.post('/',                     protect, requireApprovedInstructor, ctrl.schedule);
router.get('/:sessionId/token',      protect, ctrl.getJoinToken);
router.post('/:sessionId/verify-code', protect, ctrl.verifySessionCode);
router.post('/:sessionId/start',     protect, requireInstructor, ctrl.startSession);
router.post('/:sessionId/end',       protect, requireInstructor, ctrl.endSession);
router.post('/webhook/livekit',      ctrl.livekitWebhook);

router.get('/lookup/:meetingCode', liveController.lookupByCode);

// Students: join a live session using meeting code + passcode
router.post('/join', protect, liveController.joinByCode);

// Students should NEVER have access to /start or /end — only instructors/admins.

module.exports = router;
