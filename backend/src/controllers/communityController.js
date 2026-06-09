// ============================================================
// communityController.js
// ============================================================
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await query('SELECT * FROM forum_categories ORDER BY sort_order');
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
};

exports.listPosts = async (req, res, next) => {
  try {
    const { category, type, search, sort = 'newest', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = ['fp.is_deleted = FALSE', 'fp.parent_id IS NULL'];
    const params = [];

    if (category) { where.push('fc.slug = ?'); params.push(category); }
    if (type)     { where.push('fp.type = ?'); params.push(type); }
    if (search)   { where.push('(fp.title LIKE ? OR fp.body LIKE ?)'); const s = `%${search}%`; params.push(s, s); }

    const orderMap = { newest: 'fp.created_at DESC', popular: 'fp.vote_count DESC', active: 'fp.reply_count DESC' };

    const posts = await query(`
      SELECT fp.id, fp.title, fp.body, fp.type, fp.vote_count, fp.reply_count,
             fp.view_count, fp.is_pinned, fp.is_answered, fp.tags, fp.created_at,
             fc.name AS category_name, fc.slug AS category_slug, fc.color AS category_color,
             u.id AS user_id, u.first_name, u.last_name, u.avatar_url, u.role AS user_role,
             LEFT(fp.body, 200) AS preview
      FROM forum_posts fp
      JOIN forum_categories fc ON fc.id = fp.category_id
      JOIN users u ON u.id = fp.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY fp.is_pinned DESC, ${orderMap[sort] || orderMap.newest}
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({ success: true, data: posts });
  } catch (err) { next(err); }
};

exports.getPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    await query('UPDATE forum_posts SET view_count = view_count + 1 WHERE id = ?', [postId]);

    const [post] = await query(`
      SELECT fp.*, fc.name AS category_name, fc.slug AS category_slug,
             u.first_name, u.last_name, u.avatar_url, u.role AS user_role, u.headline
      FROM forum_posts fp
      JOIN forum_categories fc ON fc.id = fp.category_id
      JOIN users u ON u.id = fp.user_id
      WHERE fp.id = ? AND fp.is_deleted = FALSE
    `, [postId]);
    if (!post) throw new AppError('Post not found', 404);

    const replies = await query(`
      SELECT fp.id, fp.body, fp.vote_count, fp.created_at,
             u.id AS user_id, u.first_name, u.last_name, u.avatar_url, u.role AS user_role
      FROM forum_posts fp JOIN users u ON u.id = fp.user_id
      WHERE fp.parent_id = ? AND fp.is_deleted = FALSE
      ORDER BY fp.vote_count DESC, fp.created_at ASC
    `, [postId]);

    res.json({ success: true, data: { ...post, replies } });
  } catch (err) { next(err); }
};

exports.createPost = async (req, res, next) => {
  try {
    const { categoryId, title, body, type = 'discussion', tags } = req.body;
    const postId = uuidv4();
    await query(
      'INSERT INTO forum_posts (id, category_id, user_id, title, body, type, tags) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [postId, categoryId, req.user.userId, title, body, type, JSON.stringify(tags || [])]
    );
    await query('UPDATE forum_categories SET post_count = post_count + 1 WHERE id = ?', [categoryId]);
    res.status(201).json({ success: true, data: { id: postId } });
  } catch (err) { next(err); }
};

exports.replyPost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { body } = req.body;
    const [parent] = await query('SELECT id, category_id FROM forum_posts WHERE id = ?', [postId]);
    if (!parent) throw new AppError('Post not found', 404);
    const replyId = uuidv4();
    await query(
      'INSERT INTO forum_posts (id, category_id, user_id, parent_id, body, type) VALUES (?, ?, ?, ?, ?, "discussion")',
      [replyId, parent.category_id, req.user.userId, postId, body]
    );
    await query('UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id = ?', [postId]);
    res.status(201).json({ success: true, data: { id: replyId } });
  } catch (err) { next(err); }
};

exports.votePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { value = 1 } = req.body;
    const userId = req.user.userId;
    const voteVal = value > 0 ? 1 : -1;
    const [existing] = await query('SELECT id, value FROM forum_votes WHERE post_id = ? AND user_id = ?', [postId, userId]);
    if (existing) {
      if (existing.value === voteVal) {
        await query('DELETE FROM forum_votes WHERE id = ?', [existing.id]);
        await query('UPDATE forum_posts SET vote_count = vote_count - ? WHERE id = ?', [voteVal, postId]);
      } else {
        await query('UPDATE forum_votes SET value = ? WHERE id = ?', [voteVal, existing.id]);
        await query('UPDATE forum_posts SET vote_count = vote_count + ? WHERE id = ?', [voteVal * 2, postId]);
      }
    } else {
      await query('INSERT INTO forum_votes (id, post_id, user_id, value) VALUES (?, ?, ?, ?)', [uuidv4(), postId, userId, voteVal]);
      await query('UPDATE forum_posts SET vote_count = vote_count + ? WHERE id = ?', [voteVal, postId]);
    }
    const [updated] = await query('SELECT vote_count FROM forum_posts WHERE id = ?', [postId]);
    res.json({ success: true, data: { voteCount: updated.vote_count } });
  } catch (err) { next(err); }
};

exports.deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const [post] = await query('SELECT user_id FROM forum_posts WHERE id = ?', [postId]);
    if (!post) throw new AppError('Post not found', 404);
    if (post.user_id !== req.user.userId && req.user.role !== 'admin') throw new AppError('Forbidden', 403);
    await query('UPDATE forum_posts SET is_deleted = TRUE WHERE id = ?', [postId]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) { next(err); }
};

