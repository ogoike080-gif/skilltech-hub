const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { getRedis } = require('../config/redis');
const { logger } = require('../utils/logger');

// ── Socket auth middleware ─────────────────────────────────

function socketAuth(socket, next) {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    socket.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch (err) {
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

    // ── Join course rooms ────────────────────────────────

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
        logger.error(
          'Socket join courses error:',
          err
        );
      }
    });

    // ── Live session room ────────────────────────────────

    socket.on(
      'session:join',
      async ({ sessionId }) => {
        if (!sessionId) {
          return socket.emit('error', {
            message: 'Invalid session ID',
          });
        }

        try {
          const [session] = await query(
            `SELECT id, instructor_id
             FROM live_sessions
             WHERE id = ?
             AND status IN ("scheduled","live")`,
            [sessionId]
          );

          if (!session) {
            return socket.emit('error', {
              message: 'Session not found',
            });
          }

          socket.join(`session:${sessionId}`);

          socket.sessionId = sessionId;

          socket.isInstructor =
            session.instructor_id === userId;

          const redis = getRedis();

          if (redis) {
            await redis.sAdd(
              `session:${sessionId}:participants`,
              String(userId)
            );

            const count = await redis.sCard(
              `session:${sessionId}:participants`
            );

            io.to(
              `session:${sessionId}`
            ).emit('session:participants', {
              count,
            });
          }

          socket.emit('session:joined', {
            sessionId,
            isInstructor: socket.isInstructor,
          });

          logger.info(
            `User ${userId} joined session ${sessionId}`
          );
        } catch (err) {
          logger.error(
            'Session join error:',
            err
          );
        }
      }
    );

    // ── Session leave ────────────────────────────────────

    socket.on(
      'session:leave',
      async ({ sessionId }) => {
        socket.leave(`session:${sessionId}`);

        await updateParticipantCount(
          io,
          sessionId,
          userId,
          'remove'
        );
      }
    );

    // ── Classroom chat ───────────────────────────────────

    socket.on(
      'chat:message',
      async ({
        sessionId,
        message,
        type = 'chat',
      }) => {
        if (!sessionId) return;

        if (
          !message ||
          !message.trim() ||
          message.length > 1000
        ) {
          return;
        }

        try {
          const [user] = await query(
            `SELECT first_name,
                    last_name,
                    avatar_url
             FROM users
             WHERE id = ?`,
            [userId]
          ).catch(() => [null]);

          if (!user) return;

          const msg = {
            id: `msg_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 7)}`,

            userId,

            userName:
              `${user.first_name} ${user.last_name}`,

            avatar: user.avatar_url,

            message: message.trim(),

            type,

            role,

            timestamp: new Date().toISOString(),
          };

          io.to(
            `session:${sessionId}`
          ).emit('chat:message', msg);

          const redis = getRedis();

          if (redis) {
            await redis.lPush(
              `session:${sessionId}:chat`,
              JSON.stringify(msg)
            );

            await redis.lTrim(
              `session:${sessionId}:chat`,
              0,
              199
            );
          }
        } catch (err) {
          logger.error(
            'Chat message error:',
            err
          );
        }
      }
    );

    // ── Raise hand ───────────────────────────────────────

    socket.on(
      'classroom:raise-hand',
      ({ sessionId }) => {
        io.to(
          `session:${sessionId}`
        ).emit(
          'classroom:hand-raised',
          {
            userId,
            timestamp: Date.now(),
          }
        );
      }
    );

    socket.on(
      'classroom:lower-hand',
      ({ sessionId }) => {
        io.to(
          `session:${sessionId}`
        ).emit(
          'classroom:hand-lowered',
          { userId }
        );
      }
    );

    // ── Reactions ────────────────────────────────────────

    socket.on(
      'classroom:reaction',
      async ({ sessionId, emoji }) => {
        const allowed = [
          '👍',
          '❤️',
          '😂',
          '🔥',
          '👏',
          '🎉',
          '😮',
          '🤔',
        ];

        if (!allowed.includes(emoji)) return;

        const [user] = await query(
          'SELECT first_name FROM users WHERE id = ?',
          [userId]
        ).catch(() => [null]);

        io.to(
          `session:${sessionId}`
        ).emit('classroom:reaction', {
          userId,
          userName:
            user?.first_name || 'Student',
          emoji,
          timestamp: Date.now(),
        });
      }
    );

    // ── Typing indicators ────────────────────────────────

    socket.on(
      'chat:typing',
      ({ sessionId }) => {
        socket
          .to(`session:${sessionId}`)
          .emit('chat:typing', {
            userId,
          });
      }
    );

    socket.on(
      'chat:stop-typing',
      ({ sessionId }) => {
        socket
          .to(`session:${sessionId}`)
          .emit('chat:stop-typing', {
            userId,
          });
      }
    );

    // ── Disconnect ───────────────────────────────────────

    socket.on('disconnect', async () => {
      logger.info(
        `Socket disconnected: ${userId}`
      );

      if (socket.sessionId) {
        await updateParticipantCount(
          io,
          socket.sessionId,
          userId,
          'remove'
        );
      }
    });
  });

  // ── Utility methods ────────────────────────────────────

  io.notifyUser = (
    userId,
    notification
  ) => {
    io.to(`user:${userId}`).emit(
      'notification',
      notification
    );
  };

  io.broadcastToSession = (
    sessionId,
    event,
    data
  ) => {
    io.to(`session:${sessionId}`).emit(
      event,
      data
    );
  };
}

// ── Helper ────────────────────────────────────────────────

async function updateParticipantCount(
  io,
  sessionId,
  userId,
  action
) {
  try {
    const redis = getRedis();

    if (!redis) return;

    if (action === 'remove') {
      await redis.sRem(
        `session:${sessionId}:participants`,
        String(userId)
      );
    }

    const count = await redis.sCard(
      `session:${sessionId}:participants`
    );

    io.to(`session:${sessionId}`).emit(
      'session:participants',
      { count }
    );
  } catch (err) {
    logger.warn(
      'Participant count update failed:',
      err.message
    );
  }
}

module.exports = {
  setupSocketHandlers,
};