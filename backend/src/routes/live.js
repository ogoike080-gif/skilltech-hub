const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/liveController');
const { protect, requireInstructor } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Ensure uploads folder exists
fs.mkdirSync('uploads', { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads');
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB
  }
});

// =============================
// Live Session Routes
// =============================

router.get('/', protect, ctrl.listSessions);

router.post(
  '/',
  protect,
  requireInstructor,
  ctrl.schedule
);

router.get(
  '/my-sessions',
  protect,
  requireInstructor,
  ctrl.mySessions
);

router.get(
  '/lookup/:meetingCode',
  ctrl.lookupByCode
);

router.post(
  '/join',
  protect,
  ctrl.joinByCode
);

router.get(
  '/:sessionId/token',
  protect,
  ctrl.getJoinToken
);

router.post(
  '/:sessionId/verify-code',
  protect,
  ctrl.verifySessionCode
);

router.post(
  '/:sessionId/start',
  protect,
  requireInstructor,
  ctrl.startSession
);

router.post(
  '/:sessionId/end',
  protect,
  requireInstructor,
  ctrl.endSession
);

router.post(
  '/:sessionId/start-recording',
  protect,
  requireInstructor,
  ctrl.startRecording
);

router.post(
  '/:sessionId/stop-recording',
  protect,
  requireInstructor,
  ctrl.stopRecording
);

router.post(
  '/:sessionId/process-recording',
  protect,
  requireInstructor,
  ctrl.processRecordingManually
);

router.post(
  '/:sessionId/upload-recording',
  protect,
  requireInstructor,
  upload.single('recording'),
  ctrl.uploadRecording
);

router.post(
  '/webhook/livekit',
  ctrl.livekitWebhook
);




module.exports = router;

// ============================================================
// ADD TO routes/live.js — one new line before module.exports
// ============================================================
router.post('/:sessionId/save-recording', protect, requireInstructor, ctrl.saveRecording);
