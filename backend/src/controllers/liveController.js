const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const { processRecordingMedia } = require('../services/mediaProcessor');

// Livekit loaded lazily so server starts without credentials
function getLivekit() {
  return require('livekit-server-sdk');
}

const { EgressClient } = require('livekit-server-sdk');

function getEgressClient() {
  return new EgressClient(livekitUrl, apiKey, apiSecret);
}

const { query, transaction } = require('../config/database');
const { getRedis } = require('../config/redis');
const { sendClassReminder } = require('../services/email');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

const livekitUrl = process.env.LIVEKIT_URL;
const apiKey     = process.env.LIVEKIT_API_KEY;
const apiSecret  = process.env.LIVEKIT_API_SECRET;

function randomMeetingCode() {
  const n = Math.floor(100000000 + Math.random() * 900000000);
  return String(n);
}
function randomPasscode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Join-grant helpers ──────────────────────────────────────
// A short-lived signed token proving a student verified the
// meeting code + passcode for a specific session. Required by
// getJoinToken for anyone who isn't the session's own instructor.

function issueJoinGrant(sessionId, userId) {
  return jwt.sign(
    { sessionId, userId, purpose: 'live_join' },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
}

function verifyJoinGrant(token, sessionId, userId) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return (
      payload.purpose === 'live_join' &&
      payload.sessionId === sessionId &&
      payload.userId === userId
    );
  } catch {
    return false;
  }
}

// ── Schedule a live session ────────────────────────────────

