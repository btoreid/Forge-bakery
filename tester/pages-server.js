/* Server som oppfører seg som GitHub Pages: Cache-Control max-age, ETag og
   304 på If-None-Match. Uten max-age ville testen aldri sett cache-plagen
   Bjørn beskriver — python http.server sender ingen av delene. */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const logg = [];

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  // Testkrok: hva har serveren faktisk svart? Nullstiller samtidig.
  if (p === '/__logg') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    const ut = JSON.stringify(logg); logg.length = 0; return res.end(ut);
  }
  if (p.endsWith('/')) p += 'index.html';
  const fil = path.join(ROT, p);
  if (!fil.startsWith(ROT) || !fs.existsSync(fil) || fs.statSync(fil).isDirectory()) {
    res.writeHead(404); return res.end('ikke funnet');
  }
  const buf = fs.readFileSync(fil);
  const etag = '"' + crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16) + '"';
  logg.push({ url: p, cc: req.headers['cache-control'] || '', inm: req.headers['if-none-match'] || '' });
  if (process.env.LOGG) console.error('REQ ' + p + '  cc=' + (req.headers['cache-control'] || '-') + '  etag-sendt=' + (req.headers['if-none-match'] ? 'ja' : 'nei'));
  if (req.headers['if-none-match'] === etag) {
    logg[logg.length - 1].status = 304;
    res.writeHead(304, { 'ETag': etag, 'Cache-Control': 'max-age=600' });
    return res.end();
  }
  logg[logg.length - 1].status = 200;
  logg[logg.length - 1].bytes = buf.length;
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(fil)] || 'application/octet-stream',
    'Content-Length': buf.length,
    'ETag': etag,
    'Cache-Control': 'max-age=600',        // som GitHub Pages
    'Last-Modified': fs.statSync(fil).mtime.toUTCString()
  });
  res.end(buf);
}).listen(8124, () => console.log('kjører på 8124'));

process.on('SIGUSR2', () => { console.log(JSON.stringify(logg.slice(-40))); logg.length = 0; });
