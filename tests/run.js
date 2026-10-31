'use strict';
/**
 * Pengujian otomatis TrustGuard (tanpa dependensi). Jalankan: npm test
 * Mencakup: mesin aturan, penyensor, klien Gemini (dengan server Gemini tiruan), handler chat,
 * integritas 40 chapter latihan, dan larangan tanda pisah panjang di seluruh teks.
 */
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

let passed = 0;
const failures = [];
async function test(name, fn) {
  try { await fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failures.push(name); console.log('  GAGAL ' + name + '\n       ' + (e && e.message)); }
}

/** Server Gemini tiruan: gemini-2.5-flash sudah "dimatikan", model lain hidup. */
function startMock(behavior) {
  const calls = [];
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const url = req.url;
      calls.push(url);
      res.setHeader('Content-Type', 'application/json');
      if (req.headers['x-goog-api-key'] !== 'KUNCI-UJI') { res.statusCode = 400; return res.end(JSON.stringify({ error: { message: 'API key not valid. Please pass a valid API key.' } })); }
      if (url.startsWith('/models?')) return res.end(JSON.stringify({ models: [
        { name: 'models/gemini-9.9-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-9.9-flash-image', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] }] }));
      const model = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
      const cfg = JSON.parse(body || '{}').generationConfig || {};
      if (behavior.dead.indexOf(model) >= 0) { res.statusCode = 404; return res.end(JSON.stringify({ error: { message: 'This model models/' + model + ' is no longer available.' } })); }
      if (behavior.rejectThinking && cfg.thinkingConfig) { res.statusCode = 400; return res.end(JSON.stringify({ error: { message: 'Unknown field thinkingConfig' } })); }
      const text = behavior.text || '{"reply":"Jawaban uji **tebal** \u2014 dengan tanda pisah","mood":"alert"}';
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ thought: true, text: 'berpikir...' }, { text: text }] } }] }));
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok({ srv, calls, url: 'http://127.0.0.1:' + srv.address().port })));
}

