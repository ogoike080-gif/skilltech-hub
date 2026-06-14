import http from 'http';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

// CHANGE THIS TO YOUR BACKEND URL
const BACKEND_URL = process.env.BACKEND_URL;

const server = http.createServer((req, res) => {

  // Proxy OAuth requests to backend
  if (req.url.startsWith('/api/auth/')) {
    if (!BACKEND_URL) {
      res.writeHead(500);
      return res.end('BACKEND_URL not configured');
    }

    return res.writeHead(302, {
      Location: `${BACKEND_URL}${req.url}`
    }).end();
  }

  let filePath = path.join(DIST_DIR, req.url);

  if (req.url === '/' || !path.extname(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found');
    }

    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
