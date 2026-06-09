const Stripe = require('stripe');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../config/database');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not set in .env');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// ── Stripe: Create checkout session ───────────────────────

exports.stripeCheckout = async (req, res, next) => {
  try {
    const { courseId, sessionId, couponCode } = req.body;
    const userId = req.user.userId;

    let item, itemType, amount;

    if (courseId) {
      const [course] = await query(
        'SELECT id, title, price, currency, thumbnail_url FROM courses WHERE id = ? AND is_published = TRUE',
        [courseId]
      );
      if (!course) throw new AppError('Course not found', 404);
      if (course.price === 0) throw new AppError('Course is free — enroll directly', 400);
      item = course; itemType = 'course'; amount = course.price;
    } else if (sessionId) {
      const [sess] = await query(
        'SELECT id, title, price FROM live_sessions WHERE id = ? AND status = "scheduled"',
        [sessionId]
      );
      if (!sess) throw new AppError('Session not found', 404);
      item = sess; itemType = 'session'; amount = sess.price;
    } else {
      throw new AppError('courseId or sessionId required', 400);
    }

    // Apply coupon
    let discount = 0;
    if (couponCode) {
      const [coupon] = await query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()) AND (max_uses IS NULL OR used_count < max_uses)',
        [couponCode.toUpperCase()]
      );
      if (coupon) {
        discount = coupon.type === 'percent'
          ? (amount * coupon.value) / 100
          : coupon.value;
      }
    }

    const finalAmount = Math.max(0, amount - discount);
    const [user] = await query('SELECT email FROM users WHERE id = ?', [userId]);

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{
        price_data: {
          currency: item.currency || 'usd',
          product_data: { name: item.title },
          unit_amount: Math.round(finalAmount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/payment/cancel`,
      metadata: {
        userId, itemType,
        courseId:  courseId  || '',
        sessionId: sessionId || '',
      },
    });

    // Pre-create payment record
    await query(
      `INSERT INTO payments (id, user_id, course_id, provider, provider_ref, amount, currency, status, type)
       VALUES (?, ?, ?, 'stripe', ?, ?, ?, 'pending', ?)`,
      [uuidv4(), userId, courseId || null, session.id,
       finalAmount, item.currency || 'USD', itemType]
    );

    res.json({ success: true, data: { checkoutUrl: session.url, sessionId: session.id } });
  } catch (err) {
    next(err);
  }
};

// ── Stripe webhook ─────────────────────────────────────────

exports.stripeWebhook = async (req, res) => {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.warn('Stripe webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, itemType, courseId, sessionId } = session.metadata;

    try {
      await transaction(async (conn) => {
        // Update payment record
        await conn.execute(
          'UPDATE payments SET status = "success" WHERE provider_ref = ?',
          [session.id]
        );

        if (itemType === 'course' && courseId) {
          // Enroll user
          await conn.execute(
            'INSERT IGNORE INTO enrollments (id, user_id, course_id) VALUES (?, ?, ?)',
            [uuidv4(), userId, courseId]
          );
          await conn.execute(
            'UPDATE courses SET total_students = total_students + 1 WHERE id = ?',
            [courseId]
          );
        }
      });
    } catch (err) {
      logger.error('Stripe webhook processing error:', err);
      return res.status(500).send('Processing error');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    await query(
      'UPDATE payments SET status = "failed" WHERE provider_ref LIKE ?',
      [`%${pi.id}%`]
    ).catch(err => logger.warn('Payment failed update error:', err.message));
  }

  res.json({ received: true });
};

// ── Paystack: Initialize ───────────────────────────────────

exports.paystackInitialize = async (req, res, next) => {
  try {
    const { courseId, couponCode } = req.body;
    const userId = req.user.userId;

    const [course] = await query(
      'SELECT id, title, price, currency FROM courses WHERE id = ? AND is_published = TRUE',
      [courseId]
    );
    if (!course) throw new AppError('Course not found', 404);

    const [user] = await query('SELECT email FROM users WHERE id = ?', [userId]);

    let amount = course.price;
    if (couponCode) {
      const [coupon] = await query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())',
        [couponCode.toUpperCase()]
      );
      if (coupon) {
        amount = coupon.type === 'percent'
          ? amount - (amount * coupon.value) / 100
          : Math.max(0, amount - coupon.value);
      }
    }

    const reference = `STH-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${process.env.CLIENT_URL}/payment/success`,
        metadata: { userId, courseId, platform: 'skilltech' },
      }),
    });

    const data = await response.json();
    if (!data.status) throw new AppError(data.message || 'Paystack error', 400);

    await query(
      `INSERT INTO payments (id, user_id, course_id, provider, provider_ref, amount, currency, status, type)
       VALUES (?, ?, ?, 'paystack', ?, ?, ?, 'pending', 'course')`,
      [uuidv4(), userId, courseId, reference, amount, course.currency || 'NGN']
    );

    res.json({
      success: true,
      data: { authorizationUrl: data.data.authorization_url, reference },
    });
  } catch (err) {
    next(err);
  }
};

// ── Paystack webhook ───────────────────────────────────────

exports.paystackWebhook = async (req, res) => {
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(400).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());

  if (event.event === 'charge.success') {
    const { reference, metadata } = event.data;
    const { userId, courseId } = metadata;

    try {
      await transaction(async (conn) => {
        await conn.execute(
          'UPDATE payments SET status = "success" WHERE provider_ref = ?',
          [reference]
        );
        if (courseId) {
          await conn.execute(
            'INSERT IGNORE INTO enrollments (id, user_id, course_id) VALUES (?, ?, ?)',
            [uuidv4(), userId, courseId]
          );
          await conn.execute(
            'UPDATE courses SET total_students = total_students + 1 WHERE id = ?',
            [courseId]
          );
        }
      });
    } catch (err) {
      logger.error('Paystack webhook processing error:', err);
    }
  }

  res.sendStatus(200);
};

// ── Payment history ────────────────────────────────────────

exports.myPayments = async (req, res, next) => {
  try {
    const payments = await query(`
      SELECT p.id, p.provider, p.amount, p.currency, p.status, p.type, p.created_at,
             c.title AS course_title, c.thumbnail_url
      FROM payments p
      LEFT JOIN courses c ON c.id = p.course_id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [req.user.userId]);

    res.json({ success: true, data: payments });
  } catch (err) {
    next(err);
  }
};

// ── Admin: revenue stats ───────────────────────────────────

exports.revenueStats = async (req, res, next) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const [totals] = await query(`
      SELECT
        SUM(CASE WHEN status = 'success' THEN amount ELSE 0 END) AS total_revenue,
        COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful_payments,
        COUNT(*) AS total_attempts
      FROM payments
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    const daily = await query(`
      SELECT DATE(created_at) AS date, SUM(amount) AS revenue, COUNT(*) AS transactions
      FROM payments WHERE status = 'success' AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at) ORDER BY date ASC
    `, [days]);

    const byCourse = await query(`
      SELECT c.title, SUM(p.amount) AS revenue, COUNT(*) AS sales
      FROM payments p JOIN courses c ON c.id = p.course_id
      WHERE p.status = 'success' AND p.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.course_id ORDER BY revenue DESC LIMIT 10
    `, [days]);

    res.json({
      success: true,
      data: { totals, daily, byCourse },
    });
  } catch (err) {
    next(err);
  }
};
