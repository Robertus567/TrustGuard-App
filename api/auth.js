'use strict';
/**
 * /api/auth : akun pengguna (daftar, masuk, keluar, hapus) dan info sesi.
 *
 *  GET  /api/auth                      -> { enabled, user }  (user = null bila belum masuk)
 *  POST /api/auth { action: 'signup', username, email?, password, lang? }
 *  POST /api/auth { action: 'login',  login, password, lang? }     (login = nama pengguna atau email)
 *  POST /api/auth { action: 'logout' }
 *  POST /api/auth { action: 'delete', password }
 *
 * Prinsip: tidak pernah mengirim hash kata sandi ke klien, tidak pernah mencatat IP, email, atau
 * kata sandi di log, dan pesan kesalahan login dibuat sama untuk akun tak dikenal maupun sandi salah
 * agar penyerang tidak bisa menebak nama pengguna yang ada.
 */
const db = require('../lib/db.js');
const auth = require('../lib/auth.js');

/* Pembatas laju di memori: 10 percobaan daftar/masuk per IP per 10 menit. IP tidak disimpan ke mana pun. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map();
function limited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  attempts.set(ip, list);
  if (attempts.size > 5000) attempts.clear();
  return list.length > MAX_ATTEMPTS;
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || 'x').split(',')[0].trim();
}

/** Bentuk pengguna yang aman dikirim ke klien (tanpa hash). username memakai ejaan asli pengguna. */
function publicUser(u) {
  return { id: u.id, username: u.displayName, email: u.email, createdAt: u.createdAt, progress: u.progress };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const query = req.query || {};
  const lang = (body.lang || query.lang) === 'en' ? 'en' : 'id';
  const t = (id, en) => (lang === 'en' ? en : id);

  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: t('Metode tidak didukung.', 'Method not allowed.') });

  // Fitur akun nonaktif (Vercel tanpa DATABASE_URL): GET tetap 200 agar UI tahu harus menyembunyikan menu Masuk.
  if (!db.enabled()) {
    if (req.method === 'GET') return res.status(200).json({ enabled: false, user: null });
    return res.status(503).json({ error: t('Fitur akun belum diaktifkan di server ini.', 'Accounts are not enabled on this server.'), disabled: true });
  }

  try {
    if (req.method === 'GET') {
      const session = auth.getSession(req);
      if (!session) return res.status(200).json({ enabled: true, user: null });
      const user = await db.users.get(session.uid);
      if (!user) { auth.clearSession(res); return res.status(200).json({ enabled: true, user: null }); } // akun sudah dihapus
      return res.status(200).json({ enabled: true, user: publicUser(user) });
    }

    // Semua aksi POST mengubah keadaan, jadi wajib berasal dari situs ini sendiri.
    if (!auth.sameOrigin(req)) return res.status(403).json({ error: t('Permintaan ditolak.', 'Request rejected.') });

    const action = String(body.action || '');

    if (action === 'signup' || action === 'login') {
      if (limited(clientIp(req))) {
        return res.status(429).json({ error: t('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.', 'Too many attempts. Please wait a few minutes and try again.') });
      }
    }

    if (action === 'signup') {
      const displayName = String(body.username || '').trim();
      const username = auth.normUsername(displayName);
      const emailRaw = String(body.email || '').trim();
      const email = emailRaw ? auth.normEmail(emailRaw) : null;
      const password = body.password;

      if (!auth.validUsername(username)) {
        return res.status(400).json({ error: t('Nama pengguna harus 3-20 karakter: huruf kecil, angka, titik, atau garis bawah.', 'Username must be 3-20 characters: lowercase letters, numbers, dots, or underscores.') });
      }
      if (email && !auth.validEmail(email)) {
        return res.status(400).json({ error: t('Format email tidak valid.', 'Invalid email format.') });
      }
      if (!auth.validPassword(password)) {
        return res.status(400).json({ error: t('Kata sandi harus 8-72 karakter.', 'Password must be 8-72 characters.') });
      }

      let user;
      try {
        user = await db.users.create({ username: username, displayName: displayName, email: email, passwordHash: auth.hashPassword(password) });
      } catch (e) {
        if (e && e.code === 'DUPLICATE') {
          return res.status(409).json({
            error: e.field === 'email' ? t('Email sudah terdaftar.', 'Email is already registered.') : t('Nama pengguna sudah dipakai.', 'Username is already taken.'),
            field: e.field
          });
        }
        throw e;
      }
      auth.setSession(res, user.id, req);
      return res.status(200).json({ ok: true, user: publicUser(user) });
    }

    if (action === 'login') {
      const login = String(body.login || '').trim().toLowerCase();
      const password = body.password;
      const wrong = () => res.status(401).json({ error: t('Nama pengguna atau kata sandi salah.', 'Wrong username or password.') });
      if (!login || typeof password !== 'string' || !password) return wrong();
      const user = await db.users.findByLogin(login);
      // Pesan sama untuk akun tak dikenal dan sandi salah supaya nama pengguna tidak bisa ditebak.
      if (!user || !auth.verifyPassword(password, user.passwordHash)) return wrong();
      auth.setSession(res, user.id, req);
      return res.status(200).json({ ok: true, user: publicUser(user) });
    }

    if (action === 'logout') {
      auth.clearSession(res);
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const session = auth.getSession(req);
      if (!session) return res.status(401).json({ error: t('Masuk dulu untuk menghapus akun.', 'Sign in to delete your account.') });
      const user = await db.users.get(session.uid);
      if (!user) { auth.clearSession(res); return res.status(401).json({ error: t('Sesi tidak berlaku lagi.', 'Session is no longer valid.') }); }
      if (typeof body.password !== 'string' || !auth.verifyPassword(body.password, user.passwordHash)) {
        return res.status(401).json({ error: t('Kata sandi salah.', 'Wrong password.') });
      }
      await db.users.remove(user.id);
      auth.clearSession(res);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: t('Aksi tidak dikenal.', 'Unknown action.') });
  } catch (e) {
    console.error('[api/auth]', e && e.message); // hanya pesan, tanpa data pengguna
    return res.status(500).json({ error: t('Server sedang bermasalah. Coba lagi sebentar lagi.', 'Server problem. Please try again shortly.') });
  }
};
