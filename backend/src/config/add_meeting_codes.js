// backend/src/config/add_meeting_codes.js
// Run via Railway Console: node src/config/add_meeting_codes.js
//
// Adds Zoom-style meeting_code + passcode columns to live_sessions,
// so instructors get a shareable code/passcode instead of students
// being able to start sessions themselves.

const mysql = require('mysql2/promise');
require('dotenv').config();

function randomMeetingCode() {
  // 9-digit numeric code, formatted like Zoom: 123 456 789
  const n = Math.floor(100000000 + Math.random() * 900000000);
  return String(n);
}

function randomPasscode() {
  // 6-character alphanumeric passcode
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

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

  const columnsToAdd = [
    { table: 'live_sessions', column: 'meeting_code', definition: 'VARCHAR(20) NULL' },
    { table: 'live_sessions', column: 'passcode',     definition: 'VARCHAR(10) NULL' },
  ];

  for (const { table, column, definition } of columnsToAdd) {
    const [existing] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME, table, column]
    );
    if (existing.length > 0) {
      console.log(`⏭️  ${table}.${column} already exists — skipping`);
      continue;
    }
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`✅ Added ${table}.${column}`);
  }

  // Backfill any existing sessions without a code
  const [sessions] = await connection.query(
    'SELECT id FROM live_sessions WHERE meeting_code IS NULL'
  );
  for (const s of sessions) {
    await connection.query(
      'UPDATE live_sessions SET meeting_code = ?, passcode = ? WHERE id = ?',
      [randomMeetingCode(), randomPasscode(), s.id]
    );
  }
  console.log(`✅ Backfilled meeting codes for ${sessions.length} existing session(s)`);

  // Add unique index on meeting_code so codes never collide
  try {
    await connection.query(
      'ALTER TABLE live_sessions ADD UNIQUE INDEX idx_meeting_code (meeting_code)'
    );
    console.log('✅ Added unique index on meeting_code');
  } catch (err) {
    console.log('⏭️  Unique index already exists or failed:', err.message);
  }

  await connection.end();
  console.log('\n🎉 Migration complete!');
}

migrate().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
