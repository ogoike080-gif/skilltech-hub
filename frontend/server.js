import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const BACKEND_URL = process.env.BACKEND_URL;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {

  // OAuth redirect
  if (req.url.startsWith('/api/auth/')) {
    if (!BACKEND_URL) {
      res.writeHead(500);
      return res.end('BACKEND_URL not configured');
    }

    res.writeHead(302, {
      Location: `${BACKEND_URL}${req.url}`
    });

    return res.end();
  }

  let filePath = path.join(
    DIST_DIR,
    req.url === '/' ? 'index.html' : req.url
  );

  fs.readFile(filePath, (err, data) => {

    // React Router fallback
    if (err) {

      // Only fallback for routes, not assets
      if (!path.extname(req.url)) {

        const indexPath = path.join(DIST_DIR, 'index.html');

        return fs.readFile(indexPath, (indexErr, indexData) => {
          if (indexErr) {
            res.writeHead(404);
            return res.end('Not Found');
          }

          res.writeHead(200, {
            'Content-Type': 'text/html'
          });

          res.end(indexData);
        });
      }

      res.writeHead(404);
      return res.end('Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      'Content-Type':
        mimeTypes[ext] || 'application/octet-stream'
    });

    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});