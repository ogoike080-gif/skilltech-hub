const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');

router.get('/', async (req, res, next) => {
  try {
    const schools = await query('SELECT * FROM schools WHERE is_active = TRUE ORDER BY sort_order');
    res.json({ success: true, data: schools });
  } catch (err) { next(err); }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const [school] = await query('SELECT * FROM schools WHERE slug = ? AND is_active = TRUE', [req.params.slug]);
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    const courses = await query(
      'SELECT id, title, slug, thumbnail_url, level, `type`, price, is_free, avg_rating, total_students FROM courses WHERE school_id = ? AND is_published = TRUE ORDER BY total_students DESC',
      [school.id]
    );
    res.json({ success: true, data: { ...school, courses } });
  } catch (err) { next(err); }
});

module.exports = router;
