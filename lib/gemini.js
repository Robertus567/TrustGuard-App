'use strict';
/**
 * Klien Gemini untuk Guardian AI.
 *
 * Kenapa file ini ada?
 * Google rutin mematikan model lama (contohnya gemini-2.5-flash dijadwalkan mati 16 Oktober 2026).
 * Kode lama memaku satu nama model dan menelan semua error, sehingga chat diam-diam jatuh ke
 * mode lokal. Klien ini:
 *  1. mencoba beberapa nama model secara berurutan (alias "-latest" lebih dulu),
 *  2. kalau semua nama gagal dengan 404, meminta daftar model aktif langsung dari Google,
 *  3. mencoba beberapa varian parameter (model baru dan lama menerima parameter berbeda),
 *  4. mengingat model yang berhasil, dan
 *  5. melaporkan alasan kegagalan yang jelas (tanpa pernah membocorkan kunci API).
 */

/** Urutan model yang dicoba. Nilai GEMINI_MODEL dari .env selalu dicoba paling awal. */
const PREFERRED = [
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash'
];

const state = { model: null, variant: 0, bad: {} };
const BAD_TTL_MS = 10 * 60 * 1000;

class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/** Alamat dasar API. Bisa diganti lewat GEMINI_BASE_URL (dipakai pengujian otomatis). */
function baseUrl() {
  return (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
}

/** Satu panggilan HTTP dengan batas waktu. Kunci dikirim lewat header, bukan lewat URL. */
async function request(path, options, key, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl() + path, Object.assign({
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }
    }, options));
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) { /* bukan JSON, abaikan */ }
    return { status: res.status, ok: res.ok, json, text };
  } catch (e) {
    if (e && e.name === 'AbortError') throw new GeminiError('TIMEOUT', 'Gemini tidak membalas dalam batas waktu.');
    throw new GeminiError('NETWORK', 'Server tidak bisa menghubungi Gemini (' + ((e && e.cause && e.cause.code) || (e && e.message)) + ').');
  } finally {
    clearTimeout(timer);
  }
}

/** Mengambil pesan error dari respons Google. */
function errorMessage(r) {
  return (r.json && r.json.error && r.json.error.message) || String(r.text || '').slice(0, 160);
}

/** Mengelompokkan error supaya alurnya mudah diputuskan. */
function classify(status, message) {
  if (status === 400 && /api key not valid|API_KEY_INVALID|API key expired/i.test(message)) return 'AUTH';
  if (status === 401 || status === 403) return 'AUTH';
  if (status === 404) return 'MODEL';
  if (status === 429) return 'QUOTA';
  if (status === 400) return 'BAD_REQUEST';
  if (status >= 500) return 'SERVER';
  return 'UNKNOWN';
}

/** Tiga varian parameter dari yang paling lengkap sampai yang paling polos. */
function buildVariants(body) {
  const make = (cfg) => Object.assign({}, body, { generationConfig: cfg });
  return [
    make({ maxOutputTokens: 2048, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'low' } }),
    make({ maxOutputTokens: 2048, responseMimeType: 'application/json' }),
    make({ maxOutputTokens: 2048 })
  ];
}

/** Mengambil teks jawaban (bagian "thought" dilewati). */
function extractText(json) {
  const parts = json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts;
  if (!Array.isArray(parts)) return '';
  return parts.filter((p) => p && !p.thought && typeof p.text === 'string').map((p) => p.text).join('').trim();
}

function finishReason(json) {
  return (json && json.candidates && json.candidates[0] && json.candidates[0].finishReason) || (json && json.promptFeedback && json.promptFeedback.blockReason) || 'tanpa alasan';
}

function isBad(model) { return state.bad[model] && Date.now() - state.bad[model] < BAD_TTL_MS; }

