'use strict';
/**
 * Utilitas autentikasi TrustGuard: hash kata sandi, token sesi, cookie, dan validasi masukan.
 * Hanya memakai modul bawaan Node (crypto). Dipakai oleh api/auth.js dan api/progress.js.
 *
 * Sesi bersifat stateless: token = payload + tanda tangan HMAC, disimpan di cookie HttpOnly.
 * Server tidak perlu tabel sesi; cukup memverifikasi tanda tangan dan masa berlaku.
 */
const crypto = require('crypto');

const COOKIE = 'tg_session';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000; // 30 hari
const SCRYPT = { N: 16384, r: 8, p: 1, saltLen: 16, keyLen: 32 };

/* ------------------------------------------------------------------ */
/* Kata sandi                                                           */
/* ------------------------------------------------------------------ */

/** Hash kata sandi memakai scrypt. Formatnya menyimpan parameter agar bisa dinaikkan di masa depan. */
function hashPassword(pw) {
  const salt = crypto.randomBytes(SCRYPT.saltLen);
  const key = crypto.scryptSync(String(pw), salt, SCRYPT.keyLen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

/** Membandingkan kata sandi dengan hash tersimpan. Masukan rusak -> false, bukan exception. */
function verifyPassword(pw, stored) {
  try {
    const parts = String(stored || '').split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const N = Number(parts[1]); const r = Number(parts[2]); const p = Number(parts[3]);
    const salt = Buffer.from(parts[4], 'base64');
    const expected = Buffer.from(parts[5], 'base64');
    if (!N || !r || !p || !salt.length || !expected.length) return false;
    const actual = crypto.scryptSync(String(pw), salt, expected.length, { N: N, r: r, p: p });
    return crypto.timingSafeEqual(actual, expected);
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Token sesi                                                           */
/* ------------------------------------------------------------------ */

let processSecret = null;
/**
 * Rahasia penandatangan token. Urutan: AUTH_SECRET -> turunan DATABASE_URL -> acak per proses.
 * Turunan DATABASE_URL dipakai agar sesi tetap sah antar cold start di Vercel walau AUTH_SECRET lupa diisi.
 */
function secret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.DATABASE_URL) return crypto.createHash('sha256').update('tg-session:' + process.env.DATABASE_URL).digest('hex');
  if (!processSecret) {
    processSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[auth] AUTH_SECRET belum diisi: sesi login akan hangus setiap server dimulai ulang.');
  }
  return processSecret;
}

function b64url(buf) { return Buffer.from(buf).toString('base64url'); }
function hmac(data) { return crypto.createHmac('sha256', secret()).update(data).digest(); }

/** Membuat token sesi untuk id pengguna tertentu. */
function sign(data) {
  const payload = b64url(JSON.stringify({ uid: String(data.uid), exp: Date.now() + SESSION_MS, v: 1 }));
  return payload + '.' + b64url(hmac(payload));
}

/** Memeriksa token: tanda tangan (perbandingan waktu-tetap) dan masa berlaku. Tidak sah -> null. */
function verify(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return null;
    const expected = hmac(parts[0]);
    const given = Buffer.from(parts[1], 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (!payload || payload.v !== 1 || typeof payload.uid !== 'string') return null;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Cookie                                                               */
/* ------------------------------------------------------------------ */

/** Mengurai header Cookie menjadi objek { nama: nilai }. */
function parseCookies(req) {
  const out = {};
  String(req && req.headers && req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { out[k] = part.slice(i + 1).trim(); }
  });
  return out;
}

/** Permintaan datang lewat HTTPS? Di Vercel selalu ya; lokal dicek dari header proxy. */
function isSecure(req) {
  return !!process.env.VERCEL || (req && req.headers && req.headers['x-forwarded-proto'] === 'https');
}

/** Memasang cookie sesi (HttpOnly agar tidak bisa dibaca skrip, SameSite=Lax untuk menahan CSRF lintas situs). */
function setSession(res, uid, req) {
  const parts = [COOKIE + '=' + sign({ uid: uid }), 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=' + Math.floor(SESSION_MS / 1000)];
  if (isSecure(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

/** Menghapus cookie sesi (Max-Age=0 membuat browser langsung membuangnya). */
function clearSession(res) {
  res.setHeader('Set-Cookie', COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

/** Sesi dari cookie permintaan: { uid } atau null. */
function getSession(req) {
  const payload = verify(parseCookies(req)[COOKIE]);
  return payload ? { uid: payload.uid } : null;
}

/* ------------------------------------------------------------------ */
/* Penjaga CSRF                                                         */
/* ------------------------------------------------------------------ */

/**
 * Hanya mengizinkan permintaan pengubah data dari situs ini sendiri.
 * Browser modern mengirim Origin pada fetch POST; bila host-nya beda dengan Host kita, tolak.
 * Origin yang kosong (klien non-browser, pengujian) diizinkan karena cookie SameSite=Lax sudah menahan kasus lintas situs.
 */
function sameOrigin(req) {
  const h = req && req.headers || {};
  const site = String(h['sec-fetch-site'] || '').toLowerCase();
  if (site === 'same-origin' || site === 'none') return true;
  const origin = h.origin;
  if (!origin || origin === 'null') return !origin;
  try {
    const host = String(h['x-forwarded-host'] || h.host || '').split(',')[0].trim().toLowerCase();
    return new URL(origin).host.toLowerCase() === host;
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Validasi masukan                                                     */
/* ------------------------------------------------------------------ */

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

function normUsername(s) { return String(s || '').trim().toLowerCase(); }
function validUsername(s) { return USERNAME_RE.test(normUsername(s)); }
function normEmail(s) { return String(s || '').trim().toLowerCase(); }
function validEmail(s) { const e = normEmail(s); return e.length <= 120 && EMAIL_RE.test(e); }
function validPassword(s) { return typeof s === 'string' && s.length >= PASSWORD_MIN && s.length <= PASSWORD_MAX; }

module.exports = {
  COOKIE, SESSION_MS, PASSWORD_MIN, PASSWORD_MAX,
  hashPassword, verifyPassword,
  secret, sign, verify,
  parseCookies, setSession, clearSession, getSession, isSecure,
  sameOrigin,
  normUsername, validUsername, normEmail, validEmail, validPassword
};
