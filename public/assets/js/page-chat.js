/** page-chat.js : Guardian AI. Pengiriman memakai fetch (tanpa refresh halaman) dengan penanganan error lengkap. */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, L = A.L, esc = A.esc;
  var msgs = $('#msgs'), form = $('#f'), ta = $('#q'), sendBtn = $('#send'), consent = $('#consent');
  var history = [], busy = false, pending = null;

  function scroll() { msgs.scrollTop = msgs.scrollHeight; }
  function add(role, inner, cls) {
    var d = document.createElement('div');
    d.className = 'msg ' + role + (cls ? ' ' + cls : ''); d.innerHTML = inner; msgs.appendChild(d); scroll(); return d;
  }
  function greet() {
    add('bot', '<p>' + esc(L('Hai, aku Guardian. Tempel pesan, tautan, atau ceritakan situasimu dengan bahasamu sendiri. Boleh juga tanya hal umum soal keamanan digital, misalnya cara mengamankan akun atau cara mengenali pinjol ilegal.', 'Hi, I am Guardian. Paste a message, a link, or describe your situation in your own words. You can also ask general digital safety questions, like how to secure an account or spot an illegal lender.')) + '</p>', 'greet');
  }
  greet();

  function autosize() { ta.style.height = '56px'; ta.style.height = Math.min(160, ta.scrollHeight) + 'px'; }
  ta.addEventListener('input', autosize);
  ta.addEventListener('focus', function () { window.Mecha.lookAt(ta); });
  ta.addEventListener('blur', function () { window.Mecha.lookAt(null); });
  ta.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  sendBtn.addEventListener('click', function (e) { e.preventDefault(); submit(); });

  /* Persetujuan singkat sebelum pesan pertama dikirim ke server */
  function ask(cb) {
    if (A.Sess.get('tg-consent')) return cb();
    pending = cb; consent.classList.add('show'); window.Sound.play('toggle'); $('#cOk').focus();
  }
  $('#cOk').addEventListener('click', function () { A.Sess.set('tg-consent', '1'); consent.classList.remove('show'); if (pending) { var f = pending; pending = null; f(); } });
  $('#cNo').addEventListener('click', function () { consent.classList.remove('show'); pending = null; });

  function submit() {
    var raw = ta.value.trim();
    if (!raw || busy) { if (!raw) window.Mecha.react('bingung'); return; }
    ask(function () { send(raw); });
  }

  function send(raw) {
    busy = true; sendBtn.disabled = true;
    var red = window.TG.redact(raw.slice(0, 2000));   // data sensitif disamarkan sebelum meninggalkan browser
    ta.value = ''; autosize();
    add('me', '<p>' + esc(red.text) + '</p>' + (red.count ? '<div class="sens">' + esc(L(red.count + ' data sensitif disamarkan sebelum dikirim.', red.count + ' sensitive item(s) masked before sending.')) + '</div>' : ''));
    history.push({ role: 'user', text: red.text });
    window.Sound.play('send'); window.Mecha.react('mikir');
    var typing = add('bot', '<div class="dots"><i></i><i></i><i></i></div>');

    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 30000);
    fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: A.lang(), messages: history.slice(-8) }), signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) { /* bukan JSON */ } return { ok: r.ok, status: r.status, j: j }; });
    }).then(function (res) {
      clearTimeout(timer); typing.remove();
      if (!res.ok || !res.j || !res.j.reply) {
        var m = res.j && res.j.error ? res.j.error : L('Layanan sedang tidak bisa dijangkau. Kamu tetap bisa memakai Scanner yang berjalan di browser.', 'The service cannot be reached right now. You can still use the Scanner, which runs in your browser.');
        add('bot', '<p>' + esc(m) + '</p>'); window.Mecha.react('salah'); return;
      }
      var j = res.j, tags = '';
      if (j.analysis && j.analysis.signals && j.analysis.signals.length) tags = '<div class="tags">' + j.analysis.signals.slice(0, 4).map(function (s) { return '<span class="tag">' + esc(L(s.title.id, s.title.en)) + '</span>'; }).join('') + '</div>';
      // Catatan mode hanya muncul saat pengembangan lokal (server tidak mengirim j.dev di produksi)
      var dev = (j.dev && j.dev.ai === 'local') ? '<div class="dev">[dev] ' + esc(j.dev.note || 'mode lokal') + '</div>' : '';
      add('bot', A.md(j.reply) + tags + dev);
      history.push({ role: 'model', text: j.reply });
      window.Sound.play('recv');
      var mood = j.mood || 'thinking'; window.Mecha.mood(mood, 5000);
      window.Mecha.say(mood === 'alert' ? L('Hati-hati ya!', 'Be careful!') : mood === 'happy' ? L('Bagus, tetap waspada!', 'Nice, stay alert!') : mood === 'worried' ? L('Hmm, cek dulu ya.', 'Hmm, check first.') : L('Ini saranku.', 'Here is my advice.'), 3000);
    }).catch(function (err) {
      clearTimeout(timer); typing.remove();
      add('bot', '<p>' + esc(err && err.name === 'AbortError' ? L('Balasan terlalu lama. Coba lagi sebentar lagi.', 'The reply took too long. Please try again shortly.') : L('Koneksi bermasalah. Periksa internetmu lalu coba lagi.', 'Connection problem. Check your internet and try again.')) + '</p>');
      window.Mecha.react('salah');
    }).then(function () { busy = false; sendBtn.disabled = false; ta.focus(); });
  }

  /* Contoh pertanyaan: baris chip di atas kotak ketik */
  var Q = [['Aku dapat pesan hadiah dan diminta kirim OTP. Ini penipuan?', 'I got a prize message asking for an OTP. Is this a scam?', 'Pesan hadiah', 'Prize message'],
    ['Ada link dari nomor tak dikenal minta aku verifikasi akun. Aman diklik?', 'An unknown number sent a link to verify my account. Is it safe to click?', 'Cek tautan', 'Check a link'],
    ['Tawaran kerja gaji tinggi tapi harus bayar biaya administrasi dulu. Bagaimana?', 'A high salary job offer wants an admin fee first. What should I do?', 'Tawaran kerja', 'Job offer'],
    ['Aku terlanjur transfer ke penipu. Apa langkah pertamaku?', 'I already transferred money to a scammer. What is my first step?', 'Sudah transfer', 'Already paid'],
    ['Bagaimana cara tahu pinjol itu legal atau ilegal?', 'How do I tell whether an online lender is legal?', 'Cek pinjol', 'Check a lender'],
    ['Apa itu verifikasi dua langkah dan kenapa penting?', 'What is two-step verification and why does it matter?', 'Verifikasi 2 langkah', '2-step verification']];
  var qbox = $('#quick');
  function drawQ() { qbox.innerHTML = Q.map(function (q, i) { return '<button type="button" class="chip" data-i="' + i + '" data-snd="x">' + esc(L(q[2], q[3])) + '</button>'; }).join(''); }
  drawQ();
  qbox.addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; var q = Q[+b.getAttribute('data-i')]; ta.value = L(q[0], q[1]); autosize(); ta.focus(); window.Sound.play('pick'); });
  $('#clear').addEventListener('click', function () { msgs.innerHTML = ''; history = []; greet(); window.Sound.play('uncheck'); window.Mecha.mood('idle'); });
  A.onLang(function () { drawQ(); var g = $('.greet'); if (g && !history.length) { msgs.innerHTML = ''; greet(); } });

  /* Teks kiriman dari Scanner (sudah disamarkan) */
  var pre = A.Sess.get('tg-prefill');
  if (pre) { ta.value = pre; autosize(); try { sessionStorage.removeItem('tg-prefill'); } catch (e) { /* diabaikan */ } }
  setTimeout(function () { window.Mecha.react('halo'); }, 1200);
})();
