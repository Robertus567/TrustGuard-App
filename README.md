# TrustGuard

**Kenali, belajar, bertindak melawan tipuan digital.**
Aplikasi web edukasi untuk anak muda Indonesia yang dibuat untuk **MIT-Week 2026: Guardians of the Digital Space** (studi kasus *The Trust Trap: Navigating Digital Deception*).

TrustGuard membantu pengguna di tiga momen: saat **ragu** pada sebuah pesan (Scanner dan Guardian AI), saat ingin **makin jeli** (Latihan 40 chapter dengan 4 tingkat guardian), dan saat sesuatu **sudah terlanjur terjadi** (Langkah Aman dan kanal pelaporan resmi). Semua fitur inti berjalan di browser dan tetap berguna **tanpa akun**.

---

## Daftar isi

1. [Fitur utama](#1-fitur-utama)
2. [Cara memenuhi studi kasus](#2-cara-memenuhi-studi-kasus)
3. [Menjalankan di komputer sendiri](#3-menjalankan-di-komputer-sendiri)
4. [Deploy ke Vercel dan Neon](#4-deploy-ke-vercel-dan-neon)
5. [Arsitektur dan alur data](#5-arsitektur-dan-alur-data)
6. [Struktur folder](#6-struktur-folder)
7. [Akun, progres, dan sistem tier](#7-akun-progres-dan-sistem-tier)
8. [Scanner berkas (PDF, Word, gambar)](#8-scanner-berkas-pdf-word-gambar)
9. [Guardian AI](#9-guardian-ai)
10. [Privasi dan keamanan](#10-privasi-dan-keamanan)
11. [Pengujian](#11-pengujian)
12. [Sumber, pustaka, dan kredit](#12-sumber-pustaka-dan-kredit)
13. [Keterbatasan yang jujur](#13-keterbatasan-yang-jujur)
14. [Lisensi](#14-lisensi)

---

## 1. Fitur utama

| Fitur | Pendekatan | Apa yang dilakukan | Di mana berjalan |
|---|---|---|---|
| **Scanner** | Recognize | Tempel pesan, tautan, atau tawaran; dapatkan skor risiko 0-100, tingkat (rendah/sedang/tinggi), dan **alasan untuk setiap tanda bahaya** (36 pola isi pesan + 6 pemeriksaan tautan: domain tiruan merek, ekstensi berisiko, tautan pendek, IP mentah, punycode, berkas APK). | Browser (rules.js) |
| **Scanner berkas** | Recognize | Unggah **tangkapan layar / foto chat** (OCR), **PDF** (lapisan teks + anotasi tautan), atau **DOCX** (teks + hyperlink). Teks hasil ekstraksi bisa dikoreksi, lalu dianalisis mesin aturan yang sama. | Browser (pdf.js, JSZip, Tesseract.js WebAssembly). Berkas **tidak pernah diunggah**. |
| **Guardian AI** | Recognize | Ceritakan situasi dengan bahasa sendiri atau tanya hal umum keamanan digital. Jawaban dibangun di atas analisis aturan + **basis pengetahuan terkurasi** (OJK, Komdigi, BI, Polri, KemenPPPA, FTC, CISA, NIST), ditulis oleh Gemini bila tersedia, atau disusun lokal bila tidak. Data sensitif disamarkan dua lapis sebelum keluar. | Server (api/chat.js), opsional Gemini API |
| **Latihan** | Learn | 40 kasus fiktif realistis dalam **8 jalur** (lowongan kerja, hadiah, penyamaran, investasi dan pinjaman, tautan, akun, belanja, medsos dan hoaks). Tiga pilihan, umpan balik yang menjelaskan **mengapa tiap pilihan benar atau kurang tepat**, bintang, dan **4 tingkat guardian**. | Browser; progres ke server bila masuk akun |
| **Langkah Aman** | Act | Pilih situasi (sudah klik tautan, bagikan OTP, sudah transfer, diancam, akun diretas, ragu), ikuti daftar periksa, salin atau bagikan pesan peringatan ke teman, dan buka **7 kanal pelaporan resmi** yang sudah diverifikasi. | Browser |
| **Akun (opsional)** | Pendukung | Nama pengguna + kata sandi (email opsional). Menyimpan progres latihan dan tier ke **Neon PostgreSQL**. Profil, unduh data (JSON), hapus akun. | Server (api/auth.js, api/progress.js) |
| **Guardian** (karakter) | UX | Gadis mecha anime yang digambar sendiri (SVG): 16 suasana hati, bereaksi pada hasil Scanner, jawaban latihan, kolom formulir (menutup mata saat kata sandi diketik), bisa dielus, diangkat, diputar, dan tertidur bila lama diabaikan. | Browser |

Dua bahasa (Indonesia dan Inggris) di seluruh antarmuka, efek suara sintetis (bisa dimatikan), responsif sampai layar 360 px, dan aman di browser dalam aplikasi (Instagram, TikTok).

## 2. Cara memenuhi studi kasus

| Ketentuan panitia | Implementasi TrustGuard |
|---|---|
| Minimal satu fitur utama yang **merespons input pengguna** | Scanner (teks dan berkas), Guardian AI, Latihan, dan Langkah Aman semuanya menghasilkan keluaran yang bergantung pada input atau pilihan pengguna. |
| Dapat diuji pada tautan live, satu alur sampai hasil, tanpa error | Alur 30 detik: buka `/scanner`, klik contoh "Hadiah dan OTP", lihat skor dan alasan, klik "Tanya Guardian AI". Tidak ada dependensi npm; tidak ada langkah build. |
| Berguna **tanpa data sensitif**; hindari mengumpulkan data pribadi | Tidak ada fitur yang meminta nama asli, nomor HP, atau identitas. Akun opsional hanya butuh nama panggilan dan kata sandi. Penyensor otomatis menutup OTP, kartu, KTP, telepon, dan email sebelum chat dikirim. |
| Contoh fiktif, tidak menghosting konten berbahaya nyata | Semua domain dan merek dalam contoh latihan adalah rekaan. Tidak ada tautan ke situs penipuan. |
| **Transparan tentang keterbatasan**, tidak mengklaim deteksi pasti | Setiap hasil Scanner dan jawaban AI memuat kalimat "petunjuk awal, bukan bukti aman atau penipuan". Halaman Privasi memuat bagian "Batas kami". |
| Jelaskan bila input dikirim ke pihak ketiga (API AI) | Dialog persetujuan sebelum pesan pertama di Guardian AI, bagian "Cara AI dipakai" di halaman Privasi, dan catatan di footer. |
| README dan video menjelaskan pendekatan | Dokumen ini (bagian 1, 2, 5, 9, 10). |

## 3. Menjalankan di komputer sendiri

Prasyarat: **Node.js 18+** (disarankan 20 atau lebih baru). Tidak ada `npm install`.

```bash
node local-server.js
```

Lalu buka http://127.0.0.1:3000. Di Windows cukup klik dua kali `start.bat` (ia memeriksa Node, membuat `.env`, dan membuka browser). Di Mac/Linux: `./start.sh`.

Variabel lingkungan (semua **opsional**, lihat `.env.example`):

| Variabel | Fungsi | Jika kosong |
|---|---|---|
| `GEMINI_API_KEY` | Mengaktifkan jawaban Gemini di Guardian AI. Kunci gratis dari https://aistudio.google.com/apikey | Guardian AI memakai mode lokal (aturan + basis pengetahuan). |
| `GEMINI_MODEL` | Memaksa nama model tertentu. | Klien memilih model `flash` yang masih aktif secara otomatis. |
| `DATABASE_URL` | Connection string PostgreSQL dari Neon untuk fitur akun. | Lokal: akun disimpan di berkas `.data/users.json` (hanya untuk pengembangan). Vercel: fitur akun nonaktif, tombol Masuk disembunyikan. |
| `AUTH_SECRET` | Rahasia penandatangan cookie sesi (teks acak 32+ karakter). | Diturunkan dari `DATABASE_URL`, atau acak per proses (sesi reset saat restart). |

Saat server menyala, terminal menampilkan status kunci Gemini, driver database yang dipakai, dan hasil uji koneksi Gemini.

## 4. Deploy ke Vercel dan Neon

1. **Neon**: buat project di https://neon.tech, buka *Connect*, salin *Connection string* (pooled maupun direct keduanya bisa). Tabel dibuat otomatis saat permintaan pertama (`CREATE TABLE IF NOT EXISTS`); skemanya ada di `docs/schema.sql` bila ingin dijalankan manual lewat SQL Editor Neon.
2. **Vercel**: *Import* repositori ini. Framework preset: *Other*. Tidak ada build command; `vercel.json` sudah mengatur `public/` sebagai output statis, `api/*.js` sebagai serverless function, header keamanan (CSP), dan cache berkas vendor.
3. **Environment Variables** di Vercel: `GEMINI_API_KEY`, `DATABASE_URL`, `AUTH_SECRET` (buat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
4. *Deploy*. Uji: buka `/api/auth` (harus `{"enabled":true,"user":null}`), lalu `/signup`.

Catatan: `local-server.js` hanya untuk lokal; di Vercel tidak dipakai. Jangan menamainya `server.js`, `app.js`, atau `index.js` di root: Vercel akan menganggapnya backend utama dan mengabaikan folder `api/`. Driver Neon di `lib/db.js` memakai **endpoint HTTP SQL Neon** lewat `fetch` bawaan Node, sehingga tidak perlu paket npm dan cocok untuk serverless.

## 5. Arsitektur dan alur data

```
Browser (public/)                                   Server
┌───────────────────────────────┐                   ┌──────────────────────────────────┐
│ rules.js  mesin aturan        │  teks tidak       │ api/chat.js  ──► lib/kb.js (RAG) │
│ docscan.js pdf.js/JSZip/OCR   │  pernah keluar    │      │        ──► lib/gemini.js   │──► Gemini API (opsional,
│ lessons1/2.js 40 chapter      │                   │      └── rules.js (analisis awal) │    teks sudah disamarkan)
│ levels.js  bintang dan tier   │                   │ api/auth.js  ──► lib/auth.js      │
│ account.js klien akun ────────┼── /api/auth ────► │              ──► lib/db.js ───────│──► Neon PostgreSQL
│ page-learn.js ────────────────┼── /api/progress ► │ api/progress.js                   │    (atau .data/users.json lokal)
│ mecha.js  karakter Guardian   │                   │ local-server.js (lokal) / Vercel  │
└───────────────────────────────┘                   └──────────────────────────────────┘
```

Alur satu pesan chat: ketik → disamarkan di browser (`TG.redact`) → `/api/chat` menyamarkan lagi, menganalisis aturan, mengambil 5 entri pengetahuan paling relevan → Gemini menyusun jawaban dalam JSON `{reply, mood}` → bila Gemini gagal, jawaban disusun lokal → browser menampilkan jawaban, tag tanda bahaya, dan Guardian berekspresi sesuai `mood`.

## 6. Struktur folder

```
trustguard/
├─ api/                 serverless functions (Vercel) dan handler lokal
│  ├─ chat.js           Guardian AI
│  ├─ auth.js           daftar, masuk, keluar, hapus akun, status sesi
│  └─ progress.js       baca dan simpan progres latihan (merge per chapter)
├─ lib/
│  ├─ gemini.js         klien Gemini: pemilihan model otomatis, varian parameter, pesan error jelas
│  ├─ kb.js             basis pengetahuan terkurasi (21 entri bersumber) + retrieval
│  ├─ db.js             repository pengguna: driver Neon (HTTP SQL), berkas lokal, atau nonaktif
│  ├─ auth.js           scrypt, token HMAC, cookie, CSRF same-origin, validasi
│  └─ env.js            pembaca .env yang tahan BOM, UTF-16, CRLF
├─ public/
│  ├─ index.html, scanner.html, chat.html, learn.html, act.html, privacy.html
│  ├─ login.html, signup.html, profile.html, 404.html
│  └─ assets/
│     ├─ css/ style.css (inti), pages.css (per halaman), mecha.css (karakter)
│     ├─ js/  boot, core, sound, fx, mecha, levels, account, rules, lessons1, lessons2,
│     │       scan-ui, docscan, chrome, page-*.js
│     ├─ fonts/  Sora dan Figtree (self-host, OFL)
│     ├─ img/    logo, favicon, OG image (karya sendiri)
│     └─ vendor/ pdf.js, JSZip, Tesseract.js + core WASM, tessdata (lihat CREDITS.md)
├─ tests/run.js, tests/account.js   pengujian otomatis tanpa dependensi (41 tes)
├─ docs/schema.sql                   skema tabel tg_users
├─ local-server.js, start.bat, start.sh, vercel.json, .env.example, package.json
```

Semua kode berkomentar dalam Bahasa Indonesia dan menjelaskan *mengapa*, bukan hanya *apa*, supaya mudah dirawat orang baru.

## 7. Akun, progres, dan sistem tier

- **Opsional.** Tamu bisa berlatih; progresnya hanya hidup di `sessionStorage` tab itu dan dihapus saat tab ditutup. Saat tamu masuk atau mendaftar, progres tab itu **digabung** ke akun.
- **Data akun**: `username` (3-20 karakter `[a-z0-9_.]`, disimpan lowercase + tampilan asli), `email` (opsional, hanya nama masuk alternatif, tidak pernah dikirimi apa pun), `password_hash` (scrypt N=16384, r=8, p=1, garam 16 byte), `progress` (JSONB `{ "<nomorChapter>": { "ok": bool, "tries": n } }`), `created_at`, `updated_at`.
- **Sesi**: cookie `tg_session` berisi token `base64url(payload).HMAC-SHA256`, HttpOnly, SameSite=Lax, Secure di HTTPS, 30 hari. Tidak ada tabel sesi.
- **Keamanan**: pemeriksaan same-origin untuk semua permintaan yang mengubah data, batas 10 percobaan masuk/daftar per IP per 10 menit, pesan error yang sama untuk nama salah dan kata sandi salah, log tanpa email atau kata sandi.
- **Bintang**: 3 bila benar di percobaan pertama, 2 bila benar setelah mengulang, 1 bila sudah mencoba. Maksimum 120.
- **Tier**: Pengintai (0+), Penjaga (30+), Pelindung (65+), Guardian Legenda (100+). Lencana digambar sendiri (SVG) dan tampil di header, halaman Latihan, Profil, dan kartu hero beranda. Naik tier memicu perayaan.
- **Hak pengguna**: unduh seluruh data sebagai JSON dan hapus akun permanen (dengan konfirmasi kata sandi) dari `/profile`.

## 8. Scanner berkas (PDF, Word, gambar)

Diimplementasikan **tanpa API AI** supaya hemat kuota dan privat, memakai pustaka sumber terbuka yang mapan, semuanya self-host di `public/assets/vendor/`:

| Jenis | Pustaka | Cara kerja |
|---|---|---|
| PDF | pdf.js 4.10.38 (Mozilla) | Membaca lapisan teks tiap halaman (maks 20) dan **anotasi tautan** (URL di balik teks). Halaman tanpa teks (hasil scan) dirender ke kanvas lalu di-OCR (maks 8 halaman). PDF berkata sandi ditolak dengan pesan jelas. |
| DOCX | JSZip 3.10.1 | Membuka arsip, membaca `word/document.xml` (plus catatan kaki, header, footer) dan relasi hyperlink. `.doc` lama diminta disimpan ulang sebagai `.docx`. |
| Gambar (PNG, JPG, WEBP, GIF, BMP, tempel Ctrl+V) | Tesseract.js 5.1.1 + tessdata_fast `ind` dan `eng` | OCR di Web Worker (WebAssembly, varian SIMD bila didukung). Gambar diperkecil ke 2400 px. Model bahasa diunduh dari situs ini sekali lalu di-cache browser. |
| TXT, MD, CSV | bawaan browser | Dibaca langsung. |

Teks hasil ekstraksi ditampilkan di kotak yang bisa diedit, lalu dianalisis `rules.js` yang sama dengan mode teks. Batas 12 MB per berkas dan 12.000 karakter teks. CSP mengizinkan `wasm-unsafe-eval` khusus untuk ini; tidak ada permintaan jaringan ke luar situs.

## 9. Guardian AI

- **Grounding**: setiap permintaan ke Gemini menyertakan hasil mesin aturan (tanda bahaya dan penjelasannya) dan entri basis pengetahuan paling relevan dari `lib/kb.js`. Entri dirangkum dari OJK (Kontak 157, Satgas PASTI, IASC), Komdigi (Aduan Konten, CekRekening.id), Bank Indonesia dan ASPI (QRIS), Bareskrim Polri (Patroli Siber), KemenPPPA (SAPA 129), serta panduan internasional FTC, CISA, NIST SP 800-63B, Google Safety Center, dan WhatsApp Safety.
- **Instruksi sistem** melarang memvonis "pasti aman/pasti penipuan", melarang mengarang nomor atau situs di luar pengetahuan, meminta 1-3 langkah konkret, memperlakukan teks pengguna sebagai data (anti prompt injection), dan membatasi topik ke keamanan digital.
- **Pertanyaan umum** (misalnya "apa itu verifikasi dua langkah", "cara cek pinjol legal") dijawab dari entri pengetahuan bahkan tanpa Gemini.
- **Ketahanan**: `lib/gemini.js` mencoba beberapa nama model `flash` yang aktif, meminta daftar model dari Google bila semuanya 404, mencoba varian parameter, mengingat model yang berhasil, dan selalu jatuh ke jawaban lokal bila gagal, dengan alasan yang hanya tampil saat pengembangan lokal.
- **Batas**: 8 pesan terakhir, 2.000 karakter per pesan, 15 permintaan per menit per IP.

## 10. Privasi dan keamanan

Ringkasan teknis (penjelasan ramah pengguna ada di `/privacy`):

- Scanner teks, Scanner berkas, Latihan, dan Langkah Aman tidak mengirim teks atau berkas ke mana pun.
- Penyensoran dua lapis (browser lalu server) untuk OTP, kata sandi, nomor kartu, nomor 16 digit, telepon, email, dan angka panjang sebelum teks mencapai Gemini.
- Server tidak menyimpan percakapan dan hanya mencatat jenis error.
- Akun hanya menyimpan lima kolom di atas; tidak ada IP, perangkat, atau isi chat di database.
- CSP ketat: `default-src 'self'`, skrip hanya dari situs sendiri (+ `wasm-unsafe-eval` untuk OCR), tanpa font atau skrip pihak ketiga, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy: no-referrer`, `Permissions-Policy` menolak kamera, mikrofon, dan lokasi.
- Tidak ada analitik, iklan, atau cookie pelacak. Satu-satunya cookie adalah sesi login.
- Fitur AI ditujukan untuk pengguna 18+ sesuai ketentuan API Google; fitur lain terbuka untuk semua.

## 11. Pengujian

```bash
npm test        # sama dengan: node tests/run.js
```

41 tes tanpa dependensi: mesin aturan dan penyensor, klien Gemini terhadap server tiruan (model mati, varian parameter, kunci salah), handler chat (grounding, penyensoran sebelum Gemini, mode produksi, batas laju), pembaca `.env`, serta akun (hash kata sandi, token sesi, merge progres, daftar/masuk/keluar/hapus, CSRF, batas laju, mode nonaktif). Pengujian akun memakai driver berkas di folder sementara.

Pemeriksaan manual yang dilakukan sebelum rilis: semua halaman di lebar 1380 px dan 375 px, alur daftar → latihan → progres tersimpan → profil, scanner berkas dengan PDF buatan, DOCX buatan, dan PNG berteks (OCR tepat), serta pemeriksaan tab Network untuk memastikan tidak ada permintaan ke luar situs.

## 12. Sumber, pustaka, dan kredit

### Karya sendiri (tidak memakai aset pihak ketiga)
- **Karakter Guardian**: digambar dari nol sebagai SVG di `public/assets/js/mecha.js`, terinspirasi gaya figur chibi mecha anime secara umum (rambut panjang dua kuncir, headphone bertanduk, jaket puffer kebesaran, gauntlet bercakar, sirip hiu). Tidak menjiplak karakter atau karya seniman tertentu.
- **Logo, favicon, OG image, lencana tier, ikon antarmuka**: SVG buatan sendiri.
- **Efek suara**: disintesis langsung dengan WebAudio (`public/assets/js/sound.js`), tanpa berkas audio.
- **40 chapter latihan, basis pengetahuan, teks antarmuka**: ditulis sendiri; semua merek, nomor, dan tautan dalam contoh adalah fiktif.

### Pustaka pihak ketiga (self-host di `public/assets/vendor/`, rincian di `CREDITS.md` di folder itu)

| Pustaka | Versi | Lisensi | Sumber | Kegunaan |
|---|---|---|---|---|
| pdf.js (Mozilla) | 4.10.38 | Apache-2.0 | https://github.com/mozilla/pdf.js | Teks dan anotasi tautan PDF, render halaman untuk OCR |
| JSZip (Stuart Knightley) | 3.10.1 | MIT | https://github.com/Stuk/jszip | Membuka arsip `.docx` |
| Tesseract.js | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js | API OCR dan Web Worker |
| tesseract.js-core | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js-core | Mesin Tesseract 5 (WebAssembly, LSTM, varian SIMD dan non-SIMD) |
| tessdata_fast (`ind`, `eng`) | main | Apache-2.0 | https://github.com/tesseract-ocr/tessdata_fast | Model bahasa OCR Indonesia dan Inggris |
| Sora (Jonathan Barnbrook, Sora Sagano) | latin 500-800 | SIL OFL 1.1 | https://fonts.google.com/specimen/Sora | Font judul |
| Figtree (Erik Kennedy) | latin 400-700 | SIL OFL 1.1 | https://fonts.google.com/specimen/Figtree | Font isi |

### Layanan
- **Google Gemini API** (opsional): penyusun jawaban Guardian AI. Ketentuan: https://ai.google.dev/gemini-api/terms
- **Neon** (opsional): PostgreSQL serverless untuk akun dan progres. https://neon.tech
- **Vercel**: hosting statis dan serverless functions. https://vercel.com

### Sumber pengetahuan (dirangkum ke `lib/kb.js`, `public/assets/js/page-act.js`, dan materi latihan)
- OJK: Kontak OJK 157, Satgas PASTI (sipasti.ojk.go.id), Indonesia Anti-Scam Centre (iasc.ojk.go.id), edukasi waspada investasi dan pinjaman online ilegal.
- Komdigi: Aduan Konten (aduankonten.id), CekRekening.id, Aduan Nomor, literasi digital.
- Bank Indonesia dan ASPI: ketentuan QRIS dan keamanan pembayaran.
- Bareskrim Polri: Patroli Siber (patrolisiber.id). KemenPPPA: SAPA 129.
- FTC "How to Recognize and Avoid Phishing Scams", CISA "Avoiding Social Engineering and Phishing Attacks", NIST SP 800-63B (autentikasi), Google Safety Center, WhatsApp Safety Center, cekfakta.com dan turnbackhoax.id untuk hoaks.

Kanal dan nomor diverifikasi terakhir **31 Oktober 2026**; periksa ulang sebelum rilis berikutnya karena bisa berubah. `aduannomor.id` sengaja tidak ditampilkan karena sempat tidak dapat diakses saat diuji (bisa diaktifkan lagi lewat `show: true` di `page-act.js`).

### Perangkat bantu pengembangan
Kode dan dokumentasi disusun oleh tim dengan bantuan asisten AI (Claude) untuk penulisan kode dan penyuntingan; semua keputusan desain, verifikasi sumber, dan pengujian dilakukan oleh tim.

## 13. Keterbatasan yang jujur

- Mesin aturan hanya mengenali **pola yang dikenal**; skor rendah bukan bukti aman. Penipuan baru bisa lolos.
- OCR bisa salah membaca gambar buram, miring, atau berlatar ramai; karena itu teks hasil ekstraksi selalu ditampilkan untuk dikoreksi.
- Jawaban AI bisa keliru; ia dibatasi oleh pengetahuan yang disertakan dan diminta memakai bahasa kemungkinan, tetapi tetap harus diverifikasi lewat kanal resmi.
- Tanpa `DATABASE_URL` di Vercel fitur akun nonaktif (disengaja, supaya aplikasi tetap bisa dideploy tanpa database).
- Tidak ada pemulihan kata sandi lewat email (karena kami tidak mengirim email dan tidak ingin mewajibkan email). Pengguna yang lupa kata sandi perlu membuat akun baru.

## 14. Lisensi

Kode TrustGuard dirilis di bawah **lisensi MIT**. Pustaka pihak ketiga tetap tunduk pada lisensinya masing-masing (lihat berkas LICENSE di tiap subfolder `public/assets/vendor/` dan `public/assets/fonts/`).
