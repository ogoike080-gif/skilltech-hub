// Minimal production static server with SPA fallback for React Router
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// Serve static assets (JS, CSS, images) with long cache
app.use(express.static(DIST_DIR, {
  maxAge: '1y',
  index: false, // don't auto-serve index.html for directory requests
}));

// SPA fallback — send index.html for ANY route not matched above
// This is what makes /auth/callback, /dashboard, /login etc. work on refresh
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
