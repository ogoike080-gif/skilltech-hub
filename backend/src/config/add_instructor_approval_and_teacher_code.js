// backend/src/config/add_instructor_approval_and_teacher_code.js
// Run via Railway Console: node src/config/add_instructor_approval_and_teacher_code.js

const mysql = require('mysql2/promise');
const { randomUUID } = require('crypto');
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

  const addColumn = async (table, column, definition) => {
    const [existing] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME, table, column]
    );
    if (existing.length > 0) {
      console.log(`⏭️  ${table}.${column} already exists`);
      return;
    }
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`✅ Added ${table}.${column}`);
  };

  // 1) Instructor approval status on users
  await addColumn('users', 'instructor_status', `ENUM('none','pending','approved','rejected') DEFAULT 'none'`);
  await addColumn('users', 'teacher_code', `VARCHAR(20) NULL`); // unique short code students enter to find this teacher

  // Backfill teacher_code for any existing instructors who don't have one
  const [instructors] = await connection.query(
    `SELECT id FROM users WHERE role = 'instructor' AND (teacher_code IS NULL OR teacher_code = '')`
  );
  for (const inst of instructors) {
    const code = 'T' + Math.random().toString(36).slice(2, 8).toUpperCase();
    await connection.query('UPDATE users SET teacher_code = ?, instructor_status = "approved" WHERE id = ?', [code, inst.id]);
  }
  console.log(`✅ Backfilled teacher_code for ${instructors.length} existing instructor(s)`);

  // 2) Live sessions: require teacher_code to be supplied + payment enforcement already
  //    has meeting_code/passcode from earlier migration. Just confirm is_public/price exist.
  await addColumn('live_sessions', 'requires_teacher_code', `TINYINT(1) DEFAULT 1`);

  // 3) Payments: add a provider preference + live_session linkage if not already present
  await addColumn('payments', 'live_session_id', `VARCHAR(36) NULL`);

  // 4) Session access — track which students paid for which live session
  await connection.query(`
    CREATE TABLE IF NOT EXISTS live_session_access (
      id VARCHAR(36) PRIMARY KEY,
      live_session_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) NOT NULL,
      payment_id VARCHAR(36) NULL,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_access (live_session_id, user_id),
      FOREIGN KEY (live_session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ live_session_access table ready');

  await connection.end();
  console.log('\n🎉 Migration complete!');
}

migrate().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
