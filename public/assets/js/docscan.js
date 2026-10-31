/**
 * docscan.js : ekstraksi teks dari dokumen (PDF, DOCX, gambar, teks) SEPENUHNYA di browser.
 *
 * Tidak ada berkas yang diunggah ke server. Pustaka pihak ketiga (pdf.js, JSZip, Tesseract.js)
 * dimuat secara malas (lazy) dari /assets/vendor/ sehingga halaman tetap ringan sampai fitur dipakai.
 * Hasilnya berupa teks biasa yang bisa langsung diberikan ke mesin aturan (rules.js).
 *
 * API publik: window.TGDoc = { MAX_BYTES, MAX_PAGES, kindOf, supports, extract, warm, _internal }.
 */
(function () {
  'use strict';

  var VENDOR = '/assets/vendor';
  var MAX_BYTES = 12 * 1024 * 1024;   // ukuran berkas maksimal (12 MB)
  var MAX_PAGES = 20;                 // halaman PDF maksimal yang dibaca
  var MAX_OCR_PAGES = 8;              // halaman PDF maksimal yang di-OCR (lambat)
  var MAX_CHARS = 12000;              // panjang teks hasil maksimal
  var MIN_TEXT_CHARS = 25;            // di bawah ini halaman PDF dianggap "tanpa lapisan teks"
  var OCR_LANGS = 'ind+eng';

  /* ---------- Label progres dan pesan dua bahasa ---------- */
  var LABEL = {
    load: { id: 'Memuat komponen pembaca...', en: 'Loading reader components...' },
    read: { id: 'Membaca dokumen...', en: 'Reading document...' },
    ocr: { id: 'Mengenali teks dari gambar (OCR)...', en: 'Recognizing text from image (OCR)...' },
    done: { id: 'Selesai.', en: 'Done.' }
  };
  var WARN = {
    ocr: { id: 'Halaman tanpa teks di-OCR: hasil bisa kurang akurat.', en: 'Pages without a text layer were OCR\'d; results may be less accurate.' },
    pages: { id: 'Hanya ' + MAX_PAGES + ' halaman pertama yang dibaca.', en: 'Only the first ' + MAX_PAGES + ' pages were read.' },
    ocrPages: { id: 'OCR dibatasi ' + MAX_OCR_PAGES + ' halaman; halaman gambar lainnya dilewati.', en: 'OCR limited to ' + MAX_OCR_PAGES + ' pages; other image-only pages were skipped.' },
    noOcr: { id: 'Browser ini tidak mendukung OCR; halaman tanpa lapisan teks dilewati.', en: 'This browser cannot run OCR; pages without a text layer were skipped.' },
    truncated: { id: 'Teks dipotong pada ' + MAX_CHARS + ' karakter.', en: 'Text truncated at ' + MAX_CHARS + ' characters.' },
    empty: { id: 'Tidak ada teks yang bisa dibaca dari berkas ini.', en: 'No readable text was found in this file.' }
  };

  /** Membuat Error dengan kode mesin serta pesan manusiawi dua bahasa (.code, .id, .en). */
  function fail(code, id, en) { var e = new Error(en); e.code = code; e.id = id; e.en = en; return e; }
  /** Membungkus error asing (dari pustaka) menjadi error PARSE yang ramah, kecuali sudah berkode. */
  function wrap(e, id, en) { if (e && e.code && e.id) return e; var w = fail('PARSE', id, en); w.cause = e; return w; }

  /* ---------- Deteksi jenis berkas dan kemampuan browser ---------- */
  /** Menentukan jenis berkas: 'pdf' | 'docx' | 'image' | 'text' | null (dari MIME, lalu ekstensi). */
  function kindOf(file) {
    var type = String((file && file.type) || '').toLowerCase();
    var name = String((file && file.name) || '').toLowerCase();
    var ext = name.indexOf('.') >= 0 ? name.split('.').pop() : '';
    if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') return 'docx';
    if (/^image\/(png|jpeg|webp|gif|bmp)$/.test(type) || /^(png|jpe?g|webp|gif|bmp)$/.test(ext)) return 'image';
    if (/^text\/(plain|markdown|csv)$/.test(type) || /^(txt|md|csv)$/.test(ext)) return 'text';
    return null;
  }

  /** Mendeteksi fitur browser yang dibutuhkan tiap jalur ekstraksi. */
  function supports() {
    var wasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    var worker = typeof Worker === 'function';
    // Dukungan modul ES (dan import() dinamis) diperkirakan lewat atribut noModule
    var modules = typeof HTMLScriptElement !== 'undefined' && 'noModule' in HTMLScriptElement.prototype;
    var promise = typeof Promise === 'function' && typeof Uint8Array === 'function';
    return { pdf: modules && promise, docx: promise, ocr: wasm && worker && promise, worker: worker };
  }

  /* ---------- Pemuat pustaka (dimemo agar hanya dimuat sekali) ---------- */
  var scriptCache = {};
  /** Menyisipkan <script src> satu asal (same-origin) dan menunggu sampai termuat. */
  function loadScript(src) {
    if (!scriptCache[src]) {
      scriptCache[src] = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = function () { resolve(); };
        s.onerror = function () { delete scriptCache[src]; reject(fail('PARSE', 'Gagal memuat komponen ' + src, 'Failed to load component ' + src)); };
        document.head.appendChild(s);
      });
    }
    return scriptCache[src];
  }
  var pdfLibPromise = null;
  /** Memuat pdf.js (modul ES) lewat import() dinamis dan mengatur lokasi worker-nya. */
  function loadPdf() {
    if (!pdfLibPromise) {
      pdfLibPromise = import(VENDOR + '/pdfjs/pdf.min.mjs').then(function (lib) {
        lib.GlobalWorkerOptions.workerSrc = VENDOR + '/pdfjs/pdf.worker.min.mjs';
        return lib;
      });
      pdfLibPromise.catch(function () { pdfLibPromise = null; });
    }
    return pdfLibPromise;
  }
  var ocrWorkerPromise = null, ocrProgress = null;
  /** Membuat (sekali) worker Tesseract dengan semua berkas dari /assets/vendor; dipakai ulang antar panggilan. */
  function loadOcr() {
    if (!supports().ocr) return Promise.reject(fail('OCR_UNAVAILABLE', 'Browser ini tidak mendukung OCR. Salin dan tempel teksnya saja.', 'This browser cannot run OCR. Please paste the text instead.'));
    if (!ocrWorkerPromise) {
      ocrWorkerPromise = loadScript(VENDOR + '/tesseract/tesseract.min.js').then(function () {
        return window.Tesseract.createWorker(OCR_LANGS, 1, {
          workerPath: VENDOR + '/tesseract/worker.min.js',
          // Direktori: worker menambahkan sendiri tesseract-core-simd-lstm.wasm.js atau tesseract-core-lstm.wasm.js
          corePath: VENDOR + '/tesseract/core',
          langPath: VENDOR + '/tessdata',      // worker mengambil <langPath>/<kode>.traineddata.gz
          workerBlobURL: false, gzip: true,
          logger: function (m) { if (ocrProgress) ocrProgress(m); },
          errorHandler: function () { /* error dilaporkan lewat promise recognize() */ }
        });
      });
      ocrWorkerPromise.catch(function () { ocrWorkerPromise = null; });
    }
    return ocrWorkerPromise;
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', function () {
      if (ocrWorkerPromise) ocrWorkerPromise.then(function (w) { return w.terminate(); }).catch(function () { /* diabaikan */ });
      ocrWorkerPromise = null;
    });
  }

  /* ---------- Helper murni (bisa diuji tanpa browser) ---------- */
  /** Mengubah entitas XML (&amp; &lt; &gt; &quot; &apos; &#NNN; &#xHH;) menjadi karakter. */
  function decodeEntities(s) {
    return s.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#[0-9]+);/g, function (_, e) {
      if (e === 'amp') return '&'; if (e === 'lt') return '<'; if (e === 'gt') return '>'; if (e === 'quot') return '"'; if (e === 'apos') return "'";
      var cp = e.charAt(1) === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return String.fromCodePoint(cp); } catch (err) { return ''; }
    });
  }
  /**
   * Mengambil teks dari XML WordprocessingML (word/document.xml dsb.) memakai regex.
   * Paragraf w:p dipisah baris baru; w:t = teks, w:tab = spasi, w:br/w:cr = baris baru.
   * Teks instruksi field (w:instrText) dan teks terhapus (w:delText) diabaikan.
   */
  function xmlToText(xml) {
    var src = String(xml || '').replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '').replace(/<w:delText[^>]*>[\s\S]*?<\/w:delText>/g, '');
    // Paragraf kosong yang ditulis <w:p/> ikut ditangkap supaya menjadi baris kosong
    var paras = [], pRe = /<w:p(?:\s[^>]*)?\/>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, m;
    var tok = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>/g;
    while ((m = pRe.exec(src))) {
      // Properti paragraf/run dibuang dulu supaya definisi tab-stop (<w:tab> di dalam <w:tabs>) tidak ikut terbaca
      var body = m[0].replace(/<w:pPr>[\s\S]*?<\/w:pPr>/g, '').replace(/<w:rPr>[\s\S]*?<\/w:rPr>/g, '');
      var out = '', t;
      tok.lastIndex = 0;
      while ((t = tok.exec(body))) out += t[1] !== undefined ? decodeEntities(t[1]) : (t[0].indexOf('w:tab') === 1 ? ' ' : '\n');
      paras.push(out);
    }
    return paras.join('\n');
  }
  /** Mengambil URL hyperlink dari word/_rels/document.xml.rels (Relationship bertipe .../hyperlink). */
  function relsToLinks(xml) {
    var links = [], re = /<Relationship\b([^>]*)\/?>/g, m;
    while ((m = re.exec(String(xml || '')))) {
      var attrs = m[1], type = /\bType="([^"]*)"/.exec(attrs), target = /\bTarget="([^"]*)"/.exec(attrs);
      if (type && /\/hyperlink$/.test(type[1]) && target && target[1]) links.push(decodeEntities(target[1]));
    }
    return uniq(links);
  }
  /** Menggabungkan item getTextContent() pdf.js: spasi antar item, baris baru saat hasEOL atau posisi Y berubah. */
  function joinTextItems(items) {
    var out = '', lastY = null;
    (items || []).forEach(function (it) {
      if (typeof it.str !== 'string') return;
      var y = it.transform && it.transform.length > 5 ? Math.round(it.transform[5]) : null;
      if (out && lastY !== null && y !== null && Math.abs(y - lastY) > 2 && !/\n$/.test(out)) out += '\n';
      out += it.str + (it.hasEOL ? '\n' : (it.str && !/\s$/.test(it.str) ? ' ' : ''));
      if (y !== null) lastY = y;
    });
    return out;
  }
  /** Merapikan teks: satukan spasi beruntun, maksimal satu baris kosong, potong pada MAX_CHARS. */
  function normalize(text) {
    var t = String(text || '').replace(/\r\n?/g, '\n').replace(/[ \t \f]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    var truncated = t.length > MAX_CHARS;
    return { text: truncated ? t.slice(0, MAX_CHARS).trim() : t, truncated: truncated };
  }
  /** Menghapus duplikat tanpa mengubah urutan. */
  function uniq(arr) { var seen = {}; return arr.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; }); }
  /** Membuat baris "Tautan dalam dokumen: ..." agar mesin aturan melihat URL yang tersembunyi di balik teks. */
  function linkLines(links) { return links.map(function (u) { return 'Tautan dalam dokumen: ' + u; }).join('\n'); }

  /* ---------- Helper browser ---------- */
  /** Membaca Blob menjadi ArrayBuffer (FileReader, kompatibel luas). */
  function readBuffer(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(fail('PARSE', 'Berkas tidak bisa dibaca.', 'The file could not be read.')); };
      r.readAsArrayBuffer(blob);
    });
  }
  /** Memuat gambar ke kanvas dan mengecilkannya bila sisi terpanjang melebihi maxSide piksel. */
  function imageToCanvas(file, maxSide) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight, 1));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * scale)); c.height = Math.max(1, Math.round(img.naturalHeight * scale));
        var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(fail('PARSE', 'Gambar tidak bisa dibuka. Coba simpan sebagai PNG atau JPG.', 'The image could not be opened. Try saving it as PNG or JPG.')); };
      img.src = url;
    });
  }
  /** Menjalankan OCR pada kanvas dengan worker Tesseract bersama; progres 'recognizing text' diteruskan ke report. */
  function ocrCanvas(canvas, report) {
    return loadOcr().then(function (worker) {
      ocrProgress = function (m) {
        if (!m || typeof m.progress !== 'number') return;
        if (m.status === 'recognizing text') report('ocr', m.progress); else report('load', m.progress * 0.9);
      };
      return worker.recognize(canvas).then(function (res) { ocrProgress = null; return (res && res.data && res.data.text) || ''; }, function (e) {
        ocrProgress = null; throw wrap(e, 'OCR gagal dijalankan. Salin dan tempel teksnya saja.', 'OCR failed. Please paste the text instead.');
      });
    });
  }

  /* ---------- Jalur per jenis berkas ---------- */
  /** PDF: lapisan teks per halaman + anotasi tautan; halaman tanpa teks dirender ke kanvas lalu di-OCR. */
  function extractPdf(file, report, out) {
    var lib, pdf;
    report('load', 0);
    return Promise.all([loadPdf(), readBuffer(file)]).then(function (r) {
      lib = r[0];
      return lib.getDocument({ data: new Uint8Array(r[1]), isEvalSupported: false, disableFontFace: true, useSystemFonts: true }).promise;
    }).then(function (doc) {
      pdf = doc;
      var total = pdf.numPages, n = Math.min(total, MAX_PAGES), parts = [], ocrCount = 0, ocrWarned = false;
      out.totalPages = total;
      if (total > MAX_PAGES) out.warnings.push(WARN.pages);
      var chain = Promise.resolve();
      for (var i = 1; i <= n; i++) {
        (function (num) {
          chain = chain.then(function () {
            report('read', (num - 1) / n, num, n);
            return pdf.getPage(num);
          }).then(function (page) {
            return Promise.all([page.getTextContent(), page.getAnnotations().catch(function () { return []; })]).then(function (r) {
              var text = joinTextItems(r[0].items);
              r[1].forEach(function (a) { var u = a && (a.url || a.unsafeUrl); if (u) out.links.push(String(u)); });
              if (text.replace(/\s/g, '').length >= MIN_TEXT_CHARS) return text;
              if (!supports().ocr) { if (!ocrWarned) { out.warnings.push(WARN.noOcr); ocrWarned = true; } return text; }
              if (ocrCount >= MAX_OCR_PAGES) { if (out.warnings.indexOf(WARN.ocrPages) < 0) out.warnings.push(WARN.ocrPages); return text; }
              ocrCount++;
              if (out.warnings.indexOf(WARN.ocr) < 0) out.warnings.push(WARN.ocr);
              var vp = page.getViewport({ scale: 1.6 }), longest = Math.max(vp.width, vp.height);
              if (longest > 2200) vp = page.getViewport({ scale: 1.6 * 2200 / longest });
              var c = document.createElement('canvas'); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
              // intent 'print' membuat pdf.js merender tanpa requestAnimationFrame, jadi tetap jalan saat tab tidak terlihat
              return page.render({ canvasContext: c.getContext('2d'), viewport: vp, intent: 'print' }).promise.then(function () {
                return ocrCanvas(c, function (stage, pct) { report(stage, pct, num, n); });
              }).then(function (t) { c.width = c.height = 1; return text + '\n' + t; });
            }).then(function (t) { parts.push(t); out.pages = num; });
          });
        })(i);
      }
      return chain.then(function () { return parts.join('\n\n'); });
    }).then(function (text) { return { text: text }; }, function (e) {
      if (e && e.name === 'PasswordException') throw fail('ENCRYPTED', 'PDF ini terkunci kata sandi. Buka kuncinya dulu atau tempel teksnya.', 'This PDF is password-protected. Unlock it first or paste the text.');
      throw wrap(e, 'PDF tidak bisa dibaca (mungkin rusak atau bukan PDF).', 'The PDF could not be read (it may be corrupt or not a PDF).');
    }).then(function (r) { if (pdf) pdf.destroy(); return r; }, function (e) { if (pdf) pdf.destroy(); throw e; });
  }

  /** DOCX: baca XML dokumen, catatan kaki/akhir, header/footer dari ZIP, lalu ambil teks dan hyperlink. */
  function extractDocx(file, report, out) {
    report('load', 0);
    var hint = { id: 'Berkas Word ini tidak bisa dibuka. Simpan ulang sebagai .docx atau tempel teksnya.', en: 'This Word file could not be opened. Save it again as .docx or paste the text.' };
    return Promise.all([loadScript(VENDOR + '/jszip/jszip.min.js'), readBuffer(file)]).then(function (r) {
      var b = new Uint8Array(r[1], 0, Math.min(4, r[1].byteLength));
      if (b[0] === 0xD0 && b[1] === 0xCF) throw fail('UNSUPPORTED', 'Ini format Word lama (.doc). Simpan sebagai .docx dulu atau tempel teksnya.', 'This is the old Word format (.doc). Save it as .docx first or paste the text.');
      if (b[0] !== 0x50 || b[1] !== 0x4B) throw fail('PARSE', hint.id, hint.en);
      report('read', 0.2);
      return window.JSZip.loadAsync(r[1]);
    }).then(function (zip) {
      var names = ['word/document.xml', 'word/footnotes.xml', 'word/endnotes.xml'];
      zip.file(/^word\/(header|footer)\d*\.xml$/).forEach(function (f) { names.push(f.name); });
      names.push('word/_rels/document.xml.rels');
      if (!zip.file('word/document.xml')) throw fail('PARSE', hint.id, hint.en);
      return Promise.all(names.map(function (n) { var f = zip.file(n); return f ? f.async('string') : Promise.resolve(''); })).then(function (xmls) {
        report('read', 0.8);
        var rels = xmls.pop();
        out.links = relsToLinks(rels);
        out.pages = 1;
        return { text: xmls.map(xmlToText).filter(Boolean).join('\n\n') };
      });
    }).catch(function (e) { throw wrap(e, hint.id, hint.en); });
  }

  /** Gambar: kecilkan ke kanvas (maks 2400 px) lalu OCR dengan Tesseract. */
  function extractImage(file, report, out) {
    report('load', 0);
    return imageToCanvas(file, 2400).then(function (c) { out.pages = 1; return ocrCanvas(c, report); }).then(function (t) { return { text: t }; });
  }

  /** Teks biasa (.txt/.md/.csv). */
  function extractText(file, report, out) {
    report('read', 0.5);
    out.pages = 1;
    return (typeof file.text === 'function' ? file.text() : readBuffer(file).then(function (b) { return new TextDecoder('utf-8').decode(b); })).then(function (t) { return { text: t }; });
  }

  /* ---------- API utama ---------- */
  /**
   * Mengekstrak teks dari berkas. Mengembalikan Promise<{ kind, text, pages, totalPages, links, warnings, ms }>.
   * onProgress({ stage, pct, page, pages, label:{id,en} }) dipanggil berulang; stage: 'load' | 'read' | 'ocr' | 'done'.
   */
  function extract(file, onProgress) {
    var t0 = Date.now(), cb = typeof onProgress === 'function' ? onProgress : function () {};
    var out = { kind: null, text: '', pages: 0, totalPages: 0, links: [], warnings: [], ms: 0 };
    function report(stage, pct, page, pages) {
      try { cb({ stage: stage, pct: Math.max(0, Math.min(1, pct || 0)), page: page || 0, pages: pages || 0, label: LABEL[stage] || LABEL.read }); } catch (e) { /* diabaikan */ }
    }
    return new Promise(function (resolve) {
      if (!file || typeof file.size !== 'number') throw fail('UNSUPPORTED', 'Tidak ada berkas yang dipilih.', 'No file was selected.');
      if (file.size > MAX_BYTES) throw fail('TOO_BIG', 'Berkas terlalu besar (maks. 12 MB).', 'File is too large (max 12 MB).');
      var kind = kindOf(file), ext = String(file.name || '').toLowerCase().split('.').pop();
      if (!kind) {
        if (ext === 'doc') throw fail('UNSUPPORTED', 'Format Word lama (.doc) belum didukung. Simpan sebagai .docx atau tempel teksnya.', 'Old Word format (.doc) is not supported. Save as .docx or paste the text.');
        throw fail('UNSUPPORTED', 'Jenis berkas tidak didukung. Gunakan PDF, DOCX, gambar (PNG/JPG), atau TXT.', 'Unsupported file type. Use PDF, DOCX, an image (PNG/JPG), or TXT.');
      }
      out.kind = kind;
      var sup = supports();
      if (kind === 'image' && !sup.ocr) throw fail('OCR_UNAVAILABLE', 'Browser ini tidak mendukung OCR gambar. Salin dan tempel teksnya saja.', 'This browser cannot OCR images. Please paste the text instead.');
      if (kind === 'pdf' && !sup.pdf) throw fail('UNSUPPORTED', 'Browser ini terlalu lama untuk membaca PDF. Tempel teksnya saja.', 'This browser is too old to read PDFs. Please paste the text instead.');
      var run = { pdf: extractPdf, docx: extractDocx, image: extractImage, text: extractText }[kind];
      resolve(run(file, report, out));
    }).then(function (r) {
      out.links = uniq(out.links);
      var body = r.text + (out.links.length ? '\n\n' + linkLines(out.links) : '');
      var n = normalize(body);
      out.text = n.text;
      if (n.truncated) out.warnings.push(WARN.truncated);
      if (!out.text) out.warnings.push(WARN.empty);
      out.ms = Date.now() - t0;
      report('done', 1, out.pages, out.pages);
      return out;
    });
  }

  /** Memanaskan pustaka di latar belakang ('pdf' | 'ocr' | 'docx'); tidak pernah melempar error. */
  function warm(kind) {
    var p = kind === 'pdf' ? loadPdf() : kind === 'ocr' ? loadOcr() : kind === 'docx' ? loadScript(VENDOR + '/jszip/jszip.min.js') : Promise.resolve();
    return p.then(function () { return true; }, function () { return false; });
  }

  window.TGDoc = {
    MAX_BYTES: MAX_BYTES, MAX_PAGES: MAX_PAGES, MAX_OCR_PAGES: MAX_OCR_PAGES, MAX_CHARS: MAX_CHARS,
    kindOf: kindOf, supports: supports, extract: extract, warm: warm,
    // Helper murni, dibuka untuk pengujian otomatis (Node) tanpa browser
    _internal: { _xmlToText: xmlToText, _relsToLinks: relsToLinks, _joinTextItems: joinTextItems, _normalize: normalize, _decodeEntities: decodeEntities }
  };
})();
