'use strict';
/**
 * /api/progress : progres latihan pengguna yang sedang masuk.
 *
 *  GET /api/progress                 -> { progress }
 *  PUT /api/progress { progress }    -> gabungkan dengan progres di server, simpan, balas { progress }
 *  (POST diterima juga sebagai alias PUT untuk klien yang membatasi metode.)
 *
 * Penggabungan memakai mergeProgress: per chapter diambil hasil terbaik, jadi mengirim progres lama
 * dari perangkat lain tidak akan menurunkan bintang yang sudah diraih.
 */
const db = require('../lib/db.js');
const auth = require('../lib/auth.js');

const MAX_BYTES = 20 * 1024; // batas ukuran JSON progres yang diterima

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const query = req.query || {};
  const lang = (body.lang || query.lang) === 'en' ? 'en' : 'id';
  const t = (id, en) => (lang === 'en' ? en : id);

  const method = req.method === 'POST' ? 'PUT' : req.method;
  if (method !== 'GET' && method !== 'PUT') return res.status(405).json({ error: t('Metode tidak didukung.', 'Method not allowed.') });

  if (!db.enabled()) {
    return res.status(503).json({ error: t('Fitur akun belum diaktifkan di server ini.', 'Accounts are not enabled on this server.'), disabled: true });
  }

  try {
    const session = auth.getSession(req);
    if (!session) return res.status(401).json({ error: t('Masuk dulu untuk menyimpan progres.', 'Sign in to save progress.') });

    if (method === 'GET') {
      const user = await db.users.get(session.uid);
      if (!user) { auth.clearSession(res); return res.status(401).json({ error: t('Sesi tidak berlaku lagi.', 'Session is no longer valid.') }); }
      return res.status(200).json({ progress: user.progress });
    }

    // PUT: ubah data, jadi wajib dari situs sendiri dan ukurannya dibatasi.
    if (!auth.sameOrigin(req)) return res.status(403).json({ error: t('Permintaan ditolak.', 'Request rejected.') });
    const incoming = body.progress;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({ error: t('Format progres tidak valid.', 'Invalid progress format.') });
    }
    let size = 0;
    try { size = Buffer.byteLength(JSON.stringify(incoming), 'utf8'); } catch (e) { size = Infinity; }
    if (size > MAX_BYTES) return res.status(413).json({ error: t('Data progres terlalu besar.', 'Progress data is too large.') });

    const user = await db.users.get(session.uid);
    if (!user) { auth.clearSession(res); return res.status(401).json({ error: t('Sesi tidak berlaku lagi.', 'Session is no longer valid.') }); }
    const merged = db.mergeProgress(user.progress, incoming);
    const saved = await db.users.saveProgress(user.id, merged);
    return res.status(200).json({ progress: saved ? saved.progress : merged });
  } catch (e) {
    console.error('[api/progress]', e && e.message);
    return res.status(500).json({ error: t('Server sedang bermasalah. Coba lagi sebentar lagi.', 'Server problem. Please try again shortly.') });
  }
};
