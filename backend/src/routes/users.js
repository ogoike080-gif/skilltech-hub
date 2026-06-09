const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/dashboard',      protect, ctrl.dashboard);
router.put('/profile',        protect, ctrl.updateProfile);
router.put('/password',       protect, ctrl.changePassword);
router.post('/avatar',        protect, upload.single('avatar'), ctrl.uploadAvatar);
router.get('/leaderboard',    ctrl.leaderboard);
router.get('/:userId/public', ctrl.publicProfile);

module.exports = router;
