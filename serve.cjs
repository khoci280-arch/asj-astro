const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const mimeTypes = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const dist = path.join(__dirname, 'dist');
const PROXY_TARGET = 'https://asjportal.netlify.app';

const server = http.createServer((req, res) => {
  // Proxy Netlify functions to production
  if (req.url.startsWith('/.netlify/functions/')) {
    const targetUrl = PROXY_TARGET + req.url;
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const proxyReq = https.request(targetUrl, { method: req.method, headers: { ...req.headers, host: 'asjportal.netlify.app' } }, proxyRes => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', (e) => { res.writeHead(502); res.end('Proxy error: ' + e.message); });
      if (body) proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }
  // Static files
  let fp = path.join(dist, req.url === '/' ? '/index.html' : req.url);
  if (!fs.existsSync(fp) && !path.extname(fp)) fp = path.join(dist, 'index.html');
  if (!fs.existsSync(fp)) { res.writeHead(404); res.end('Not found'); return; }
  const ext = path.extname(fp);
  res.writeHead(200, {'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
  fs.createReadStream(fp).pipe(res);
});
server.listen(4321, () => console.log('Serving + proxying on http://localhost:4321'));
