-- Skema database akun TrustGuard (Neon Postgres).
--
-- Tidak wajib dijalankan manual: lib/db.js menjalankan CREATE TABLE IF NOT EXISTS yang sama
-- secara otomatis pada query pertama. Berkas ini disediakan sebagai dokumentasi dan untuk
-- membuat tabel lebih dulu lewat SQL Editor Neon bila diinginkan.

CREATE TABLE IF NOT EXISTS tg_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,        -- huruf kecil, 3-20 karakter [a-z0-9_.], dipakai untuk login
  display_name TEXT NOT NULL,           -- nama pengguna persis seperti yang diketik pengguna
  email TEXT UNIQUE,                    -- opsional, disimpan huruf kecil
  password_hash TEXT NOT NULL,          -- scrypt, format 'scrypt$N$r$p$salt$hash' (lihat lib/auth.js)
  progress JSONB NOT NULL DEFAULT '{}'::jsonb, -- progres latihan: { "<nomor chapter>": { "ok": bool, "tries": int } }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
