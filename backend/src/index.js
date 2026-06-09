const express = require('express');
const http    = require('http');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const passport  = require('passport');
require('dotenv').config();

const { connectDB }          = require('./config/database');
const { connectRedis }       = require('./config/redis');
const { logger }             = require('./utils/logger');
const { errorHandler }       = require('./middleware/errorHandler');
const { setupSocketHandlers } = require('./socket');

// Routes
const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const courseRoutes      = require('./routes/courses');
const schoolRoutes      = require('./routes/schools');
const lessonRoutes      = require('./routes/lessons');
const liveRoutes        = require('./routes/live');
const streamRoutes      = require('./routes/streaming');
const assessmentRoutes  = require('./routes/assessments');
const certificateRoutes = require('./routes/certificates');
const paymentRoutes     = require('./routes/payments');
const mentorRoutes      = require('./routes/mentors');
const communityRoutes   = require('./routes/community');
const jobRoutes         = require('./routes/jobs');
const aiRoutes          = require('./routes/ai');
const adminRoutes       = require('./routes/admin');
const notifRoutes       = require('./routes/notifications');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ──────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST'], credentials: true },
});
setupSocketHandlers(io);
app.set('io', io);

// ── Security ───────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

// Raw body for webhooks (must be before json parser)
app.use('/api/payments/webhook/stripe',   express.raw({ type: 'application/json' }));
app.use('/api/payments/webhook/paystack', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting ──────────────────────────────────────────
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }));
app.use('/api/ai',   rateLimit({ windowMs: 60 * 1000, max: 40 }));

// ── Passport ───────────────────────────────────────────────
require('./config/passport')(passport);
app.use(passport.initialize());

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(),
}));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/schools',       schoolRoutes);
app.use('/api/courses',       courseRoutes);
app.use('/api/lessons',       lessonRoutes);
app.use('/api/live',          liveRoutes);
app.use('/api/streaming',     streamRoutes);
app.use('/api/assessments',   assessmentRoutes);
app.use('/api/certificates',  certificateRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/mentors',       mentorRoutes);
app.use('/api/community',     communityRoutes);
app.use('/api/jobs',          jobRoutes);
app.use('/api/ai',            aiRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notifRoutes);

// ── 404 handler ────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));

// ── Error handler ──────────────────────────────────────────
app.use(errorHandler);

// ── Boot ───────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    logger.info('✅ MySQL connected');
  } catch (err) {
    logger.error('❌ MySQL connection failed:', err.message);
    logger.error('   Make sure XAMPP MySQL is running and DB_PASSWORD is correct in .env');
    process.exit(1);
  }

  try {
    await connectRedis();
  } catch (err) {
    logger.warn('⚠️  Redis not available — using memory fallback');
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    logger.info('');
    logger.info('🚀 SkillTech Hub API is running!');
    logger.info(`   Local:   http://localhost:${PORT}`);
    logger.info(`   Health:  http://localhost:${PORT}/health`);
    logger.info(`   Mode:    ${process.env.NODE_ENV || 'development'}`);
    logger.info('');
  });
}

bootstrap();
module.exports = { app, server, io };
