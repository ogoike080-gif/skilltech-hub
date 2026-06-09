const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/certificateController');
const { protect } = require('../middleware/auth');

router.post('/',             protect, ctrl.issue);
router.get('/my',            protect, ctrl.myCertificates);
router.get('/verify/:token', ctrl.verify);

module.exports = router;
