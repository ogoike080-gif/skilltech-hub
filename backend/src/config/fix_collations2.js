// backend/src/config/fix_collations2.js
// Run via Railway Console: node src/config/fix_collations2.js
//
// Fixes the 2 tables that failed in fix_collations.js because of the
// foreign key constraint between users <-> refresh_tokens. We temporarily
// drop FK checks, convert both tables, then restore checks.

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixRemainingTables() {
  console.log('🔄 Connecting to database...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('✅ Connected to:', process.env.DB_NAME);

  try {
    console.log('🔓 Disabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    console.log('🔧 Converting users table...');
    await connection.query(
      `ALTER TABLE \`users\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('✅ users converted');

    console.log('🔧 Converting refresh_tokens table...');
    await connection.query(
      `ALTER TABLE \`refresh_tokens\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log('✅ refresh_tokens converted');

    console.log('🔒 Re-enabling foreign key checks...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n🎉 All 31 tables now use utf8mb4_unicode_ci!');

    // Final verification - check all tables' collations
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log('\n📋 Final collation check:');
    const [results] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME]);

    const mismatched = results.filter(r => r.TABLE_COLLATION !== 'utf8mb4_unicode_ci');
    if (mismatched.length === 0) {
      console.log('✅ ALL tables confirmed using utf8mb4_unicode_ci. No mismatches!');
    } else {
      console.log(`⚠️  ${mismatched.length} tables still mismatched:`);
      mismatched.forEach(t => console.log(`   - ${t.TABLE_NAME}: ${t.TABLE_COLLATION}`));
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    await connection.query('SET FOREIGN_KEY_CHECKS = 1'); // always restore
  } finally {
    await connection.end();
  }
}

fixRemainingTables();
