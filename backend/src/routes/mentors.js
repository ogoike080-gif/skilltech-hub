const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mentorController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/',                       optionalAuth, ctrl.listMentors);
router.get('/:mentorId',              optionalAuth, ctrl.getMentor);
router.post('/profile',               protect, ctrl.createProfile);
router.put('/availability',           protect, ctrl.setAvailability);
router.get('/:mentorId/slots',        protect, ctrl.getAvailableSlots);
router.post('/book',                  protect, ctrl.bookSession);
router.get('/bookings/my',            protect, ctrl.myBookings);
router.post('/bookings/:id/complete', protect, ctrl.completeSession);

module.exports = router;
