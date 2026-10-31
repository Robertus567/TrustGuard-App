'use strict';
/**
 * Repositori pengguna TrustGuard dengan tiga "driver" penyimpanan, tanpa dependensi npm.
 *
 *  - neon : Postgres di Neon lewat endpoint HTTP SQL (https://<host>/sql) memakai fetch bawaan Node.
 *           Dipilih otomatis bila DATABASE_URL terisi (lokal maupun Vercel).
 *  - file : berkas JSON di <proyek>/.data/users.json. Hanya untuk pengembangan di komputer sendiri;
 *           di Vercel sistem berkas bersifat sementara, jadi driver ini tidak pernah dipakai di sana.
 *  - none : fitur akun nonaktif (DATABASE_URL kosong di Vercel). Semua endpoint akun membalas 503.
 *
 * Semua fungsi repositori bersifat async dan mengembalikan bentuk objek pengguna yang sama,
 * apa pun driver-nya, supaya api/auth.js dan api/progress.js tidak perlu tahu di mana data disimpan.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TABLE = 'tg_users';
const NEON_TIMEOUT_MS = 10000;

/* ------------------------------------------------------------------ */
/* Pemilihan driver dan keterangan untuk log                            */
/* ------------------------------------------------------------------ */

/** Nama driver yang aktif, ditentukan ulang setiap kali agar perubahan env saat pengujian ikut terbaca. */
function driver() {
  if (process.env.DATABASE_URL) return 'neon';
  if (!process.env.VERCEL) return 'file';
  return 'none';
}

function enabled() { return driver() !== 'none'; }

/** Lokasi folder data driver berkas. TG_DATA_DIR dipakai pengujian agar tidak menyentuh data asli. */
function dataDir() {
  return process.env.TG_DATA_DIR || path.join(__dirname, '..', '.data');
}
function dataFile() { return path.join(dataDir(), 'users.json'); }

/** Keterangan singkat untuk ditampilkan saat server mulai. Tidak pernah memuat kata sandi atau connection string. */
function describe() {
  const d = driver();
  if (d === 'neon') {
    try {
      const info = parseNeonUrl(process.env.DATABASE_URL);
      return 'Neon Postgres (host ' + info.host + ', tabel ' + TABLE + ')';
    } catch (e) {
      return 'Neon Postgres (DATABASE_URL tidak valid: ' + e.message + ')';
    }
  }
  if (d === 'file') {
    // Lokasi bawaan ditampilkan relatif (.data/users.json); lokasi kustom (TG_DATA_DIR) ditampilkan apa adanya.
    const shown = process.env.TG_DATA_DIR ? dataFile() : path.relative(path.join(__dirname, '..'), dataFile()).split(path.sep).join('/');
    return 'berkas lokal ' + shown + ' (hanya untuk pengembangan)';
  }
  return 'nonaktif (DATABASE_URL belum diisi)';
}

/* ------------------------------------------------------------------ */
/* Sanitasi dan penggabungan progres latihan                            */
/* ------------------------------------------------------------------ */

/** Nilai "bintang" sebuah catatan chapter: lulus sekali coba = 3, lulus = 2, belum lulus = 1. */
function stars(rec) { return rec.ok ? (rec.tries === 1 ? 3 : 2) : 1; }

/**
 * Membersihkan objek progres kiriman klien. Hanya kunci chapter 1..200 yang diterima,
 * ok dipaksa boolean dan tries dipaksa bilangan bulat 1..99. Masukan bukan objek -> {}.
 */
function sanitizeProgress(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  Object.keys(obj).forEach((key) => {
    if (!/^(?:[1-9]|[1-9][0-9]|1[0-9][0-9]|200)$/.test(key)) return;
    const v = obj[key];
    if (!v || typeof v !== 'object') return;
    let tries = Math.floor(Number(v.tries));
    if (!Number.isFinite(tries)) tries = 1;
    tries = Math.min(99, Math.max(1, tries));
    out[key] = { ok: v.ok === true, tries: tries };
  });
  return out;
}

/**
 * Menggabungkan dua progres (misalnya milik server dan kiriman perangkat lain).
 * Per chapter dipilih catatan dengan bintang lebih tinggi; bila seri, yang percobaannya lebih sedikit.
 * Dengan begitu progres tidak pernah "mundur" hanya karena satu perangkat ketinggalan.
 */
function mergeProgress(a, b) {
  const left = sanitizeProgress(a);
  const right = sanitizeProgress(b);
  const out = Object.assign({}, left);
  Object.keys(right).forEach((key) => {
    const cur = out[key];
    const cand = right[key];
    if (!cur) { out[key] = cand; return; }
    const better = stars(cand) > stars(cur) || (stars(cand) === stars(cur) && cand.tries < cur.tries);
    if (better) out[key] = cand;
  });
  return out;
}

