# Pustaka pihak ketiga (vendored) untuk pemindai dokumen

Semua berkas di folder ini disajikan dari situs sendiri (`/assets/vendor/...`) dan dimuat secara malas oleh
`public/assets/js/docscan.js`. Tidak ada satu pun yang mengambil sesuatu dari internet saat berjalan, sehingga
sesuai dengan CSP `script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:`.
Dokumen pengguna tidak pernah meninggalkan browser.

| Pustaka | Versi | Lisensi | Sumber | Berkas yang di-vendor | Ukuran | Kegunaan |
|---|---|---|---|---|---|---|
| pdf.js (Mozilla) | 4.10.38 | Apache-2.0 | https://github.com/mozilla/pdf.js (diunduh dari https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/) | `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs`, `pdfjs/LICENSE.txt` | 352.645 B + 1.375.838 B | Membaca lapisan teks dan anotasi tautan PDF; merender halaman tanpa teks ke kanvas untuk OCR |
| JSZip (Stuart Knightley) | 3.10.1 | MIT (dual MIT/GPLv3, dipakai di bawah MIT) | https://github.com/Stuk/jszip (diunduh dari https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/) | `jszip/jszip.min.js`, `jszip/LICENSE.txt` | 97.630 B | Membuka arsip ZIP di dalam berkas .docx untuk membaca `word/document.xml` dan relasi hyperlink |
| Tesseract.js | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js (diunduh dari https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/) | `tesseract/tesseract.min.js`, `tesseract/worker.min.js`, `tesseract/LICENSE.txt` | 66.695 B + 123.724 B | API OCR di thread utama + skrip Web Worker yang menjalankan mesin OCR |
| tesseract.js-core | 5.1.1 | Apache-2.0 | https://github.com/naptha/tesseract.js-core (diunduh dari https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/) | `tesseract/core/tesseract-core-simd-lstm.wasm.js`, `tesseract/core/tesseract-core-lstm.wasm.js`, `tesseract/core/LICENSE.txt` | 3.938.657 B + 3.938.277 B | Mesin Tesseract 5 (WebAssembly, model LSTM saja). Varian `simd` dipakai bila browser mendukung WASM SIMD, varian tanpa `simd` sebagai cadangan. Biner WASM tertanam (base64) di dalam `.wasm.js`, jadi tidak ada berkas `.wasm` terpisah yang perlu disajikan |
| tessdata_fast (Tesseract OCR) | main (2025) | Apache-2.0 | https://github.com/tesseract-ocr/tessdata_fast | `tessdata/ind.traineddata.gz`, `tessdata/eng.traineddata.gz`, `tessdata/LICENSE.txt` | 609.600 B (ind; asli 1.122.661 B) + 1.976.309 B (eng; asli 4.113.088 B) | Model bahasa Indonesia dan Inggris untuk OCR, dikompres gzip -9 (Tesseract.js mengunduh `<langPath>/<kode>.traineddata.gz` lalu mendekompres sendiri) |

Total sekitar 13 MB di disk; browser hanya mengunduh bagian yang dipakai (PDF: ~1,7 MB; DOCX: ~0,1 MB;
OCR: ~3,9 MB inti + ~2,6 MB data bahasa, lalu di-cache oleh browser selama 7 hari dan data bahasa juga di-cache
Tesseract.js di IndexedDB).

## Cara Tesseract.js 5.1.1 mencari berkas (diverifikasi dari `worker.min.js` dan `tesseract.min.js`)

- **`corePath`** (`worker.min.js`, fungsi getCore): bila nilainya berakhiran `js`, dipakai apa adanya sebagai URL
  berkas (tanpa deteksi SIMD). Bila tidak, dianggap **direktori**: garis miring di akhir dibuang, lalu worker
  mendeteksi dukungan WASM SIMD dan menambahkan sendiri
  `/tesseract-core-simd-lstm.wasm.js` (SIMD + lstmOnly), `/tesseract-core-lstm.wasm.js` (tanpa SIMD + lstmOnly),
  `/tesseract-core-simd.wasm.js` atau `/tesseract-core.wasm.js` (bila model legacy diminta). Berkas dimuat dengan
  `importScripts()` dari dalam worker. `lstmOnly` dihitung di `tesseract.min.js` sebagai
  `[OEM.DEFAULT, OEM.LSTM_ONLY].includes(oem) && !legacyCore`; `docscan.js` memakai `oem = 1` (LSTM_ONLY), sehingga
  hanya dua berkas `*-lstm.wasm.js` yang pernah diminta. Itulah sebabnya hanya keduanya yang di-vendor.
- **`langPath`** (`worker.min.js`, fungsi loadLanguage): URL data bahasa = `langPath` tanpa garis miring akhir +
  `/<kode>.traineddata` + (`.gz` bila `gzip` true; default true). Diambil dengan `fetch()` dari worker, lalu
  didekompres bila dua byte pertama adalah magic gzip (`1f 8b`). Dengan `langPath: '/assets/vendor/tessdata'` dan
  bahasa `'ind+eng'`, worker meminta `/assets/vendor/tessdata/ind.traineddata.gz` dan `/eng.traineddata.gz`.
  Hasilnya di-cache di IndexedDB (`cacheMethod` default `write`).
- **`workerPath` / `workerBlobURL`**: default `workerBlobURL: true` membuat Blob berisi `importScripts(workerPath)`.
  `docscan.js` memakai `workerBlobURL: false` sehingga worker dibuat langsung dengan `new Worker(workerPath)` dari
  URL same-origin (`worker-src 'self'`).
- **Catatan CSP**: loader Emscripten di dalam `*.wasm.js` pertama-tama mencoba `fetch()` terhadap data URI
  base64 biner WASM yang tertanam. Dengan `connect-src 'self'` percobaan itu ditolak browser (muncul satu pesan
  error merah di konsol: "Refused to connect ... data:application/octet-stream;base64"), lalu loader otomatis
  beralih mendekode base64 secara sinkron, sehingga OCR tetap berjalan normal (sudah diverifikasi). Bila ingin
  konsol bersih, tambahkan `data:` pada `connect-src` di `local-server.js` dan `vercel.json`.
- Nilai default bila opsi tidak diisi adalah CDN jsDelivr (`https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.1`
  dan `https://cdn.jsdelivr.net/npm/@tesseract.js-data/...`); karena `connect-src 'self'`, opsi WAJIB diisi dengan
  jalur lokal seperti yang dilakukan `docscan.js`.

## Opsi yang dipakai `docscan.js`

```js
Tesseract.createWorker('ind+eng', 1, {
  workerPath: '/assets/vendor/tesseract/worker.min.js',
  corePath: '/assets/vendor/tesseract/core',   // direktori, worker memilih varian simd/non-simd
  langPath: '/assets/vendor/tessdata',
  workerBlobURL: false, gzip: true, logger: ..., errorHandler: ...
});
```

pdf.js dimuat lewat `import('/assets/vendor/pdfjs/pdf.min.mjs')` dengan
`GlobalWorkerOptions.workerSrc = '/assets/vendor/pdfjs/pdf.worker.min.mjs'` dan
`getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: true })`.
