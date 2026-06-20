
// Livekit loaded lazily so server starts without credentials
function getLivekit() {
  return require('livekit-server-sdk');
}
const { query } = require('../config/database');
const { getRedis } = require('../config/redis');
const { sendClassReminder } = require('../services/email');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const livekitUrl = process.env.LIVEKIT_URL;
const apiKey     = process.env.LIVEKIT_API_KEY;
const apiSecret  = process.env.LIVEKIT_API_SECRET;


// ADD these new functions to backend/src/controllers/liveController.js
// (keep your existing schedule/getJoinToken/startSession/endSession/listSessions
//  functions — these are ADDITIONS, not replacements, except where noted)

const { v4: uuidv4 } = require('uuid');
// ... (keep your existing requires at the top of the file)

function randomMeetingCode() {
  const n = Math.floor(100000000 + Math.random() * 900000000);
  return String(n);
}
function randomPasscode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── UPDATE your existing `schedule` function: generate code+passcode ──
// Inside exports.schedule, right after `const sessionId = uuidv4();` add:
//
//   const meetingCode = randomMeetingCode();
//   const passcode    = randomPasscode();
//
// Then add meeting_code, passcode to the INSERT INTO live_sessions columns
// and values array (matching positions), e.g.:
//
//   INSERT INTO live_sessions
//     (id, course_id, instructor_id, title, description, scheduled_at,
//      duration_min, livekit_room_id, rtmp_key, max_participants,
//      is_recorded, is_public, price, meeting_code, passcode)
//   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//
// And in the response, return them too:
//   res.status(201).json({
//     success: true,
//     data: { sessionId, livekitRoomId, rtmpKey, meetingCode, passcode },
//   });


// ── NEW: Join by meeting code + passcode (students use this) ──────
// Mount as: POST /api/live/join
// Body: { meetingCode, passcode }
exports.joinByCode = async (req, res, next) => {
  try {
    const { meetingCode, passcode } = req.body;
    const userId = req.user.userId;

    if (!meetingCode || !passcode) {
      throw new AppError('Meeting code and passcode are required', 400);
    }

    const [session] = await query(
      `SELECT ls.*, u.first_name, u.last_name
       FROM live_sessions ls JOIN users u ON u.id = ls.instructor_id
       WHERE ls.meeting_code = ?`,
      [meetingCode.replace(/\s/g, '')]
    );

    if (!session) throw new AppError('Invalid meeting code', 404);
    if (session.passcode !== passcode.toUpperCase()) {
      throw new AppError('Incorrect passcode', 403);
    }
    if (session.status === 'ended')     throw new AppError('This class has ended', 410);
    if (session.status === 'cancelled') throw new AppError('This class was cancelled', 410);
    if (session.status === 'scheduled') throw new AppError('The host has not started this class yet', 425);

    // Students NEVER start a session — only join an already-live one.
    // Re-use the existing getJoinToken logic by redirecting through it:
    req.params.sessionId = session.id;
    return exports.getJoinToken(req, res, next);
  } catch (err) {
    next(err);
  }
};


// ── UPDATE getJoinToken: enforce instructor-only start ─────────────
// Inside your existing exports.getJoinToken, the canPublish grant should
// ALWAYS be tied to isInstructor — confirm this line already exists:
//
//   canPublish: isInstructor,
//
// This already prevents students from broadcasting — good, no change needed
// there. The key addition is that students can only reach this function
// via joinByCode (above) once status === 'live', never via a "start" button.


// ── NEW: Get session info by meeting code (for the "Enter Class" pre-screen) ──
// Mount as: GET /api/live/lookup/:meetingCode
exports.lookupByCode = async (req, res, next) => {
  try {
    const { meetingCode } = req.params;
    const [session] = await query(
      `SELECT ls.id, ls.title, ls.status, ls.scheduled_at, ls.duration_min,
              u.first_name, u.last_name, u.avatar_url
       FROM live_sessions ls JOIN users u ON u.id = ls.instructor_id
       WHERE ls.meeting_code = ?`,
      [meetingCode.replace(/\s/g, '')]
    );
    if (!session) throw new AppError('Invalid meeting code', 404);

    res.json({ success: true, data: session });
  } catch (err) {
    next(err);
  }
};



// ── Schedule a live session ────────────────────────────────

