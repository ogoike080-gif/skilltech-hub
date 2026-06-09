const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { getRedis } = require('../config/redis');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

// ── Connect social account ─────────────────────────────────

exports.connectPlatform = async (req, res, next) => {
  try {
    const { platform, rtmpUrl, streamKey, channelName, accessToken } = req.body;
    const userId = req.user.userId;

    const validPlatforms = ['youtube', 'facebook', 'instagram', 'tiktok', 'linkedin', 'custom'];
    if (!validPlatforms.includes(platform)) {
      throw new AppError('Invalid platform', 400);
    }

    // For custom RTMP, use provided values directly
    // For social platforms, this would handle OAuth token exchange
    const id = uuidv4();
    await query(`
      INSERT INTO social_connections
        (id, user_id, platform, channel_name, rtmp_url, stream_key, access_token, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
      ON DUPLICATE KEY UPDATE
        channel_name = VALUES(channel_name),
        rtmp_url = VALUES(rtmp_url),
        stream_key = VALUES(stream_key),
        access_token = VALUES(access_token),
        is_active = TRUE,
        updated_at = NOW()
    `, [id, userId, platform, channelName || platform,
        rtmpUrl || getPlatformRtmpUrl(platform),
        streamKey || null,
        accessToken ? JSON.stringify(accessToken) : null]);

    res.json({ success: true, message: `${platform} connected successfully` });
  } catch (err) {
    next(err);
  }
};

// ── List connected platforms ───────────────────────────────

exports.myConnections = async (req, res, next) => {
  try {
    const connections = await query(`
      SELECT id, platform, channel_name, is_active,
             (CASE WHEN access_token IS NOT NULL THEN TRUE ELSE FALSE END) AS has_token,
             token_expires_at, created_at, updated_at
      FROM social_connections WHERE user_id = ?
      ORDER BY platform
    `, [req.user.userId]);

    res.json({ success: true, data: connections });
  } catch (err) {
    next(err);
  }
};

// ── Start multistream ──────────────────────────────────────

exports.startMultistream = async (req, res, next) => {
  try {
    const { sessionId, connectionIds } = req.body;
    const userId = req.user.userId;

    const [session] = await query(
      'SELECT * FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, userId]
    );
    if (!session) throw new AppError('Session not found', 404);
    if (session.status !== 'live') throw new AppError('Session must be live to start streaming', 400);

    if (!connectionIds?.length) throw new AppError('Select at least one platform', 400);

    // Get the connection details
    const placeholders = connectionIds.map(() => '?').join(',');
    const connections = await query(
      `SELECT * FROM social_connections WHERE id IN (${placeholders}) AND user_id = ? AND is_active = TRUE`,
      [...connectionIds, userId]
    );

    if (!connections.length) throw new AppError('No valid connections found', 404);

    const targets = [];
    for (const conn of connections) {
      const targetId = uuidv4();
      await query(
        `INSERT INTO stream_targets (id, session_id, connection_id, status, started_at)
         VALUES (?, ?, ?, 'active', NOW())`,
        [targetId, sessionId, conn.id]
      );

      // In production, this would call your RTMP relay server (e.g., nginx-rtmp, Restream API)
      // to forward the stream to this platform
      const streamResult = await forwardToRtmp(session, conn);
      targets.push({ platform: conn.platform, targetId, ...streamResult });
    }

    // Store active stream state in Redis
    const redis = getRedis();
    await redis.setEx(
      `stream:${sessionId}:targets`,
      86400,
      JSON.stringify(targets)
    );

    res.json({
      success: true,
      data: { targets, message: `Streaming to ${targets.length} platform(s)` },
    });
  } catch (err) {
    next(err);
  }
};

// ── Stop multistream ───────────────────────────────────────

