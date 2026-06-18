// backend/src/config/migrate.js
// Run this ONCE via Railway backend Console: node src/config/migrate.js
// This imports your full schema.sql directly into the connected MySQL database.

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
    multipleStatements: true, // REQUIRED to run a full .sql file at once
  });

  console.log('✅ Connected to:', process.env.DB_NAME);

  const sqlPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ schema.sql not found at', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log(`📄 Loaded schema.sql (${sql.length} chars). Running migration...`);

  try {
    await connection.query(sql);
    console.log('🎉 Migration completed successfully!');

    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\n✅ Database now has ${tables.length} tables:`);
    tables.forEach(t => console.log('  -', Object.values(t)[0]));
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
