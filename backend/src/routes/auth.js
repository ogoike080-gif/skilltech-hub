const express  = require('express');
const router   = express.Router();
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// ── Email / password auth ──────────────────────────────────
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().notEmpty().withMessage('First name required'),
  body('lastName').trim().notEmpty().withMessage('Last name required'),
], validate, ctrl.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, ctrl.login);

router.post('/refresh',         ctrl.refreshToken);
router.post('/logout',          ctrl.logout);
router.get('/verify/:token',    ctrl.verifyEmail);
router.get('/me',               protect, ctrl.me);
router.post('/forgot-password', [body('email').isEmail()], validate, ctrl.forgotPassword);
router.post('/reset-password',  [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }),
], validate, ctrl.resetPassword);

// ── OAuth routes (only active when credentials are configured) ─
if (process.env.GOOGLE_CLIENT_ID) {
  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );
  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/auth/error' }),
    ctrl.oauthCallback('google')
  );
} else {
  router.get('/google', (req, res) => res.status(503).json({ success: false, message: 'Google OAuth not configured' }));
}

if (process.env.GITHUB_CLIENT_ID) {
  router.get('/github',
    passport.authenticate('github', { scope: ['user:email'], session: false })
  );
  router.get('/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/auth/error' }),
    ctrl.oauthCallback('github')
  );
} else {
  router.get('/github', (req, res) => res.status(503).json({ success: false, message: 'GitHub OAuth not configured' }));
}

module.exports = router;
