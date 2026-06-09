const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/assessmentController');
const { protect, requireInstructor } = require('../middleware/auth');

router.get('/course/:courseId',         protect, ctrl.listByCourse);
router.get('/:id',                      protect, ctrl.getAssessment);
router.post('/:id/submit',             protect, ctrl.submitAttempt);
router.get('/:id/attempts',            protect, ctrl.myAttempts);
router.post('/',                        protect, requireInstructor, ctrl.create);
router.post('/:assessmentId/questions', protect, requireInstructor, ctrl.addQuestion);

module.exports = router;
