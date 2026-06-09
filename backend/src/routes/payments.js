const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/stripe/checkout',     protect, ctrl.stripeCheckout);
router.post('/webhook/stripe',      ctrl.stripeWebhook);
router.post('/paystack/initialize', protect, ctrl.paystackInitialize);
router.post('/webhook/paystack',    ctrl.paystackWebhook);
router.get('/my-payments',          protect, ctrl.myPayments);
router.get('/revenue-stats',        protect, ctrl.revenueStats);

module.exports = router;
