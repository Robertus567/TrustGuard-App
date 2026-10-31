/**
 * levels.js : sistem bintang dan 4 tingkatan (tier) guardian.
 *
 * Bintang per chapter: 3 jika benar di percobaan pertama, 2 jika benar setelah mengulang, 1 jika baru mencoba.
 * Maksimum 40 chapter x 3 = 120 bintang. Tier ditentukan oleh total bintang.
 * Lencana tier digambar sendiri dengan SVG (tanpa aset pihak ketiga).
 */
(function () {
  'use strict';
  var L = window.TGApp.L;

  var TIERS = [
    { i: 1, k: 'scout', id: 'Pengintai', en: 'Scout', min: 0, c1: '#e3a87a', c2: '#8a4b2a', glow: 'rgba(227,168,122,.55)',
      desc: ['Baru mulai mengenali pola. Setiap chapter menambah ketajaman matamu.', 'Just starting to spot patterns. Every chapter sharpens your eye.'] },
    { i: 2, k: 'sentinel', id: 'Penjaga', en: 'Sentinel', min: 30, c1: '#8ff7e6', c2: '#1f8f9c', glow: 'rgba(94,234,212,.55)',
      desc: ['Sudah bisa membaca tanda bahaya umum dan tahu kapan harus berhenti.', 'Reads common warning signs and knows when to pause.'] },
    { i: 3, k: 'protector', id: 'Pelindung', en: 'Protector', min: 65, c1: '#ffe9b5', c2: '#c9962e', glow: 'rgba(243,217,164,.6)',
      desc: ['Jeli pada modus yang halus dan siap membantu orang di sekitarmu.', 'Sharp on subtle tricks and ready to help the people around you.'] },
    { i: 4, k: 'legend', id: 'Guardian Legenda', en: 'Legend Guardian', min: 100, c1: '#d9c7ff', c2: '#6f5bff', glow: 'rgba(196,167,255,.65)',
      desc: ['Hampir semua chapter tuntas sempurna. Kamu teladan guardian digital.', 'Nearly every chapter perfect. You are a model digital guardian.'] }
  ];
  var MAX_STARS = 120;

  /** Bintang untuk satu catatan progres { ok, tries }. */
  function starsOf(p) { if (!p) return 0; return p.ok ? (p.tries === 1 ? 3 : 2) : 1; }

  /** Ringkasan progres: { done, perfect, stars, tried }. */
  function summary(progress, list) {
    var out = { done: 0, perfect: 0, stars: 0, tried: 0 };
    var total = list ? list.length : 40;
    Object.keys(progress || {}).forEach(function (k) {
      var n = +k; if (!(n >= 1 && n <= total)) return;
      var p = progress[k]; out.tried++;
      out.stars += starsOf(p);
      if (p.ok) { out.done++; if (p.tries === 1) out.perfect++; }
    });
    return out;
  }

  /** Tier untuk jumlah bintang tertentu, plus kemajuan ke tier berikutnya. */
  function tierFor(stars) {
    var t = TIERS[0];
    for (var i = 0; i < TIERS.length; i++) if (stars >= TIERS[i].min) t = TIERS[i];
    var next = TIERS[t.i] || null;
    var span = next ? next.min - t.min : MAX_STARS - t.min;
    var pct = next ? Math.min(1, (stars - t.min) / span) : 1;
    return { tier: t, next: next, pct: pct, toNext: next ? Math.max(0, next.min - stars) : 0, stars: stars };
  }

  /**
   * Lencana SVG untuk sebuah tier. size dalam px. Tiap tier punya bentuk emblem berbeda:
   * 1 mata pengintai, 2 gembok penjaga, 3 sayap pelindung, 4 mahkota dengan lingkar cahaya.
   */
  var bid = 0;
  function badge(tier, size, locked) {
    var u = ++bid, s = size || 64, t = tier;
    var emblem = {
      scout: '<circle cx="32" cy="33" r="9.5" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="33" r="3.6" fill="#fff"/><path d="M15 33q17-16 34 0q-17 16-34 0z" fill="none" stroke="#fff" stroke-width="2.4"/>',
      sentinel: '<rect x="23" y="30" width="18" height="14" rx="4" fill="#fff"/><path d="M26 30v-4a6 6 0 0 1 12 0v4" fill="none" stroke="#fff" stroke-width="3"/><circle cx="32" cy="37" r="2" fill="' + t.c2 + '"/>',
      protector: '<path d="M32 22v24M32 28c-6-8-16-6-20 2 6 0 12 4 20 10M32 28c6-8 16-6 20 2-6 0-12 4-20 10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
      legend: '<path d="M18 42l-3-16 9 7 8-12 8 12 9-7-3 16z" fill="#fff"/><rect x="17" y="43" width="30" height="4" rx="2" fill="#fff"/><circle cx="32" cy="16" r="2.4" fill="#fff"/>'
    }[t.k];
    return '<svg class="tier-badge' + (locked ? ' locked' : '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 64 64" aria-hidden="true"><defs>' +
      '<linearGradient id="tb' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + t.c1 + '"/><stop offset="1" stop-color="' + t.c2 + '"/></linearGradient>' +
      '<linearGradient id="tf' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      (t.k === 'legend' ? '<circle cx="32" cy="32" r="30" fill="none" stroke="url(#tb' + u + ')" stroke-width="1.6" stroke-dasharray="4 5" opacity=".9"/>' : '') +
      '<path d="M32 4 56 12v18c0 14-9.5 24.5-24 29C17.5 54.5 8 44 8 30V12z" fill="url(#tb' + u + ')"/>' +
      '<path d="M32 4 8 12v18c0 4 1 8 2.6 11.4C11.4 28 18 13 32 4z" fill="url(#tf' + u + ')"/>' +
      '<path d="M32 9.5l18.5 6.3v14.4c0 11.3-7.2 19.3-18.5 23.3-11.3-4-18.5-12-18.5-23.3V15.8z" fill="none" stroke="#060a16" stroke-opacity=".28" stroke-width="1.6"/>' +
      '<g>' + emblem + '</g>' +
      (t.i >= 3 ? '<path d="M50 6l1.6 3.6 3.6 1.6-3.6 1.6L50 16.4l-1.6-3.6-3.6-1.6 3.6-1.6z" fill="#fff"/>' : '') +
      '</svg>';
  }

  /** Teks nama tier sesuai bahasa. */
  function name(t) { return L(t.id, t.en); }

  window.TGLevel = { TIERS: TIERS, MAX_STARS: MAX_STARS, starsOf: starsOf, summary: summary, tierFor: tierFor, badge: badge, name: name };
})();
