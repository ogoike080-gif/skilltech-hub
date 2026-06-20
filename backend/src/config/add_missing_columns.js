// backend/src/config/add_missing_columns.js
// Run via Railway Console: node src/config/add_missing_columns.js
//
// Adds columns the controllers expect but that don't exist in the
// users table from the original schema (e.g. subscription_tier).
// Safe to re-run — checks if column exists before adding.

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMissingColumns() {
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
    { table: 'users', column: 'subscription_tier', definition: "VARCHAR(20) DEFAULT 'free'" },
    { table: 'users', column: 'bio',                definition: 'TEXT NULL' },
    { table: 'users', column: 'headline',           definition: 'VARCHAR(255) NULL' },
    { table: 'users', column: 'website_url',        definition: 'VARCHAR(500) NULL' },
    { table: 'users', column: 'linkedin_url',       definition: 'VARCHAR(500) NULL' },
    { table: 'users', column: 'github_url',         definition: 'VARCHAR(500) NULL' },
  ];

  for (const { table, column, definition } of columnsToAdd) {
    try {
      // Check if column already exists
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
    } catch (err) {
      console.log(`❌ Failed to add ${table}.${column}: ${err.message}`);
    }
  }

  console.log('\n🎉 Done! Checking final users table structure...');
  const [columns] = await connection.query(`SHOW COLUMNS FROM users`);
  console.log('\nFinal users table columns:');
  columns.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));

  await connection.end();
}

addMissingColumns().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
