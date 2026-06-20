// backend/src/config/add_user_points_table.js
// Run via Railway Console: node src/config/add_user_points_table.js
//
// Creates the user_points table that userController.js's dashboard
// function expects but never got created in any prior migration.

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addUserPointsTable() {
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
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        points INT NOT NULL DEFAULT 0,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ user_points table created');

    // Verify
    const [tables] = await connection.query("SHOW TABLES LIKE 'user_points'");
    if (tables.length > 0) {
      console.log('✅ Confirmed: user_points table exists');

      const [columns] = await connection.query('SHOW COLUMNS FROM user_points');
      console.log('\nColumns:');
      columns.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await connection.end();
  }
}

addUserPointsTable().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
