const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/jobController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/',          optionalAuth, ctrl.listJobs);
router.get('/:jobId',    optionalAuth, ctrl.getJob);
router.post('/',         protect, ctrl.createListing);
router.put('/:jobId',    protect, ctrl.updateListing);
router.delete('/:jobId', protect, ctrl.deleteListing);

module.exports = router;
