// ADD these routes to backend/src/routes/live.js
// (keep all existing routes — these are additions)

// Students: look up a session by its public meeting code (no auth needed
// to preview, but joining requires login via the existing `protect` middleware)
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