/* ------------------------------------------------------------------ */
/* Driver Neon (HTTP SQL)                                               */
/* ------------------------------------------------------------------ */

/**
 * Mengurai connection string Postgres menjadi bagian yang dibutuhkan.
 * Contoh: postgresql://user:pass@ep-abc.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
 */
function parseNeonUrl(url) {
  let u;
  try { u = new URL(String(url || '')); } catch (e) { throw new Error('format connection string tidak dikenali'); }
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') throw new Error('skema harus postgresql://');
  if (!u.hostname) throw new Error('host kosong');
  return {
    host: u.hostname,
    database: u.pathname.replace(/^\//, '') || 'neondb',
    user: decodeURIComponent(u.username || ''),
    endpoint: 'https://' + u.hostname + '/sql'
  };
}

/**
 * Menjalankan satu perintah SQL lewat HTTP. Semua nilai dikembalikan sebagai teks
 * (Neon-Raw-Text-Output), jadi jsonb di-JSON.parse sendiri dan id tetap string.
 */
async function neonQuery(sql, params) {
  const connStr = process.env.DATABASE_URL;
  const info = parseNeonUrl(connStr);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NEON_TIMEOUT_MS);
  let resp;
  let json;
  try {
    resp = await fetch(info.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': connStr,
        'Neon-Raw-Text-Output': 'true'
      },
      body: JSON.stringify({ query: sql, params: params || [] }),
      signal: ctrl.signal
    });
    const text = await resp.text();
    try { json = JSON.parse(text); } catch (e) { json = { message: text.slice(0, 200) }; }
  } catch (e) {
    const err = new Error(e && e.name === 'AbortError' ? 'Neon tidak merespons dalam 10 detik' : 'tidak bisa menghubungi Neon: ' + (e && e.message));
    err.code = 'NEON_NETWORK';
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    // Pesan dari Neon aman ditampilkan; connection string tidak pernah ikut.
    const err = new Error('Neon menolak query (' + resp.status + '): ' + (json && json.message || 'tanpa keterangan'));
    err.code = json && json.code || 'NEON_HTTP_' + resp.status;
    throw err;
  }
  return json;
}

