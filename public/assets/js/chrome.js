/**
 * chrome.js : kerangka halaman yang sama di semua halaman.
 * Menyuntikkan header (navbar, pergantian bahasa, tombol suara, tombol Masuk atau avatar profil), footer,
 * tombol melayang Guardian, dan mengatur loader (layar pembuka dan transisi antarhalaman).
 * Halaman menentukan dirinya lewat <body data-page="home|scanner|chat|learn|act|privacy|auth|profile|404">.
 */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, $$ = A.$$, L = A.L, esc = A.esc;
  var page = document.body.getAttribute('data-page') || 'home';
  window.Sound.setTheme(page);

  /* ---------- Logo inline (agar bagian-bagiannya bisa dianimasikan saat hover) ---------- */
  var SHIELD = 'M32 3.5 56 12v19.5C56 46.5 46.5 56.5 32 61 17.5 56.5 8 46.5 8 31.5V12z';
  var uid = 0;
  function logo() {
    var u = ++uid;
    return '<svg class="lm" viewBox="0 0 64 64" fill="none" aria-hidden="true"><defs>' +
      '<linearGradient id="lg' + u + '" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8ff7e6"/><stop offset=".5" stop-color="#5eead4"/><stop offset="1" stop-color="#7b8cff"/></linearGradient>' +
      '<linearGradient id="lf' + u + '" x1="20" y1="4" x2="30" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<clipPath id="lc' + u + '"><path d="' + SHIELD + '"/></clipPath></defs>' +
      '<path d="' + SHIELD + '" fill="url(#lg' + u + ')"/><path d="M32 3.5 56 12v19.5C56 46.5 46.5 56.5 32 61z" fill="#0a1230" opacity=".16"/>' +
      '<path d="M32 3.5 8 12v19.5c0 4.2 1 8 2.6 11.4C11.4 28 18 13 32 3.5z" fill="url(#lf' + u + ')"/>' +
      '<path d="M32 9.5l18.5 6.3v15.4c0 11.3-7.2 19.3-18.5 23.3-11.3-4-18.5-12-18.5-23.3V15.8z" stroke="#060a16" stroke-opacity=".3" stroke-width="1.6"/>' +
      '<g clip-path="url(#lc' + u + ')"><rect class="lm-shine" x="0" y="-4" width="12" height="72" fill="#fff"/></g>' +
      '<path class="lm-check" pathLength="1" d="M21.5 32.5 29 40l14-16.5" stroke="#060a16" stroke-width="5.4" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle class="lm-dot" cx="47.5" cy="15.5" r="2.4" fill="#f3d9a4"/></svg>';
  }
  window.TGLogo = logo;

  /* ---------- Data navigasi ---------- */
  var ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    scanner: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
    chat: '<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5z"/><path d="M9 9.5h6M9 12.5h3.5"/>',
    learn: '<path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 12v4.2c0 1 2.2 2.3 5 2.3s5-1.3 5-2.3V12"/><path d="M21 9.5V15"/>',
    act: '<path d="M12 3 5 6v5.5c0 4.2 2.8 7.4 7 9 4.2-1.6 7-4.8 7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    privacy: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.2"/>',
    user: '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1-4.2 4-6.5 7.5-6.5s6.5 2.3 7.5 6.5"/>'
  };
  var NAV = [
    ['/', 'home', 'Beranda', 'Home'], ['/scanner', 'scanner', 'Scanner', 'Scanner'], ['/chat', 'chat', 'Guardian AI', 'Guardian AI'],
    ['/learn', 'learn', 'Latihan', 'Practice'], ['/act', 'act', 'Langkah Aman', 'Safe Steps'], ['/privacy', 'privacy', 'Privasi', 'Privacy']
  ];

  /* ---------- Header ---------- */
  function buildHeader() {
    var links = NAV.map(function (n) {
      return '<a href="' + n[0] + '"' + (n[1] === page ? ' class="on" aria-current="page"' : '') + ' data-nav="' + n[1] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n[1]] + '</svg><span data-en="' + n[3] + '">' + n[2] + '</span></a>';
    }).join('');
    var h = document.createElement('header');
    h.className = 'hd'; h.id = 'hd';
    h.innerHTML = '<div class="hd-in wrap"><a class="brand" href="/" aria-label="TrustGuard">' + logo() + '<span>Trust<em>Guard</em></span></a>' +
      '<nav class="nv" id="nv" aria-label="Menu utama" data-en-aria="Main menu"><i aria-hidden="true"></i>' + links + '<div class="nv-extra" id="nvExtra"></div></nav>' +
      '<div class="hd-tools">' +
      '<div class="lg" data-lang="' + A.lang() + '" role="group" aria-label="Bahasa" data-en-aria="Language"><i aria-hidden="true"></i><button type="button" data-l="id" aria-pressed="' + (A.lang() === 'id') + '">ID</button><button type="button" data-l="en" aria-pressed="' + (A.lang() === 'en') + '">EN</button></div>' +
      '<button type="button" class="snd" id="snd" aria-pressed="' + window.Sound.isOn() + '" aria-label="Efek suara" data-en-aria="Sound effects"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path class="wv" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/><path class="xx" d="M16 9.5l5 5M21 9.5l-5 5"/></svg></button>' +
      '<div class="acct" id="acct"></div>' +
      '<button type="button" class="mt" id="mt" aria-expanded="false" aria-controls="nv" aria-label="Buka menu" data-en-aria="Open menu"><span></span><span></span></button></div></div><div class="hd-prog" id="prog"></div>';
    var skip = document.createElement('a');
    skip.className = 'skip'; skip.href = '#main'; skip.setAttribute('data-en', 'Skip to content'); skip.textContent = 'Lewati ke konten';
    document.body.insertBefore(h, document.body.firstChild);
    document.body.insertBefore(skip, h);
  }

  /* ---------- Akun di header: tombol Masuk (tamu) atau avatar dengan menu (sudah masuk) ---------- */
  function initial(name) { return esc(String(name || '?').trim().charAt(0).toUpperCase()); }
  function renderAccount() {
    var box = $('#acct'), extra = $('#nvExtra');
    if (!box) return;
    var Acc = window.TGAccount, user = Acc ? Acc.user() : null, on = Acc ? Acc.enabled() : false;
    var here = location.pathname + location.search;
    if (!on) { box.innerHTML = ''; extra.innerHTML = ''; return; }
    if (!user) {
      box.innerHTML = '<a class="btn btn-gh btn-sm hd-login" href="/login?next=' + encodeURIComponent(here) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.user + '</svg><span data-en="Sign in">Masuk</span></a>';
      extra.innerHTML = '<a href="/login?next=' + encodeURIComponent(here) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.user + '</svg><span data-en="Sign in or create account">Masuk atau buat akun</span></a>';
    } else {
      var lv = window.TGLevel ? window.TGLevel.tierFor(window.TGLevel.summary(user.progress).stars) : null;
      var ring = lv ? lv.tier.c1 : '#5eead4';
      box.innerHTML = '<div class="av"><button type="button" class="av-btn" id="avBtn" aria-haspopup="true" aria-expanded="false" aria-label="' + esc(L('Profil ', 'Profile ') + user.username) + '" style="--ring:' + ring + '"><span>' + initial(user.username) + '</span></button>' +
        '<div class="av-menu" id="avMenu" role="menu">' +
        '<div class="av-head"><span class="av-big" style="--ring:' + ring + '">' + initial(user.username) + '</span><div><b>' + esc(user.username) + '</b><small>' + (user.email ? esc(user.email) : L('tanpa email', 'no email')) + '</small></div></div>' +
        (lv ? '<div class="av-tier">' + window.TGLevel.badge(lv.tier, 40) + '<div><b>' + esc(window.TGLevel.name(lv.tier)) + '</b><small>' + lv.stars + ' &#9733; ' + (lv.next ? L('lagi ' + lv.toNext + ' ke ' + window.TGLevel.name(lv.next), lv.toNext + ' more to ' + window.TGLevel.name(lv.next)) : L('tier tertinggi', 'top tier')) + '</small></div></div>' : '') +
        '<a href="/profile" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.user + '</svg><span data-en="My profile">Profil saya</span></a>' +
        '<a href="/learn" role="menuitem"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.learn + '</svg><span data-en="Continue practice">Lanjutkan latihan</span></a>' +
        '<button type="button" id="logoutBtn" role="menuitem" data-snd="x"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/></svg><span data-en="Sign out">Keluar</span></button></div></div>';
      extra.innerHTML = '<a href="/profile"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS.user + '</svg><span>' + esc(user.username) + (lv ? ' <small class="muted">(' + esc(window.TGLevel.name(lv.tier)) + ')</small>' : '') + '</span></a>';
      var btn = $('#avBtn'), menu = $('#avMenu');
      function toggle(open) { menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', String(open)); if (open) window.Sound.play('toggle'); }
      btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(!menu.classList.contains('open')); });
      document.addEventListener('click', function (e) { if (menu.classList.contains('open') && !menu.contains(e.target)) toggle(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
      $('#logoutBtn').addEventListener('click', function () {
        window.Sound.play('uncheck');
        window.TGAccount.logout().then(function () { A.toast(L('Kamu sudah keluar. Sampai jumpa!', 'You are signed out. See you!')); if (page === 'profile') location.href = '/'; });
      });
    }
    A.apply(box); A.apply(extra);
  }

  /* ---------- Footer ---------- */
  function buildFooter() {
    var f = document.createElement('footer');
    f.className = 'ft';
    var col = function (title, titleEn, items) {
      return '<div><h4 data-en="' + titleEn + '">' + title + '</h4>' + items.map(function (i) { return '<a href="' + i[0] + '" data-en="' + i[2] + '">' + i[1] + '</a>'; }).join('') + '</div>';
    };
    f.innerHTML = '<div class="wrap"><div class="ft-grid"><div><a class="brand" href="/">' + logo() + '<span>Trust<em>Guard</em></span></a>' +
      '<p data-en="Learn to spot digital traps, practice safer decisions, and know what to do when something feels off. An educational tool, not a guarantee of safety.">Kenali jebakan digital, latih keputusan yang lebih aman, dan tahu langkah saat ada yang terasa janggal. Ini alat edukasi, bukan jaminan keamanan.</p></div>' +
      col('Fitur', 'Features', [['/scanner', 'Scanner', 'Scanner'], ['/chat', 'Guardian AI', 'Guardian AI'], ['/learn', 'Latihan', 'Practice'], ['/act', 'Langkah Aman', 'Safe Steps']]) +
      col('Informasi', 'Information', [['/', 'Beranda', 'Home'], ['/privacy', 'Privasi dan keamanan data', 'Privacy and data safety'], ['/privacy#ai', 'Penggunaan AI', 'How AI is used'], ['/privacy#akun', 'Akun dan progres', 'Accounts and progress']]) +
      '<div><h4 data-en="Report scams">Lapor penipuan</h4><a href="https://iasc.ojk.go.id" target="_blank" rel="noopener noreferrer">Indonesia Anti-Scam Centre</a><a href="https://cekrekening.id" target="_blank" rel="noopener noreferrer">CekRekening.id</a><a href="/act#lapor" data-en="All official channels">Semua kanal resmi</a></div></div>' +
      '<div class="ft-bot"><span data-en="Built for MIT-Week 2026: Guardians of the Digital Space.">Dibuat untuk MIT-Week 2026: Guardians of the Digital Space.</span><span data-en="Results are early hints, never proof that something is safe or a scam.">Hasil hanyalah petunjuk awal, bukan bukti aman atau penipuan.</span></div></div>';
    var main = $('main');
    if (main && main.parentNode) main.parentNode.insertBefore(f, main.nextSibling); else document.body.appendChild(f);
  }

  /* ---------- Tombol melayang menuju Guardian AI ---------- */
  function buildFab() {
    if (page === 'chat' || page === '404' || page === 'auth') return;
    var a = document.createElement('a');
    a.className = 'fab'; a.href = '/chat'; a.setAttribute('aria-label', 'Guardian AI');
    a.innerHTML = '<span class="tt" data-en="Ask Guardian AI">Tanya Guardian AI</span><span class="fab-in"><span class="mecha" data-mecha data-crop="head" data-static data-id="fab"></span></span>';
    document.body.appendChild(a);
  }

  /* ---------- Perilaku navbar ---------- */
  function wireHeader() {
    var hd = $('#hd'), nv = $('#nv'), ind = $('i', nv), prog = $('#prog'), links = $$('a[data-nav]', nv);
    var active = $('a.on', nv);
    function place(a) {
      if (!a || getComputedStyle(ind).display === 'none') return;
      ind.style.width = a.offsetWidth + 'px';
      ind.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      ind.style.opacity = '1';
    }
    function rest() { if (active) place(active); else ind.style.opacity = '0'; }
    links.forEach(function (a) {
      a.addEventListener('mouseenter', function () { place(a); });
      a.addEventListener('focus', function () { place(a); });
    });
    nv.addEventListener('mouseleave', rest);
    nv.addEventListener('focusout', function () { setTimeout(function () { if (!nv.contains(document.activeElement)) rest(); }, 30); });
    window.addEventListener('resize', rest);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
    setTimeout(rest, 60);
    A.onLang(function () { setTimeout(rest, 40); });

    // Menu seluler
    var mt = $('#mt');
    function toggleMenu(open) {
      nv.classList.toggle('open', open); mt.setAttribute('aria-expanded', String(open));
      window.Sound.play('toggle');
    }
    mt.addEventListener('click', function () { toggleMenu(!nv.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nv.classList.contains('open')) toggleMenu(false); });
    document.addEventListener('click', function (e) { if (nv.classList.contains('open') && !nv.contains(e.target) && !mt.contains(e.target)) toggleMenu(false); });

    // Bahasa
    var lg = $('.lg');
    $$('button', lg).forEach(function (b) {
      b.addEventListener('click', function () {
        A.setLang(b.getAttribute('data-l'));
        lg.setAttribute('data-lang', A.lang());
        $$('button', lg).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        window.Sound.play('toggle');
      });
    });
    // Suara
    var snd = $('#snd');
    snd.addEventListener('click', function () { var on = !window.Sound.isOn(); window.Sound.set(on); snd.setAttribute('aria-pressed', String(on)); });

    // Bayangan header dan garis kemajuan scroll
    var ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.pageYOffset || document.documentElement.scrollTop, max = document.documentElement.scrollHeight - window.innerHeight;
        hd.classList.toggle('scrolled', y > 8);
        prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* ---------- Loader ---------- */
  var ld = $('#ld');
  function runLoader() {
    if (!ld) return;
    var first = !A.Sess.get('tg-seen');
    A.Sess.set('tg-seen', '1');
    var minMs = first ? 1700 : 650, start = Date.now(), bar = $('#ldbar'), tag = $('#ldtag'), pct = 0, msgIdx = 0;
    var msgs = [['Menyiapkan perisai...', 'Preparing the shield...'], ['Memuat latihan...', 'Loading practice...'], ['Hampir siap...', 'Almost ready...']];
    if (!first) { var t0 = $('.ld-tag'); if (t0) t0.style.visibility = 'hidden'; }
    function say() { if (tag) { tag.textContent = L(msgs[msgIdx][0], msgs[msgIdx][1]); } }
    say();
    var ticker = setInterval(function () {
      pct = Math.min(92, pct + (92 - pct) * .12 + 1);
      if (bar) bar.style.width = pct + '%';
      var m = Math.min(msgs.length - 1, Math.floor((Date.now() - start) / (minMs / 2.4)));
      if (m !== msgIdx) { msgIdx = m; say(); }
    }, 90);
    var finished = false;
    function finish() {
      if (finished) return; finished = true; clearInterval(ticker);
      if (bar) bar.style.width = '100%';
      // Suara pembuka hanya terdengar bila browser sudah mengizinkan audio (setelah interaksi pengguna)
      setTimeout(function () { ld.className = 'ld out'; window.Sound.play(first ? 'welcome' : 'load'); }, 260);
    }
    var loaded = document.readyState === 'complete', fontsOk = !(document.fonts && document.fonts.ready), elapsed = false;
    function check() { if (loaded && fontsOk && elapsed) finish(); }
    if (!loaded) window.addEventListener('load', function () { loaded = true; check(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fontsOk = true; check(); });
    setTimeout(function () { elapsed = true; check(); }, minMs);
    setTimeout(finish, 3800); // batas atas: apa pun yang terjadi loader ditutup
    // Kembali lewat tombol back (bfcache): pastikan loader tidak tersangkut
    window.addEventListener('pageshow', function (e) { if (e.persisted) { ld.className = 'ld out'; } });
  }

  /* Transisi saat berpindah halaman internal */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    var url; try { url = new URL(a.href, location.href); } catch (er) { return; }
    if (url.origin !== location.origin || a.hasAttribute('download')) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // hash di halaman yang sama
    if (!ld) return;
    e.preventDefault();
    window.Sound.play('nav');
    ld.className = 'ld fast';
    var tag = $('#ldtag'); if (tag) tag.textContent = '';
    setTimeout(function () { location.href = url.href; }, 360);
  });
  // Klik tombol umum berbunyi, kecuali yang menandai data-snd (diatur sendiri oleh halaman)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.btn,.chip');
    if (b && !b.hasAttribute('data-snd') && !(b.tagName === 'A' && b.getAttribute('href'))) window.Sound.play('click');
  });

  /* ---------- Mulai ---------- */
  buildHeader(); buildFooter(); buildFab();
  if (A.lang() === 'en') A.apply(document);
  wireHeader();
  renderAccount();
  if (window.TGAccount) { window.TGAccount.onChange(renderAccount); A.onLang(renderAccount); }
  if (window.Mecha) window.Mecha.init(document);
  window.FX.reveal(document);
  runLoader();
  // Anchor #hash di halaman lain (mis. /privacy#ai): gulir setelah loader selesai
  if (location.hash) setTimeout(function () { var t = $(location.hash); if (t && t.scrollIntoView) t.scrollIntoView(); }, 900);
})();
