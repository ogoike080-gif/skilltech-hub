const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const { query } = require('../config/database');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../services/email');
const { logger } = require('../utils/logger');
const { AppError } = require('../utils/errors');

// ── Token generation ───────────────────────────────────────

function generateTokens(userId, role) {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    }
  );

  const refreshToken = jwt.sign(
    { userId, role },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }
  );

  return { accessToken, refreshToken };
}

async function saveRefreshToken(userId, token) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await query(
    `INSERT INTO refresh_tokens
      (id, user_id, token, expires_at)
     VALUES (?, ?, ?, ?)`,
    [uuidv4(), userId, token, expiresAt]
  );
}

// ── Register ───────────────────────────────────────────────

// FIXED REGISTER FUNCTION FOR authController.js

exports.register = async (req, res, next) => {
  try {
    let {
      firstName,
      lastName,
      email,
      password,
      role,
      preferredSchoolId,
    } = req.body;

    if (!firstName || !lastName || !email || !password) {
      throw new AppError(
        'First name, last name, email and password are required',
        400
      );
    }

    email = email.trim().toLowerCase();

    const [existing] = await query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    const verifyToken = uuidv4();

    await query(
      `INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        preferred_school_id,
        verify_token,
        oauth_provider,
        is_active,
        is_verified
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, FALSE)`,
      [
        userId,
        email,
        passwordHash,
        firstName,
        lastName,
        role || 'student',
        preferredSchoolId || null,
        verifyToken,
        'local'
      ]
    );

    sendWelcomeEmail({
      email,
      firstName,
      verifyToken
    }).catch(err => {
      logger.warn('Welcome email failed:', err.message);
    });

    const { accessToken, refreshToken } = generateTokens(
      userId,
      role || 'student'
    );

    await saveRefreshToken(userId, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { accessToken, refreshToken }
    });

  } catch (err) {
    next(err);
  }
};


// ── Login ──────────────────────────────────────────────────

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const [user] = await query(
      `SELECT
          id,
          email,
          password_hash,
          first_name,
          last_name,
          role,
          is_active,
          is_verified,
          avatar_url
       FROM users
       WHERE email = ?
       AND oauth_provider = 'local'`,
      [email.trim().toLowerCase()]
    );

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.is_active) {
      throw new AppError(
        'Account suspended. Contact support.',
        403
      );
    }

    const valid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!valid) {
      throw new AppError('Invalid email or password', 401);
    }

    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.role
    );

    await saveRefreshToken(user.id, refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          avatarUrl: user.avatar_url,
          isVerified: user.is_verified,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Refresh Token ──────────────────────────────────────────

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token required', 400);
    }

    let payload;

    try {
      payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch (err) {
      throw new AppError(
        'Invalid or expired refresh token',
        401
      );
    }

    const [stored] = await query(
      `SELECT id
       FROM refresh_tokens
       WHERE user_id = ?
       AND token = ?
       AND expires_at > NOW()`,
      [payload.userId, refreshToken]
    );

    if (!stored) {
      throw new AppError(
        'Refresh token not found or expired',
        401
      );
    }

    await query(
      'DELETE FROM refresh_tokens WHERE id = ?',
      [stored.id]
    );

    const tokens = generateTokens(
      payload.userId,
      payload.role
    );

    await saveRefreshToken(
      payload.userId,
      tokens.refreshToken
    );

    res.json({
      success: true,
      data: tokens,
    });
  } catch (err) {
    next(err);
  }
};

// ── Logout ─────────────────────────────────────────────────

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await query(
        'DELETE FROM refresh_tokens WHERE token = ?',
        [refreshToken]
      );
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ── Verify Email ───────────────────────────────────────────

exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const [user] = await query(
      'SELECT id FROM users WHERE verify_token = ?',
      [token]
    );

    if (!user) {
      throw new AppError(
        'Invalid or expired verification token',
        400
      );
    }

    await query(
      `UPDATE users
       SET is_verified = TRUE,
           verify_token = NULL
       WHERE id = ?`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ── Forgot Password ────────────────────────────────────────

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const [user] = await query(
      `SELECT id, first_name
       FROM users
       WHERE email = ?
       AND oauth_provider = 'local'`,
      [email.trim().toLowerCase()]
    );

    if (user) {
      const resetToken = uuidv4();

      const expires = new Date(
        Date.now() + 60 * 60 * 1000
      );

      await query(
        `UPDATE users
         SET reset_token = ?,
             reset_token_expires = ?
         WHERE id = ?`,
        [resetToken, expires, user.id]
      );

      sendPasswordResetEmail({
        email,
        firstName: user.first_name,
        resetToken,
      }).catch((err) => {
        logger.warn('Reset email failed:', err.message);
      });
    }

    res.json({
      success: true,
      message:
        'If that email exists, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ── Reset Password ─────────────────────────────────────────

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const [user] = await query(
      `SELECT id
       FROM users
       WHERE reset_token = ?
       AND reset_token_expires > NOW()`,
      [token]
    );

    if (!user) {
      throw new AppError(
        'Invalid or expired reset token',
        400
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `UPDATE users
       SET password_hash = ?,
           reset_token = NULL,
           reset_token_expires = NULL
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    await query(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [user.id]
    );

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (err) {
    next(err);
  }
};

// ── OAuth Callback ─────────────────────────────────────────

exports.oauthCallback = () => async (req, res) => {
  try {
    const user = req.user;

    const { accessToken, refreshToken } =
      generateTokens(user.id, user.role);

    await saveRefreshToken(user.id, refreshToken);

    const redirect =
      `${process.env.CLIENT_URL}/auth/callback?` +
      `access=${accessToken}&refresh=${refreshToken}`;

    res.redirect(redirect);
  } catch (err) {
    logger.error(err);
    res.redirect(`${process.env.CLIENT_URL}/auth/error`);
  }
};

// ── Current User ───────────────────────────────────────────

exports.me = async (req, res, next) => {
  try {
    const [user] = await query(
      `SELECT
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          role,
          bio,
          headline,
          website_url,
          linkedin_url,
          github_url,
          subscription_tier,
          is_verified,
          created_at
       FROM users
       WHERE id = ?`,
      [req.user.userId]
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};