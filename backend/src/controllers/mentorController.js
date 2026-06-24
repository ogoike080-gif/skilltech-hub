exports.listMentors = async (req, res, next) => {
  try {
    const {
      specialty,
      minRate,
      maxRate,
      page = 1,
      limit = 12
    } = req.query;

    // Convert to numbers
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 12);
    const offset = (pageNum - 1) * limitNum;

    const where = [
      'mp.is_approved = TRUE',
      'mp.is_available = TRUE'
    ];

    const params = [];

    if (minRate) {
      where.push('mp.hourly_rate >= ?');
      params.push(Number(minRate));
    }

    if (maxRate) {
      where.push('mp.hourly_rate <= ?');
      params.push(Number(maxRate));
    }

    if (specialty) {
      where.push('JSON_CONTAINS(mp.specialties, ?)');
      params.push(JSON.stringify(specialty));
    }

    const sql = `
      SELECT
        mp.id,
        mp.hourly_rate,
        mp.currency,
        mp.specialties,
        mp.experience_yrs,
        mp.avg_rating,
        mp.total_sessions,
        mp.bio,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.headline
      FROM mentor_profiles mp
      JOIN users u ON u.id = mp.user_id
      WHERE ${where.join(' AND ')}
      ORDER BY mp.avg_rating DESC,
               mp.total_sessions DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const mentors = await query(sql, params);

    res.json({
      success: true,
      data: mentors,
      pagination: {
        page: pageNum,
        limit: limitNum
      }
    });

  } catch (err) {
    next(err);
  }
};

exports.getMentor = async (req, res, next) => {
  try {
    const [mentor] = await query(`
      SELECT mp.*, u.first_name, u.last_name, u.avatar_url, u.headline, u.bio AS user_bio,
             u.linkedin_url, u.github_url, u.website_url
      FROM mentor_profiles mp JOIN users u ON u.id = mp.user_id
      WHERE mp.id = ? AND mp.is_approved = TRUE
    `, [req.params.mentorId]);
    if (!mentor) throw new AppError('Mentor not found', 404);

    const availability = await query(
      'SELECT day_of_week, start_time, end_time FROM mentor_availability WHERE mentor_id = ? ORDER BY day_of_week',
      [mentor.id]
    );
    res.json({ success: true, data: { ...mentor, availability } });
  } catch (err) { next(err); }
};

exports.createProfile = async (req, res, next) => {
  try {
    const { hourlyRate, currency = 'USD', specialties, experienceYrs, bio, timezone } = req.body;
    const existing = await query('SELECT id FROM mentor_profiles WHERE user_id = ?', [req.user.userId]);
    if (existing.length) throw new AppError('Mentor profile already exists', 409);

    const id = uuidv4();
    await query(
      'INSERT INTO mentor_profiles (id, user_id, hourly_rate, currency, specialties, experience_yrs, bio, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user.userId, hourlyRate, currency, JSON.stringify(specialties || []), experienceYrs, bio, timezone || 'UTC']
    );
    await query("UPDATE users SET role = 'mentor' WHERE id = ? AND role = 'student'", [req.user.userId]);
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.setAvailability = async (req, res, next) => {
  try {
    const { slots } = req.body;
    const [mentor] = await query('SELECT id FROM mentor_profiles WHERE user_id = ?', [req.user.userId]);
    if (!mentor) throw new AppError('Mentor profile not found', 404);

    await query('DELETE FROM mentor_availability WHERE mentor_id = ?', [mentor.id]);
    for (const slot of slots) {
      await query(
        'INSERT INTO mentor_availability (id, mentor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), mentor.id, slot.dayOfWeek, slot.startTime, slot.endTime]
      );
    }
    res.json({ success: true, message: 'Availability updated' });
  } catch (err) { next(err); }
};

exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { mentorId } = req.params;
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();

    const slots = await query(
      'SELECT start_time, end_time FROM mentor_availability WHERE mentor_id = ? AND day_of_week = ?',
      [mentorId, dayOfWeek]
    );

    const booked = await query(
      'SELECT scheduled_at, duration_min FROM mentorship_bookings WHERE mentor_id = ? AND DATE(scheduled_at) = ? AND status NOT IN ("cancelled")',
      [mentorId, targetDate.toISOString().split('T')[0]]
    );

    res.json({ success: true, data: { availableSlots: slots, bookedSlots: booked } });
  } catch (err) { next(err); }
};

exports.bookSession = async (req, res, next) => {
  try {
    const { mentorId, scheduledAt, durationMin = 60, topic, notes } = req.body;
    const [mentor] = await query('SELECT * FROM mentor_profiles WHERE id = ? AND is_available = TRUE', [mentorId]);
    if (!mentor) throw new AppError('Mentor not found or unavailable', 404);

    const id = uuidv4();
    await query(
      'INSERT INTO mentorship_bookings (id, mentor_id, student_id, scheduled_at, duration_min, topic, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, mentorId, req.user.userId, new Date(scheduledAt), durationMin, topic, notes]
    );
    res.status(201).json({ success: true, data: { bookingId: id } });
  } catch (err) { next(err); }
};

exports.myBookings = async (req, res, next) => {
  try {
    const { role = 'student' } = req.query;
    const idField = role === 'mentor' ? 'mp.user_id' : 'mb.student_id';

    const bookings = await query(`
      SELECT mb.id, mb.scheduled_at, mb.duration_min, mb.topic, mb.status,
             mb.student_rating, mb.meet_url,
             s.first_name AS student_first, s.last_name AS student_last, s.avatar_url AS student_avatar,
             m.first_name AS mentor_first, m.last_name AS mentor_last, m.avatar_url AS mentor_avatar,
             mp.hourly_rate
      FROM mentorship_bookings mb
      JOIN users s ON s.id = mb.student_id
      JOIN mentor_profiles mp ON mp.id = mb.mentor_id
      JOIN users m ON m.id = mp.user_id
      WHERE ${idField} = ?
      ORDER BY mb.scheduled_at DESC LIMIT 50
    `, [req.user.userId]);
    res.json({ success: true, data: bookings });
  } catch (err) { next(err); }
};

exports.completeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    await query(
      'UPDATE mentorship_bookings SET status = "completed", student_rating = ?, student_review = ? WHERE id = ? AND student_id = ?',
      [rating, review, id, req.user.userId]
    );
    if (rating) {
      const [booking] = await query('SELECT mentor_id FROM mentorship_bookings WHERE id = ?', [id]);
      const [stats] = await query(
        'SELECT AVG(student_rating) AS avg_r, COUNT(*) AS cnt FROM mentorship_bookings WHERE mentor_id = ? AND student_rating IS NOT NULL',
        [booking.mentor_id]
      );
      await query('UPDATE mentor_profiles SET avg_rating = ?, total_sessions = ? WHERE id = ?',
        [parseFloat(stats.avg_r).toFixed(2), stats.cnt, booking.mentor_id]);
    }
    res.json({ success: true, message: 'Session completed' });
  } catch (err) { next(err); }
};
