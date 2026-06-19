// backend/src/routes/diagnostics.js
// A self-service diagnostics endpoint. Visit it in your browser any time to
// instantly see DB connection status, table list, row counts, and env vars
// WITHOUT digging through Railway logs.
//
// Mount it in index.js with: app.use('/api/diagnostics', require('./routes/diagnostics'));
// Then visit: https://skilltech-hub-production.up.railway.app/api/diagnostics

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.get('/', async (req, res) => {
  const report = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    database: { connected: false, tables: [], rowCounts: {} },
    env: {
      DB_HOST: !!process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME || 'NOT SET',
      CLIENT_URL: process.env.CLIENT_URL || 'NOT SET',
      API_URL: process.env.API_URL || 'NOT SET',
      JWT_SECRET: !!process.env.JWT_SECRET,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
    },
    criticalTables: {},
  };

  try {
    const tables = await query('SHOW TABLES');
    report.database.connected = true;
    report.database.tables = tables.map(t => Object.values(t)[0]);

    // Check the specific tables that have caused 500 errors before
    const watchList = ['users', 'courses', 'live_sessions', 'schools', 'enrollments', 'payments'];
    for (const table of watchList) {
      if (report.database.tables.includes(table)) {
        try {
          const [{ count }] = await query(`SELECT COUNT(*) as count FROM \`${table}\``);
          report.criticalTables[table] = { exists: true, rows: count };
        } catch (e) {
          report.criticalTables[table] = { exists: true, rows: 'error: ' + e.message };
        }
      } else {
        report.criticalTables[table] = { exists: false, rows: 0 };
      }
    }
  } catch (err) {
    report.database.connected = false;
    report.database.error = err.message;
  }

  // Overall health verdict
  const missingTables = Object.entries(report.criticalTables)
    .filter(([, v]) => !v.exists)
    .map(([k]) => k);

  report.verdict = !report.database.connected
    ? '❌ Database connection FAILED — check DB_HOST/DB_USER/DB_PASSWORD'
    : missingTables.length > 0
      ? `⚠️  Missing tables: ${missingTables.join(', ')} — run migration`
      : '✅ All systems healthy';

  res.json(report);
});

module.exports = router;