let schemaPromise = null;
/** Membuat tabel sekali per proses (promise dimemo). Bila gagal, dicoba lagi pada panggilan berikutnya. */
function ensureSchema() {
  if (driver() !== 'neon') return Promise.resolve(false);
  if (!schemaPromise) {
    schemaPromise = neonQuery(SCHEMA_SQL, []).then(() => true).catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

const SCHEMA_SQL = [
  'CREATE TABLE IF NOT EXISTS ' + TABLE + ' (',
  '  id BIGSERIAL PRIMARY KEY,',
  '  username TEXT UNIQUE NOT NULL,',
  '  display_name TEXT NOT NULL,',
  '  email TEXT UNIQUE,',
  '  password_hash TEXT NOT NULL,',
  "  progress JSONB NOT NULL DEFAULT '{}'::jsonb,",
  '  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),',
  '  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()',
  ')'
].join('\n');

const COLS = 'id, username, display_name, email, password_hash, progress, created_at, updated_at';

/** Mengubah baris teks dari Neon menjadi objek pengguna standar. */
function rowToUser(row) {
  if (!row) return null;
  let progress = {};
  try { progress = sanitizeProgress(JSON.parse(row.progress || '{}')); } catch (e) { progress = {}; }
  return {
    id: String(row.id),
    username: row.username,
    displayName: row.display_name,
    email: row.email || null,
    passwordHash: row.password_hash,
    progress: progress,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

/** Error duplikat dengan kode seragam untuk semua driver. */
function duplicateError(field) {
  const err = new Error('duplikat ' + field);
  err.code = 'DUPLICATE';
  err.field = field;
  return err;
}

const neonUsers = {
  async create(data) {
    await ensureSchema();
    let r;
    try {
      r = await neonQuery(
        'INSERT INTO ' + TABLE + ' (username, display_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING ' + COLS,
        [data.username, data.displayName, data.email || null, data.passwordHash]
      );
    } catch (e) {
      // 23505 = unique_violation. Nama constraint bawaan Postgres: tg_users_username_key / tg_users_email_key.
      if (e && (e.code === '23505' || /unique|duplicate key/i.test(e.message))) {
        throw duplicateError(/email/i.test(e.message) ? 'email' : 'username');
      }
      throw e;
    }
    return rowToUser(r.rows && r.rows[0]);
  },
  async findByLogin(login) {
    await ensureSchema();
    const l = String(login || '').trim().toLowerCase();
    if (!l) return null;
    const r = await neonQuery('SELECT ' + COLS + ' FROM ' + TABLE + ' WHERE username = $1 OR email = $1 LIMIT 1', [l]);
    return rowToUser(r.rows && r.rows[0]);
  },
  async get(id) {
    await ensureSchema();
    if (!/^\d{1,19}$/.test(String(id))) return null;
    const r = await neonQuery('SELECT ' + COLS + ' FROM ' + TABLE + ' WHERE id = $1', [String(id)]);
    return rowToUser(r.rows && r.rows[0]);
  },
  async saveProgress(id, progress) {
    await ensureSchema();
    if (!/^\d{1,19}$/.test(String(id))) return null;
    const r = await neonQuery(
      'UPDATE ' + TABLE + ' SET progress = $2::jsonb, updated_at = now() WHERE id = $1 RETURNING ' + COLS,
      [String(id), JSON.stringify(sanitizeProgress(progress))]
    );
    return rowToUser(r.rows && r.rows[0]);
  },
  async remove(id) {
    await ensureSchema();
    if (!/^\d{1,19}$/.test(String(id))) return false;
    const r = await neonQuery('DELETE FROM ' + TABLE + ' WHERE id = $1', [String(id)]);
    return Number(r.rowCount) > 0;
  }
};

/* ------------------------------------------------------------------ */
/* Driver berkas JSON (pengembangan lokal)                              */
/* ------------------------------------------------------------------ */

/** Membaca seluruh isi berkas; berkas rusak atau belum ada dianggap kosong. */
function readStore() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
    if (parsed && Array.isArray(parsed.users)) return { nextId: Number(parsed.nextId) || 1, users: parsed.users };
  } catch (e) { /* belum ada atau rusak: mulai dari kosong */ }
  return { nextId: 1, users: [] };
}

/** Menulis secara atomik: tulis ke berkas sementara lalu rename, agar berkas tidak setengah jadi bila proses mati. */
function writeStore(store) {
  const file = dataFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + process.pid + '.' + crypto.randomBytes(4).toString('hex') + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, file);
}

/** Salinan objek pengguna agar pemanggil tidak mengubah data di dalam store tanpa sengaja. */
function cloneUser(u) {
  return u ? {
    id: String(u.id), username: u.username, displayName: u.displayName, email: u.email || null,
    passwordHash: u.passwordHash, progress: sanitizeProgress(u.progress), createdAt: u.createdAt, updatedAt: u.updatedAt
  } : null;
}

const fileUsers = {
  async create(data) {
    const store = readStore();
    if (store.users.some((u) => u.username === data.username)) throw duplicateError('username');
    if (data.email && store.users.some((u) => u.email === data.email)) throw duplicateError('email');
    const now = new Date().toISOString();
    const user = {
      id: String(store.nextId++), username: data.username, displayName: data.displayName, email: data.email || null,
      passwordHash: data.passwordHash, progress: {}, createdAt: now, updatedAt: now
    };
    store.users.push(user);
    writeStore(store);
    return cloneUser(user);
  },
  async findByLogin(login) {
    const l = String(login || '').trim().toLowerCase();
    if (!l) return null;
    return cloneUser(readStore().users.find((u) => u.username === l || (u.email && u.email === l)));
  },
  async get(id) {
    return cloneUser(readStore().users.find((u) => String(u.id) === String(id)));
  },
  async saveProgress(id, progress) {
    const store = readStore();
    const user = store.users.find((u) => String(u.id) === String(id));
    if (!user) return null;
    user.progress = sanitizeProgress(progress);
    user.updatedAt = new Date().toISOString();
    writeStore(store);
    return cloneUser(user);
  },
  async remove(id) {
    const store = readStore();
    const before = store.users.length;
    store.users = store.users.filter((u) => String(u.id) !== String(id));
    if (store.users.length === before) return false;
    writeStore(store);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Driver "none": setiap operasi gagal dengan kode DISABLED             */
/* ------------------------------------------------------------------ */

function disabledError() {
  const err = new Error('fitur akun nonaktif (DATABASE_URL belum diisi)');
  err.code = 'DISABLED';
  return err;
}
const noneUsers = {
  async create() { throw disabledError(); },
  async findByLogin() { throw disabledError(); },
  async get() { throw disabledError(); },
  async saveProgress() { throw disabledError(); },
  async remove() { throw disabledError(); }
};

/** Repositori aktif dipilih per pemanggilan supaya env yang berubah (misalnya saat pengujian) langsung berlaku. */
function repo() {
  const d = driver();
  return d === 'neon' ? neonUsers : d === 'file' ? fileUsers : noneUsers;
}
const users = {
  create: (data) => repo().create(data),
  findByLogin: (login) => repo().findByLogin(login),
  get: (id) => repo().get(id),
  saveProgress: (id, progress) => repo().saveProgress(id, progress),
  remove: (id) => repo().remove(id)
};

module.exports = {
  driver, enabled, describe, users, ensureSchema, mergeProgress, sanitizeProgress,
  _internal: { parseNeonUrl, mergeProgress, sanitizeProgress, dataFile, SCHEMA_SQL }
};
