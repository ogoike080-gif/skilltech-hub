const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

let pool;

// ────────────────────────────────────────────────────────────
// Connect Database
// ────────────────────────────────────────────────────────────
async function connectDB() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_NAME || 'skilltech_hub',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',

      waitForConnections: true,
      connectionLimit: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      queueLimit: 0,

      timezone: 'Z',
      charset: 'utf8mb4',
      multipleStatements: true,
    });

    // Test connection
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    logger.info('✅ MySQL connected');

    // Log current database
    try {
      const [rows] = await pool.query(
        'SELECT DATABASE() AS db'
      );

      console.log(
        'CONNECTED DATABASE:',
        rows[0]?.db || 'unknown'
      );
    } catch (err) {
      console.warn(
        'Unable to determine active database:',
        err.message
      );
    }

    // Log users table columns
    try {
      const [cols] = await pool.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
      `);

      console.log(
        'USERS TABLE COLUMNS:',
        cols.map((c) => c.COLUMN_NAME)
      );
    } catch (err) {
      console.warn(
        'Unable to inspect users table:',
        err.message
      );
    }

    return pool;
  } catch (err) {
    logger.error('❌ Database connection failed');
    logger.error(err);

    throw err;
  }
}

// ────────────────────────────────────────────────────────────
// Get Database Instance
// ────────────────────────────────────────────────────────────
function getDB() {
  if (!pool) {
    throw new Error(
      'Database not initialized. Call connectDB() first.'
    );
  }

  return pool;
}

// ────────────────────────────────────────────────────────────
// Query Helper
// Uses query() instead of execute()
// to avoid Railway/MySQL prepared statement issues
// with LIMIT, OFFSET, JSON_CONTAINS, etc.
// ────────────────────────────────────────────────────────────
async function query(sql, params = []) {
  const db = getDB();

  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error('\n========== DB ERROR ==========');
    console.error('SQL:', sql);
    console.error('PARAMS:', params);
    console.error('MESSAGE:', err.message);
    console.error('CODE:', err.code);
    console.error('STACK:', err.stack);
    console.error('==============================\n');

    throw err;
  }
}

// ────────────────────────────────────────────────────────────
// Transaction Helper
// ────────────────────────────────────────────────────────────
async function transaction(callback) {
  const db = getDB();
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const result = await callback(conn);

    await conn.commit();

    return result;
  } catch (err) {
    await conn.rollback();

    console.error('\n======= TRANSACTION ERROR =======');
    console.error(err);
    console.error('=================================\n');

    throw err;
  } finally {
    conn.release();
  }
}

// ────────────────────────────────────────────────────────────
// Graceful Shutdown
// ────────────────────────────────────────────────────────────
async function closeDB() {
  try {
    if (pool) {
      await pool.end();
      logger.info('✅ Database pool closed');
    }
  } catch (err) {
    logger.error('Error closing database pool');
    logger.error(err);
  }
}

module.exports = {
  connectDB,
  getDB,
  query,
  transaction,
  closeDB,
};