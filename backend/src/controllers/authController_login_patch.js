// ============================================================
// PATCH: backend/src/controllers/authController.js
// ============================================================
//
// 1) In the `login` function, update the SELECT to also pull
//    instructor_status:
//
//    BEFORE:
//    const [user] = await query(
//      `SELECT
//          id,
//          email,
//          password_hash,
//          first_name,
//          last_name,
//          role,
//          is_active,
//          is_verified,
//          avatar_url
//       FROM users
//       WHERE email = ?
//       AND oauth_provider = 'local'`,
//      [email.trim().toLowerCase()]
//    );
//
//    AFTER:
const [user] = await query(
  `SELECT
      id,
      email,
      password_hash,
      first_name,
      last_name,
      role,
      is_active,
      is_verified,
      avatar_url,
      instructor_status
   FROM users
   WHERE email = ?
   AND oauth_provider = 'local'`,
  [email.trim().toLowerCase()]
);

// 2) Then in the response payload further down, add instructorStatus:
//
//    BEFORE:
//    res.json({
//      success: true,
//      data: {
//        accessToken,
//        refreshToken,
//        user: {
//          id: user.id,
//          email: user.email,
//          firstName: user.first_name,
//          lastName: user.last_name,
//          role: user.role,
//          avatarUrl: user.avatar_url,
//          isVerified: user.is_verified,
//        },
//      },
//    });
//
//    AFTER:
res.json({
  success: true,
  data: {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      avatarUrl: user.avatar_url,
      isVerified: user.is_verified,
      instructorStatus: user.instructor_status,
    },
  },
});

// 3) Also update `me` (used to refresh user data on app load /
//    page refresh) the same way — add instructor_status to its
//    SELECT and to the returned object:
//
//    BEFORE (in exports.me):
//    const [user] = await query(
//      `SELECT
//          id, email, first_name, last_name, avatar_url, role,
//          bio, headline, website_url, linkedin_url, github_url,
//          subscription_tier, is_verified, created_at
//       FROM users
//       WHERE id = ?`,
//      [req.user.userId]
//    );
//
//    AFTER:
const [user] = await query(
  `SELECT
      id, email, first_name, last_name, avatar_url, role,
      bio, headline, website_url, linkedin_url, github_url,
      subscription_tier, is_verified, instructor_status, created_at
   FROM users
   WHERE id = ?`,
  [req.user.userId]
);
// (the `me` response already does `res.json({ success: true, data: user })`
//  with the raw row, so instructor_status will automatically be included
//  — no further change needed there, just the SELECT.)
