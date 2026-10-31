/** page-profile.js : profil pengguna: tier, bintang, kemajuan per jalur, unduh data, keluar, hapus akun. */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, L = A.L, esc = A.esc;
  var Acc = window.TGAccount, Lv = window.TGLevel, cats = window.TGL.cats, list = window.TGL.list;

  function fmtDate(iso) { try { return new Date(iso).toLocaleDateString(A.lang() === 'en' ? 'en-GB' : 'id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } }

  function render() {
    var user = Acc.user();
    $('#guest').hidden = !!user; $('#pf').hidden = !user;
    if (!user) { window.Mecha.mood('confused', 3000); return; }
    var prog = user.progress || {}, s = Lv.summary(prog, list), lv = Lv.tierFor(s.stars), t = lv.tier;
    var card = $('#pfCard');
    card.style.setProperty('--ring', t.c1); card.style.setProperty('--tglow', t.glow);
    card.innerHTML = '<div class="pf-av"><span>' + esc(user.username.charAt(0).toUpperCase()) + '</span>' + Lv.badge(t, 44) + '</div>' +
      '<h1>' + esc(user.username) + '</h1><div class="em">' + (user.email ? esc(user.email) : L('Tanpa email', 'No email')) + '</div>' +
      '<div class="since">' + L('Bergabung ', 'Joined ') + esc(fmtDate(user.createdAt)) + '</div>' +
      '<div class="pf-tier" style="--t1:' + t.c1 + ';--t2:' + t.c2 + '">' + Lv.badge(t, 64) + '<div style="flex:1;min-width:0"><b>' + esc(Lv.name(t)) + '</b><small>' + esc(L(t.desc[0], t.desc[1])) + '</small><div class="pbar"><span style="width:' + Math.round(lv.pct * 100) + '%"></span></div><small>' + (lv.next ? L(lv.stars + ' bintang. Lagi ' + lv.toNext + ' ke ' + Lv.name(lv.next) + '.', lv.stars + ' stars. ' + lv.toNext + ' more to ' + Lv.name(lv.next) + '.') : L(lv.stars + ' bintang. Tier tertinggi!', lv.stars + ' stars. Top tier!')) + '</small></div></div>';
    $('#pfStats').innerHTML = [[s.done + '/' + list.length, L('chapter selesai', 'chapters done')], [s.perfect, L('sempurna percobaan pertama', 'perfect first tries')], [s.stars + '/' + Lv.MAX_STARS, L('bintang', 'stars')]]
      .map(function (x) { return '<div class="card"><b>' + x[0] + '</b><span>' + esc(x[1]) + '</span></div>'; }).join('');
    $('#tiers').innerHTML = Lv.TIERS.map(function (x) {
      var locked = s.stars < x.min;
      return '<div class="tier' + (x.i === t.i ? ' cur' : '') + '" style="--tc:' + x.c1 + '" data-now="' + L('Sekarang', 'Now') + '">' + Lv.badge(x, 60, locked) + '<b>' + esc(Lv.name(x)) + '</b><span class="req">' + (x.min ? x.min + '+ ★' : L('Mulai', 'Start')) + '</span><small>' + esc(L(x.desc[0], x.desc[1])) + '</small></div>';
    }).join('');
    $('#catprog').innerHTML = cats.map(function (c) {
      var items = list.filter(function (x) { return x.cat === c.k; }), done = items.filter(function (x) { return prog[x.n] && prog[x.n].ok; }).length;
      return '<li style="--c:' + c.c + '"><b><i></i>' + esc(L(c.id, c.en)) + '</b><small>' + done + '/' + items.length + '</small><div class="pbar"><span style="width:' + (done / items.length * 100) + '%"></span></div></li>';
    }).join('');
    window.Mecha.mood(t.i >= 3 ? 'cheer' : 'happy', 2500);
  }

  $('#exportBtn').addEventListener('click', function () {
    var user = Acc.user(); if (!user) return;
    var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), username: user.username, email: user.email, createdAt: user.createdAt, progress: user.progress }, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'trustguard-' + user.username + '.json'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    window.Sound.play('check'); A.toast(L('Data diunduh.', 'Data downloaded.'));
  });
  $('#logoutBtn2').addEventListener('click', function () { Acc.logout().then(function () { A.toast(L('Kamu sudah keluar.', 'You are signed out.')); window.Sound.play('uncheck'); setTimeout(function () { location.href = '/'; }, 700); }); });
  $('#delBtn').addEventListener('click', function () {
    var pw = $('#delPw').value;
    if (!pw) { A.toast(L('Ketik kata sandimu dulu.', 'Type your password first.')); $('#delPw').focus(); return; }
    if (!window.confirm(L('Hapus akun dan seluruh progres secara permanen?', 'Permanently delete the account and all progress?'))) return;
    Acc.remove(pw).then(function (r) {
      if (!r.ok) { A.toast(r.j.error || L('Gagal menghapus.', 'Could not delete.')); window.Sound.play('fail'); window.Mecha.react('salah'); return; }
      A.toast(L('Akun dihapus. Terima kasih sudah berlatih bersama kami.', 'Account deleted. Thank you for practicing with us.')); window.Sound.play('drop');
      window.Mecha.react('salah'); setTimeout(function () { location.href = '/'; }, 1200);
    });
  });
  $('#delPw').addEventListener('focus', function () { window.Mecha.peek(true); });
  $('#delPw').addEventListener('blur', function () { window.Mecha.peek(false); });

  Acc.ready().then(render);
  Acc.onChange(render); A.onLang(render);
  if (Acc.user()) render();
})();