exports.stopMultistream = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const [session] = await query(
      'SELECT id FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, userId]
    );
    if (!session) throw new AppError('Session not found', 404);

    await query(
      `UPDATE stream_targets st
       JOIN live_sessions ls ON ls.id = st.session_id
       SET st.status = 'ended', st.ended_at = NOW()
       WHERE ls.id = ? AND st.status = 'active'`,
      [sessionId]
    );

    const redis = getRedis();
    await redis.del(`stream:${sessionId}:targets`);

    res.json({ success: true, message: 'All streams stopped' });
  } catch (err) {
    next(err);
  }
};

// ── Get live stream analytics ──────────────────────────────

exports.streamAnalytics = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [session] = await query(
      'SELECT * FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, req.user.userId]
    );
    if (!session) throw new AppError('Session not found', 404);

    const targets = await query(`
      SELECT st.id, st.status, st.viewer_count, st.started_at, st.ended_at,
             sc.platform, sc.channel_name
      FROM stream_targets st
      JOIN social_connections sc ON sc.id = st.connection_id
      WHERE st.session_id = ?
    `, [sessionId]);

    // Get real-time viewer count from Redis
    const redis = getRedis();
    const realtimeData = await redis.get(`stream:${sessionId}:targets`);
    const rtData = realtimeData ? JSON.parse(realtimeData) : [];

    const analytics = targets.map(t => {
      const rt = rtData.find(r => r.platform === t.platform) || {};
      return {
        ...t,
        liveViewers: rt.viewers || t.viewer_count,
      };
    });

    const totalViewers = analytics.reduce((sum, t) => sum + (t.liveViewers || 0), 0);

    res.json({
      success: true,
      data: {
        sessionId,
        totalViewers,
        platforms: analytics,
        sessionDuration: session.started_at
          ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000 / 60)
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Generate RTMP ingest URL for session ───────────────────

exports.getRtmpIngest = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const [session] = await query(
      'SELECT rtmp_key, title FROM live_sessions WHERE id = ? AND instructor_id = ?',
      [sessionId, req.user.userId]
    );
    if (!session) throw new AppError('Session not found', 404);

    const rtmpServer = process.env.RTMP_SERVER_URL || 'rtmp://stream.skilltechhub.com/live';

    res.json({
      success: true,
      data: {
        rtmpUrl:    `${rtmpServer}/${session.rtmp_key}`,
        streamKey:  session.rtmp_key,
        playbackUrl:`https://stream.skilltechhub.com/hls/${session.rtmp_key}.m3u8`,
        instructions: {
          obs: 'In OBS: Settings → Stream → Custom → paste the RTMP URL and stream key',
          streamyard: 'Add as a destination using the RTMP URL and stream key',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Stream chat aggregation (from all platforms) ──────────

exports.aggregatedChat = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // In production, this would pull from platform APIs
    // YouTube Data API, Facebook Graph API, etc.
    // Here we return a structure showing how it works

    res.json({
      success: true,
      data: {
        sessionId,
        note: 'Real-time chat aggregation via WebSocket — connect to /socket.io and join room session:<id>',
        socketEvent: 'stream:chat',
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Helpers ────────────────────────────────────────────────

function getPlatformRtmpUrl(platform) {
  const urls = {
    youtube:  'rtmp://a.rtmp.youtube.com/live2',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
    tiktok:   'rtmp://push.tiktok.com/live',
    linkedin: 'rtmps://4489-1.rtmp.linkedin.com/live',
    instagram:'rtmps://edgetee-upload-an1-1.xx.fbcdn.net:443/rtmp',
  };
  return urls[platform] || null;
}

async function forwardToRtmp(session, connection) {
  // In production, this calls your RTMP relay service (nginx-rtmp, Restream, etc.)
  // to rebroadcast the incoming stream to each platform.
  //
  // Example with Restream API:
  //   POST https://api.restream.io/v2/user/channel
  //   { rtmpUrl: connection.rtmp_url, streamKey: connection.stream_key }
  //
  // Or with your own nginx-rtmp server:
  //   POST http://nginx-rtmp-server/control/record/start
  //   { app: 'live', name: session.rtmp_key, url: connection.rtmp_url }

  logger.info(`Forwarding stream ${session.rtmp_key} to ${connection.platform}`);
  return { status: 'active', viewers: 0 };
}
