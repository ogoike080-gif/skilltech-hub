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

module.exports = router;
