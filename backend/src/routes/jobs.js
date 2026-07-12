const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/jobController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/',          optionalAuth, ctrl.listJobs);
router.get('/:jobId',    optionalAuth, ctrl.getJob);
router.post('/',         protect, ctrl.createListing);
router.put('/:jobId',    protect, ctrl.updateListing);
router.delete('/:jobId', protect, ctrl.deleteListing);

router.post('/:jobId/apply',                    protect, ctrl.applyForJob);
router.get('/my-applications',                  protect, ctrl.myApplications);
router.get('/:jobId/applicants',                protect, ctrl.getApplicants);
router.put('/:jobId/applicants/:applicationId', protect, ctrl.updateApplicationStatus);
router.get('/:jobId/match',                     protect, ctrl.getAiMatch);

module.exports = router;

