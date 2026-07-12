// backend/src/config/add_skill_and_videos.js
// Run via Railway Console: node src/config/add_skill_and_videos.js

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  console.log('🔄 Connecting to database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  console.log('✅ Connected to:', process.env.DB_NAME);

  // 1) Add preferred_school_id to users (the "skill" they chose at signup)
  const [existing] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'preferred_school_id'`,
    [process.env.DB_NAME]
  );
  if (existing.length === 0) {
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN preferred_school_id CHAR(36) NULL
    `);
    console.log('✅ Added users.preferred_school_id');
  } else {
    console.log('⏭️  users.preferred_school_id already exists');
  }

  // 2) Motivational videos table (curated external + auto-tagged recordings)
  await connection.query(`
    CREATE TABLE IF NOT EXISTS motivational_videos (
      id VARCHAR(36) PRIMARY KEY,
      school_id CHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      video_url VARCHAR(500) NOT NULL,
      thumbnail_url VARCHAR(500) NULL,
      source ENUM('curated','recording') DEFAULT 'curated',
      live_session_id CHAR(36) NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (live_session_id) REFERENCES live_sessions(id) ON DELETE SET NULL
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ motivational_videos table ready');

  // 3) Link live_sessions to a school too, so recordings can be auto-tagged
  const [lsExisting] = await connection.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'live_sessions' AND COLUMN_NAME = 'school_id'`,
    [process.env.DB_NAME]
  );
  if (lsExisting.length === 0) {
    await connection.query(`
      ALTER TABLE live_sessions
      ADD COLUMN school_id CHAR(36) NULL
    `);
    console.log('✅ Added live_sessions.school_id');
  } else {
    console.log('⏭️  live_sessions.school_id already exists');
  }

  // 4) Seed a few curated motivational videos per school (placeholder YouTube links)
  const [schools] = await connection.query('SELECT id, slug, name FROM schools');
  const curated = {
    'software-engineering':  { title: 'Why Software Engineers Will Always Be in Demand', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    'artificial-intelligence':{ title: 'The Future Belongs to AI Builders',              url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    'data-science':          { title: 'Data Is the New Oil — Become a Refiner',          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    'cybersecurity':         { title: 'The World Needs More Cyber Defenders',             url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    'cloud-computing':       { title: 'Cloud Skills = Career Security',                  url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    'product-design':        { title: 'Design Shapes How the World Feels',               url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    'digital-marketing':      { title: 'Every Business Needs a Growth Mind',              url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
  };

  for (const school of schools) {
    const video = curated[school.slug];
    if (!video) continue;
    const [existingVid] = await connection.query(
      'SELECT id FROM motivational_videos WHERE school_id = ? AND title = ?',
      [school.id, video.title]
    );
    if (existingVid.length === 0) {
      const { randomUUID } = require('crypto');
      await connection.query(
        `INSERT INTO motivational_videos (id, school_id, title, video_url, source)
         VALUES (?, ?, ?, ?, 'curated')`,
        [randomUUID(), school.id, video.title, video.url]
      );
      console.log(`✅ Seeded video for ${school.name}`);
    }
  }

  await connection.end();
  console.log('\n🎉 Migration complete!');
}

migrate().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
