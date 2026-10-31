/**
 * scan-ui.js : komponen hasil pemeriksaan yang dipakai Scanner dan demo di beranda.
 * Semua analisis berjalan di browser lewat TG.analyze (rules.js). Tidak ada data yang dikirim.
 */
(function () {
  'use strict';
  var A = window.TGApp, L = A.L, esc = A.esc;

  var LV = {
    high: { id: 'Risiko tinggi', en: 'High risk', c: '#ff6b81', mood: 'bahaya',
      sum: ['Banyak tanda bahaya yang cocok. Perlakukan ini sebagai kemungkinan besar tipuan sampai terbukti sebaliknya.', 'Many warning signs match. Treat this as a likely scam until proven otherwise.'],
      next: [['Jangan klik, balas, atau transfer apa pun.', 'Do not click, reply, or transfer anything.'], ['Verifikasi lewat kanal resmi yang kamu cari sendiri.', 'Verify through an official channel you look up yourself.'], ['Simpan bukti lalu lihat halaman Langkah Aman untuk melapor.', 'Keep evidence, then see the Safe Steps page to report it.']] },
    medium: { id: 'Risiko sedang', en: 'Medium risk', c: '#ffb454', mood: 'sedang',
      sum: ['Ada beberapa tanda yang patut diwaspadai. Tahan dulu dan periksa sebelum bertindak.', 'There are some signs worth caution. Pause and check before acting.'],
      next: [['Tahan dulu, jangan buru-buru membalas atau membayar.', 'Hold on, do not rush to reply or pay.'], ['Cek pengirim dan tawarannya lewat sumber resmi.', 'Check the sender and the offer through official sources.'], ['Jangan bagikan data pribadi atau kode apa pun.', 'Do not share personal data or any codes.']] },
    low: { id: 'Risiko rendah', en: 'Low risk', c: '#4ade80', mood: 'aman',
      sum: ['Tidak ada pola risiko yang cocok. Ini bukan jaminan aman, karena penipuan baru bisa lolos dari aturan sederhana.', 'No risk patterns matched. This is not a guarantee of safety, because new scams can slip past simple rules.'],
      next: [['Tetap verifikasi jika ada permintaan uang atau data.', 'Still verify if there is any request for money or data.'], ['Jika ragu, ceritakan konteksnya ke Guardian AI.', 'If unsure, describe the context to Guardian AI.']] }
  };

  var SAMPLES = [
    { id: 'Hadiah dan OTP', en: 'Prize and OTP', tid: 'Selamat! Kamu menang hadiah Rp50 juta. Klik http://hadiah-nusantara.xyz dan kirim kode OTP sekarang juga untuk klaim.', ten: 'Congratulations! You won Rp50 million. Click http://hadiah-nusantara.xyz and send your OTP code right now to claim.' },
    { id: 'Biaya kerja', en: 'Job fee', tid: 'Lowongan admin gaji tinggi tanpa pengalaman. Kamu lolos seleksi, transfer biaya administrasi Rp300.000 hari ini dan jangan bilang siapa-siapa.', ten: 'High salary admin job, no experience needed. You passed the selection, transfer a Rp300,000 admin fee today and do not tell anyone.' },
    { id: 'Tautan e-wallet', en: 'E-wallet link', tid: 'Akun DANA kamu dibatasi. Verifikasi di http://dana-verifikasi-akun.top segera agar tidak diblokir.', ten: 'Your DANA account is restricted. Verify at http://dana-verifikasi-akun.top soon or it will be blocked.' },
    { id: 'Teman minta uang', en: 'Friend asks for money', tid: 'Hai ini aku, nomor baru ya. Bisa transfer Rp1.500.000 dulu? Mendesak banget, nanti kuganti. Jangan bilang siapa-siapa dulu.', ten: 'Hi it is me, new number. Can you transfer Rp1,500,000? Really urgent, I will pay you back. Do not tell anyone yet.' },
    { id: 'Pesan biasa', en: 'Normal message', tid: 'Besok kuliah jam 9 di ruang 204 ya, jangan lupa bawa laptop.', ten: 'Class is at 9 tomorrow in room 204, do not forget your laptop.' }
  ];

  /** Membuat HTML hasil analisis. compact=true untuk demo di beranda. */
  function html(an, compact) {
    var lv = LV[an.level];
    var off = 327 * (1 - an.score / 100);
    var sig = an.found.map(function (f, i) {
      return '<li style="--i:' + i + '"><b>' + esc(L(f.title.id, f.title.en)) + '</b><span>' + esc(L(f.explain.id, f.explain.en)) + '</span></li>';
    }).join('');
    var urls = an.urls.length ? '<div><b>' + L('Tautan terdeteksi', 'Links found') + '</b><div class="urls" style="margin-top:8px">' + an.urls.map(function (u) { return '<code>' + esc(u) + '</code>'; }).join('') + '</div></div>' : '';
    var next = '<div><b>' + L('Langkah berikutnya', 'Next steps') + '</b><ul class="mini" style="margin-top:10px">' + lv.next.map(function (n) { return '<li>' + esc(L(n[0], n[1])) + '</li>'; }).join('') + '</ul></div>';
    return '<div class="res-top"><div class="gauge" style="--lc:' + lv.c + '"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" data-off="' + off.toFixed(1) + '"/></svg><b>' + an.score + '<small>/100</small></b></div>' +
      '<div style="flex:1;min-width:200px;--lc:' + lv.c + '"><span class="lv">' + L(lv.id, lv.en) + '</span><p>' + esc(L(lv.sum[0], lv.sum[1])) + '</p></div></div>' +
      (sig ? '<ul class="sig" style="--lc:' + lv.c + '">' + sig + '</ul>' : '') + urls + (compact ? '' : next) +
      '<p class="muted" style="font-size:.88rem">' + L('Hasil ini hanya petunjuk awal berbasis aturan yang bisa dijelaskan, bukan bukti bahwa sesuatu aman atau pasti penipuan.', 'This result is only an early rule-based hint you can explain, not proof that something is safe or definitely a scam.') + '</p>';
  }

  /** Menganimasikan jarum gauge setelah elemen masuk ke DOM. */
  function animate(box) {
    var fg = A.$('.gauge .fg', box);
    if (!fg) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { fg.style.strokeDashoffset = fg.getAttribute('data-off'); }); });
  }

  /** Ringkasan teks untuk disalin. */
  function summary(an) {
    var lv = LV[an.level];
    return 'TrustGuard: ' + L(lv.id, lv.en) + ' (' + an.score + '/100)\n' + an.found.map(function (f) { return '- ' + L(f.title.id, f.title.en); }).join('\n') + '\n' + L('Hasil hanya petunjuk awal.', 'Result is only an early hint.');
  }

  window.TGScan = { LV: LV, SAMPLES: SAMPLES, html: html, animate: animate, summary: summary };
})();
