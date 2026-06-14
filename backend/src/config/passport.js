const { v4: uuidv4 } = require('uuid');
const { query } = require('./database');

module.exports = (passport) => {

  // ── Google OAuth ─────────────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      // IMPORTANT:
      // Must match the route defined in auth routes.
      // If routes are mounted with app.use('/auth', authRoutes)
      // then callback should be:
      callbackURL: `${process.env.API_URL}/auth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@google.oauth`;
        const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
        const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
        const avatar = profile.photos?.[0]?.value || null;
        const oauthId = String(profile.id);

        let [user] = await query(
          'SELECT * FROM users WHERE email = ? OR (oauth_id = ? AND oauth_provider = "google")',
          [email, oauthId]
        );

        if (!user) {
          const id = uuidv4();

          await query(
            `INSERT INTO users
              (id, email, first_name, last_name, avatar_url, oauth_provider, oauth_id, is_verified)
             VALUES (?, ?, ?, ?, ?, 'google', ?, TRUE)`,
            [id, email, firstName, lastName, avatar, oauthId]
          );

          [user] = await query('SELECT * FROM users WHERE id = ?', [id]);
        } else if (!user.oauth_id) {
          await query(
            'UPDATE users SET oauth_provider = "google", oauth_id = ?, is_verified = TRUE WHERE id = ?',
            [oauthId, user.id]
          );

          [user] = await query('SELECT * FROM users WHERE id = ?', [user.id]);
        }

        await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        done(null, user);
      } catch (err) {
        console.error('[passport:google] Error:', err);
        done(err, null);
      }
    }));
  }

  // ── GitHub OAuth ─────────────────────────────────────────
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    const GitHubStrategy = require('passport-github2').Strategy;

    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,

      // IMPORTANT:
      // Must match the route defined in auth routes.
      callbackURL: `${process.env.API_URL}/auth/github/callback`,

      scope: ['user:email'],
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
        const displayName = profile.displayName || profile.username || 'GitHub User';
        const parts = displayName.split(' ');

        const firstName = parts[0] || 'User';
        const lastName = parts.slice(1).join(' ') || '';
        const avatar = profile.photos?.[0]?.value || null;
        const oauthId = String(profile.id);
        const githubUrl = `https://github.com/${profile.username}`;

        let [user] = await query(
          'SELECT * FROM users WHERE email = ? OR (oauth_id = ? AND oauth_provider = "github")',
          [email, oauthId]
        );

        if (!user) {
          const id = uuidv4();

          await query(
            `INSERT INTO users
              (id, email, first_name, last_name, avatar_url, oauth_provider, oauth_id, is_verified, github_url)
             VALUES (?, ?, ?, ?, ?, 'github', ?, TRUE, ?)`,
            [id, email, firstName, lastName, avatar, oauthId, githubUrl]
          );

          [user] = await query('SELECT * FROM users WHERE id = ?', [id]);
        }

        await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

        done(null, user);
      } catch (err) {
        console.error('[passport:github] Error:', err);
        done(err, null);
      }
    }));
  }

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const [user] = await query('SELECT * FROM users WHERE id = ?', [id]);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
};
