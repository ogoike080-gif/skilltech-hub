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
