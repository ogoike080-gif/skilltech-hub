// backend/src/config/fix_collations.js
// Run ONCE via Railway Console: node src/config/fix_collations.js
//
// Fixes "Illegal mix of collations" errors by converting every table
// to the same collation (utf8mb4_unicode_ci), so JOINs between old tables
// (users, refresh_tokens) and newly migrated tables (courses, schools, etc.)
// work correctly.

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixCollations() {
  console.log('🔄 Connecting to database...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('✅ Connected to:', process.env.DB_NAME);

  // First, convert the whole database default
  await connection.query(
    `ALTER DATABASE \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log('✅ Database default collation set to utf8mb4_unicode_ci');

  const [tables] = await connection.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);

  console.log(`\n🔧 Converting ${tableNames.length} tables to utf8mb4_unicode_ci...\n`);

  let success = 0, failed = 0;

  for (const table of tableNames) {
    try {
      await connection.query(
        `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ ${table}`);
      success++;
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done! ${success} tables converted, ${failed} failed.`);
  console.log('All tables now use the same collation — JOIN errors should be gone.');

  await connection.end();
}

fixCollations().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
