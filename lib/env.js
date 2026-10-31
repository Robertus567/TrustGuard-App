'use strict';
/**
 * Pembaca file .env yang tahan banting.
 * Menangani kasus yang sering terjadi di Windows:
 *  - file disimpan dengan BOM UTF-8 (baris pertama jadi tidak terbaca),
 *  - file disimpan UTF-16 oleh PowerShell,
 *  - baris berakhiran CRLF, memakai tanda kutip, atau diawali "export",
 *  - file tersimpan sebagai ".env.txt" karena ekstensi disembunyikan.
 */
const fs = require('fs');
const path = require('path');

/** Mengubah buffer file menjadi teks, apa pun encoding-nya. */
function decode(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf.slice(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  const text = buf.toString('utf8');
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Mengurai isi .env menjadi objek { NAMA: nilai }. */
function parse(text) {
  const out = {};
  text.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) return;
    let value = m[2];
    if (/^["']/.test(value)) {
      const quote = value[0];
      const end = value.indexOf(quote, 1);
      value = end > 0 ? value.slice(1, end) : value.slice(1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    out[m[1]] = value.trim();
  });
  return out;
}

/** Memuat .env, .env.local, dan .env.txt dari folder proyek ke process.env (tanpa menimpa nilai yang sudah ada). */
function loadEnv(dir) {
  const found = [];
  ['.env', '.env.local', '.env.txt'].forEach((name) => {
    let buf;
    try { buf = fs.readFileSync(path.join(dir, name)); } catch (e) { return; }
    found.push(name);
    const vars = parse(decode(buf));
    Object.keys(vars).forEach((k) => { if (vars[k] && !process.env[k]) process.env[k] = vars[k]; });
  });
  return found;
}

/** Menyamarkan kunci API untuk ditampilkan di log. */
function maskKey(key) {
  if (!key) return '(kosong)';
  return key.slice(0, 4) + '...' + key.slice(-3) + ' (' + key.length + ' karakter)';
}

module.exports = { loadEnv, parse, decode, maskKey };