exports.schedule = async (req, res, next) => {
  try {
    const {
      courseId, title, description, scheduledAt,
      durationMin = 60, maxParticipants = 500,
      isRecorded = true, isPublic = false, price = 0,
    } = req.body;

    const sessionId     = uuidv4();
    const livekitRoomId = `room-${sessionId}`;
    const rtmpKey       = `sk_${uuidv4().replace(/-/g, '')}`;
    const meetingCode   = randomMeetingCode();
    const passcode      = randomPasscode();

    await query(`
      INSERT INTO live_sessions
        (id, course_id, instructor_id, title, description, scheduled_at,
         duration_min, livekit_room_id, rtmp_key, max_participants,
         is_recorded, is_public, price, meeting_code, passcode)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sessionId, courseId || null, req.user.userId, title, description,
      new Date(scheduledAt), durationMin, livekitRoomId, rtmpKey,
      maxParticipants, isRecorded ? 1 : 0, isPublic ? 1 : 0, price,
      meetingCode, passcode
    ]);

    // Queue reminders (in production, use Bull/BullMQ)
    scheduleReminders(sessionId, title, new Date(scheduledAt));

    res.status(201).json({
      success: true,
      data: { sessionId, livekitRoomId, rtmpKey, meetingCode, passcode },
    });
  } catch (err) {
    next(err);
  }
};

// ── Join by meeting code + passcode (students use this) ────
// POST /api/live/join   Body: { meetingCode, passcode }

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

    req.params.sessionId = session.id;
    req.joinGrant = issueJoinGrant(session.id, userId);
    return exports.getJoinToken(req, res, next);
  } catch (err) {
    next(err);
  }
};

// ── Verify a code+passcode for a SPECIFIC session ───────────
// Used when a student lands on /classroom/:id directly (from
// LivePage, dashboard, or a raw URL) and must prove they have
// the code+passcode for THAT session before getting a token.
// POST /api/live/:sessionId/verify-code   Body: { meetingCode, passcode }

exports.verifySessionCode = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { meetingCode, passcode } = req.body;
    const userId = req.user.userId;

    if (!meetingCode || !passcode) {
      throw new AppError('Meeting code and passcode are required', 400);
    }

    const [session] = await query(
      `SELECT id, meeting_code, passcode, status
       FROM live_sessions WHERE id = ?`,
      [sessionId]
    );
    if (!session) throw new AppError('Session not found', 404);

    if (session.meeting_code !== meetingCode.replace(/\s/g, '')) {
      throw new AppError('Meeting code does not match this class', 403);
    }
    if (session.passcode !== passcode.toUpperCase()) {
      throw new AppError('Incorrect passcode', 403);
    }

    const grant = issueJoinGrant(sessionId, userId);
    res.json({ success: true, data: { grant } });
  } catch (err) {
    next(err);
  }
};

// ── Look up a session by meeting code (pre-join preview) ───
// GET /api/live/lookup/:meetingCode

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

    const isInstructor = session.instructor_id === userId;
    const isAdmin = req.user.role === 'admin';

    // ── Enforce code+passcode verification for everyone else ──
    if (!isInstructor && !isAdmin) {
      const grant = req.joinGrant || req.query?.grant;
      if (!verifyJoinGrant(grant, sessionId, userId)) {
        throw new AppError(
          "You must enter this class's meeting code and passcode to join.",
          403
        );
      }
    }

    // Check access (unchanged from before)
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
      canPublish:    true,
      canSubscribe:  true,
      canPublishData: true,
      roomRecord:    isInstructor,
    });

    const token = await at.toJwt();

    await query(
      `INSERT IGNORE INTO session_participants (id, session_id, user_id) VALUES (?, ?, ?)`,
      [uuidv4(), sessionId, userId]
    ).catch(() => {});

    const redis = getRedis();
    await redis.incr(`session:${sessionId}:participants`);

    if (!isInstructor) {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${session.instructor_id}`).emit('live:student-joined', {
          sessionId,
          sessionTitle: session.title,
          studentName: `${user.first_name} ${user.last_name}`,
          studentAvatar: user.avatar_url,
          joinedAt: new Date().toISOString(),
        });
      }

      await query(
        `INSERT INTO notifications
         (id, user_id, type, title, body, action_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          session.instructor_id,
          'info',
          'A student joined your live class',
          `${user.first_name} ${user.last_name} just joined "${session.title}"`,
          `/classroom/${sessionId}`,
        ]
      ).catch(err => {
        logger.error('Notification insert failed:', err);
      });
    }

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

    // Start recording if this session is configured to record.
    // Best-effort: a failure here should not prevent the class
    // from starting — log and move on.
    if (session.is_recorded) {
      try {
        const egress = getEgressClient();
        const egressInfo = await egress.startRoomCompositeEgress(
          session.livekit_room_id,
        {
  fileOutputs: [{
    fileType: 'MP4',
    filepath: `recordings/${session.livekit_room_id}.mp4`,
  }],
}
        );
        await query(
          'UPDATE live_sessions SET egress_id = ? WHERE id = ?',
          [egressInfo.egressId, sessionId]
        ).catch(() => {});
        logger.info(`Started egress recording for room ${session.livekit_room_id}`);
      } catch (err) {
        logger.warn('Failed to start egress recording:', err.message);
      }
    }

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
             ls.meeting_code, ls.passcode,
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

    // Strip meeting_code/passcode for any session that isn't the
    // requester's own (or unless they're an admin). req.user may be
    // undefined here if this route is ever hit without `protect` —
    // treat that as "definitely not the owner" rather than crashing.
    const isAdmin = req.user?.role === 'admin';
    const requesterId = req.user?.userId;

    const sanitized = sessions.map(s => {
      const ownsSession = isAdmin || s.instructor_id === requesterId;
      if (ownsSession) return s;
      const { meeting_code, passcode, ...rest } = s;
      return rest;
    });

    res.json({
      success: true,
      data: sanitized,
    });
  } catch (err) {
    next(err);
  }
};

// ── My sessions (instructor-only) ───────────────────────────
// GET /api/live/my-sessions?status=scheduled|live|ended (optional)

exports.mySessions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const instructorId = req.user.userId;

    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));

    const where = ['ls.instructor_id = ?'];
    const params = [instructorId];

    if (status) {
      where.push('ls.status = ?');
      params.push(status);
    }

    const dataSql = `
      SELECT ls.id, ls.title, ls.description, ls.scheduled_at,
             ls.duration_min, ls.status, ls.is_recorded, ls.is_public,
             ls.max_participants, ls.current_participants, ls.price, ls.recording_url,
             ls.meeting_code, ls.passcode,
             u.id AS instructor_id, u.first_name, u.last_name, u.avatar_url,
             c.title AS course_title, c.slug AS course_slug,
             auto_c.slug AS auto_course_slug, auto_c.title AS auto_course_title
      FROM live_sessions ls
      JOIN users u ON u.id = ls.instructor_id
      LEFT JOIN courses c ON c.id = ls.course_id
      LEFT JOIN courses auto_c ON auto_c.source_live_session_id = ls.id
      WHERE ${where.join(' AND ')}
      ORDER BY ls.status = 'live' DESC, ls.scheduled_at ASC
      LIMIT ${limit}
    `;
    const sessions = await query(dataSql, params);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    next(err);
  }
};


// ============================================================
// ADD TO liveController.js — paste after exports.mySessions
// ============================================================

// Start egress recording manually from inside the classroom.
// POST /api/live/:sessionId/start-recording

exports.startRecording = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [session] = await query(
      'SELECT * FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, req.user.userId]
    );
    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== 'live') throw new AppError('Session must be live to start recording', 400);

    if (session.egress_id) {
      throw new AppError('Recording already in progress', 400);
    }

    const egress = getEgressClient();
    const egressInfo = await egress.startRoomCompositeEgress(
      session.livekit_room_id,
      {
  fileOutputs: [{
    fileType: 'MP4',
    filepath: `recordings/${session.livekit_room_id}.mp4`,
  }],
}
    );

    await query(
      'UPDATE live_sessions SET egress_id = ?, is_recorded = 1 WHERE id = ?',
      [egressInfo.egressId, sessionId]
    );

    logger.info(`Manual recording started for session ${sessionId}, egress ${egressInfo.egressId}`);

    res.json({ success: true, message: 'Recording started', data: { egressId: egressInfo.egressId } });
  } catch (err) {
    next(err);
  }
};

// Stop egress recording manually from inside the classroom.
// POST /api/live/:sessionId/stop-recording

exports.stopRecording = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [session] = await query(
      'SELECT * FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, req.user.userId]
    );
    if (!session) throw new AppError('Session not found', 404);

    if (!session.egress_id) {
      throw new AppError('No active recording to stop', 400);
    }

    const egress = getEgressClient();
    await egress.stopEgress(session.egress_id);

    await query(
      'UPDATE live_sessions SET egress_id = NULL WHERE id = ?',
      [sessionId]
    );

    logger.info(`Manual recording stopped for session ${sessionId}`);

    res.json({ success: true, message: 'Recording stopped. Your video will be processed shortly.' });
  } catch (err) {
    next(err);
  }
};


// ============================================================
// ADD TO routes/live.js — two new lines
// ============================================================

// router.post('/:sessionId/start-recording', protect, requireInstructor, ctrl.startRecording);
// router.post('/:sessionId/stop-recording',  protect, requireInstructor, ctrl.stopRecording);


// ============================================================
// ADD TO liveController.js — paste after exports.mySessions
// ============================================================

// Manual trigger: instructor requests processing of their own
// session's recording (noise removal + captions + course creation).
// Useful when the auto egress_ended webhook didn't fire, or the
// instructor wants to re-trigger after fixing something.
// POST /api/live/:sessionId/process-recording

exports.processRecordingManually = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Only the session's own instructor (or admin) can trigger this
    const [session] = await query(
      `SELECT * FROM live_sessions WHERE id = ?`,
      [sessionId]
    );
    if (!session) throw new AppError('Session not found', 404);

    const isOwner = session.instructor_id === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      throw new AppError('You can only process your own sessions', 403);
    }

    if (!session.recording_url) {
      throw new AppError(
        'No recording available yet. The recording may still be processing on Livekit\'s end.',
        422
      );
    }

    // Check if a course already exists — if so, just re-run the
    // media processing and update the lesson's content_url/caption_url
    // rather than creating a duplicate course.
    const [existingCourse] = await query(
      `SELECT c.id, l.id AS lesson_id
       FROM courses c
       JOIN sections s ON s.course_id = c.id
       JOIN lessons l ON l.section_id = s.id
       WHERE c.source_live_session_id = ?
       LIMIT 1`,
      [sessionId]
    );

    // Run processing (noise removal + captions) — this uploads to
    // Cloudinary, not Railway's ephemeral local disk.
    const { cleanedVideoUrl, captionUrl } = await processRecordingMedia(
      session.recording_url,
      sessionId
    );
    const finalVideoUrl = cleanedVideoUrl || session.recording_url;

    if (existingCourse) {
      // Update existing lesson with freshly processed content
      await query(
        `UPDATE lessons
         SET content_url = ?, caption_url = ?
         WHERE id = ?`,
        [finalVideoUrl, captionUrl, existingCourse.lesson_id]
      );

      res.json({
        success: true,
        message: 'Recording reprocessed and course updated',
        data: { courseId: existingCourse.id, cleanedVideoUrl, captionUrl },
      });
    } else {
      // No course yet — run the full auto-creation pipeline
      await createCourseFromRecordedSession(session.livekit_room_id, session.recording_url);

      // Fetch the newly created course to return its slug
      const [newCourse] = await query(
        'SELECT id, slug FROM courses WHERE source_live_session_id = ?',
        [sessionId]
      );

      res.json({
        success: true,
        message: 'Recording processed and posted to your courses',
        data: { courseId: newCourse?.id, courseSlug: newCourse?.slug, cleanedVideoUrl, captionUrl },
      });
    }
  } catch (err) {
    next(err);
  }
};


// ============================================================
// ADD TO routes/live.js — one new line
// ============================================================

// router.post('/:sessionId/process-recording', protect, requireInstructor, ctrl.processRecordingManually);



// ── Update participant count / recording status from Livekit webhook ──

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
      const url = event.egressInfo?.fileResults?.[0]?.downloadUrl;
      const roomId = event.room?.name;
      if (url && roomId) {
        await query(
          'UPDATE live_sessions SET recording_url = ? WHERE livekit_room_id = ?',
          [url, roomId]
        );

        // Auto-create a course from this recorded session.
        // Best-effort — a failure here must not break webhook
        // processing (Livekit will retry the webhook if we 500).
        try {
          await createCourseFromRecordedSession(roomId, url);
        } catch (err) {
          logger.error('Auto-course-creation failed:', err);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    logger.error('Livekit webhook error:', err);
    res.sendStatus(500);
  }
};

// ── Auto-create a course from a recorded live session ──────
// Runs noise removal + auto-captions on the recording (best-effort),
// then creates a published course + section + lesson pointing at the
// processed (or original, if processing failed) video.

async function createCourseFromRecordedSession(livekitRoomId, recordingUrl) {
  const [session] = await query(
    `SELECT ls.*, u.preferred_school_id AS instructor_preferred_school,
            c.school_id AS linked_course_school_id
     FROM live_sessions ls
     JOIN users u ON u.id = ls.instructor_id
     LEFT JOIN courses c ON c.id = ls.course_id
     WHERE ls.livekit_room_id = ?`,
    [livekitRoomId]
  );

  if (!session) {
    logger.warn(`createCourseFromRecordedSession: no session found for room ${livekitRoomId}`);
    return;
  }

  // Avoid double-creating if this session already produced a course
  // (e.g. webhook redelivery from Livekit's retry behavior).
  const [existing] = await query(
    'SELECT id FROM courses WHERE source_live_session_id = ?',
    [session.id]
  );
  if (existing) {
    logger.info(`Course already exists for session ${session.id}, skipping`);
    return;
  }

  // Determine school: linked course's school first, then instructor's
  // preferred school, otherwise bail (a course requires a school_id).
  const schoolId = session.linked_course_school_id || session.instructor_preferred_school;
  if (!schoolId) {
    logger.warn(`Cannot auto-create course for session ${session.id}: no school could be determined`);
    return;
  }

  // Process the recording: noise removal + auto-captions. Best-effort —
  // if both fail, we still create the course using the original
  // unprocessed recording rather than blocking course creation.
  const { cleanedVideoUrl, captionUrl } = await processRecordingMedia(recordingUrl, session.id);
  const finalVideoUrl = cleanedVideoUrl || recordingUrl;

  const courseId = uuidv4();
  const sectionId = uuidv4();
  const lessonId = uuidv4();
  const slug = `${session.title}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 200);

  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO courses (
        id, school_id, instructor_id, title, slug, description,
        short_desc, level, type, price, currency, is_free,
        is_published, total_lessons, source_live_session_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'beginner', 'self_paced', 0, 'USD', 1, 1, 1, ?)`,
      [
        courseId, schoolId, session.instructor_id, session.title, slug,
        session.description || `Recorded from the live class "${session.title}".`,
        session.description?.slice(0, 500) || null,
        session.id,
      ]
    );

    await conn.execute(
      `INSERT INTO sections (id, course_id, title, sort_order)
       VALUES (?, ?, 'Recording', 0)`,
      [sectionId, courseId]
    );

    await conn.execute(
      `INSERT INTO lessons (
        id, section_id, course_id, title, type, content_url,
        caption_url, sort_order, is_preview, is_published
      ) VALUES (?, ?, ?, ?, 'video', ?, ?, 0, 1, 1)`,
      [lessonId, sectionId, courseId, session.title, finalVideoUrl, captionUrl]
    );
  });

  logger.info(
    `Auto-created course ${courseId} from live session ${session.id}` +
    `${cleanedVideoUrl ? ' (noise-reduced)' : ' (original audio)'}` +
    `${captionUrl ? ' with captions' : ' without captions'}`
  );
}

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
