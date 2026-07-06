const express = require('express');
const multer = require('multer');
const router = express.Router();

const ctrl = require('../controllers/userController');
const { protect } = require('../middleware/auth');

const path = require("path");


const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "uploads/");
    },
    filename(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 * 1024
    }
});

// Debug: check which controller functions are missing
console.log('User Controller:', Object.keys(ctrl));

router.get('/dashboard', protect, ctrl.dashboard);
router.put('/profile', protect, ctrl.updateProfile);
router.put('/password', protect, ctrl.changePassword);
router.post('/avatar', protect, upload.single('avatar'), ctrl.uploadAvatar);
router.get('/leaderboard', ctrl.leaderboard);
router.get('/:userId/public', ctrl.publicProfile);
router.get('/motivation', protect, ctrl.getMotivationVideos);

module.exports = router;