function fakeRes() {
  const r = { code: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (o) => { r.body = o; return r; };
  return r;
}
const post = (body, ip) => ({ method: 'POST', body, headers: { 'x-forwarded-for': ip || '1.1.1.1' } });

(async () => {
  const TG = require(path.join(root, 'public/assets/js/rules.js'));

  console.log('\nMesin aturan dan penyensor');
  await test('pesan OTP + hadiah terdeteksi tinggi', () => {
    const a = TG.analyze('Selamat! Kamu menang hadiah. Klik link dan kirim kode OTP sekarang juga!');
    assert.strictEqual(a.level, 'high'); assert.ok(a.found.some((f) => f.id === 'otp'));
  });
  await test('pesan biasa tetap rendah', () => assert.strictEqual(TG.analyze('Jadi ketemu jam 3 sore di perpustakaan ya?').level, 'low'));
  await test('domain tiruan bank terdeteksi', () => {
    const a = TG.analyze('Verifikasi di http://bca-verifikasi-nasabah.xyz sekarang');
    assert.ok(a.found.some((f) => f.id === 'u-brand') && a.found.some((f) => f.id === 'u-tld'));
  });
  await test('domain resmi tidak dianggap tiruan', () => assert.ok(!TG.analyze('buka https://www.bca.co.id').found.some((f) => f.id === 'u-brand')));
  await test('pola bahasa Inggris terdeteksi', () => {
    const a = TG.analyze('Congratulations! You have won a prize. Pay the processing fee and send your verification code within 10 minutes.');
    assert.strictEqual(a.level, 'high');
  });
  await test('sensor: OTP, kartu, telepon, email, KTP', () => {
    const r = TG.redact('OTP 482913, kartu 4111 1111 1111 1111, hp 081234567890, a@b.com, ktp 3201234567890001');
    assert.ok(!/482913|4111|081234|a@b\.com|3201234567890001/.test(r.text), r.text);
    assert.ok(r.count >= 5 && /OTP/.test(r.text));
  });
  await test('sensor tidak merusak nominal rupiah', () => assert.strictEqual(TG.redact('Transfer Rp150.000 ya').text, 'Transfer Rp150.000 ya'));

  console.log('\nKlien Gemini dan handler chat');
  const gemini = require(path.join(root, 'lib/gemini.js'));
  const chat = require(path.join(root, 'api/chat.js'));
  const mock = await startMock({ dead: ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash'], rejectThinking: true });
  process.env.GEMINI_BASE_URL = mock.url;
  process.env.GEMINI_API_KEY = 'KUNCI-UJI';
  delete process.env.VERCEL; delete process.env.NODE_ENV;

  await test('semua nama bawaan mati: model ditemukan lewat ListModels + varian tanpa thinking', async () => {
    const r = await gemini.generate({ key: 'KUNCI-UJI', system: 's', contents: [{ role: 'user', parts: [{ text: 'hai' }] }] });
    assert.strictEqual(r.model, 'gemini-9.9-flash');
  });
  await test('model yang berhasil diingat (tanpa mencoba ulang model mati)', async () => {
    mock.calls.length = 0;
    await gemini.generate({ key: 'KUNCI-UJI', system: 's', contents: [{ role: 'user', parts: [{ text: 'hai' }] }] });
    assert.ok(mock.calls.length <= 2, 'terlalu banyak panggilan: ' + mock.calls.length);
  });
  await test('kunci salah dilaporkan sebagai AUTH tanpa mencoba model lain', async () => {
    let err; try { await gemini.generate({ key: 'SALAH', system: 's', contents: [{ role: 'user', parts: [{ text: 'x' }] }] }); } catch (e) { err = e; }
    assert.ok(err && err.code === 'AUTH');
  });
  await test('chat: jawaban Gemini dipakai, bagian thought dilewati, tanda pisah panjang dibersihkan', async () => {
    const res = fakeRes();
    await chat(post({ lang: 'id', messages: [{ role: 'user', text: 'Aku dapat pesan hadiah dan diminta kirim OTP. Ini penipuan?' }] }), res);
    assert.strictEqual(res.code, 200);
    assert.ok(/Jawaban uji/.test(res.body.reply) && !/[\u2013\u2014]/.test(res.body.reply), res.body.reply);
    assert.strictEqual(res.body.mood, 'alert');
    assert.strictEqual(res.body.dev.ai, 'gemini');
  });
  await test('chat: OTP dan nomor di pesan disamarkan sebelum dikirim ke Gemini', async () => {
    let seen = '';
    const original = global.fetch;
    global.fetch = async (u, o) => { if (o && o.body) seen += o.body; return original(u, o); };
    const res = fakeRes();
    await chat(post({ messages: [{ role: 'user', text: 'kode OTP saya 998877 dan hp 081234567890, aman?' }] }, '2.2.2.2'), res);
    global.fetch = original;
    assert.ok(seen && !/998877|081234567890/.test(seen), 'data sensitif bocor ke Gemini');
  });
  await test('chat: produksi tidak mengirim info mode AI sama sekali', async () => {
    process.env.VERCEL = '1';
    const res = fakeRes();
    await chat(post({ messages: [{ role: 'user', text: 'halo' }] }, '3.3.3.3'), res);
    delete process.env.VERCEL;
    assert.strictEqual(res.body.dev, undefined);
  });
  await test('chat: tanpa kunci memakai jawaban lokal yang tetap berguna (id dan en)', async () => {
    const saved = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
    const a = fakeRes(); await chat(post({ lang: 'id', messages: [{ role: 'user', text: 'Kirim OTP agar hadiah cair' }] }, '4.4.4.4'), a);
    const b = fakeRes(); await chat(post({ lang: 'en', messages: [{ role: 'user', text: 'Send OTP so the prize is released' }] }, '5.5.5.5'), b);
    process.env.GEMINI_API_KEY = saved;
    assert.ok(/tanda bahaya/.test(a.body.reply) && /warning signs/.test(b.body.reply));
    assert.strictEqual(a.body.dev.ai, 'local');
  });
  await test('chat: Gemini error jatuh ke lokal, dan produksi tidak membocorkan alasan', async () => {
    process.env.GEMINI_API_KEY = 'SALAH'; process.env.VERCEL = '1';
    const res = fakeRes(); await chat(post({ messages: [{ role: 'user', text: 'transfer dulu ya' }] }, '6.6.6.6'), res);
    process.env.GEMINI_API_KEY = 'KUNCI-UJI'; delete process.env.VERCEL;
    assert.ok(res.body.reply.length > 20 && res.body.dev === undefined);
  });
  await test('chat: pesan kosong ditolak dan batas laju bekerja', async () => {
    const a = fakeRes(); await chat(post({ messages: [] }, '7.7.7.7'), a); assert.strictEqual(a.code, 400);
    let last; for (let i = 0; i < 17; i++) { last = fakeRes(); await chat(post({ messages: [{ role: 'user', text: 'tes ' + i }] }, '8.8.8.8'), last); }
    assert.strictEqual(last.code, 429);
  });
  mock.srv.close();

  console.log('\nPembaca .env');
  const { parse, decode } = require(path.join(root, 'lib/env.js'));
  await test('.env dengan BOM UTF-8, UTF-16, CRLF, dan tanda kutip terbaca benar', () => {
    assert.strictEqual(parse(decode(Buffer.from('\uFEFFGEMINI_API_KEY=abc123\r\nGEMINI_MODEL=\r\n', 'utf8'))).GEMINI_API_KEY, 'abc123');
    const u16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('GEMINI_API_KEY="xyz"\r\n', 'utf16le')]);
    assert.strictEqual(parse(decode(u16)).GEMINI_API_KEY, 'xyz');
    assert.strictEqual(parse("export GEMINI_API_KEY = 'k1' # komentar").GEMINI_API_KEY, 'k1');
  });

  // Pengujian konten diaktifkan otomatis bila berkasnya sudah ada
  const contentTests = path.join(__dirname, 'content.js');
  if (fs.existsSync(contentTests)) await require(contentTests)({ test, assert, root });

  // Pengujian akun dan progres (driver berkas ke folder sementara)
  const accountTests = path.join(__dirname, 'account.js');
  if (fs.existsSync(accountTests)) await require(accountTests)({ test, assert, root });

  console.log('\n' + passed + ' lulus, ' + failures.length + ' gagal.');
  process.exit(failures.length ? 1 : 0);
})();
