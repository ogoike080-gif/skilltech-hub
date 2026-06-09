const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getRedis } = require('../config/redis');
const { logger } = require('../utils/logger');

// ── Socket auth middleware ─────────────────────────────────

function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    next(new Error('Invalid token'));
  }
}

// ── Main socket setup ──────────────────────────────────────

function setupSocketHandlers(io) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const { userId, role } = socket.user;
    logger.info(`Socket connected: ${userId}`);

    // ── Join personal room ───────────────────────────────
    socket.join(`user:${userId}`);

    // ── Join course rooms (for enrolled students) ────────
    socket.on('join:courses', async () => {
      try {
        const enrollments = await query(
          'SELECT course_id FROM enrollments WHERE user_id = ?',
          [userId]
        );
        for (const e of enrollments) {
          socket.join(`course:${e.course_id}`);
        }
      } catch (err) {
        logger.error('Socket join courses error:', err);
      }
    });

    // ── Live session room ────────────────────────────────
    socket.on('session:join', async ({ sessionId }) => {
      try {
        const [session] = await query(
          'SELECT id, instructor_id FROM live_sessions WHERE id = ? AND status IN ("scheduled","live")',
          [sessionId]
        );
        if (!session) return socket.emit('error', { message: 'Session not found' });

        socket.join(`session:${sessionId}`);
        socket.sessionId = sessionId;
        socket.isInstructor = session.instructor_id === userId;

        // Track participant
        const redis = getRedis();
        await redis.sAdd(`session:${sessionId}:participants`, userId);
        const count = await redis.sCard(`session:${sessionId}:participants`);

        // Broadcast updated count
        io.to(`session:${sessionId}`).emit('session:participants', { count });

        socket.emit('session:joined', { sessionId, isInstructor: socket.isInstructor });
        logger.info(`User ${userId} joined session ${sessionId}`);
      } catch (err) {
        logger.error('Session join error:', err);
      }
    });

    // ── Session leave ────────────────────────────────────
    socket.on('session:leave', async ({ sessionId }) => {
      socket.leave(`session:${sessionId}`);
      await updateParticipantCount(io, sessionId, userId, 'remove');
    });

    // ── Classroom chat ───────────────────────────────────
    socket.on('chat:message', async ({ sessionId, message, type = 'chat' }) => {
      if (!message?.trim() || message.length > 1000) return;

      const [user] = await query(
        'SELECT first_name, last_name, avatar_url FROM users WHERE id = ?',
        [userId]
      ).catch(() => [null]);

      if (!user) return;

      const msg = {
        id:        `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        userName:  `${user.first_name} ${user.last_name}`,
        avatar:    user.avatar_url,
        message:   message.trim(),
        type,
        role,
        timestamp: new Date().toISOString(),
      };

      io.to(`session:${sessionId}`).emit('chat:message', msg);

      // Persist important messages to Redis (last 200)
      const redis = getRedis();
      await redis.lPush(`session:${sessionId}:chat`, JSON.stringify(msg));
      await redis.lTrim(`session:${sessionId}:chat`, 0, 199);
    });

    // ── Raise hand ───────────────────────────────────────
    socket.on('classroom:raise-hand', ({ sessionId }) => {
      io.to(`session:${sessionId}`).emit('classroom:hand-raised', { userId, timestamp: Date.now() });
    });

    socket.on('classroom:lower-hand', ({ sessionId }) => {
      io.to(`session:${sessionId}`).emit('classroom:hand-lowered', { userId });
    });

    // ── Reactions / emoji ────────────────────────────────
    socket.on('classroom:reaction', async ({ sessionId, emoji }) => {
      const allowed = ['👍', '❤️', '😂', '🔥', '👏', '🎉', '😮', '🤔'];
      if (!allowed.includes(emoji)) return;

      const [user] = await query('SELECT first_name FROM users WHERE id = ?', [userId]).catch(() => [null]);

      io.to(`session:${sessionId}`).emit('classroom:reaction', {
        userId,
        userName: user?.first_name || 'Student',
        emoji,
        timestamp: Date.now(),
      });
    });

    // ── Poll ─────────────────────────────────────────────
    socket.on('classroom:poll:create', ({ sessionId, question, options }) => {
      if (!socket.isInstructor) return;

      const poll = {
        id:       `poll_${Date.now()}`,
        question, options,
        votes:    {},
        createdAt: Date.now(),
      };

      io.to(`session:${sessionId}`).emit('classroom:poll:new', poll);
    });

    socket.on('classroom:poll:vote', ({ sessionId, pollId, optionIndex }) => {
      io.to(`session:${sessionId}`).emit('classroom:poll:voted', {
        pollId, userId, optionIndex,
      });
    });

    // ── Whiteboard ───────────────────────────────────────
    socket.on('whiteboard:draw', ({ sessionId, data }) => {
      socket.to(`session:${sessionId}`).emit('whiteboard:draw', { userId, data });
    });

    socket.on('whiteboard:clear', ({ sessionId }) => {
      if (!socket.isInstructor) return;
      io.to(`session:${sessionId}`).emit('whiteboard:cleared');
    });

    // ── Breakout rooms ───────────────────────────────────
    socket.on('breakout:create', ({ sessionId, rooms }) => {
      if (!socket.isInstructor) return;
      io.to(`session:${sessionId}`).emit('breakout:created', { rooms });
    });

    socket.on('breakout:join', ({ sessionId, roomId }) => {
      socket.join(`breakout:${sessionId}:${roomId}`);
      io.to(`breakout:${sessionId}:${roomId}`).emit('breakout:user-joined', { userId });
    });

    // ── Q&A session ──────────────────────────────────────
    socket.on('qa:submit', async ({ sessionId, question }) => {
      if (!question?.trim()) return;

      const [user] = await query('SELECT first_name, last_name FROM users WHERE id = ?', [userId]).catch(() => [null]);

      const qa = {
        id:        `qa_${Date.now()}`,
        userId,
        userName:  user ? `${user.first_name} ${user.last_name}` : 'Student',
        question:  question.trim(),
        timestamp: Date.now(),
        upvotes:   0,
        answered:  false,
      };

      io.to(`session:${sessionId}`).emit('qa:question', qa);
    });

    socket.on('qa:answer', ({ sessionId, questionId, answer }) => {
      if (!socket.isInstructor) return;
      io.to(`session:${sessionId}`).emit('qa:answered', { questionId, answer, timestamp: Date.now() });
    });

    // ── Code collaboration ───────────────────────────────
    socket.on('code:change', ({ sessionId, code, language, userId: editUserId }) => {
      socket.to(`session:${sessionId}`).emit('code:change', { code, language, userId: editUserId });
    });

    socket.on('code:cursor', ({ sessionId, position }) => {
      socket.to(`session:${sessionId}`).emit('code:cursor', { userId, position });
    });

    // ── Streaming chat aggregation ───────────────────────
    socket.on('stream:chat', ({ sessionId, platform, message, author }) => {
      // Broadcast aggregated external platform messages to session
      io.to(`session:${sessionId}`).emit('stream:chat', {
        platform, message, author, timestamp: Date.now(),
      });
    });

    // ── Community notifications ──────────────────────────
    socket.on('community:join', ({ categoryId }) => {
      socket.join(`community:${categoryId}`);
    });

    // ── Typing indicators ────────────────────────────────
    socket.on('chat:typing', ({ sessionId }) => {
      socket.to(`session:${sessionId}`).emit('chat:typing', { userId });
    });

    socket.on('chat:stop-typing', ({ sessionId }) => {
      socket.to(`session:${sessionId}`).emit('chat:stop-typing', { userId });
    });

    // ── Disconnect ───────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${userId}`);
      if (socket.sessionId) {
        await updateParticipantCount(io, socket.sessionId, userId, 'remove');
      }
    });
  });

  // ── Notification broadcaster (called from controllers) ───
  io.notifyUser = (userId, notification) => {
    io.to(`user:${userId}`).emit('notification', notification);
  };

  io.broadcastToSession = (sessionId, event, data) => {
    io.to(`session:${sessionId}`).emit(event, data);
  };
}

// ── Helper ─────────────────────────────────────────────────

async function updateParticipantCount(io, sessionId, userId, action) {
  try {
    const redis = getRedis();
    if (action === 'remove') {
      await redis.sRem(`session:${sessionId}:participants`, userId);
    }
    const count = await redis.sCard(`session:${sessionId}:participants`);
    io.to(`session:${sessionId}`).emit('session:participants', { count });
  } catch (err) {
    logger.warn('Participant count update failed:', err.message);
  }
}

module.exports = { setupSocketHandlers };
