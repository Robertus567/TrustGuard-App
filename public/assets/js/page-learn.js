/**
 * page-learn.js : latihan 40 chapter dalam 8 jalur.
 *
 * Alur tampilan (dibuat bertahap supaya tidak sesak):
 *  1. Pilih jalur (8 kartu kategori dengan kemajuan).
 *  2. Daftar chapter di jalur itu (daftar vertikal yang tenang). Pencarian menampilkan hasil lintas jalur.
 *  3. Mode bermain: satu kasus, tiga pilihan, umpan balik dengan alasan, bintang, dan reaksi Guardian.
 *
 * Progres: pengguna yang masuk akun disimpan ke server (lewat TGAccount.saveProgress);
 * tamu hanya di sessionStorage selama tab terbuka dan ditawarkan digabung saat masuk.
 */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, $$ = A.$$, L = A.L, esc = A.esc;
  var Acc = window.TGAccount, Lv = window.TGLevel;
  var cats = window.TGL.cats, list = window.TGL.list;
  var prog = Acc.progress();
  var F = { cat: null, q: '' }, cur = null, answered = false, lastTier = null;
  function catOf(k) { return cats.filter(function (c) { return c.k === k; })[0]; }
  function save() {
    if (Acc.user()) Acc.saveProgress(prog); else Acc.guest.set(prog);
  }
  function starsHtml(n) { return '<span class="stars" aria-label="' + n + ' / 3">' + '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n) + '</span>'; }

  /* ---------- Ringkasan, tier, dan catatan tamu ---------- */
  function stats() {
    var s = Lv.summary(prog, list), lv = Lv.tierFor(s.stars);
    $('#sDone').textContent = s.done + '/' + list.length; $('#sPerfect').textContent = s.perfect; $('#sStars').textContent = s.stars;
    $('#tierbox').innerHTML = Lv.badge(lv.tier, 58) + '<div class="tb-i"><div class="tb-top"><b>' + esc(Lv.name(lv.tier)) + '</b><small>' + (lv.next ? L('Lagi ' + lv.toNext + ' bintang ke ' + Lv.name(lv.next), lv.toNext + ' more stars to ' + Lv.name(lv.next)) : L('Tier tertinggi tercapai', 'Top tier reached')) + '</small></div><div class="pbar" style="--t1:' + lv.tier.c1 + ';--t2:' + lv.tier.c2 + '"><span style="width:' + Math.round(lv.pct * 100) + '%"></span></div></div>';
    var user = Acc.user();
    $('#guestNote').hidden = !!user || !Acc.enabled();
    if (lastTier && lv.tier.i > lastTier) tierUp(lv.tier);
    lastTier = lv.tier.i;
  }
  /** Perayaan naik tier: kartu lencana muncul di tengah layar, konfeti, dan Guardian ikut bersorak. */
  function tierUp(t) {
    var el = $('#tierup');
    el.innerHTML = '<small>' + L('Naik tier!', 'Tier up!') + '</small>' + Lv.badge(t, 110) + '<b>' + esc(Lv.name(t)) + '</b><p class="muted" style="max-width:34ch">' + esc(L(t.desc[0], t.desc[1])) + '</p>';
    el.classList.add('show'); window.Sound.play('level');
    window.FX.confetti(window.innerWidth / 2, window.innerHeight / 2, 180);
    window.Mecha.react('bangga');
    setTimeout(function () { el.classList.remove('show'); }, 4200);
  }

  /* ---------- Langkah 1: jalur ---------- */
  function drawPaths() {
    $('#paths').innerHTML = cats.map(function (c, i) {
      var items = list.filter(function (x) { return x.cat === c.k; });
      var done = items.filter(function (x) { return prog[x.n] && prog[x.n].ok; }).length;
      return '<button type="button" class="card spot path rv vis' + (done === items.length ? ' done' : '') + '" data-k="' + c.k + '" style="--c:' + c.c + ';--i:' + i + '"><div class="pn"><i></i><small>' + done + '/' + items.length + '</small></div><h3>' + esc(L(c.id, c.en)) + '</h3><div class="pbar"><span style="width:' + (done / items.length * 100) + '%"></span></div><span class="go">' + (done === items.length ? L('Ulangi jalur', 'Replay path') : done ? L('Lanjutkan', 'Continue') : L('Mulai', 'Start')) + '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></button>';
    }).join('');
  }

  /* ---------- Langkah 2: daftar chapter ---------- */
  function matches(c) {
    var q = F.q.trim().toLowerCase();
    if (q) {
      var num = q.replace(/(bab|chapter|ch|no|nomor|#)/g, '').trim();
      if (/^\d+$/.test(num)) return c.n === +num;
      var hay = (c.title.id + ' ' + c.title.en + ' ' + catOf(c.cat).id + ' ' + catOf(c.cat).en + ' ' + c.n).toLowerCase();
      return hay.indexOf(q) >= 0;
    }
    return !F.cat || c.cat === F.cat;
  }
  function drawList() {
    var q = F.q.trim(), items = list.filter(matches);
    var showList = !!q || !!F.cat;
    $('#pathView').hidden = showList; $('#chapView').hidden = !showList;
    $('#found').hidden = !q;
    if (!showList) { drawPaths(); return; }
    $('#found').textContent = L(items.length + ' dari ' + list.length + ' chapter cocok', items.length + ' of ' + list.length + ' chapters match');
    var cat = F.cat && !q ? catOf(F.cat) : null;
    $('#chTitle').innerHTML = cat ? '<i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + cat.c + ';margin-right:10px"></i>' + esc(L(cat.id, cat.en)) : esc(L('Hasil pencarian', 'Search results'));
    if (!items.length) { $('#grid').innerHTML = '<div class="none card"><p>' + L('Tidak ada chapter yang cocok. Coba kata lain atau nomor chapter.', 'No matching chapters. Try another word or a chapter number.') + '</p></div>'; return; }
    $('#grid').innerHTML = items.map(function (c, i) {
      var cc = catOf(c.cat), p = prog[c.n];
      var st = p ? (p.ok ? L('Selesai', 'Done') : L('Perlu diulang', 'Retry')) : L('Belum', 'New');
      return '<button type="button" class="card spot ch-row ' + (p ? (p.ok ? 'done' : 'miss') : '') + '" data-n="' + c.n + '" style="--c:' + cc.c + ';animation:pop .5s var(--ease) both;animation-delay:' + (i * 50) + 'ms"><span class="no">' + (c.n < 10 ? '0' : '') + c.n + '</span><span><h3>' + esc(L(c.title.id, c.title.en)) + '</h3>' + (q ? '<span class="ct">' + esc(L(cc.id, cc.en)) + '</span>' : '') + '</span><span class="st">' + st + (p ? ' ' + starsHtml(Lv.starsOf(p)) : '') + '</span></button>';
    }).join('');
  }
  function refresh() { drawList(); stats(); }
  $('#paths').addEventListener('click', function (e) { var b = e.target.closest('.path'); if (!b) return; F.cat = b.getAttribute('data-k'); window.Sound.play('pick'); refresh(); window.Mecha.say(L('Jalur bagus. Yuk mulai!', 'Good path. Let us go!'), 2000); });
  $('#toPaths').addEventListener('click', function () { F.cat = null; F.q = ''; $('#srch').value = ''; window.Sound.play('nav'); refresh(); });
  $('#srch').addEventListener('input', function () { F.q = this.value; drawList(); });
  $('#grid').addEventListener('click', function (e) { var b = e.target.closest('.ch-row'); if (b) { window.Sound.play('nav'); open(+b.getAttribute('data-n')); } });

  /* ---------- Langkah 3: bermain ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function open(n) {
    var c = list.filter(function (x) { return x.n === n; })[0]; if (!c) return;
    cur = { c: c, order: shuffle([0, 1, 2]), tries: 0 }; answered = false;
    $('#listView').hidden = true; $('#playView').hidden = false; drawPlay(); window.scrollTo(0, 0);
    window.Mecha.mood('thinking', 2000); window.Mecha.say(L('Baca pelan-pelan, apa yang janggal?', 'Read slowly, what feels off?'), 2600);
  }
  function close() { $('#playView').hidden = true; $('#listView').hidden = false; if (cur) F.cat = cur.c.cat; refresh(); window.Mecha.mood('idle'); window.scrollTo(0, 0); }
  function drawPlay() {
    var c = cur.c, cat = catOf(c.cat), letters = ['A', 'B', 'C'];
    $('#playView').style.setProperty('--c', cat.c);
    $('#plTitle').textContent = 'Chapter ' + c.n + ': ' + L(c.title.id, c.title.en);
    $('#plCat').innerHTML = '<i style="background:' + cat.c + ';width:10px;height:10px;border-radius:50%;display:inline-block"></i> ' + esc(L(cat.id, cat.en));
    $('#plFrom').textContent = L(c.from.id, c.from.en); $('#plMsg').textContent = L(c.msg.id, c.msg.en);
    $('#opts').innerHTML = cur.order.map(function (oi, i) {
      var o = c.opts[oi];
      return '<button type="button" class="opt" data-oi="' + oi + '" data-snd="x" style="animation:pop .5s var(--ease) both;animation-delay:' + (i * 90) + 'ms"><span class="L">' + letters[i] + '</span><span class="tx">' + esc(L(o.t.id, o.t.en)) + '</span><span class="why"></span></button>';
    }).join('');
    drawDots();
    $('#prev').disabled = c.n <= 1; $('#next').disabled = c.n >= list.length;
    var r = $('#result'); r.className = 'result'; r.innerHTML = '';
    answered = false;
  }
  function drawDots() { var c = cur.c; $('#dots').innerHTML = list.filter(function (x) { return x.cat === c.cat; }).map(function (x) { var p = prog[x.n]; return '<i class="' + (p ? (p.ok ? 'd' : 'm') : '') + (x.n === c.n ? ' cur' : '') + '" title="' + x.n + '"></i>'; }).join(''); }
  function answer(btn) {
    if (answered) return; answered = true; cur.tries++;
    var c = cur.c, oi = +btn.getAttribute('data-oi'), pickedOk = c.opts[oi].ok;
    var rect = btn.getBoundingClientRect();
    $$('.opt').forEach(function (b, idx) {
      var o = c.opts[+b.getAttribute('data-oi')];
      b.disabled = true; b.classList.add(o.ok ? 'ok' : 'no'); if (b !== btn && !o.ok) b.classList.add('dim');
      var why = $('.why', b);
      why.innerHTML = '<b>' + (o.ok ? L('Kenapa ini benar', 'Why this is right') : L('Kenapa ini kurang tepat', 'Why this falls short')) + '</b>' + esc(L(o.r.id, o.r.en));
      if (b === btn) b.insertAdjacentHTML('beforeend', '<span class="you">' + L('Pilihanmu', 'Your pick') + '</span>');
      setTimeout(function () { b.classList.add('reveal'); }, o.ok ? 150 : 450 + idx * 140);
    });
    var p = prog[c.n] || { ok: false, tries: 0 }; p.tries = (p.tries || 0) + 1; if (pickedOk) p.ok = true; prog[c.n] = p; save();
    var stars = Lv.starsOf(p);
    if (pickedOk) { window.Sound.play('success'); window.FX.flash('ok'); window.FX.confetti(rect.left + rect.width / 2, rect.top + rect.height / 2, 110); window.Mecha.react('benar'); }
    else { window.Sound.play('fail'); window.FX.flash('bad'); window.FX.shake($('.case')); window.FX.shake(btn); window.Mecha.react('salah'); }
    var allDone = list.every(function (x) { return prog[x.n] && prog[x.n].ok; });
    var r = $('#result'); r.className = 'result show ' + (pickedOk ? 'good' : 'bad');
    var saveNote = Acc.user() ? L('Progres tersimpan di akunmu.', 'Progress saved to your account.') : L('Progres tamu: hanya selama tab ini terbuka.', 'Guest progress: only while this tab is open.');
    r.innerHTML = '<div><h3>' + (pickedOk ? L('Benar! Kamu guardian yang jeli.', 'Correct! You are a sharp guardian.') : L('Belum tepat, tapi kamu belajar.', 'Not quite, but you are learning.')) + '</h3>' + starsHtml(stars) + '<p>' + L('Baca alasan di tiap kartu untuk memahami polanya.', 'Read the reason on each card to understand the pattern.') + '</p><p class="save">' + saveNote + '</p></div><div class="row">' +
      (pickedOk ? '' : '<button type="button" class="btn btn-gh" id="retry" data-snd="x">' + L('Coba lagi', 'Try again') + '</button>') +
      (cur.c.n < list.length ? '<button type="button" class="btn btn-pri" id="nextBtn" data-snd="x">' + L('Chapter berikutnya', 'Next chapter') + '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' : '') +
      '<button type="button" class="btn btn-gh" id="backBtn" data-snd="x">' + L('Daftar chapter', 'Chapter list') + '</button></div>';
    setTimeout(function () { r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 900);
    if (allDone) setTimeout(function () { window.Sound.play('level'); window.FX.confetti(window.innerWidth / 2, window.innerHeight / 3, 200); window.Mecha.say(L('Semua chapter tuntas! Kamu hebat!', 'All chapters done! Amazing!'), 5000); }, 1200);
    drawDots(); stats();
    var rt = $('#retry'); if (rt) rt.onclick = function () { cur.order = shuffle([0, 1, 2]); drawPlay(); window.Mecha.mood('thinking', 1500); window.Sound.play('pick'); };
    var nb = $('#nextBtn'); if (nb) nb.onclick = function () { window.Sound.play('nav'); open(cur.c.n + 1); };
    $('#backBtn').onclick = function () { window.Sound.play('nav'); close(); };
  }
  $('#opts').addEventListener('click', function (e) { var b = e.target.closest('.opt'); if (b) { window.Sound.play('pick'); answer(b); } });
  $('#back').addEventListener('click', function () { window.Sound.play('nav'); close(); });
  $('#prev').addEventListener('click', function () { open(cur.c.n - 1); });
  $('#next').addEventListener('click', function () { open(cur.c.n + 1); });
  document.addEventListener('keydown', function (e) {
    if ($('#playView').hidden || answered) return;
    var i = { '1': 0, '2': 1, '3': 2, a: 0, b: 1, c: 2 }[e.key.toLowerCase()]; var tgt = e.target.tagName;
    if (i !== undefined && tgt !== 'INPUT' && tgt !== 'TEXTAREA') { var b = $$('.opt')[i]; if (b) answer(b); }
  });
  A.onLang(function () { if (!$('#playView').hidden && !answered) drawPlay(); refresh(); });

  /* Saat status akun berubah (masuk atau keluar di tab lain, atau data server tiba): pakai progres akun, gabungkan progres tamu */
  Acc.onChange(function (user) {
    if (user) {
      var g = Acc.guest.get();
      var merged = Acc.merge(user.progress || {}, g);
      prog = merged;
      if (Object.keys(g).length) { Acc.guest.clear(); Acc.saveProgress(prog); A.toast(L('Progres tamu digabungkan ke akunmu.', 'Guest progress merged into your account.')); }
    } else { prog = Acc.guest.get(); }
    lastTier = null; refresh();
  });

  /* Parameter URL: ?cat=job atau ?c=12 */
  var qs = location.search.match(/[?&](cat|c)=([^&]+)/g) || [];
  qs.forEach(function (s) { var m = s.match(/[?&](cat|c)=([^&]+)/); if (m[1] === 'cat' && catOf(m[2])) F.cat = m[2]; });
  refresh();
  var cm = location.search.match(/[?&]c=(\d+)/); if (cm) open(+cm[1]);
  if (!cm) setTimeout(function () { window.Mecha.react('halo'); }, 1500);
})();
