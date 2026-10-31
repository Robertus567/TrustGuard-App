'use strict';
/**
 * Server lokal TrustGuard (tanpa dependensi npm).
 *
 * Dipakai untuk menjalankan aplikasi di komputer sendiri: `node server.js` atau klik start.bat.
 * Saat di-deploy ke Vercel, file ini TIDAK dipakai: Vercel menyajikan folder public/ sebagai situs statis
 * dan menjalankan setiap berkas di folder api/ sebagai serverless function.
 *
 * Supaya perilaku lokal dan Vercel sama, server ini meniru hal-hal kecil yang disediakan Vercel:
 *  - req.body sudah berupa objek (JSON) untuk POST/PUT,
 *  - req.query berisi parameter URL,
 *  - res.status(kode).json(objek) tersedia.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { loadEnv, maskKey } = require('./lib/env');

// Muat .env sebelum modul lain dibaca
const envFiles = loadEnv(__dirname);

const gemini = require('./lib/gemini.js');

const PUBLIC_DIR = path.join(__dirname, 'public');
const API_DIR = path.join(__dirname, 'api');

/** Tipe konten per ekstensi. .gz dan .traineddata dipakai data bahasa OCR, .mjs dan .wasm dipakai pdf.js dan Tesseract. */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.gz': 'application/gzip',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.traineddata': 'application/octet-stream'
};

/**
 * Header keamanan. Samakan dengan vercel.json bila diubah.
 * - 'wasm-unsafe-eval' dibutuhkan agar OCR (Tesseract, WebAssembly) dan pdf.js boleh berjalan di browser.
 * - blob: pada img-src dan worker-src dipakai untuk pratinjau gambar yang diunggah dan worker pdf.js.
 * - connect-src 'self' berarti browser hanya boleh menghubungi situs ini sendiri (tidak ada pelacak pihak ketiga).
 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' data:; worker-src 'self' blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
};

function send(res, status, type, body, cache) {
  Object.keys(SECURITY_HEADERS).forEach((k) => res.setHeader(k, SECURITY_HEADERS[k]));
  res.statusCode = status;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', cache || 'no-cache');
  res.end(body);
}

/** Menyajikan berkas statis dengan perlindungan path traversal dan URL bersih (/scanner -> scanner.html). */
function serveStatic(res, pathname) {
  let rel = pathname === '/' ? '/index.html' : pathname;
  if (!path.extname(rel)) rel += '.html';
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (file.indexOf(PUBLIC_DIR + path.sep) !== 0) return notFound(res);
  fs.readFile(file, (err, data) => {
    if (err) return notFound(res);
    const ext = path.extname(file);
    // Berkas vendor berukuran besar (OCR, pdf.js) boleh di-cache lama oleh browser
    const cache = rel.indexOf('/assets/vendor/') === 0 ? 'public, max-age=604800' : 'no-cache';
    send(res, 200, MIME[ext] || 'application/octet-stream', data, cache);
  });
}

function notFound(res) {
  fs.readFile(path.join(PUBLIC_DIR, '404.html'), (err, data) => {
    send(res, 404, 'text/html; charset=utf-8', err ? '404' : data);
  });
}

/** Membaca body JSON (maksimal 64 KB, cukup untuk chat dan progres latihan). */
async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64000) break;
  }
  try { return JSON.parse(raw || '{}'); } catch (e) { return {}; }
}

/** Memuat handler API dari folder api/ bila ada (api/chat.js, api/auth.js, api/progress.js). */
const handlers = {};
function apiHandler(name) {
  if (!/^[a-z-]+$/.test(name)) return null;
  if (handlers[name] === undefined) {
    const file = path.join(API_DIR, name + '.js');
    handlers[name] = fs.existsSync(file) ? require(file) : null;
  }
  return handlers[name];
}

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch (e) { return notFound(res); }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch (e) { return notFound(res); }

  const api = pathname.match(/^\/api\/([a-z-]+)\/?$/);
  if (api) {
    const handler = apiHandler(api[1]);
    if (!handler) return send(res, 404, 'application/json; charset=utf-8', '{"error":"Endpoint tidak ada."}');
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') ? await readBody(req) : {};
    // Penyesuaian kecil agar handler gaya Vercel (res.status().json()) bisa jalan di sini
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => send(res, res.statusCode || 200, 'application/json; charset=utf-8', JSON.stringify(obj), 'no-store');
    try { return await handler(req, res); } catch (e) {
      console.error('[api/' + api[1] + ']', e && e.message);
      return send(res, 500, 'application/json; charset=utf-8', '{"error":"Server error"}');
    }
  }
  serveStatic(res, pathname);
});

let port = Number(process.env.PORT) || 3000;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < 3010) { port += 1; server.listen(port, '127.0.0.1'); }
  else { console.error(e.message); process.exit(1); }
});

server.on('listening', () => {
  const url = 'http://127.0.0.1:' + port;
  const key = process.env.GEMINI_API_KEY;
  console.log('\nTrustGuard berjalan di ' + url);
  console.log('File env terbaca : ' + (envFiles.length ? envFiles.join(', ') : '(tidak ada, buat file .env dari .env.example)'));
  console.log('Kunci Gemini     : ' + maskKey(key));
  // Status database akun (Neon di produksi, berkas lokal saat pengembangan)
  try {
    const db = require('./lib/db.js');
    console.log('Database akun    : ' + db.describe());
  } catch (e) { console.log('Database akun    : modul lib/db.js belum ada (fitur akun nonaktif)'); }
  if (key) {
    console.log('Menguji koneksi Gemini...');
    gemini.selfTest(key)
      .then((r) => console.log('[OK] Gemini aktif memakai model: ' + r.model + '\n'))
      .catch((e) => console.log('[!] Gemini belum bisa dipakai, chat memakai mode lokal.\n    ' + gemini.hint(e) + '\n'));
  } else {
    console.log('[i] Tanpa kunci, Guardian AI memakai mode lokal (tetap berfungsi).\n');
  }
  console.log('Tekan Ctrl+C untuk berhenti.\n');
  if (process.env.OPEN === '1') {
    const cmd = process.platform === 'win32' ? 'start "" "' + url + '"' : process.platform === 'darwin' ? 'open "' + url + '"' : 'xdg-open "' + url + '"';
    exec(cmd);
  }
});

server.listen(port, '127.0.0.1');
