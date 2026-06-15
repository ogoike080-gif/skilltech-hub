const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

let pool;

async function connectDB() {
  pool = mysql.createPool({
    host:               process.env.DB_HOST || 'localhost',
    port:               parseInt(process.env.DB_PORT) || 3306,
    database:           process.env.DB_NAME || 'skilltech_hub',
    user:               process.env.DB_USER || 'root',
    password:           process.env.DB_PASSWORD || '',
    waitForConnections: true,
    connectionLimit:    parseInt(process.env.DB_POOL_MAX) || 20,
    queueLimit:         0,
    timezone:           'Z',
    charset:            'utf8mb4',
  });

  // Test connection
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  return pool;
}

function getDB() {
  if (!pool) throw new Error('Database not initialized. Call connectDB() first.');
  return pool;
}

// Convenience query wrapper with logging
async function query(sql, params = []) {
  const db = getDB();
  try {
    const [rows] = await db.execute(sql, params);
    return rows;
  } catch (err) {
    logger.error('DB query error:', { sql, params, err: err.message });
    throw err;
  }
}

// Transaction helper
async function transaction(callback) {
  const db = getDB();
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { connectDB, getDB, query, transaction };


const [rows] = await pool.query('SELECT DATABASE() AS db');
console.log('CONNECTED DATABASE:', rows[0].db);

const [cols] = await pool.query(`
SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME='users'
`);

console.log(
  'USERS TABLE COLUMNS:',
  cols.map(c => c.COLUMN_NAME)
);