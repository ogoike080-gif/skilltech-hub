// backend/src/config/migrate.js
// Run via Railway backend Console: node src/config/migrate.js
// Splits schema.sql into individual statements and runs them one by one,
// so a single failed INSERT (e.g. column mismatch) doesn't block the rest.

const fs = require('fs');
const path = require('path');
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
    multipleStatements: true,
  });

  console.log('✅ Connected to:', process.env.DB_NAME);

  const sqlPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ schema.sql not found at', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`📄 Loaded schema.sql (${sql.length} chars).`);

  // Split into individual statements on semicolons that end a line,
  // while ignoring semicolons inside string literals/comments (simple heuristic
  // good enough for phpMyAdmin-style dumps).
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`🔧 Running ${statements.length} statements individually...\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const stmt of statements) {
    try {
      await connection.query(stmt);
      if (/^CREATE TABLE/i.test(stmt)) {
        const match = stmt.match(/`(\w+)`/);
        console.log(`✅ Created table: ${match ? match[1] : '?'}`);
        created++;
      }
    } catch (err) {
      // Table already exists / column mismatch on INSERT — log and continue
      const preview = stmt.slice(0, 60).replace(/\n/g, ' ');
      console.log(`⚠️  Skipped (${err.code || err.message}): ${preview}...`);
      skipped++;
      if (err.code && !err.code.startsWith('ER_')) failed++;
    }
  }

  console.log(`\n🎉 Migration finished.`);
  console.log(`   Tables created: ${created}`);
  console.log(`   Statements skipped/errored: ${skipped}`);

  const [tables] = await connection.query('SHOW TABLES');
  console.log(`\n✅ Database now has ${tables.length} tables total:`);
  tables.forEach(t => console.log('  -', Object.values(t)[0]));

  await connection.end();
}

migrate().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
