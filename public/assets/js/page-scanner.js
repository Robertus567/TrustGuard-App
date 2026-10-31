/**
 * page-scanner.js : halaman Scanner.
 * Dua mode input: teks/tautan, atau berkas (PDF, DOCX, gambar, TXT). Berkas dibaca di browser oleh docscan.js,
 * hasil teksnya ditampilkan untuk dikoreksi, lalu dianalisis mesin aturan yang sama (rules.js). Tidak ada yang dikirim.
 */
(function () {
  'use strict';
  var A = window.TGApp, $ = A.$, L = A.L, esc = A.esc;
  var input = $('#in'), out = $('#out'), count = $('#cnt'), sens = $('#sens'), last = null, lastText = '';
  var S = window.TGScan, D = window.TGDoc;

  /* ---------- Tab mode ---------- */
  var tabs = { text: $('#tabText'), doc: $('#tabDoc') }, modes = { text: $('#modeText'), doc: $('#modeDoc') };
  function setMode(k) {
    Object.keys(tabs).forEach(function (m) { tabs[m].setAttribute('aria-selected', String(m === k)); modes[m].classList.toggle('on', m === k); modes[m].hidden = m !== k; });
    if (k === 'doc' && D) D.warm('pdf');
    window.Sound.play('toggle');
  }
  tabs.text.addEventListener('click', function () { setMode('text'); });
  tabs.doc.addEventListener('click', function () { setMode('doc'); });

  /* ---------- Mode teks ---------- */
  var chips = $('#chips');
  function drawChips() { chips.innerHTML = S.SAMPLES.map(function (s, i) { return '<button type="button" class="chip" data-i="' + i + '" data-snd="x">' + esc(L(s.id, s.en)) + '</button>'; }).join(''); }
  drawChips();
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    var s = S.SAMPLES[+b.getAttribute('data-i')];
    input.value = L(s.tid, s.ten); window.Sound.play('pick'); onInput(); run(input.value);
  });
  function onInput() {
    count.textContent = input.value.length + ' / 4000';
    sens.classList.toggle('show', window.TG.redact(input.value).count > 0);
  }
  input.addEventListener('input', onInput);
  input.addEventListener('focus', function () { window.Mecha.lookAt(input); });
  input.addEventListener('blur', function () { window.Mecha.lookAt(null); });

  /* ---------- Hasil ---------- */
  function actions() {
    return '<div class="res-actions"><button type="button" class="btn btn-pri" id="toAI" data-snd="x">' + L('Tanya Guardian AI', 'Ask Guardian AI') + '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
      '<button type="button" class="btn btn-gh" id="cpy" data-snd="x">' + L('Salin ringkasan', 'Copy summary') + '</button>' +
      '<a class="btn btn-gh" href="/act">' + L('Langkah Aman', 'Safe Steps') + '</a></div>';
  }
  function show() {
    out.innerHTML = '<div id="resBox" style="display:flex;flex-direction:column;gap:16px;flex:1">' + S.html(last, false) + actions() + '</div>';
    S.animate(out);
    $('#cpy').onclick = function () { A.copy(S.summary(last)).then(function () { A.toast(L('Ringkasan disalin.', 'Summary copied.')); window.Sound.play('check'); }); };
    $('#toAI').onclick = function () {
      // Teks dititipkan di sessionStorage (bukan di URL) setelah disamarkan, lalu halaman chat mengisinya ke kotak pesan
      A.Sess.set('tg-prefill', window.TG.redact(lastText).text.slice(0, 2000)); window.Sound.play('nav'); location.href = '/chat';
    };
  }
  /** Menjalankan analisis untuk sebuah teks (dari kotak teks maupun hasil ekstraksi berkas). */
  function run(text) {
    text = String(text || '').trim();
    if (!text) { A.toast(L('Tempel pesan atau tautan dulu.', 'Paste a message or link first.')); input.focus(); window.Mecha.react('bingung'); return; }
    lastText = text.slice(0, 12000);
    window.Mecha.react('mikir'); window.Sound.play('scan');
    out.innerHTML = '<div class="empty"><div class="dots"><i></i><i></i><i></i></div><p>' + L('Memeriksa tanda bahaya...', 'Checking for warning signs...') + '</p></div>';
    setTimeout(function () {
      last = window.TG.analyze(lastText); show();
      window.Sound.play(last.level === 'high' ? 'high' : last.level === 'medium' ? 'med' : 'low');
      window.Mecha.react(S.LV[last.level].mood);
      if (window.innerWidth < 980) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 650);
  }
  $('#go').addEventListener('click', function () { run(input.value); });
  $('#clr').addEventListener('click', function () { input.value = ''; onInput(); input.focus(); window.Sound.play('uncheck'); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run(input.value); });

  /* ---------- Mode berkas ---------- */
  var drop = $('#drop'), fileIn = $('#file'), filebox = $('#filebox'), docprog = $('#docprog'), docbar = $('#docbar'), doclabel = $('#doclabel'), extract = $('#extract'), extxt = $('#extxt'), exmeta = $('#exmeta');
  var curFile = null, thumbUrl = null;
  function fmtSize(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }
  function resetDoc() {
    curFile = null; filebox.hidden = true; docprog.hidden = true; extract.hidden = true; extxt.value = '';
    if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = null; }
    $('#thumb').innerHTML = '';
  }
  $('#fclear').addEventListener('click', function () { resetDoc(); fileIn.value = ''; window.Sound.play('uncheck'); });
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); });
  fileIn.addEventListener('change', function () { if (fileIn.files && fileIn.files[0]) handleFile(fileIn.files[0]); });
  // Tempel gambar dari papan klip (tangkapan layar) saat berada di mode berkas
  document.addEventListener('paste', function (e) {
    if (modes.doc.hidden || !e.clipboardData) return;
    var items = e.clipboardData.items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && /^image\//.test(items[i].type)) { var f = items[i].getAsFile(); if (f) { handleFile(f); e.preventDefault(); return; } }
    }
  });

  function handleFile(file) {
    if (!D) { A.toast(L('Browser ini belum mendukung pembacaan berkas. Tempel teksnya saja.', 'This browser cannot read files here. Paste the text instead.')); return; }
    resetDoc(); curFile = file;
    var kind = D.kindOf(file);
    filebox.hidden = false;
    $('#fname').textContent = file.name || L('tempelan gambar', 'pasted image');
    $('#fmeta').textContent = (kind ? kind.toUpperCase() : '?') + ' · ' + fmtSize(file.size);
    if (kind === 'image') { thumbUrl = URL.createObjectURL(file); $('#thumb').innerHTML = '<img src="' + thumbUrl + '" alt="">'; }
    else $('#thumb').textContent = kind ? kind.toUpperCase() : '?';
    docprog.hidden = false; docbar.style.width = '4%'; doclabel.textContent = L('Membaca berkas...', 'Reading file...');
    window.Mecha.react('mikir'); window.Sound.play('scan');
    D.extract(file, function (p) {
      docbar.style.width = Math.max(4, Math.round((p.pct || 0) * 100)) + '%';
      var lbl = p.label ? L(p.label.id, p.label.en) : '';
      if (p.stage === 'ocr' && p.pages > 1) lbl += ' (' + p.page + '/' + p.pages + ')';
      doclabel.textContent = lbl;
    }).then(function (r) {
      docprog.hidden = true;
      if (!r.text || !r.text.trim()) {
        A.toast(L('Tidak ada teks yang bisa dibaca dari berkas ini. Coba gambar yang lebih jelas atau tempel teksnya.', 'No readable text found in this file. Try a clearer image or paste the text.'));
        window.Mecha.react('bingung'); return;
      }
      extract.hidden = false; extxt.value = r.text;
      var meta = [];
      if (r.pages) meta.push(L(r.pages + ' halaman', r.pages + ' page(s)'));
      if (r.links && r.links.length) meta.push(L(r.links.length + ' tautan', r.links.length + ' link(s)'));
      meta.push(r.text.length + ' ' + L('karakter', 'chars'));
      exmeta.textContent = meta.join(' · ');
      if (r.warnings && r.warnings.length) A.toast(L(r.warnings[0].id, r.warnings[0].en));
      window.Sound.play('check'); window.Mecha.react('bangga');
      // Langsung analisis supaya pengguna segera melihat hasil; teks tetap bisa dikoreksi lalu diperiksa ulang
      run(r.text);
    }).catch(function (err) {
      docprog.hidden = true;
      A.toast(err && err.id ? L(err.id, err.en || err.id) : L('Berkas tidak bisa dibaca.', 'The file could not be read.'));
      window.Mecha.react('salah');
    });
  }
  $('#goDoc').addEventListener('click', function () { run(extxt.value); });
  extxt.addEventListener('input', function () { sens.classList.toggle('show', false); });

  A.onLang(function () { drawChips(); if (last) show(); });
  onInput();
  setTimeout(function () { window.Mecha.react('halo'); }, 1200);
})();
