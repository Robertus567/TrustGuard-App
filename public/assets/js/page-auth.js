/**
 * page-auth.js : halaman Masuk dan Buat akun (dipilih lewat <body data-auth="login|signup">).
 *
 * Interaksi:
 *  - label mengambang, garis bawah bercahaya, dan percikan kecil tiap kali mengetik,
 *  - Guardian melirik kolom yang sedang diisi dan menutup mata saat kata sandi diketik,
 *  - pengukur kekuatan kata sandi, peringatan Caps Lock, tombol lihat/sembunyikan,
 *  - validasi sisi klien yang ramah sebelum dikirim, lalu tombol berubah jadi centang saat berhasil.
 * Tidak ada data yang dikirim ke mana pun selain /api/auth di situs ini.
 */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, $$ = A.$$, L = A.L, esc = A.esc;
  var Acc = window.TGAccount, mode = document.body.getAttribute('data-auth') || 'login';
  var form = $('#form'), err = $('#err'), sub = $('#submit');
  var next = (location.search.match(/[?&]next=([^&]+)/) || [])[1];
  next = next ? decodeURIComponent(next) : '/learn';
  if (!/^\/[a-z0-9\-\/?=&#%]*$/i.test(next) || /^\/\//.test(next)) next = '/learn'; // hanya tujuan di situs ini

  /* Bila fitur akun nonaktif di server ini, jelaskan dan jangan biarkan pengguna bingung */
  Acc.ready().then(function (user) {
    if (!Acc.enabled()) {
      form.hidden = true;
      showErr(L('Fitur akun belum diaktifkan di server ini (DATABASE_URL belum diisi). Semua fitur lain tetap bisa dipakai tanpa akun.', 'Accounts are not enabled on this server (DATABASE_URL is not set). Everything else works without an account.'));
      return;
    }
    if (user) { A.toast(L('Kamu sudah masuk sebagai ' + user.username + '.', 'You are already signed in as ' + user.username + '.')); setTimeout(function () { location.href = next; }, 900); }
  });

  function showErr(msg) { err.textContent = msg; err.classList.add('show'); window.FX.shake(err); }
  function hideErr() { err.classList.remove('show'); }

  /* ---------- Efek kolom ---------- */
  $$('.fld input').forEach(function (inp) {
    var fld = inp.parentNode;
    inp.addEventListener('focus', function () {
      if (inp.type === 'password' || inp.id === 'password') window.Mecha.peek(true); else { window.Mecha.peek(false); window.Mecha.lookAt(inp); }
    });
    inp.addEventListener('blur', function () { window.Mecha.peek(false); window.Mecha.lookAt(null); validate(inp, true); });
    inp.addEventListener('input', function () {
      hideErr();
      fld.classList.remove('pulse'); void fld.offsetWidth; fld.classList.add('pulse');
      var dot = document.createElement('i'); dot.className = 'ink';
      dot.style.left = Math.min(92, 6 + inp.value.length * 1.6) + '%'; fld.appendChild(dot);
      setTimeout(function () { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 700);
      validate(inp, false);
    });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && inp.id !== 'password' && mode === 'signup') { e.preventDefault(); var all = $$('.fld input'); var i = all.indexOf(inp); if (all[i + 1]) all[i + 1].focus(); } });
  });
  // Caps Lock
  var pw = $('#password'), caps = $('#caps');
  ['keydown', 'keyup'].forEach(function (ev) { pw.addEventListener(ev, function (e) { if (e.getModifierState) caps.classList.toggle('show', e.getModifierState('CapsLock')); }); });
  pw.addEventListener('blur', function () { caps.classList.remove('show'); });
  // Lihat atau sembunyikan kata sandi
  var eye = $('#eye');
  eye.addEventListener('click', function () {
    var show = pw.type === 'password'; pw.type = show ? 'text' : 'password'; eye.setAttribute('aria-pressed', String(show));
    window.Sound.play('toggle'); if (show) { window.Mecha.peek(false); window.Mecha.mood('wink', 1500); } else if (document.activeElement === pw) window.Mecha.peek(true);
    pw.focus();
  });

  /* ---------- Validasi ramah ---------- */
  function setHint(inp, msg, bad) {
    var fld = inp.parentNode, h = $('#h' + inp.id.charAt(0).toUpperCase() + inp.id.slice(1));
    fld.classList.toggle('bad', !!bad && !!msg); fld.classList.toggle('good', !bad && !!inp.value && !msg);
    if (h) { if (msg) h.textContent = msg; else if (h.dataset.tgOrigtext !== undefined || h.getAttribute('data-en')) A.apply(h.parentNode); else h.textContent = ''; }
  }
  function strength(v) { var s = 0; if (v.length >= 8) s++; if (v.length >= 12) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++; return v.length < 8 ? Math.min(s, 1) : Math.max(1, s); }
  function validate(inp, final) {
    var v = inp.value.trim();
    if (inp.id === 'username') {
      var ok = /^[a-z0-9_.]{3,20}$/i.test(v);
      setHint(inp, !v ? null : ok ? null : L('Pakai 3 sampai 20 huruf, angka, titik, atau garis bawah, tanpa spasi.', 'Use 3 to 20 letters, numbers, dots, or underscores, no spaces.'), !ok && !!v);
      return ok;
    }
    if (inp.id === 'email') {
      var okE = !v || (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 120);
      setHint(inp, okE ? null : L('Format email tidak valid. Kosongkan saja bila tidak mau memakai email.', 'Invalid email format. Leave it empty if you prefer.'), !okE);
      return okE;
    }
    if (inp.id === 'password') {
      var m = $('#meter'); if (m) m.setAttribute('data-s', v ? strength(v) : 0);
      var okP = v.length >= 8 && v.length <= 72;
      if (mode === 'signup') setHint(inp, !v ? null : okP ? L(['', 'Cukup. Tambah huruf besar atau angka agar lebih kuat.', 'Lumayan kuat.', 'Kuat.', 'Sangat kuat!'][strength(v)], ['', 'Okay. Add capitals or numbers to make it stronger.', 'Fairly strong.', 'Strong.', 'Very strong!'][strength(v)]) : L('Minimal 8 karakter.', 'At least 8 characters.'), !okP && !!v && final);
      return okP || (mode === 'login' && v.length > 0);
    }
    if (inp.id === 'login') { var okL = v.length >= 3; setHint(inp, okL || !v ? null : L('Isi nama pengguna atau email.', 'Enter your username or email.'), !okL && final); return okL; }
    return true;
  }

  /* ---------- Kirim ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault(); hideErr();
    var inputs = $$('.fld input'), ok = true;
    inputs.forEach(function (i) { if (!validate(i, true)) ok = false; });
    if (!ok) { showErr(L('Periksa kembali kolom yang ditandai.', 'Please check the highlighted fields.')); window.Sound.play('fail'); window.Mecha.react('bingung'); return; }
    sub.classList.add('busy'); sub.disabled = true; window.Mecha.react('mikir'); window.Sound.play('send');
    var p = mode === 'signup'
      ? Acc.signup({ username: $('#username').value.trim(), email: $('#email').value.trim(), password: pw.value })
      : Acc.login({ login: $('#login').value.trim(), password: pw.value });
    p.then(function (r) {
      sub.classList.remove('busy'); sub.disabled = false;
      if (!r.ok) {
        showErr(r.j.error || L('Gagal. Coba lagi.', 'Failed. Please try again.'));
        if (r.j.field === 'username') setHint($('#username'), r.j.error, true);
        if (r.j.field === 'email') setHint($('#email'), r.j.error, true);
        window.Sound.play('fail'); window.Mecha.react('salah'); window.FX.shake($('.au-in'));
        return;
      }
      sub.classList.add('okk'); $('.tx', sub).textContent = L('Berhasil!', 'Success!');
      window.Sound.play('success'); window.Mecha.react('benar');
      var r2 = sub.getBoundingClientRect(); window.FX.confetti(r2.left + r2.width / 2, r2.top, 90);
      // Progres tamu di tab ini ikut dibawa ke akun
      var g = Acc.guest.get();
      if (Object.keys(g).length) Acc.saveProgress(Acc.merge(r.j.user.progress || {}, g)).then(function () { Acc.guest.clear(); });
      A.toast(mode === 'signup' ? L('Akun dibuat. Selamat datang, ' + r.j.user.username + '!', 'Account created. Welcome, ' + r.j.user.username + '!') : L('Selamat datang kembali, ' + r.j.user.username + '!', 'Welcome back, ' + r.j.user.username + '!'));
      setTimeout(function () { location.href = next; }, 1100);
    });
  });

  // Tombol utama sedikit "magnetis" mengikuti kursor
  if (!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches)) {
    sub.addEventListener('pointermove', function (e) { var r = sub.getBoundingClientRect(); sub.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .08).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .18).toFixed(1) + 'px) translateY(-3px)'; });
    sub.addEventListener('pointerleave', function () { sub.style.transform = ''; });
  }
  setTimeout(function () { window.Mecha.react('halo'); }, 1200);
  setTimeout(function () { var first = $('.fld input'); if (first && window.innerWidth > 980) first.focus(); }, 1500);
})();
