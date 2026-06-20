const liveController = require('../controllers/liveController');
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/liveController');
const { protect, requireInstructor } = require('../middleware/auth');

router.get('/',                      ctrl.listSessions);
router.post('/',                     protect, requireInstructor, ctrl.schedule);
router.get('/:sessionId/token',      protect, ctrl.getJoinToken);
router.post('/:sessionId/start',     protect, requireInstructor, ctrl.startSession);
router.post('/:sessionId/end',       protect, requireInstructor, ctrl.endSession);
router.post('/webhook/livekit',      ctrl.livekitWebhook);


router.get('/lookup/:meetingCode', liveController.lookupByCode);

// Students: join a live session using meeting code + passcode
router.post('/join', protect, liveController.joinByCode);

// Make sure these EXISTING routes stay restricted to the instructor only
// (they already should be, just confirming the pattern):
//   router.post('/schedule',          protect, requireRole('instructor','admin'), liveController.schedule);
//   router.post('/:sessionId/start',  protect, requireRole('instructor','admin'), liveController.startSession);
//   router.post('/:sessionId/end',    protect, requireRole('instructor','admin'), liveController.endSession);
//
// Students should NEVER have access to /start or /end — only instructors/admins.


module.exports = router;
