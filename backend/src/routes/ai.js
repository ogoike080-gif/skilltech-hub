const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.post('/chat',           protect, ctrl.chat);
router.post('/generate-quiz',  protect, ctrl.generateQuiz);
router.post('/study-plan',     protect, ctrl.getStudyPlan);
router.post('/explain-code',   protect, ctrl.explainCode);
router.get('/conversations',   protect, ctrl.getConversations);

module.exports = router;
