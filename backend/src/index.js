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

// ── CRITICAL: Trust Railway's reverse proxy ─────────────────
app.set('trust proxy', 1);

// ── CORS: build an allow-list so multiple known frontends work ──
// Accepts CLIENT_URL plus any *.railway.app preview/staging domains,
// and falls back gracefully instead of silently blocking everything.
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

const corsOptionsDelegate = (origin, callback) => {
  // No origin = same-origin / curl / server-to-server — allow it
  if (!origin) return callback(null, true);

  const isAllowed =
    allowedOrigins.includes(origin) ||
    /\.railway\.app$/.test(new URL(origin).hostname); // allow any railway.app subdomain

  if (isAllowed) {
    callback(null, true);
  } else {
    logger.warn(`[CORS] Blocked origin: ${origin}`);
    callback(null, false);
  }
};

// ── Socket.io ──────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: corsOptionsDelegate, methods: ['GET', 'POST'], credentials: true },
});
setupSocketHandlers(io);
app.set('io', io);

// ── Security ───────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: corsOptionsDelegate,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Explicitly handle preflight for all routes
app.options('*', cors({ origin: corsOptionsDelegate, credentials: true }));

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
  clientUrl: process.env.CLIENT_URL || 'NOT SET',
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
app.use('/api/diagnostics', require('./routes/diagnostics'));
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
    logger.info(`   Local:      http://localhost:${PORT}`);
    logger.info(`   Health:     http://localhost:${PORT}/health`);
    logger.info(`   Mode:       ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   CLIENT_URL: ${process.env.CLIENT_URL || '⚠️  NOT SET — CORS will block frontend!'}`);
    logger.info('');
  });
}

bootstrap();
module.exports = { app, server, io };
