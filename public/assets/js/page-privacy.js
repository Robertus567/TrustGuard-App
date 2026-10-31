/** page-privacy.js : menampilkan data yang benar-benar tersimpan di perangkat ini (dibaca langsung dari storage) dan tombol hapus semuanya. */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, L = A.L, esc = A.esc;
  function sess(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function draw() {
    var lang = A.Store.get('tg-lang'), snd = A.Store.get('tg-snd');
    var guest = window.TGAccount ? window.TGAccount.guest.get() : {}, n = Object.keys(guest).length;
    var me = sess('tg-me'), user = null; try { user = me && JSON.parse(me).user; } catch (e) { /* diabaikan */ }
    var rows = [
      ['tg-lang', L('Pilihan bahasa (localStorage)', 'Language choice (localStorage)'), lang || L('(belum dipilih)', '(not set)')],
      ['tg-snd', L('Pilihan efek suara (localStorage)', 'Sound effects choice (localStorage)'), snd === null ? L('(belum dipilih)', '(not set)') : (snd === '1' ? L('aktif', 'on') : L('mati', 'off'))],
      ['tg-guest-progress', L('Progres latihan tamu (sessionStorage, hilang saat tab ditutup)', 'Guest practice progress (sessionStorage, gone when the tab closes)'), n + ' ' + L('chapter tercatat', 'chapters recorded')],
      ['tg-me', L('Salinan status login untuk menampilkan header lebih cepat (sessionStorage)', 'Cached sign-in status so the header renders faster (sessionStorage)'), user ? L('masuk sebagai ', 'signed in as ') + user.username : L('(tamu)', '(guest)')],
      ['tg-seen, tg-consent, tg-prefill', L('Penanda sesi: loader sudah tampil, persetujuan chat, teks kiriman Scanner ke chat (sessionStorage)', 'Session flags: loader shown, chat consent, Scanner text handed to chat (sessionStorage)'), [sess('tg-seen') ? 'tg-seen' : null, sess('tg-consent') ? 'tg-consent' : null, sess('tg-prefill') ? 'tg-prefill' : null].filter(Boolean).join(', ') || L('(kosong)', '(empty)')],
      ['tg_session', L('Cookie sesi login (HttpOnly, hanya ada bila kamu masuk; tidak terbaca skrip)', 'Sign-in session cookie (HttpOnly, present only when signed in; not readable by scripts)'), user ? L('ada', 'present') : L('(tidak ada)', '(none)')],
      ['IndexedDB: keyval-store', L('Cache model bahasa OCR (dibuat Tesseract.js setelah kamu memakai Scanner berkas gambar)', 'OCR language model cache (created by Tesseract.js after you use the image file scanner)'), L('dikelola browser', 'managed by the browser')]
    ];
    $('#stored').innerHTML = rows.map(function (r) { return '<tr><td><code class="k">' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('');
  }
  $('#wipe').addEventListener('click', function () {
    A.Store.clearAll();
    try { if (window.indexedDB && indexedDB.deleteDatabase) indexedDB.deleteDatabase('keyval-store'); } catch (e) { /* diabaikan */ }
    draw(); A.toast(L('Semua data TrustGuard di perangkat ini sudah dihapus. Cookie login dihapus lewat tombol Keluar.', 'All TrustGuard data on this device was deleted. The sign-in cookie is removed via Sign out.')); window.Sound.play('drop');
  });
  A.onLang(draw); draw();
  if (window.TGAccount) window.TGAccount.onChange(draw);
  // Penanda bagian aktif pada daftar isi
  var links = A.$$('.toc a');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.style.background = a.getAttribute('href') === '#' + e.target.id ? 'rgba(255,255,255,.1)' : ''; }); }); }, { rootMargin: '-30% 0px -60% 0px' });
    A.$$('.pv section').forEach(function (s) { io.observe(s); });
  }
})();
