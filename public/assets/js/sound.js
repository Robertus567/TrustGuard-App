/**
 * sound.js : efek suara sintetis (WebAudio). Tidak memakai berkas audio sehingga tidak ada lisensi pihak ketiga.
 * Suara baru berbunyi setelah pengguna berinteraksi (aturan browser) dan bisa dimatikan lewat tombol speaker.
 * Tiap halaman punya "tema" nada sendiri (Sound.theme).
 *
 * Kelompok suara:
 *  - antarmuka : click, nav, hover, hoverNav, toggle, pick, check, uncheck, type, focus, peek, send, recv, scan, high, med, low, success, fail, level, load
 *  - karakter  : squeak, hmph, huff, drop, pat, purr, giggle, chirp, whee, yawn, surprise, cheer, aww, welcome
 *
 * Catatan perbaikan:
 *  - Suara hover/ketik dulu terlalu pelan (amplitudo 0.045) sehingga nyaris tak terdengar; sekarang dinaikkan.
 *  - Suara "pasif" (hover, ketik, fokus, loader) hanya dijadwalkan bila audio sudah benar-benar berstatus running.
 *    Sebelumnya suara itu menumpuk saat browser masih mengunci audio lalu meledak bersamaan pada klik pertama.
 *  - Hover memakai jenis pointer (mouse/pen), bukan media query pointer:coarse, supaya laptop layar sentuh tetap berbunyi.
 *  - Semua elemen interaktif (tautan, tombol, tab, kolom formulir, dropzone, footer, halaman masuk/daftar) kini berbunyi.
 */
