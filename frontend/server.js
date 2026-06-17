import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');

// Serve static files from Vite build output
app.use(
express.static(DIST_DIR, {
maxAge: '1y',
index: false,
})
);

// SPA fallback for React Router
app.get('*', (req, res) => {
res.sendFile(path.join(DIST_DIR, 'index.html'));
});

app.listen(PORT, () => {
console.log('Frontend server running on port ' + PORT);
});