/** Daftar nama model yang akan dicoba, urut prioritas, tanpa duplikat. */
function candidateList() {
  const list = [];
  [state.model, process.env.GEMINI_MODEL].concat(PREFERRED).forEach((m) => {
    const name = m && String(m).trim().replace(/^models\//, '');
    if (name && list.indexOf(name) < 0) list.push(name);
  });
  return list;
}

/** Meminta daftar model aktif dari Google dan memilih keluarga "flash" terbaru. */
async function listModels(key, timeoutMs) {
  const r = await request('/models?pageSize=200', { method: 'GET' }, key, timeoutMs);
  if (!r.ok || !r.json || !Array.isArray(r.json.models)) return [];
  const version = (n) => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
  return r.json.models
    .filter((m) => (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0)
    .map((m) => String(m.name).replace(/^models\//, ''))
    .filter((n) => /^gemini-/.test(n) && !/(image|tts|live|audio|embedding|robotics|veo|imagen|vision|computer|customtools|native|exp)/.test(n))
    .sort((a, b) => (/flash/.test(b) ? 1 : 0) - (/flash/.test(a) ? 1 : 0) || version(b) - version(a))
    .slice(0, 4);
}

/**
 * Meminta jawaban dari Gemini.
 * @returns {Promise<{text:string, model:string}>}
 * @throws {GeminiError} dengan properti .code: NO_KEY, AUTH, QUOTA, MODEL, TIMEOUT, NETWORK, EMPTY, SERVER, BAD_REQUEST
 */
async function generate(opts) {
  const key = opts.key;
  if (!key) throw new GeminiError('NO_KEY', 'GEMINI_API_KEY belum terbaca.');
  const started = Date.now();
  const budget = opts.budgetMs || 24000;
  const left = () => budget - (Date.now() - started);
  const body = { systemInstruction: { parts: [{ text: opts.system }] }, contents: opts.contents };
  const variants = buildVariants(body);
  const candidates = candidateList();
  let lastError = null;
  let listed = false;

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i];
    if (isBad(model)) continue;
    for (let v = model === state.model ? state.variant : 0; v < variants.length; v++) {
      if (left() < 1500) throw lastError || new GeminiError('TIMEOUT', 'Waktu habis sebelum Gemini menjawab.');
      const r = await request('/models/' + encodeURIComponent(model) + ':generateContent',
        { method: 'POST', body: JSON.stringify(variants[v]) }, key, Math.min(left(), 18000));
      if (r.ok) {
        const text = extractText(r.json);
        if (!text) { lastError = new GeminiError('EMPTY', 'Gemini membalas kosong (' + finishReason(r.json) + ').'); break; }
        state.model = model;
        state.variant = v;
        return { text: text, model: model };
      }
      const message = errorMessage(r);
      const code = classify(r.status, message);
      lastError = new GeminiError(code, 'HTTP ' + r.status + ' pada model ' + model + ': ' + message);
      if (code === 'AUTH') throw lastError;           // kunci salah: model lain tidak akan membantu
      if (code === 'BAD_REQUEST') continue;           // coba varian parameter yang lebih polos
      if (code === 'MODEL') state.bad[model] = Date.now();
      break;                                          // MODEL, QUOTA, SERVER: lanjut ke model berikutnya
    }
    // Semua nama bawaan habis dan masih 404: minta daftar model aktif dari Google.
    if (i === candidates.length - 1 && !listed && lastError && lastError.code === 'MODEL' && left() > 4000) {
      listed = true;
      try {
        (await listModels(key, Math.min(left(), 8000))).forEach((n) => { if (candidates.indexOf(n) < 0) candidates.push(n); });
      } catch (e) { /* daftar model gagal diambil, lanjutkan dengan yang ada */ }
    }
  }
  state.model = null;
  throw lastError || new GeminiError('UNKNOWN', 'Gemini gagal tanpa alasan yang jelas.');
}

/** Penjelasan ramah (untuk pengembang) berdasarkan kode error. Tidak pernah memuat kunci API. */
function hint(err) {
  const map = {
    NO_KEY: 'GEMINI_API_KEY belum terbaca. Pastikan file .env berada di folder yang sama dengan server.js dan berisi baris GEMINI_API_KEY=kuncimu, lalu jalankan ulang server.',
    AUTH: 'Google menolak kunci API. Buat kunci baru di Google AI Studio dan pastikan tidak ada spasi atau tanda kutip yang ikut tersalin.',
    QUOTA: 'Kuota Gemini habis atau terlalu sering dipakai. Tunggu beberapa menit atau pakai kunci lain.',
    MODEL: 'Tidak ada model Gemini yang bisa dipakai. Isi GEMINI_MODEL dengan nama model aktif dari dokumentasi Google.',
    TIMEOUT: 'Gemini terlalu lama membalas.',
    NETWORK: 'Server tidak bisa terhubung ke internet atau ke Google.',
    EMPTY: 'Gemini membalas kosong, kemungkinan diblokir filter keamanan.',
    SERVER: 'Server Gemini sedang bermasalah.',
    BAD_REQUEST: 'Gemini menolak format permintaan.'
  };
  return (map[err && err.code] || 'Gemini gagal dipakai.') + ' Detail: ' + (err && err.message);
}

/** Uji singkat saat server lokal menyala supaya masalah langsung terlihat di terminal. */
async function selfTest(key) {
  return generate({
    key: key,
    system: 'Balas hanya dengan JSON.',
    contents: [{ role: 'user', parts: [{ text: 'Balas dengan JSON persis: {"reply":"ok","mood":"happy"}' }] }],
    budgetMs: 25000
  });
}

module.exports = { generate, selfTest, hint, GeminiError, listModels, state, PREFERRED };
