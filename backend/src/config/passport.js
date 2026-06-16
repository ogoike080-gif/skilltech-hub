const { v4: uuidv4 } = require('uuid');
const { query } = require('./database');

module.exports = (passport) => {

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const GoogleStrategy = require('passport-google-oauth20').Strategy;

    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.API_URL}/api/auth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@google.oauth`;
        const firstName = profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User';
        const lastName = profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '';
        const avatar = profile.photos?.[0]?.value || null;
        const oauthId = String(profile.id);

        console.log('[Google OAuth]', { email, firstName, lastName, oauthId });

        let rows = await query(
          'SELECT * FROM users WHERE email = ? OR (oauth_id = ? AND oauth_provider = "google")',
          [email, oauthId]
        );

        let user = Array.isArray(rows) ? rows[0] : rows;

        if (!user) {
          const id = uuidv4();

          await query(
            `INSERT INTO users
              (id, email, first_name, last_name, avatar_url, oauth_provider, oauth_id, is_verified)
             VALUES (?, ?, ?, ?, ?, 'google', ?, TRUE)`,
            [id, email, firstName, lastName, avatar, oauthId]
          );

          rows = await query('SELECT * FROM users WHERE id = ?', [id]);
          user = Array.isArray(rows) ? rows[0] : rows;
        } else if (!user.oauth_id) {
          await query(
            'UPDATE users SET oauth_provider = "google", oauth_id = ?, is_verified = TRUE WHERE id = ?',
            [oauthId, user.id]
          );

          rows = await query('SELECT * FROM users WHERE id = ?', [user.id]);
          user = Array.isArray(rows) ? rows[0] : rows;
        }

        if (!user) {
          throw new Error('User record could not be loaded after OAuth operation.');
        }

        await query(
          'UPDATE users SET last_login_at = NOW() WHERE id = ?',
          [user.id]
        );

        done(null, user);

      } catch (err) {
        console.error('====================');
        console.error('GOOGLE AUTH ERROR');
        console.error(err);
        console.error('MESSAGE:', err.message);
        console.error('CODE:', err.code);
        console.error('SQL:', err.sql);
        console.error('====================');

        done(err, null);
      }
    }));
  }

  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
      const user = Array.isArray(rows) ? rows[0] : rows;
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });
};
