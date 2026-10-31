'use strict';
/**
 * Pengujian fitur akun dan progres (lib/db.js, lib/auth.js, api/auth.js, api/progress.js).
 * Dijalankan oleh tests/run.js. Memakai driver berkas yang diarahkan ke folder sementara
 * (TG_DATA_DIR) supaya data pengembangan di .data/ tidak tersentuh.
 */
const os = require('os');
const fs = require('fs');
const path = require('path');

module.exports = async function accountTests({ test, assert, root }) {
  // Siapkan lingkungan SEBELUM modul dimuat: tanpa DATABASE_URL dan VERCEL -> driver 'file' ke folder sementara.
  const tmpDir = path.join(os.tmpdir(), 'tg-test-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  process.env.TG_DATA_DIR = tmpDir;
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  process.env.AUTH_SECRET = 'rahasia-uji-yang-cukup-panjang-untuk-hmac';

  const db = require(path.join(root, 'lib/db.js'));
  const auth = require(path.join(root, 'lib/auth.js'));
  const authApi = require(path.join(root, 'api/auth.js'));
  const progressApi = require(path.join(root, 'api/progress.js'));

  /* Tiruan req/res dengan bentuk yang sama seperti server.js dan Vercel. */
  function fakeRes() {
    const r = { code: 200, headers: {}, body: null };
    r.setHeader = (k, v) => { r.headers[k] = v; };
    r.status = (c) => { r.code = c; return r; };
    r.json = (o) => { r.body = o; return r; };
    return r;
  }
  function req(method, body, headers, query) {
    return { method, body: body || {}, headers: Object.assign({ host: 'localhost:3000', 'x-forwarded-for': '10.0.0.1' }, headers || {}), query: query || {} };
  }
  /** Mengambil nilai cookie tg_session dari header Set-Cookie. */
  function cookieOf(res) {
    const m = String(res.headers['Set-Cookie'] || '').match(/^tg_session=([^;]*)/);
    return m ? m[1] : '';
  }
  const withCookie = (token, extra) => Object.assign({ cookie: auth.COOKIE + '=' + token }, extra || {});

  console.log('\nAkun dan progres');

  await test('db: driver berkas dipakai dan describe() tidak memuat rahasia', () => {
    assert.strictEqual(db.driver(), 'file');
    assert.ok(db.enabled());
    assert.ok(/berkas lokal/.test(db.describe()), db.describe());
    process.env.DATABASE_URL = 'postgresql://pengguna_db:sandi-rahasia@ep-xyz.aws.neon.tech/neondb?sslmode=require';
    const d = db.describe();
    delete process.env.DATABASE_URL;
    assert.ok(/ep-xyz\.aws\.neon\.tech/.test(d) && !/sandi-rahasia/.test(d) && !/pengguna_db/.test(d), d);
    const info = db._internal.parseNeonUrl('postgresql://u:p@ep-abc.neon.tech/db?sslmode=require');
    assert.strictEqual(info.endpoint, 'https://ep-abc.neon.tech/sql');
    assert.strictEqual(info.database, 'db');
  });

  await test('kata sandi: hash scrypt terverifikasi, sandi salah dan hash rusak ditolak', () => {
    const h = auth.hashPassword('rahasia123');
    assert.ok(/^scrypt\$16384\$8\$1\$/.test(h));
    assert.ok(auth.verifyPassword('rahasia123', h));
    assert.ok(!auth.verifyPassword('rahasia124', h));
    assert.ok(!auth.verifyPassword('rahasia123', 'bukan-hash'));
    assert.ok(!auth.verifyPassword('rahasia123', ''));
    assert.notStrictEqual(h, auth.hashPassword('rahasia123'), 'salt harus acak');
  });

  await test('token sesi: sah, dimanipulasi, dan kedaluwarsa', () => {
    const tok = auth.sign({ uid: '42' });
    assert.strictEqual(auth.verify(tok).uid, '42');
    const [payload, sig] = tok.split('.');
    const forged = Buffer.from(JSON.stringify({ uid: '1', exp: Date.now() + 1e9, v: 1 })).toString('base64url') + '.' + sig;
    assert.strictEqual(auth.verify(forged), null);
    assert.strictEqual(auth.verify(payload + '.' + sig.slice(0, -2) + 'xx'), null);
    assert.strictEqual(auth.verify('sampah'), null);
    const realNow = Date.now;
    Date.now = () => realNow() - 31 * 24 * 60 * 60 * 1000;
    const old = auth.sign({ uid: '7' });
    Date.now = realNow;
    assert.strictEqual(auth.verify(old), null, 'token lebih dari 30 hari harus ditolak');
  });

  await test('mergeProgress: bintang lebih tinggi menang, seri -> percobaan lebih sedikit, masukan kotor dibersihkan', () => {
    const m = db.mergeProgress(
      { 1: { ok: true, tries: 2 }, 2: { ok: false, tries: 5 }, 3: { ok: true, tries: 1 }, 999: { ok: true, tries: 1 }, abc: { ok: true, tries: 1 } },
      { 1: { ok: true, tries: 1 }, 2: { ok: true, tries: 4 }, 3: { ok: true, tries: 3 }, 4: { ok: 'ya', tries: 0 }, 5: { ok: false, tries: 1000 } }
    );
    assert.deepStrictEqual(m, {
      1: { ok: true, tries: 1 }, 2: { ok: true, tries: 4 }, 3: { ok: true, tries: 1 }, 4: { ok: false, tries: 1 }, 5: { ok: false, tries: 99 }
    });
    assert.deepStrictEqual(db.mergeProgress({ 1: { ok: false, tries: 3 } }, { 1: { ok: false, tries: 2 } }), { 1: { ok: false, tries: 2 } });
    assert.deepStrictEqual(db.mergeProgress(null, 'x'), {});
  });

  let cookie = '';
  await test('signup: cookie dipasang dan GET me mengembalikan user tanpa hash', async () => {
    const r = fakeRes();
    await authApi(req('POST', { action: 'signup', username: 'Budi.01', email: 'Budi@Contoh.id', password: 'sandi-kuat-1' }), r);
    assert.strictEqual(r.code, 200, JSON.stringify(r.body));
    assert.ok(r.body.ok && r.body.user.username === 'Budi.01' && r.body.user.email === 'budi@contoh.id');
    assert.ok(/HttpOnly/.test(r.headers['Set-Cookie']) && /SameSite=Lax/.test(r.headers['Set-Cookie']) && !/Secure/.test(r.headers['Set-Cookie']));
    cookie = cookieOf(r);
    assert.ok(cookie);
    const me = fakeRes();
    await authApi(req('GET', null, withCookie(cookie)), me);
    assert.strictEqual(me.code, 200);
    assert.strictEqual(me.body.enabled, true);
    assert.strictEqual(me.body.user.username, 'Budi.01');
    assert.strictEqual(me.body.user.passwordHash, undefined);
    assert.ok(!JSON.stringify(me.body).includes('scrypt$'), 'hash bocor ke klien');
  });

  await test('signup: cookie Secure di balik HTTPS atau Vercel', async () => {
    const r = fakeRes();
    await authApi(req('POST', { action: 'signup', username: 'aman', password: 'sandi-kuat-1' }, { 'x-forwarded-proto': 'https' }), r);
    assert.strictEqual(r.code, 200);
    assert.ok(/; Secure/.test(r.headers['Set-Cookie']));
  });

  await test('signup: nama pengguna ganda -> 409, email ganda -> 409', async () => {
    const a = fakeRes();
    await authApi(req('POST', { action: 'signup', username: 'BUDI.01', password: 'sandi-kuat-1' }), a);
    assert.strictEqual(a.code, 409);
    assert.ok(/sudah dipakai/.test(a.body.error));
    const b = fakeRes();
    await authApi(req('POST', { action: 'signup', username: 'lain', email: 'budi@contoh.id', password: 'sandi-kuat-1', lang: 'en' }), b);
    assert.strictEqual(b.code, 409);
    assert.ok(/already registered/.test(b.body.error));
  });

  await test('signup: validasi nama pendek, email salah, sandi pendek -> 400', async () => {
    const a = fakeRes(); await authApi(req('POST', { action: 'signup', username: 'ab', password: 'sandi-kuat-1' }), a);
    assert.strictEqual(a.code, 400); assert.ok(/3-20/.test(a.body.error));
    const b = fakeRes(); await authApi(req('POST', { action: 'signup', username: 'valid', email: 'bukan-email', password: 'sandi-kuat-1' }), b);
    assert.strictEqual(b.code, 400);
    const c = fakeRes(); await authApi(req('POST', { action: 'signup', username: 'valid', password: 'pendek' }), c);
    assert.strictEqual(c.code, 400);
  });

  await test('login: sandi salah dan akun tak dikenal -> 401 dengan pesan sama', async () => {
    const a = fakeRes(); await authApi(req('POST', { action: 'login', login: 'budi.01', password: 'salah-sekali' }), a);
    const b = fakeRes(); await authApi(req('POST', { action: 'login', login: 'tidak.ada', password: 'salah-sekali' }), b);
    assert.strictEqual(a.code, 401); assert.strictEqual(b.code, 401);
    assert.strictEqual(a.body.error, b.body.error);
    assert.strictEqual(a.body.error, 'Nama pengguna atau kata sandi salah.');
    assert.strictEqual(a.headers['Set-Cookie'], undefined);
  });

  await test('login: berhasil lewat email (huruf besar pun boleh)', async () => {
    const r = fakeRes();
    await authApi(req('POST', { action: 'login', login: 'BUDI@contoh.id', password: 'sandi-kuat-1' }), r);
    assert.strictEqual(r.code, 200, JSON.stringify(r.body));
    assert.strictEqual(r.body.user.username, 'Budi.01');
    cookie = cookieOf(r);
    assert.ok(cookie);
  });

  await test('progress: tanpa sesi -> 401', async () => {
    const g = fakeRes(); await progressApi(req('GET'), g);
    assert.strictEqual(g.code, 401);
    assert.strictEqual(g.body.error, 'Masuk dulu untuk menyimpan progres.');
    const p = fakeRes(); await progressApi(req('PUT', { progress: { 1: { ok: true, tries: 1 } } }), p);
    assert.strictEqual(p.code, 401);
  });

  await test('progress: PUT menggabungkan (server ch1 ok tries 2, klien ch1 ok tries 1 -> tries 1) dan GET mengembalikannya', async () => {
    const first = fakeRes();
    await progressApi(req('PUT', { progress: { 1: { ok: true, tries: 2 }, 2: { ok: false, tries: 1 } } }, withCookie(cookie)), first);
    assert.strictEqual(first.code, 200, JSON.stringify(first.body));
    assert.deepStrictEqual(first.body.progress, { 1: { ok: true, tries: 2 }, 2: { ok: false, tries: 1 } });
    const second = fakeRes();
    await progressApi(req('POST', { progress: { 1: { ok: true, tries: 1 }, 2: { ok: false, tries: 3 } } }, withCookie(cookie)), second);
    assert.strictEqual(second.code, 200);
    assert.deepStrictEqual(second.body.progress, { 1: { ok: true, tries: 1 }, 2: { ok: false, tries: 1 } });
    const g = fakeRes(); await progressApi(req('GET', null, withCookie(cookie)), g);
    assert.deepStrictEqual(g.body.progress, { 1: { ok: true, tries: 1 }, 2: { ok: false, tries: 1 } });
    const me = fakeRes(); await authApi(req('GET', null, withCookie(cookie)), me);
    assert.deepStrictEqual(me.body.user.progress, g.body.progress);
  });

  await test('progress: format salah -> 400, terlalu besar -> 413', async () => {
    const a = fakeRes(); await progressApi(req('PUT', { progress: [1, 2] }, withCookie(cookie)), a);
    assert.strictEqual(a.code, 400);
    const big = {}; for (let i = 0; i < 3000; i++) big['k' + i] = { ok: true, tries: 1, pad: 'xxxxxxxxxx' };
    const b = fakeRes(); await progressApi(req('PUT', { progress: big }, withCookie(cookie)), b);
    assert.strictEqual(b.code, 413);
  });

  await test('CSRF: POST dengan origin berbeda -> 403, origin sama diizinkan', async () => {
    const a = fakeRes();
    await authApi(req('POST', { action: 'logout' }, { origin: 'https://jahat.example' }), a);
    assert.strictEqual(a.code, 403);
    assert.strictEqual(a.body.error, 'Permintaan ditolak.');
    const p = fakeRes();
    await progressApi(req('PUT', { progress: {} }, withCookie(cookie, { origin: 'https://jahat.example' })), p);
    assert.strictEqual(p.code, 403);
    const b = fakeRes();
    await authApi(req('POST', { action: 'logout' }, { origin: 'http://localhost:3000' }), b);
    assert.strictEqual(b.code, 200);
    assert.ok(/Max-Age=0/.test(b.headers['Set-Cookie']));
  });

  await test('hapus akun: butuh sesi dan sandi benar; sesudahnya GET me null', async () => {
    const noSession = fakeRes(); await authApi(req('POST', { action: 'delete', password: 'sandi-kuat-1' }), noSession);
    assert.strictEqual(noSession.code, 401);
    const wrong = fakeRes(); await authApi(req('POST', { action: 'delete', password: 'salah' }, withCookie(cookie)), wrong);
    assert.strictEqual(wrong.code, 401);
    const ok = fakeRes(); await authApi(req('POST', { action: 'delete', password: 'sandi-kuat-1' }, withCookie(cookie)), ok);
    assert.strictEqual(ok.code, 200);
    assert.ok(/Max-Age=0/.test(ok.headers['Set-Cookie']));
    const me = fakeRes(); await authApi(req('GET', null, withCookie(cookie)), me);
    assert.strictEqual(me.body.user, null);
    assert.ok(/Max-Age=0/.test(me.headers['Set-Cookie']), 'cookie yatim harus dibersihkan');
    assert.strictEqual(await db.users.findByLogin('budi.01'), null);
  });

  await test('aksi tidak dikenal -> 400, metode lain -> 405', async () => {
    const a = fakeRes(); await authApi(req('POST', { action: 'apa-ini' }), a);
    assert.strictEqual(a.code, 400);
    const b = fakeRes(); await authApi(req('DELETE', {}), b);
    assert.strictEqual(b.code, 405);
    const c = fakeRes(); await progressApi(req('PATCH', {}), c);
    assert.strictEqual(c.code, 405);
  });

  await test('batas laju: percobaan ke-11 dari IP yang sama -> 429', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = fakeRes();
      await authApi(req('POST', { action: 'login', login: 'x', password: 'y' }, { 'x-forwarded-for': '203.0.113.9' }), last);
    }
    assert.strictEqual(last.code, 429);
    assert.ok(/Terlalu banyak/.test(last.body.error));
  });

  await test('fitur nonaktif (Vercel tanpa DATABASE_URL): GET 200 enabled:false, POST/PUT 503 disabled:true', async () => {
    process.env.VERCEL = '1';
    try {
      assert.strictEqual(db.driver(), 'none');
      assert.ok(/nonaktif/.test(db.describe()));
      const g = fakeRes(); await authApi(req('GET'), g);
      assert.deepStrictEqual(g.body, { enabled: false, user: null });
      const p = fakeRes(); await authApi(req('POST', { action: 'login', login: 'a', password: 'b' }, { 'x-forwarded-for': '198.51.100.2' }), p);
      assert.strictEqual(p.code, 503); assert.strictEqual(p.body.disabled, true);
      const q = fakeRes(); await progressApi(req('PUT', { progress: {} }), q);
      assert.strictEqual(q.code, 503); assert.strictEqual(q.body.disabled, true);
    } finally {
      delete process.env.VERCEL;
    }
  });

  // Bersihkan folder sementara dan env pengujian
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* abaikan */ }
  delete process.env.TG_DATA_DIR;
  delete process.env.AUTH_SECRET;
};
