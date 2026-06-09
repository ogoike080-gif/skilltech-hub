const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/streamingController');
const { protect } = require('../middleware/auth');

router.get('/connections',            protect, ctrl.myConnections);
router.post('/connections',           protect, ctrl.connectPlatform);
router.post('/start',                 protect, ctrl.startMultistream);
router.post('/:sessionId/stop',       protect, ctrl.stopMultistream);
router.get('/:sessionId/analytics',  protect, ctrl.streamAnalytics);
router.get('/:sessionId/rtmp',       protect, ctrl.getRtmpIngest);

module.exports = router;