exports.schedule = async (req, res, next) => {
  try {
    const {
      courseId, title, description, scheduledAt,
      durationMin = 60, maxParticipants = 500,
      isRecorded = true, isPublic = false, price = 0,
    } = req.body;

    const sessionId  = uuidv4();
    const livekitRoomId = `room-${sessionId}`;
    const rtmpKey    = `sk_${uuidv4().replace(/-/g, '')}`;

    await query(`
      INSERT INTO live_sessions
        (id, course_id, instructor_id, title, description, scheduled_at,
         duration_min, livekit_room_id, rtmp_key, max_participants,
         is_recorded, is_public, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId, courseId || null, req.user.userId, title, description,
      new Date(scheduledAt), durationMin, livekitRoomId, rtmpKey,
      maxParticipants, isRecorded ? 1 : 0, isPublic ? 1 : 0, price
    ]);

    // Queue reminders (in production, use Bull/BullMQ)
    scheduleReminders(sessionId, title, new Date(scheduledAt));

    res.status(201).json({
      success: true,
      data: { sessionId, livekitRoomId, rtmpKey },
    });
  } catch (err) {
    next(err);
  }
};

// ── Get session join token ─────────────────────────────────

exports.getJoinToken = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const [session] = await query(
      `SELECT ls.*, u.first_name, u.last_name
       FROM live_sessions ls JOIN users u ON u.id = ls.instructor_id
       WHERE ls.id = ?`,
      [sessionId]
    );
    if (!session) throw new AppError('Session not found', 404);
    if (session.status === 'ended') throw new AppError('Session has ended', 410);
    if (session.status === 'cancelled') throw new AppError('Session was cancelled', 410);

    // Check access
    const isInstructor = session.instructor_id === userId;
    if (!isInstructor && !session.is_public) {
      if (session.course_id) {
        const [enrolled] = await query(
          'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
          [userId, session.course_id]
        );
        if (!enrolled && session.price > 0) {
          throw new AppError('Purchase required to join this session', 402);
        }
      }
    }

    // Build Livekit token
    const [user] = await query(
      'SELECT first_name, last_name, avatar_url FROM users WHERE id = ?',
      [userId]
    );

    const { AccessToken } = getLivekit();
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: `${user.first_name} ${user.last_name}`,
    });

    at.addGrant({
      roomJoin:      true,
      room:          session.livekit_room_id,
      canPublish:    isInstructor,
      canSubscribe:  true,
      canPublishData: true,
      roomRecord:    isInstructor,
    });

    const token = await at.toJwt();

    // Track participant
    await query(
      `INSERT IGNORE INTO session_participants (id, session_id, user_id) VALUES (?, ?, ?)`,
      [uuidv4(), sessionId, userId]
    ).catch(() => {});

    // Increment current participants in Redis (faster than DB for real-time)
    const redis = getRedis();
    await redis.incr(`session:${sessionId}:participants`);

    res.json({
      success: true,
      data: {
        token,
        serverUrl: livekitUrl,
        session: {
          id: session.id,
          title: session.title,
          isInstructor,
          isRecorded: session.is_recorded,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Start session (instructor) ─────────────────────────────

exports.startSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [session] = await query(
      'SELECT * FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, req.user.userId]
    );
    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== 'scheduled') throw new AppError('Session already started or ended', 400);

    await query(
      'UPDATE live_sessions SET status = "live", started_at = NOW() WHERE id = ?',
      [sessionId]
    );

    // Notify enrolled students via Socket.io
    const io = req.app.get('io');
    if (session.course_id) {
      io.to(`course:${session.course_id}`).emit('session:started', {
        sessionId,
        title: session.title,
      });
    }

    res.json({ success: true, message: 'Session started' });
  } catch (err) {
    next(err);
  }
};

// ── End session ────────────────────────────────────────────

exports.endSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [session] = await query(
      'SELECT * FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, req.user.userId]
    );
    if (!session) throw new AppError('Session not found', 404);

    // Update session durations for participants
    await query(
      `UPDATE session_participants
       SET left_at = NOW(),
           duration_sec = TIMESTAMPDIFF(SECOND, joined_at, NOW())
       WHERE session_id = ? AND left_at IS NULL`,
      [sessionId]
    );

    await query(
      `UPDATE live_sessions
       SET status = 'ended', ended_at = NOW()
       WHERE id = ?`,
      [sessionId]
    );

    // In production: trigger recording processing pipeline here
    if (session.is_recorded) {
      await processRecording(sessionId, session.livekit_room_id);
    }

    const io = req.app.get('io');
    io.to(`session:${sessionId}`).emit('session:ended', { sessionId });

    res.json({ success: true, message: 'Session ended' });
  } catch (err) {
    next(err);
  }
};

// ── List sessions ──────────────────────────────────────────
// Replace the existing `exports.listSessions` function in
// backend/src/controllers/liveController.js with this version.
// Same fix: limit/offset coerced to real integers via parseInt().

// Replace ONLY the exports.listSessions function inside
// backend/src/controllers/liveController.js with this version.
//
// The previous edit accidentally pasted courseController's SQL into this
// function (querying `courses`/`schools` and referencing an undefined
// `whereSQL`/`orderBy`/`params`, then returning an undefined `sessions`
// variable). This version restores the correct live_sessions query with
// the LIMIT/OFFSET interpolation fix applied.

exports.listSessions = async (req, res, next) => {
  try {
    const { status = 'scheduled', page = 1 } = req.query;

    // Force to safe integers — interpolated directly to avoid the
    // mysql2 "Incorrect arguments to mysql_stmt_execute" bug with
    // bound LIMIT/OFFSET placeholders.
    const limit  = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const offset  = (pageNum - 1) * limit;

    const dataSql = `
      SELECT ls.id, ls.title, ls.description, ls.scheduled_at,
             ls.duration_min, ls.status, ls.is_recorded, ls.is_public,
             ls.max_participants, ls.current_participants, ls.price, ls.recording_url,
             u.id AS instructor_id, u.first_name, u.last_name, u.avatar_url,
             c.title AS course_title, c.slug AS course_slug
      FROM live_sessions ls
      JOIN users u ON u.id = ls.instructor_id
      LEFT JOIN courses c ON c.id = ls.course_id
      WHERE ls.status = ?
      ORDER BY ls.scheduled_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const sessions = await query(dataSql, [status]);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};




// ── Update participant count from Livekit webhook ──────────

exports.livekitWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === 'participant_joined') {
      const roomId = event.room?.name;
      if (roomId) {
        await query(
          'UPDATE live_sessions SET current_participants = current_participants + 1 WHERE livekit_room_id = ?',
          [roomId]
        );
      }
    }

    if (event.event === 'participant_left') {
      const roomId = event.room?.name;
      if (roomId) {
        await query(
          'UPDATE live_sessions SET current_participants = GREATEST(0, current_participants - 1) WHERE livekit_room_id = ?',
          [roomId]
        );
      }
    }

    if (event.event === 'egress_ended') {
      // Recording ready — save URL
      const url = event.egressInfo?.fileResults?.[0]?.downloadUrl;
      const roomId = event.room?.name;
      if (url && roomId) {
        await query(
          'UPDATE live_sessions SET recording_url = ? WHERE livekit_room_id = ?',
          [url, roomId]
        );
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error('Livekit webhook error:', err);
    res.sendStatus(500);
  }
};

// ── Helpers ────────────────────────────────────────────────

async function scheduleReminders(sessionId, title, scheduledAt) {
  // In production, use Bull queue with delayed jobs
  // Here we schedule in-process as a simple fallback
  const reminderTimes = [
    { offset: 60 * 60 * 1000, label: '1 hour' },
    { offset: 15 * 60 * 1000, label: '15 minutes' },
  ];

  for (const rt of reminderTimes) {
    const delay = scheduledAt.getTime() - Date.now() - rt.offset;
    if (delay > 0) {
      setTimeout(async () => {
        try {
          const participants = await query(`
            SELECT u.email, u.first_name
            FROM enrollments e JOIN users u ON u.id = e.user_id
            JOIN live_sessions ls ON ls.id = ?
            WHERE e.course_id = ls.course_id
            LIMIT 500
          `, [sessionId]);

          for (const p of participants) {
            await sendClassReminder({ ...p, title, sessionId, timeLabel: rt.label });
          }
        } catch (err) {
          logger.warn('Reminder send failed:', err.message);
        }
      }, delay);
    }
  }
}

async function processRecording(sessionId, roomId) {
  // In production: call Livekit recording API or trigger S3 processing
  logger.info(`Processing recording for session ${sessionId}, room ${roomId}`);
}
