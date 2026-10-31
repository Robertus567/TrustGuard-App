/** page-home.js : beranda. Angka statistik, jalur latihan (dengan progres pengguna), kartu progres di hero, dan demo Scanner mini. */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, L = A.L, esc = A.esc;
  var cats = window.TGL.cats, list = window.TGL.list;

  // Angka statistik diambil dari data sungguhan, bukan angka karangan
  var vals = { lessons: list.length, cats: cats.length, patterns: window.TG.patterns.length + 6, channels: 7 };
  A.$$('[data-count]').forEach(function (el) {
    var target = vals[el.getAttribute('data-count')] || 0, done = false;
    function run() {
      if (done) return; done = true;
      var t0 = Date.now();
      (function tick() { var p = Math.min(1, (Date.now() - t0) / 1100); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(tick); })();
    }
    if ('IntersectionObserver' in window) { var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { run(); io.disconnect(); } }); io.observe(el); setTimeout(run, 2500); } else { run(); }
  });

  /* Jalur latihan: menampilkan kemajuan nyata pengguna (akun atau tamu) per kategori */
  function renderCats() {
    var prog = window.TGAccount ? window.TGAccount.progress() : {};
    $('#catGrid').innerHTML = cats.map(function (c) {
      var items = list.filter(function (x) { return x.cat === c.k; });
      var done = items.filter(function (x) { return prog[x.n] && prog[x.n].ok; }).length;
      var p = items.length ? done / items.length : 0;
      return '<a class="card spot cat rv vis" style="--c:' + c.c + ';--p:' + p.toFixed(3) + '" href="/learn?cat=' + c.k + '"><span class="ring"><svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="20"/><circle class="fg" cx="24" cy="24" r="20"/></svg><b>' + (done ? done + '/' + items.length : items.length) + '</b></span><span><b>' + esc(L(c.id, c.en)) + '</b><small>' + (done ? L(done + ' dari ' + items.length + ' selesai', done + ' of ' + items.length + ' done') : L(items.length + ' kasus singkat', items.length + ' short cases')) + '</small></span></a>';
    }).join('');
  }

  /* Kartu kecil di hero: mengikuti data pengguna, bukan angka pajangan */
  function renderHeroProg() {
    var el = $('#heroProg'); if (!el) return;
    var user = window.TGAccount ? window.TGAccount.user() : null;
    var prog = window.TGAccount ? window.TGAccount.progress() : {};
    var s = window.TGLevel.summary(prog, list);
    var inner = el.querySelector('div');
    if (user) {
      var lv = window.TGLevel.tierFor(s.stars);
      el.querySelector('.okc').outerHTML = window.TGLevel.badge(lv.tier, 34);
      inner.innerHTML = '<span>' + esc(user.username) + ': ' + esc(window.TGLevel.name(lv.tier)) + '</span><small>' + s.done + '/' + list.length + ' chapter, ' + s.stars + ' &#9733;</small>';
    } else if (s.tried) {
      inner.innerHTML = '<span>' + L(s.done + ' chapter selesai (tamu)', s.done + ' chapters done (guest)') + '</span><small>' + L('Masuk agar progres tersimpan', 'Sign in to keep your progress') + '</small>';
    }
  }
  renderCats(); renderHeroProg();
  if (window.TGAccount) window.TGAccount.onChange(function () { renderCats(); renderHeroProg(); });

  /* Demo Scanner mini */
  var input = $('#demoIn'), out = $('#demoOut'), last = null;
  var chips = $('#demoChips');
  chips.innerHTML = window.TGScan.SAMPLES.slice(0, 4).map(function (s, i) { return '<button type="button" class="chip" data-i="' + i + '" data-snd="x">' + esc(L(s.id, s.en)) + '</button>'; }).join('');
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    var s = window.TGScan.SAMPLES[+b.getAttribute('data-i')];
    input.value = L(s.tid, s.ten); window.Sound.play('pick'); run();
  });
  /* Kartu skor di hero: mengikuti hasil pemeriksaan pada kolom "Pesan yang ingin dicek" (bukan angka pajangan) */
  var heroScore = $('#heroScore'), scoreRaf = 0;
  function renderHeroScore(animate) {
    if (!heroScore) return;
    var b = heroScore.querySelector('b'), sm = heroScore.querySelector('small'), dot = heroScore.querySelector('.dot');
    cancelAnimationFrame(scoreRaf);
    if (!last) { // belum ada pemeriksaan
      heroScore.classList.add('idle'); dot.style.background = ''; dot.style.boxShadow = '';
      b.textContent = '?'; sm.textContent = L('Periksa pesan di bawah untuk melihat skornya', 'Check a message below to see its score'); return;
    }
    var lv = window.TGScan.LV[last.level];
    heroScore.classList.remove('idle'); dot.style.background = lv.c; dot.style.boxShadow = '0 0 14px ' + lv.c;
    sm.textContent = L('Hasil pesanmu: ', 'Your message: ') + L(lv.id, lv.en).toLowerCase();
    var target = Math.round(last.score || 0);
    if (!animate || window.matchMedia('(prefers-reduced-motion:reduce)').matches) { b.textContent = target; return; }
    var t0 = Date.now(); // hitung naik dari 0 ke skor
    (function tick() { var p = Math.min(1, (Date.now() - t0) / 800); b.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) scoreRaf = requestAnimationFrame(tick); })();
  }
  renderHeroScore();

  function run() {
    var text = input.value.trim();
    if (!text) { A.toast(L('Tempel atau pilih contoh pesan dulu.', 'Paste or pick a sample message first.')); window.Mecha.react('bingung'); return; }
    last = window.TG.analyze(text);
    out.innerHTML = window.TGScan.html(last, true); window.TGScan.animate(out); renderHeroScore(true);
    window.Sound.play('scan'); setTimeout(function () { window.Sound.play(last.level === 'high' ? 'high' : last.level === 'medium' ? 'med' : 'low'); }, 380);
    window.Mecha.react(window.TGScan.LV[last.level].mood);
  }
  $('#demoGo').addEventListener('click', run);
  input.addEventListener('focus', function () { window.Mecha.lookAt(input); });
  input.addEventListener('blur', function () { window.Mecha.lookAt(null); });
  A.onLang(function () { renderCats(); renderHeroProg(); renderHeroScore(); chips.querySelectorAll('.chip').forEach(function (b, i) { b.textContent = L(window.TGScan.SAMPLES[i].id, window.TGScan.SAMPLES[i].en); }); if (last) { out.innerHTML = window.TGScan.html(last, true); window.TGScan.animate(out); } });

  // Sapaan singkat saat halaman siap (setelah loader selesai)
  setTimeout(function () { window.Mecha.react('halo'); }, A.Sess.get('tg-seen') ? 1400 : 2600);
})();
