const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/',         protect, ctrl.list);
router.put('/:id/read', protect, ctrl.markRead);
router.put('/read-all', protect, ctrl.markAllRead);

module.exports = router;
