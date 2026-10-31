/**
 * page-act.js : Langkah Aman. Daftar periksa per situasi, pembuat pesan peringatan, dan kanal pelaporan resmi.
 * Semua kanal diverifikasi lewat sumber resmi/berita pada 30 Okt 2026. Periksa lagi sebelum rilis karena bisa berubah.
 * aduannomor.id sengaja TIDAK dicantumkan karena sempat error 522 saat diuji. Aktifkan lagi dengan mengubah show:true.
 */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, $$ = A.$$, L = A.L, esc = A.esc;
  var P = { shield: '<path d="M12 3 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>', money: '<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="12" cy="12" r="2.6"/>', alert: '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17v.5"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.5"/>' };

  /* Kanal pelaporan resmi (id, nama, deskripsi, tautan, label tautan, tampilkan) */
  var CH = [
    { n: 'Indonesia Anti-Scam Centre (OJK)', d: ['Laporkan penipuan transaksi keuangan agar rekening pelaku bisa ditelusuri dan diblokir. Lapor hanya lewat situs resminya.', 'Report financial scam transactions so the offender\'s accounts can be traced and blocked. Report only through its official site.'], u: 'https://iasc.ojk.go.id', l: 'iasc.ojk.go.id' },
    { n: 'Kontak OJK 157', d: ['Tanya soal legalitas investasi dan pinjaman online, atau laporkan keluhan. Bisa telepon 157 atau WhatsApp 0811-5715-7157.', 'Ask about the legality of investments and online lenders, or file a complaint. Call 157 or WhatsApp 0811-5715-7157.'], u: 'https://wa.me/6281157157157', l: 'WhatsApp 0811-5715-7157' },
    { n: 'SIPASTI OJK (Satgas PASTI)', d: ['Laporkan investasi atau pinjaman online ilegal untuk ditindak Satgas Pasti.', 'Report illegal investments or online loans for action by the PASTI Task Force.'], u: 'https://sipasti.ojk.go.id', l: 'sipasti.ojk.go.id' },
    { n: 'CekRekening.id (Komdigi)', d: ['Periksa apakah sebuah rekening pernah dilaporkan terkait penipuan, dan laporkan rekening mencurigakan.', 'Check whether an account has been reported for fraud, and report suspicious accounts.'], u: 'https://cekrekening.id', l: 'cekrekening.id' },
    { n: 'Aduan Konten (Komdigi)', d: ['Laporkan situs, akun, pesan, atau konten penipuan agar bisa ditinjau dan diblokir. Tersedia juga lewat WhatsApp 0811-9224-545.', 'Report scam sites, accounts, messages, or content for review and blocking. Also available via WhatsApp 0811-9224-545.'], u: 'https://aduankonten.id', l: 'aduankonten.id' },
    { n: 'Patroli Siber (Bareskrim Polri)', d: ['Buat laporan kejahatan siber ke kepolisian, misalnya penipuan online, peretasan, dan pemerasan.', 'File a cybercrime report with the police, such as online fraud, hacking, and blackmail.'], u: 'https://patrolisiber.id', l: 'patrolisiber.id' },
    { n: 'SAPA 129 (KemenPPPA)', d: ['Layanan pengaduan untuk perempuan dan anak, termasuk kekerasan berbasis gender online atau pemerasan foto pribadi. Telepon 129 atau WhatsApp 08111-129-129.', 'Complaint service for women and children, including online gender-based violence or blackmail with private photos. Call 129 or WhatsApp 08111-129-129.'], u: 'https://wa.me/628111129129', l: 'WhatsApp 08111-129-129' },
    { n: 'Aduan Nomor (Komdigi)', d: ['Laporkan nomor telepon atau SMS penipu.', 'Report scam phone numbers or SMS.'], u: 'https://aduannomor.id', l: 'aduannomor.id', show: false }
  ];

  var S = [
    { k: 'click', ic: 'link', t: ['Aku sudah klik tautan mencurigakan', 'I clicked a suspicious link'], intro: ['Tenang, belum tentu ada kerugian. Bergerak cepat tetapi teratur.', 'Stay calm, there may be no harm yet. Move quickly but in order.'], warn: ['pesan berisi tautan palsu', 'a message with a fake link'], steps: [
      ['Putuskan koneksi sebentar', 'Disconnect for a moment', 'Matikan data seluler atau Wi-Fi supaya tidak ada unduhan lanjutan.', 'Turn off mobile data or Wi-Fi so nothing else downloads.'],
      ['Jangan isi atau pasang apa pun', 'Do not enter or install anything', 'Tutup halaman tadi. Jangan memasukkan data dan jangan memasang aplikasi dari halaman itu.', 'Close that page. Do not enter data or install apps from it.'],
      ['Periksa aplikasi baru', 'Check for new apps', 'Hapus aplikasi yang baru terpasang tanpa kamu sadari, lalu jalankan pemindaian keamanan.', 'Remove any app you did not knowingly install, then run a security scan.'],
      ['Ganti kata sandi penting', 'Change important passwords', 'Mulai dari email utama, lewat aplikasi resmi dan dari perangkat yang bersih.', 'Start with your main email, through official apps and from a clean device.'],
      ['Pantau transaksi', 'Watch your transactions', 'Cek mutasi bank dan e-wallet selama beberapa hari ke depan.', 'Check bank and e-wallet activity for the next few days.'],
      ['Laporkan tautannya', 'Report the link', 'Laporkan ke Aduan Konten agar ditinjau dan diblokir.', 'Report it to Aduan Konten so it can be reviewed and blocked.']] },
    { k: 'shared', ic: 'key', t: ['Aku membagikan OTP atau kata sandi', 'I shared an OTP or password'], intro: ['Waktu sangat penting. Amankan akun sebelum pelaku sempat bertindak.', 'Time matters. Secure the account before the attacker acts.'], warn: ['penipu yang meminta OTP atau kata sandi', 'a scammer asking for an OTP or password'], steps: [
      ['Ganti kata sandi sekarang', 'Change the password now', 'Lewat aplikasi atau situs resmi yang kamu buka sendiri, bukan lewat tautan di pesan.', 'Through the official app or site you open yourself, not through a link in a message.'],
      ['Keluarkan semua sesi', 'Sign out all sessions', 'Pilih keluar dari semua perangkat dan cabut akses aplikasi yang tidak dikenal.', 'Sign out of all devices and revoke unknown app access.'],
      ['Aktifkan verifikasi dua langkah', 'Turn on two-step verification', 'Pakai aplikasi autentikator atau kunci keamanan jika tersedia.', 'Use an authenticator app or security key if available.'],
      ['Hubungi bank atau penyedia lewat nomor resmi', 'Contact your bank or provider via official numbers', 'Jika terkait uang, minta kartu atau akun dibekukan sementara.', 'If money is involved, ask for the card or account to be frozen temporarily.'],
      ['Periksa transaksi dan notifikasi', 'Review transactions and notifications', 'Catat semua aktivitas yang tidak kamu kenal sebagai bukti.', 'Note any activity you do not recognize as evidence.'],
      ['Laporkan', 'Report it', 'Laporkan ke IASC atau Kontak OJK 157 jika ada kerugian.', 'Report to IASC or Kontak OJK 157 if there was a loss.']] },
    { k: 'paid', ic: 'money', t: ['Aku sudah transfer uang', 'I already transferred money'], intro: ['Dana tidak dijamin kembali, tetapi bertindak cepat meningkatkan peluang.', 'Recovery is not guaranteed, but acting fast improves the chances.'], warn: ['penipuan yang membuat korban transfer', 'a scam that made victims transfer money'], steps: [
      ['Hubungi bank atau e-wallet sekarang', 'Contact your bank or e-wallet now', 'Lewat nomor resmi. Minta transaksi ditahan atau rekening tujuan ditinjau.', 'Through official numbers. Ask for the transaction to be held or the destination account reviewed.'],
      ['Kumpulkan bukti', 'Collect evidence', 'Tangkapan layar chat, bukti transfer, nomor rekening, dan tautan atau akun pelaku.', 'Screenshots of chats, transfer receipt, account number, and the offender\'s links or accounts.'],
      ['Lapor ke IASC atau Kontak OJK 157', 'Report to IASC or Kontak OJK 157', 'Laporan cepat membantu pemblokiran rekening pelaku.', 'A quick report helps get the offender\'s accounts blocked.'],
      ['Periksa rekening di CekRekening.id', 'Check the account at CekRekening.id', 'Lihat apakah rekening itu sudah dilaporkan, dan laporkan jika belum.', 'See if the account was already reported, and report it if not.'],
      ['Buat laporan polisi', 'File a police report', 'Gunakan Patroli Siber atau kantor polisi terdekat dengan membawa bukti.', 'Use Patroli Siber or the nearest police station with your evidence.'],
      ['Waspada "jasa pengembalian dana"', 'Beware "refund services"', 'Pihak yang menjanjikan dana kembali dengan biaya di muka biasanya penipu kedua.', 'Anyone promising a refund for an upfront fee is usually a second scammer.']] },
    { k: 'threat', ic: 'alert', t: ['Aku diancam atau diperas', 'I am being threatened or blackmailed'], intro: ['Ini bukan salahmu. Jangan bayar, dan jangan hadapi sendirian.', 'This is not your fault. Do not pay, and do not face it alone.'], warn: ['pemerasan dengan ancaman menyebar foto', 'blackmail threatening to leak photos'], steps: [
      ['Jangan bayar dan jangan ladeni', 'Do not pay or engage', 'Membayar biasanya tidak menghentikan ancaman dan memicu permintaan baru.', 'Paying usually does not stop threats and triggers new demands.'],
      ['Simpan bukti dulu', 'Keep evidence first', 'Tangkap layar pesan, nama akun, dan tautan sebelum memblokir.', 'Screenshot messages, account names, and links before blocking.'],
      ['Blokir dan laporkan akun', 'Block and report the account', 'Gunakan fitur laporan di platform tempat ancaman terjadi.', 'Use the report feature on the platform where it happened.'],
      ['Beri tahu orang tepercaya', 'Tell someone you trust', 'Keluarga, sahabat, atau konselor. Dukungan membuatmu tidak merasa sendirian.', 'Family, a close friend, or a counselor. Support keeps you from feeling alone.'],
      ['Laporkan ke pihak berwajib', 'Report to the authorities', 'Patroli Siber, atau SAPA 129 untuk korban perempuan dan anak.', 'Patroli Siber, or SAPA 129 for women and child victims.'],
      ['Perkuat privasi akun', 'Tighten account privacy', 'Atur akun menjadi privat dan aktifkan verifikasi dua langkah.', 'Set your accounts to private and turn on two-step verification.']] },
    { k: 'hacked', ic: 'shield', t: ['Akunku diretas', 'My account was hacked'], intro: ['Ambil alih kembali akunmu dan beri tahu kontakmu.', 'Take your account back and warn your contacts.'], warn: ['akun yang diretas dan mengirim tautan aneh', 'a hacked account sending strange links'], steps: [
      ['Pulihkan lewat jalur resmi', 'Recover through official routes', 'Gunakan fitur "lupa kata sandi" atau pemulihan akun di aplikasi resmi.', 'Use "forgot password" or account recovery in the official app.'],
      ['Amankan email utama dulu', 'Secure your main email first', 'Email adalah kunci pemulihan akun lain, jadi ganti kata sandinya lebih dulu.', 'Email is the recovery key for other accounts, so change its password first.'],
      ['Keluarkan semua sesi dan cabut akses pihak ketiga', 'Sign out all sessions and revoke third-party access', 'Hapus aplikasi dan perangkat yang tidak kamu kenal dari daftar akses.', 'Remove unknown apps and devices from the access list.'],
      ['Aktifkan verifikasi dua langkah', 'Turn on two-step verification', 'Ini mencegah pengambilalihan berulang.', 'This prevents repeat takeovers.'],
      ['Peringatkan teman dan keluarga', 'Warn friends and family', 'Minta mereka tidak mengklik tautan atau mengirim uang dari akunmu.', 'Ask them not to click links or send money from your account.'],
      ['Laporkan ke dukungan platform', 'Report to platform support', 'Jika ada uang terlibat, hubungi juga bank lewat nomor resmi.', 'If money is involved, also contact your bank through official numbers.']] },
    { k: 'unsure', ic: 'help', t: ['Aku ragu, belum bertindak', 'I am unsure and have not acted'], intro: ['Pilihan terbaik: berhenti sejenak dan periksa dulu.', 'The best move: pause and check first.'], warn: ['pesan yang terasa janggal', 'a message that felt off'], steps: [
      ['Berhenti sejenak', 'Pause', 'Jangan balas, klik, atau transfer. Tidak ada yang rugi karena menunggu.', 'Do not reply, click, or transfer. Nobody loses by waiting.'],
      ['Periksa tanda bahaya', 'Check the warning signs', 'Tempel pesannya ke Scanner untuk melihat alasan di balik penilaiannya.', 'Paste the message into the Scanner to see the reasoning.'],
      ['Verifikasi lewat kanal resmi', 'Verify through an official channel', 'Cari sendiri kontak resminya. Jangan pakai kontak yang tertera di pesan.', 'Look up the official contact yourself. Do not use the one in the message.'],
      ['Tanya orang tepercaya atau Guardian AI', 'Ask someone you trust or Guardian AI', 'Pendapat kedua sering mengungkap hal yang terlewat.', 'A second opinion often reveals what you missed.'],
      ['Jika terbukti penipuan, blokir dan laporkan', 'If it is a scam, block and report', 'Laporkan agar orang lain tidak menjadi korban.', 'Report it so others do not become victims.']] }
  ];

  var cur = S[0], checked = {}, link = location.origin + '/';
  function renderSit() {
    $('#sit').innerHTML = S.map(function (s) { return '<button type="button" data-k="' + s.k + '" aria-pressed="' + (s === cur) + '" data-snd="x"><svg viewBox="0 0 24 24" aria-hidden="true">' + P[s.ic] + '</svg><span>' + esc(L(s.t[0], s.t[1])) + '</span></button>'; }).join('');
  }
  function renderSteps() {
    var c = checked[cur.k] || (checked[cur.k] = {});
    $('#aTitle').textContent = L(cur.t[0], cur.t[1]); $('#aIntro').textContent = L(cur.intro[0], cur.intro[1]);
    $('#todo').innerHTML = cur.steps.map(function (st, i) {
      return '<label><input type="checkbox" data-i="' + i + '"' + (c[i] ? ' checked' : '') + '><span class="bx"><svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg></span><span class="tt"><b>' + (i + 1) + '. ' + esc(L(st[0], st[1])) + '</b><span>' + esc(L(st[2], st[3])) + '</span></span></label>';
    }).join('');
    progress(); renderWarn();
  }
  function progress() {
    var c = checked[cur.k] || {}, n = cur.steps.filter(function (x, i) { return c[i]; }).length;
    $('#pbar').style.width = (n / cur.steps.length * 100) + '%'; $('#pTxt').textContent = n + ' / ' + cur.steps.length + ' ' + L('langkah selesai', 'steps done');
  }
  function renderWarn() {
    $('#warnTxt').value = L('Waspada! Aku baru saja menemui ' + cur.warn[0] + '. Jangan klik tautan mencurigakan, jangan kirim OTP, kata sandi, atau uang. Cek dulu lewat kanal resmi yang kamu cari sendiri. Latihan dan panduannya ada di TrustGuard: ' + link,
      'Heads up! I just ran into ' + cur.warn[1] + '. Do not click suspicious links or send OTPs, passwords, or money. Check through an official channel you look up yourself. Practice and guides are at TrustGuard: ' + link);
  }
  $('#sit').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; cur = S.filter(function (s) { return s.k === b.getAttribute('data-k'); })[0]; window.Sound.play('pick'); renderSit(); renderSteps(); });
  $('#todo').addEventListener('change', function (e) {
    var i = e.target.getAttribute('data-i'), c = checked[cur.k]; c[i] = e.target.checked; window.Sound.play(e.target.checked ? 'check' : 'uncheck'); progress();
    if (cur.steps.every(function (x, j) { return c[j]; })) { window.Sound.play('success'); window.FX.confetti(window.innerWidth / 2, window.innerHeight / 2, 100); A.toast(L('Semua langkah selesai. Kamu sudah melindungi dirimu.', 'All steps done. You protected yourself.')); }
  });
  $('#copyList').addEventListener('click', function () {
    var t = L(cur.t[0], cur.t[1]) + '\n' + cur.steps.map(function (s, i) { return (i + 1) + '. ' + L(s[0], s[1]) + ': ' + L(s[2], s[3]); }).join('\n');
    A.copy(t).then(function () { A.toast(L('Daftar langkah disalin.', 'Checklist copied.')); window.Sound.play('check'); });
  });
  $('#copyWarn').addEventListener('click', function () { A.copy($('#warnTxt').value).then(function () { A.toast(L('Pesan disalin.', 'Message copied.')); window.Sound.play('check'); }); });
  $('#waWarn').addEventListener('click', function () { window.open('https://wa.me/?text=' + encodeURIComponent($('#warnTxt').value), '_blank', 'noopener'); });
  var sh = $('#shareWarn'); if (!navigator.share) sh.style.display = 'none'; else sh.addEventListener('click', function () { navigator.share({ text: $('#warnTxt').value }).catch(function () {}); });

  function renderChan() {
    $('#chan').innerHTML = CH.filter(function (c) { return c.show !== false; }).map(function (c) {
      return '<a class="card spot" href="' + c.u + '" target="_blank" rel="noopener noreferrer"><b>' + esc(c.n) + '</b><p>' + esc(L(c.d[0], c.d[1])) + '</p><span class="u">' + esc(c.l) + ' <svg class="ico" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="M7 17 17 7M9 7h8v8"/></svg></span></a>';
    }).join('');
  }
  A.onLang(function () { renderSit(); renderSteps(); renderChan(); });
  renderSit(); renderSteps(); renderChan();
})();
