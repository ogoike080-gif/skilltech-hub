const { query } = require('../config/database');

exports.list = async (req, res, next) => {
  try {
    const notifs = await query(
      'SELECT id, `type`, title, body, `data`, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.userId]
    );
    const [[{ unread }]] = await Promise.all([
      query('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.userId]),
    ]);
    res.json({ success: true, data: { notifications: notifs, unread } });
  } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE',
      [req.user.userId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};
