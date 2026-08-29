const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 4321;
const DIST = path.join(__dirname, 'dist');
const TARGET = 'https://asjportal.netlify.app';

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Proxy Netlify functions
  if (req.url.startsWith('/.netlify/functions/')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const proxyReq = https.request(TARGET + req.url, {
        method: req.method,
        headers: { 'Content-Type': 'application/json' },
      }, proxyRes => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', e => {
        res.writeHead(502);
        res.end(JSON.stringify({ error: e.message }));
      });
      if (body) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // Serve dist files
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);

  // Handle directories + missing files
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  } else if (!fs.existsSync(filePath)) {
    // Try /path/index.html for clean URLs
    const indexTry = path.join(DIST, urlPath, 'index.html');
    if (fs.existsSync(indexTry)) filePath = indexTry;
    else filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => console.log('Server on http://localhost:' + PORT));
