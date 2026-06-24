const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const passport = require('passport');


const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { logger } = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { setupSocketHandlers } = require('./socket');

// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const schoolRoutes = require('./routes/schools');
const lessonRoutes = require('./routes/lessons');
const liveRoutes = require('./routes/live');
const streamRoutes = require('./routes/streaming');
const assessmentRoutes = require('./routes/assessments');
const certificateRoutes = require('./routes/certificates');
const paymentRoutes = require('./routes/payments');
const mentorRoutes = require('./routes/mentors');
const communityRoutes = require('./routes/community');
const jobRoutes = require('./routes/jobs');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const notifRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// ─────────────────────────────────────────────────────────────
// TRUST PROXY (Railway)
// ─────────────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ─────────────────────────────────────────────────────────────
// SECURITY
// ─────────────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'https://skilltech-hub-frontend-production.up.railway.app',
  'http://localhost:3000',
  'http://localhost:5173',
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server, Postman, curl
    if (!origin) return callback(null, true);

    try {
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.railway.app');

      if (isAllowed) {
        return callback(null, true);
      }

      logger.warn(`[CORS] Blocked Origin: ${origin}`);

      return callback(
        new Error(`Origin ${origin} not allowed by CORS`)
      );
    } catch (err) {
      logger.error('[CORS ERROR]', err);
      return callback(err);
    }
  },

  credentials: true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ─────────────────────────────────────────────────────────────
// SOCKET.IO
// ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

setupSocketHandlers(io);
app.set('io', io);

// ─────────────────────────────────────────────────────────────
// REQUEST LOGGER
// ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// ─────────────────────────────────────────────────────────────
// WEBHOOK RAW BODIES
// MUST COME BEFORE express.json()
// ─────────────────────────────────────────────────────────────
app.use(
  '/api/payments/webhook/stripe',
  express.raw({ type: 'application/json' })
);

app.use(
  '/api/payments/webhook/paystack',
  express.raw({ type: 'application/json' })
);

// ─────────────────────────────────────────────────────────────
// BODY PARSERS
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// ─────────────────────────────────────────────────────────────
// MORGAN LOGGER
// ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─────────────────────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
  })
);

app.use(
  '/api/ai',
  rateLimit({
    windowMs: 60 * 1000,
    max: 40,
  })
);

// ─────────────────────────────────────────────────────────────
// PASSPORT
// ─────────────────────────────────────────────────────────────
require('./config/passport')(passport);
app.use(passport.initialize());

// ─────────────────────────────────────────────────────────────
// HEALTH CHECKS
// ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    clientUrl: process.env.CLIENT_URL || 'NOT SET',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/streaming', streamRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notifRoutes);

// Optional diagnostics route
try {
  app.use(
    '/api/diagnostics',
    require('./routes/diagnostics')
  );
} catch (err) {
  logger.warn('Diagnostics route not found');
}

// ─────────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    await connectDB();
    logger.info('✅ MySQL connected');
  } catch (err) {
    logger.error('❌ MySQL connection failed:', err);
    process.exit(1);
  }

  try {
    await connectRedis();
    logger.info('✅ Redis connected');
  } catch (err) {
    logger.warn(
      '⚠️ Redis unavailable - using memory fallback'
    );
  }

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    logger.info('');
    logger.info('🚀 SkillTech Hub API running');
    logger.info(`Local:  http://localhost:${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/health`);
    logger.info(`Mode:   ${process.env.NODE_ENV}`);
    logger.info(
      `CLIENT_URL: ${process.env.CLIENT_URL || 'NOT SET'}`
    );
    logger.info('');
  });
}

bootstrap();

module.exports = {
  app,
  server,
  io,
};