(function () {
  'use strict';
  var Store = window.TGApp.Store;
  var ctx = null, master = null;
  var enabled = Store.get('tg-snd') !== '0';
  var theme = { mult: 1, wave: 'sine' };
  var THEMES = { home: { mult: 1, wave: 'sine' }, scanner: { mult: .86, wave: 'triangle' }, chat: { mult: 1.12, wave: 'sine' }, learn: { mult: 1.2, wave: 'square' }, act: { mult: .8, wave: 'triangle' }, privacy: { mult: .9, wave: 'sine' }, auth: { mult: 1.05, wave: 'sine' }, profile: { mult: 1, wave: 'triangle' } };

  function ready() {
    if (!enabled) return null;
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = .9; // sebelumnya .3: terlalu pelan sehingga nyaris tak terdengar di banyak perangkat
        // Kompresor sebagai pembatas agar suara keras tidak pecah
        var comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
        if (comp) { comp.threshold.value = -14; comp.ratio.value = 6; master.connect(comp); comp.connect(ctx.destination); }
        else master.connect(ctx.destination);
        // Trik pembuka kunci audio untuk iOS dan browser bawaan aplikasi (Instagram, dsb.): putar buffer kosong
        try { var sb = ctx.createBuffer(1, 1, 22050), ss = ctx.createBufferSource(); ss.buffer = sb; ss.connect(ctx.destination); ss.start(0); } catch (e2) { /* diabaikan */ }
      }
      // "suspended" (belum ada interaksi) maupun "interrupted" (iOS setelah telepon/alarm) perlu dibangunkan lagi
      if (ctx.state !== 'running' && ctx.resume) { var pr = ctx.resume(); if (pr && pr.catch) pr.catch(function () { /* menunggu interaksi pengguna */ }); }
      return ctx;
    } catch (e) { return null; }
  }

  /** Satu nada: frekuensi f, mulai t detik dari sekarang, durasi d, bisa meluncur ke frekuensi slide. */
  function tone(f, t, d, vol, wave, slide) {
    var c = ready(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + t;
    o.type = wave || theme.wave;
    o.frequency.setValueAtTime(f * theme.mult, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide * theme.mult), t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || .3, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + d + .03);
  }
  /** Desis (noise) untuk efek whoosh dan napas. */
  function hiss(t, d, vol, f0, f1) {
    var c = ready(); if (!c) return;
    var len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain(), t0 = c.currentTime + t;
    src.buffer = buf; flt.type = 'bandpass'; flt.Q.value = 1.2;
    flt.frequency.setValueAtTime(f0, t0); flt.frequency.exponentialRampToValueAtTime(f1, t0 + d);
    g.gain.value = vol;
    src.connect(flt); flt.connect(g); g.connect(master); src.start(t0);
  }
  /** Nada "suara" karakter: vibrato kecil agar terdengar hidup, bukan bip mesin. */
  function voice(f, t, d, vol, slide) {
    var c = ready(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), v = c.createOscillator(), vg = c.createGain(), t0 = c.currentTime + t;
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
    v.frequency.value = 7; vg.gain.value = f * .02; v.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol || .2, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(master); v.start(t0); o.start(t0); o.stop(t0 + d + .03); v.stop(t0 + d + .03);
  }
  /** Suara perempuan bernada tinggi lewat sintesis formant: gelombang gergaji (pita suara) disaring filter pita
   *  pada frekuensi formant. f0a -> f0b = nada awal ke akhir; formants = [[frekuensi, Q, penguatan], ...]. */
  function girl(f0a, f0b, t, d, vol, formants) {
    var c = ready(); if (!c) return;
    var t0 = c.currentTime + t, o = c.createOscillator(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f0a, t0); o.frequency.exponentialRampToValueAtTime(Math.max(60, f0b), t0 + d);
    vib.frequency.value = 6; vg.gain.value = f0a * .012; vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .025); g.gain.setValueAtTime(vol, t0 + Math.max(.03, d - .06)); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    formants.forEach(function (fm) {
      var b = c.createBiquadFilter(), fg = c.createGain();
      b.type = 'bandpass'; b.frequency.value = fm[0]; b.Q.value = fm[1]; fg.gain.value = fm[2];
      o.connect(b); b.connect(fg); fg.connect(g);
    });
    g.connect(master); vib.start(t0); o.start(t0); o.stop(t0 + d + .03); vib.stop(t0 + d + .03);
  }
  /** Formant sengau ("mm") dan vokal "u" pendek untuk suara anime. */
  var NASAL = [[300, 5, 1.7], [1150, 7, .35], [2600, 6, .16]];
  var UH = [[430, 5, 1.5], [1250, 7, .5], [2750, 6, .2]];

  function arp(notes, step, d, vol, wave) { notes.forEach(function (n, i) { tone(n, i * step, d, vol, wave); }); }

  var FX = {
    /* antarmuka */
    click: function () { tone(660, 0, .08, .4, 'triangle'); tone(990, .03, .07, .22, 'sine'); },
    nav: function () { tone(520, 0, .09, .2, 'sine'); tone(780, .06, .12, .18, 'sine'); },
    hover: function () { tone(1500, 0, .07, .27, 'sine', 1950); tone(2250, .012, .05, .09, 'sine'); },
    hoverNav: function () { tone(880, 0, .09, .28, 'sine', 1180); tone(1320, .05, .08, .13, 'sine'); },
    toggle: function () { tone(440, 0, .06, .2, 'triangle'); tone(880, .06, .08, .2, 'triangle'); },
    pick: function () { tone(520, 0, .06, .22); tone(700, .05, .06, .16); },
    type: function () { tone(1900 + Math.random() * 300, 0, .03, .12, 'triangle'); },
    focus: function () { tone(760, 0, .07, .25, 'triangle', 1000); tone(1140, .04, .07, .12, 'sine'); },
    peek: function () { voice(760, 0, .1, .22, 980); voice(980, .09, .09, .16, 700); },
    success: function () { arp([523, 659, 784, 1047], .08, .22, .26, 'triangle'); },
    fail: function () { tone(220, 0, .28, .3, 'sawtooth', 110); tone(165, .1, .32, .22, 'square', 80); },
    level: function () { arp([523, 659, 784, 1047, 1319, 1568], .09, .3, .26, 'triangle'); hiss(.1, .6, .05, 800, 4000); },
    load: function () { hiss(0, .5, .07, 300, 2400); arp([392, 523, 659], .12, .3, .14, 'sine'); },
    send: function () { hiss(0, .22, .09, 500, 2600); tone(600, 0, .1, .15, 'sine', 900); },
    recv: function () { tone(784, 0, .1, .2, 'sine'); tone(1175, .09, .16, .18, 'sine'); },
    scan: function () { for (var i = 0; i < 6; i++) tone(500 + i * 120, i * .06, .08, .12, 'triangle'); },
    high: function () { tone(880, 0, .16, .3, 'sawtooth', 440); tone(880, .2, .16, .3, 'sawtooth', 440); tone(660, .4, .3, .25, 'square', 330); },
    med: function () { tone(587, 0, .16, .26, 'triangle'); tone(494, .17, .26, .24, 'triangle'); },
    low: function () { arp([659, 784, 988], .09, .22, .24, 'sine'); },
    check: function () { tone(700, 0, .06, .2, 'triangle'); tone(1050, .05, .1, .18, 'triangle'); },
    uncheck: function () { tone(500, 0, .08, .15, 'triangle'); },
    /* karakter */
    squeak: function () { voice(900, 0, .12, .22, 1500); },
    /* "Hmph!" gadis anime yang sedang kesal: hembusan napas "h", dengung sengau "mm" bernada tinggi yang
       turun, lalu letupan bibir "p" dan hembusan "f". Dua ragam dipilih acak supaya tidak monoton. */
    hmph: function () {
      var k = .94 + Math.random() * .12;
      if (Math.random() < .6) { // pendek dan tegas: "hmph!"
        hiss(0, .07, .08, 2600, 1500);
        girl(560 * k, 600 * k, .05, .09, .36, NASAL);
        girl(600 * k, 400 * k, .13, .2, .36, UH.map(function (f) { return [f[0] * .8, f[1], f[2]]; }));
        hiss(.31, .05, .17, 1500, 3600);
        hiss(.34, .14, .1, 3200, 1800);
      } else { // ngambek panjang: "hmmmph..."
        hiss(0, .08, .07, 2400, 1400);
        girl(520 * k, 560 * k, .06, .14, .28, NASAL);
        girl(560 * k, 360 * k, .19, .34, .26, NASAL);
        hiss(.2, .3, .035, 1300, 800);
        hiss(.55, .05, .15, 1500, 3400);
        hiss(.58, .17, .09, 3000, 1600);
      }
    },
    huff: function () { hiss(0, .3, .12, 900, 300); tone(260, 0, .22, .15, 'square', 180); },
    drop: function () { tone(300, 0, .16, .26, 'sine', 90); hiss(.05, .12, .06, 400, 200); },
    pat: function () { tone(520, 0, .09, .22, 'sine', 780); tone(780, .09, .09, .2, 'sine', 1040); tone(1040, .18, .16, .18, 'sine'); },
    purr: function () { for (var i = 0; i < 10; i++) tone(95 + (i % 2) * 12, i * .05, .08, .1, 'sawtooth'); },
    giggle: function () { [0, .09, .17, .26, .33].forEach(function (t, i) { voice(880 + i * 60, t, .07, .16, 1100 + i * 40); }); },
    chirp: function () { voice(1100, 0, .09, .12, 1500); voice(1500, .08, .1, .1, 1300); },
    whee: function () { voice(500, 0, .5, .2, 1500); hiss(0, .5, .05, 600, 3000); },
    yawn: function () { voice(500, 0, .5, .12, 320); voice(330, .45, .4, .08, 240); },
    surprise: function () { voice(700, 0, .08, .2, 1400); tone(1400, .08, .12, .14, 'sine'); },
    cheer: function () { voice(700, 0, .1, .18, 1000); voice(1000, .1, .14, .18, 1300); voice(1300, .24, .26, .16); },
    aww: function () { voice(600, 0, .22, .16, 420); voice(420, .22, .3, .12, 330); },
    /* Setrum: dengung listrik, percikan acak, sapuan turun, lalu padam */
    zap: function () {
      hiss(0, .9, .24, 4200, 900);
      tone(1500, 0, .5, .26, 'sawtooth', 70);
      tone(62, 0, .9, .3, 'square');
      for (var i = 0; i < 20; i++) tone(300 + Math.random() * 2600, i * .035, .04, .17, 'square');
      tone(110, .78, .4, .22, 'sawtooth', 40);
    },
    welcome: function () { arp([392, 523, 659, 784], .1, .35, .2, 'sine'); }
  };

  /* Suara "pasif" dipicu tanpa klik langsung (hover, ketik, fokus, loader). Hanya dimainkan bila audio sudah
     berstatus running; bila tidak, dilewati begitu saja (tidak ditumpuk menunggu). */
  var PASSIVE = { hover: 1, hoverNav: 1, type: 1, focus: 1, peek: 1, load: 1, welcome: 1 };
  var playCount = 0;
  function canStart() { var ua = navigator.userActivation; return !ua || ua.hasBeenActive; }

  window.Sound = {
    play: function (name) {
      if (!FX[name] || !enabled) return;
      if (PASSIVE[name]) {
        if (!ctx && canStart()) ready();
        if (!ctx || ctx.state !== 'running') return;
      }
      playCount++;
      try { FX[name](); } catch (e) { /* suara gagal tidak boleh merusak halaman */ }
    },
    setTheme: function (page) { theme = THEMES[page] || THEMES.home; },
    isOn: function () { return enabled; },
    set: function (on) { enabled = !!on; Store.set('tg-snd', on ? '1' : '0'); if (on) { ready(); FX.toggle(); } },
    unlock: ready
  };

  /* ---------- Suara otomatis untuk elemen antarmuka ---------- */
  // Elemen yang bereaksi saat kursor lewat: kelas khusus aplikasi + semua tautan, tombol, tab, ringkasan, dan kolom formulir.
  var HOVER_SEL = '.nv a,.brand,.btn,.chip,.opt,.ch-card,.ch-row,.pil,.cat,.sit button,.todo label,.chan a,.path,.av-btn,.faq summary,.tier,.lg button,.snd,.mt,.toc a,.fab,.eye,.drop,.fld,' +
    'a[href],button,summary,[role=tab],[role=menuitem],select,textarea,input[type=text],input[type=search],input[type=email],input[type=password]';
  var lastHover = 0;
  document.addEventListener('pointerover', function (e) {
    // Hanya mouse dan pena. Sentuhan tidak punya "hover"; ketukan sudah punya suara klik.
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    var el = e.target.closest && e.target.closest(HOVER_SEL);
    if (!el || el.contains(e.relatedTarget)) return;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.closest('.mc-stage')) return; // karakter punya suaranya sendiri
    var now = Date.now(); if (now - lastHover < 70) return; lastHover = now;
    window.Sound.play(el.matches('.nv a,.brand,.ft a') ? 'hoverNav' : 'hover');
  }, true);

  /* Ketukan halus saat mengetik di kolom teks (dibatasi agar tidak berisik) */
  var lastType = 0;
  document.addEventListener('input', function (e) {
    var t = e.target; if (!t || !(t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (t.type === 'checkbox' || t.type === 'radio' || t.type === 'file' || t.type === 'range') return;
    var now = Date.now(); if (now - lastType < 45) return; lastType = now;
    window.Sound.play('type');
  }, true);

  /* Kolom formulir mendapat fokus (klik atau Tab). Kolom kata sandi: Guardian menutup mata, jadi bunyinya "eep!" kecil.
     Fokus otomatis dari skrip (tanpa interaksi pengguna) tidak berbunyi. */
  document.addEventListener('focusin', function (e) {
    var t = e.target; if (!t || !t.matches) return;
    if (!t.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=hidden]):not([type=range]),textarea')) return;
    var ua = navigator.userActivation; if (ua && !ua.isActive) return;
    window.Sound.play(t.type === 'password' ? 'peek' : 'focus');
  }, true);

  /* Klik pada elemen interaktif yang belum punya suara dari kode halaman (tautan luar, anchor, ringkasan FAQ,
     menu profil, dropzone, tombol footer, dan sebagainya). Bila kode lain sudah membunyikan sesuatu pada klik yang sama,
     tidak dobel. Elemen bertanda data-snd mengatur suaranya sendiri. */
  var CLICK_SEL = 'a[href],button,summary,[role=tab],[role=menuitem],label.drop,.fab';
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest(CLICK_SEL);
    if (!el || el.hasAttribute('data-snd') || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    if (el.closest('.mc-stage,.snd')) return;
    var before = playCount;
    setTimeout(function () { if (playCount === before) window.Sound.play('click'); }, 0);
  }, true);

  /* Dropzone berkas: bunyi kecil saat berkas melayang di atasnya dan saat dilepas */
  var dz = document.querySelector('.drop');
  if (dz) {
    var overOn = false;
    dz.addEventListener('dragenter', function () { if (!overOn) { overOn = true; window.Sound.play('hover'); } });
    dz.addEventListener('dragleave', function () { overOn = false; });
    dz.addEventListener('drop', function () { overOn = false; window.Sound.play('pick'); });
  }

  // Buka kunci audio pada interaksi pengguna (syarat iOS, Android, dan browser Instagram).
  // Pendengar tetap dipasang: bila audio tertidur lagi (tab di latar belakang, interupsi iOS), interaksi berikutnya membangunkannya.
  var UNLOCK = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'click', 'keydown'];
  function unlockAudio() { if (enabled && (!ctx || ctx.state !== 'running')) ready(); }
  UNLOCK.forEach(function (ev) { window.addEventListener(ev, unlockAudio, true); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && ctx && ctx.state !== 'running') ready(); });
})();
