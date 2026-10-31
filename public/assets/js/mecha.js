/**
 * mecha.js : "Guardian", gadis mecha bergaya anime yang menemani pengguna di semua halaman.
 *
 * Karakter digambar sepenuhnya dengan SVG (karya sendiri, tanpa aset pihak ketiga):
 * rambut panjang dua kuncir putih kebiruan, headphone dengan sirip tanduk menyala, jaket puffer biru muda
 * yang kebesaran, lengan gauntlet mecha bercakar, sepatu kets, dan sirip hiu kecil di belakang.
 *
 * Cara kerja:
 *  - Satu markup SVG memuat SEMUA varian mata, mulut, alis, dan efek. Yang tampil dipilih lewat atribut
 *    data-eyes / data-mouth / data-brow / data-fx / data-pose pada elemen induk (lihat mecha.css).
 *  - Interaksi: tekan = kesal ("hmph"), tahan lalu geser = terangkat dan menggelepar (mata "> <"), lepas = jatuh membal,
 *    klik dua kali = berputar gembira, arahkan kursor = menoleh dan tersenyum, tombol "Elus" = bahagia + hati.
 *  - Otonom: berkedip, melirik kanan-kiri, menggoyang ahoge, dan tertidur (zzz) bila lama tidak disentuh.
 *  - API publik (window.Mecha): init(root), mood(nama, ms), say(teks, ms), react(jenis), pose(nama, ms),
 *    lookAt(elemen|null), peek(bool), wave(), main().
 *
 * Atribut host:  <div data-mecha [data-main] [data-pat] [data-static] [data-crop="head"]></div>
 *  - data-main   : instans utama halaman (sasaran Mecha.mood/say/react).
 *  - data-pat    : tampilkan tombol "Elus kepalanya".
 *  - data-static : tanpa interaksi, tanpa mengambang (dipakai di kartu ajakan dan tombol melayang).
 *  - data-crop   : "head" hanya menampilkan kepala (tombol melayang).
 */
(function () {
  'use strict';
  var A = window.TGApp, L = A.L;
  var uid = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;

  /** Kombinasi ekspresi untuk tiap suasana hati. */
  var MOODS = {
    idle: { eyes: 'open', mouth: 'smile', brow: 'norm', fx: '' },
    happy: { eyes: 'happy', mouth: 'open', brow: 'up', fx: 'blush sparkle' },
    cheer: { eyes: 'star', mouth: 'open', brow: 'up', fx: 'blush sparkle hearts', pose: 'cheer' },
    proud: { eyes: 'wink', mouth: 'grin', brow: 'up', fx: 'sparkle' },
    love: { eyes: 'heart', mouth: 'cat', brow: 'up', fx: 'blush hearts' },
    sad: { eyes: 'sad', mouth: 'frown', brow: 'sad', fx: 'tear sweat' },
    worried: { eyes: 'open', mouth: 'flat', brow: 'sad', fx: 'sweat' },
    alert: { eyes: 'surp', mouth: 'o', brow: 'up', fx: 'alert' },
    thinking: { eyes: 'side', mouth: 'flat', brow: 'norm', fx: 'think' },
    confused: { eyes: 'open', mouth: 'wavy', brow: 'sad', fx: 'quest' },
    wink: { eyes: 'wink', mouth: 'cat', brow: 'up', fx: 'blush' },
    annoyed: { eyes: 'annoy', mouth: 'pout', brow: 'angry', fx: 'vein redblush' },
    pat: { eyes: 'closed', mouth: 'cat', brow: 'norm', fx: 'blush hearts' },
    sleepy: { eyes: 'sleepy', mouth: 'flat', brow: 'norm', fx: 'zzz', pose: 'sleepy' },
    peek: { eyes: 'closed', mouth: 'o', brow: 'up', fx: 'blush', pose: 'peek' },
    giggle: { eyes: 'happy', mouth: 'grin', brow: 'up', fx: 'blush sparkle' },
    zap: { eyes: 'annoy', mouth: 'grin', brow: 'angry', fx: 'vein redblush zap' },
    /* Diangkat: mata "> <" tetap, tetapi mulut manyun sebal (bukan senang), pipi merah, dan setetes keringat */
    lifted: { eyes: 'squeeze', mouth: 'grump', brow: 'sad', fx: 'blush sweat' }
  };

  /** Kalimat spontan, dua bahasa. */
  var LINES = {
    poke: [['Hei, jangan ditekan-tekan!', 'Hey, stop poking me!'], ['Ih, geli tahu!', 'Eek, that tickles!'], ['Berhenti dong...', 'Stop it, please...'], ['Hmph! Aku lagi jaga-jaga, lho.', 'Hmph! I am on guard duty here.']],
    lift: [['Hmph! Turunkan aku sekarang!', 'Hmph! Put me down right now!'], ['Ih, kakiku menggantung, tahu!', 'Ugh, my feet are dangling, you know!'], ['Aku bukan boneka, tahu!', 'I am not a doll, you know!'], ['Nyebelin banget! Lepasin!', 'So annoying! Let go!']],
    drop: [['Hmph! Jangan sembarangan angkat aku.', 'Hmph! Do not just lift me like that.'], ['Awas ya, aku ngambek!', 'Watch it, I am sulking!'], ['Aduh... pusing.', 'Ouch... dizzy.']],
    pat: [['Hehe, enak banget...', 'Hehe, that feels nice...'], ['Nyaman... terima kasih!', 'So cozy... thank you!'], ['Mrrr... lagi dong!', 'Purr... more please!'], ['Kamu baik, aku jadi semangat!', 'You are kind, now I am fired up!']],
    patMany: [['Kamu baik banget. Aku makin semangat jagain kamu!', 'You are so kind. I am extra motivated to protect you!']],
    spin: [['Wheee!', 'Wheee!'], ['Lihat, aku bisa muter!', 'Look, I can spin!']],
    tickle: [['Hihihi, geli!', 'Hihihi, that tickles!'], ['Ampun, ampun!', 'Mercy, mercy!']],
    wake: [['Eh? Aku ketiduran...', 'Huh? I dozed off...'], ['Siap! Aku bangun kok.', 'Ready! I am awake.']],
    hover: [['Halo!', 'Hello!'], ['Ada yang bisa kubantu?', 'Need a hand?'], ['Hai hai!', 'Hi hi!']],
    idle: [['Ingat, jangan bagikan OTP ya.', 'Remember, never share your OTP.'], ['Ragu? Cek dulu, baru percaya.', 'In doubt? Check first, then trust.'], ['Aku di sini kalau ada yang janggal.', 'I am here if something feels off.'], ['Hoam... tetap waspada ya.', 'Yawn... stay alert, okay.']]
  };
  function pick(arr) { var l = arr[Math.floor(Math.random() * arr.length)]; return L(l[0], l[1]); }

  /** Sapaan sesuai jam di perangkat pengguna. */
  function greeting() {
    var h = new Date().getHours();
    if (h < 11) return L('Selamat pagi! Aku Guardian.', 'Good morning! I am Guardian.');
    if (h < 15) return L('Selamat siang! Aku Guardian.', 'Good afternoon! I am Guardian.');
    if (h < 18) return L('Selamat sore! Aku Guardian.', 'Good evening! I am Guardian.');
    return L('Selamat malam! Aku Guardian.', 'Good evening! I am Guardian.');
  }

  /* ------------------------------------------------------------------ */
  /* Markup SVG                                                          */
  /* ------------------------------------------------------------------ */
  var INK = '#26304f';

  /** Satu mata lengkap dengan semua variannya. side = 'L' atau 'R' (menentukan sisi bulu mata luar). */
  function eye(u, cx, side) {
    var cy = 124, out = side === 'L' ? -1 : 1;
    var star = [[0, -9], [2.2, -3], [8.6, -2.8], [3.5, 1.2], [5.3, 7.3], [0, 3.8], [-5.3, 7.3], [-3.5, 1.2], [-8.6, -2.8], [-2.2, -3]].map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    var lid = '<path d="M' + (cx - 15) + ' ' + (cy - 7) + ' Q' + cx + ' ' + (cy - 27) + ' ' + (cx + 15) + ' ' + (cy - 7) + '" stroke="' + INK + '" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + (cx + out * 14) + ' ' + (cy - 10) + ' l' + (out * 5) + ' -5M' + (cx + out * 16) + ' ' + (cy - 4) + ' l' + (out * 6) + ' -2" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M' + (cx - 10) + ' ' + (cy + 14) + ' Q' + cx + ' ' + (cy + 19) + ' ' + (cx + 10) + ' ' + (cy + 14) + '" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".45"/>';
    var iris = '<ellipse cx="' + cx + '" cy="' + (cy + 1) + '" rx="13" ry="17" fill="url(#iris' + u + ')" stroke="#1d2a4d" stroke-width="1.4"/>';
    var shine = '<circle cx="' + (cx - 4.6) + '" cy="' + (cy - 6) + '" r="4.6" fill="#fff"/><circle cx="' + (cx + 5) + '" cy="' + (cy + 7) + '" r="2.3" fill="#fff" opacity=".92"/><circle cx="' + (cx + 3) + '" cy="' + (cy - 10) + '" r="1.3" fill="#fff" opacity=".9"/>';
    return '<g class="mc-eye">' +
      '<g class="e e-open ' + side + '"><g class="mc-look">' + iris + '<ellipse cx="' + cx + '" cy="' + (cy + 3) + '" rx="6" ry="9.5" fill="#0b1430"/><ellipse cx="' + cx + '" cy="' + (cy + 11) + '" rx="6" ry="2.4" fill="#9fe6ff" opacity=".5"/>' + shine + '</g>' + lid + '</g>' +
      '<g class="e e-wet"><ellipse cx="' + (cx + 2) + '" cy="' + (cy + 9) + '" rx="7" ry="3.4" fill="#fff" opacity=".75"/><ellipse cx="' + (cx - 6) + '" cy="' + (cy - 1) + '" rx="3" ry="4.6" fill="#fff" opacity=".9"/></g>' +
      '<g class="e e-happy ' + side + '"><path d="M' + (cx - 12) + ' ' + (cy + 4) + ' Q' + cx + ' ' + (cy - 13) + ' ' + (cx + 12) + ' ' + (cy + 4) + '" stroke="' + INK + '" stroke-width="4.8" fill="none" stroke-linecap="round"/></g>' +
      '<g class="e e-closed"><path d="M' + (cx - 12) + ' ' + (cy - 1) + ' Q' + cx + ' ' + (cy + 10) + ' ' + (cx + 12) + ' ' + (cy - 1) + '" stroke="' + INK + '" stroke-width="4.6" fill="none" stroke-linecap="round"/></g>' +
      '<g class="e e-annoy"><path d="M' + (cx - 12.5) + ' ' + (cy - 1) + ' A12.5 14 0 0 0 ' + (cx + 12.5) + ' ' + (cy - 1) + 'Z" fill="url(#iris' + u + ')" stroke="#1d2a4d" stroke-width="1.4"/><ellipse cx="' + cx + '" cy="' + (cy + 6) + '" rx="4" ry="5.5" fill="#0b1430"/><circle cx="' + (cx - 3) + '" cy="' + (cy + 2) + '" r="2" fill="#fff"/><path d="M' + (cx - 16) + ' ' + (cy - 1) + 'H' + (cx + 16) + '" stroke="' + INK + '" stroke-width="4.6" stroke-linecap="round"/></g>' +
      '<g class="e e-sleepy"><g class="mc-look">' + iris + '<ellipse cx="' + cx + '" cy="' + (cy + 4) + '" rx="6" ry="9" fill="#0b1430"/><circle cx="' + (cx - 4) + '" cy="' + (cy + 2) + '" r="3" fill="#fff"/></g><path d="M' + (cx - 16) + ' ' + (cy - 9) + ' Q' + cx + ' ' + (cy - 28) + ' ' + (cx + 16) + ' ' + (cy - 9) + ' L' + (cx + 16) + ' ' + (cy + 3) + ' Q' + cx + ' ' + (cy - 2) + ' ' + (cx - 16) + ' ' + (cy + 3) + 'Z" fill="#ffe9dd"/><path d="M' + (cx - 15) + ' ' + (cy + 2) + ' Q' + cx + ' ' + (cy - 3) + ' ' + (cx + 15) + ' ' + (cy + 2) + '" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/></g>' +
      '<g class="e e-star">' + iris + '<polygon transform="translate(' + cx + ' ' + (cy + 1) + ')" points="' + star + '" fill="#fff7d6"/>' + lid + '</g>' +
      '<g class="e e-heart">' + iris + '<path transform="translate(' + cx + ' ' + (cy + 2) + ') scale(1.35)" d="M0 -3C-5 -10 -13 -1 0 8C13 -1 5 -10 0 -3Z" fill="#ff6b9a"/><circle cx="' + (cx - 4) + '" cy="' + (cy - 5) + '" r="3" fill="#fff"/>' + lid + '</g>' +
      '<g class="e e-squeeze"><path d="M' + (cx + out * 9) + ' ' + (cy - 4) + ' L' + (cx - out * 7) + ' ' + (cy + 5) + ' L' + (cx + out * 9) + ' ' + (cy + 14) + '" stroke="' + INK + '" stroke-width="4.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '<g class="e e-surp"><ellipse cx="' + cx + '" cy="' + cy + '" rx="14.5" ry="18.5" fill="#fff" stroke="#1d2a4d" stroke-width="2"/><circle cx="' + cx + '" cy="' + (cy + 1) + '" r="5" fill="#0b1430"/><circle cx="' + (cx - 1.8) + '" cy="' + (cy - 1) + '" r="1.6" fill="#fff"/></g></g>';
  }

  function heart(x, y, cls) { return '<g transform="translate(' + x + ' ' + y + ')"><path class="mc-h ' + cls + '" d="M0 -3C-5 -10 -13 -1 0 8C13 -1 5 -10 0 -3Z" fill="#ff7b9c"/></g>'; }

  /** Gauntlet mecha (lengan bawah + cakar). x,y = pojok kiri atas kotak gauntlet. */
  function gauntlet(x, y) {
    return '<circle cx="' + (x + 11) + '" cy="' + (y + 1) + '" r="12" fill="#dfe7f4" stroke="#8fa3c0" stroke-width="2"/>' +
      '<rect x="' + x + '" y="' + y + '" width="22" height="21" rx="6" fill="#cfd9ea" stroke="#8698b8" stroke-width="2"/>' +
      '<rect class="mc-glow" x="' + (x + 4) + '" y="' + (y + 6) + '" width="14" height="3.2" rx="1.6" fill="#5eead4"/>' +
      '<path d="M' + (x + 2) + ' ' + (y + 20) + ' l3.5 13 3.5-13M' + (x + 8) + ' ' + (y + 21) + ' l3 14 3-14M' + (x + 14) + ' ' + (y + 20) + ' l3.5 13 3.5-13" fill="#b9c6db" stroke="#7d8fae" stroke-width="1.4" stroke-linejoin="round"/>';
  }

  /** Membuat markup SVG lengkap. crop=head hanya menampilkan kepala (untuk tombol melayang). */
  function svg(crop) {
    var u = ++uid;
    var vb = crop === 'head' ? '36 22 168 160' : '0 -44 240 364';
    return '<svg class="mc-svg" viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Guardian"><defs>' +
      '<linearGradient id="hair' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e3eeff"/><stop offset="1" stop-color="#a9ccf7"/></linearGradient>' +
      '<linearGradient id="tip' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe0ff"/><stop offset="1" stop-color="#6fb6ff"/></linearGradient>' +
      '<linearGradient id="iris' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe8ff"/><stop offset=".5" stop-color="#3f8cff"/><stop offset="1" stop-color="#1b3fa8"/></linearGradient>' +
      '<linearGradient id="jk' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#deefff"/><stop offset="1" stop-color="#a6cff7"/></linearGradient>' +
      '<linearGradient id="badge' + u + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ff7e6"/><stop offset="1" stop-color="#7b8cff"/></linearGradient>' +
      '</defs>' +
      '<ellipse class="mc-shadow" cx="120" cy="306" rx="54" ry="7" fill="#000" opacity=".28"/>' +
      '<g class="mc-all">' +
      /* rambut belakang dan dua kuncir */
      '<path d="M58 124C48 62 88 40 120 40s72 22 62 84l-4 54H62z" fill="url(#hair' + u + ')"/>' +
      '<g class="mc-tail l"><path d="M72 118C40 150 32 212 46 274c4 14 20 18 24 6C56 240 60 190 88 150z" fill="url(#hair' + u + ')"/><path d="M46 274c4 14 20 18 24 6-3-10-7-20-8-32-7 4-13 14-16 26z" fill="url(#tip' + u + ')"/><path d="M62 150c-10 26-14 60-8 96" stroke="#fff" stroke-width="2.4" opacity=".55" fill="none" stroke-linecap="round"/></g>' +
      '<g class="mc-tail r"><g transform="translate(240 0) scale(-1 1)"><path d="M72 118C40 150 32 212 46 274c4 14 20 18 24 6C56 240 60 190 88 150z" fill="url(#hair' + u + ')"/><path d="M46 274c4 14 20 18 24 6-3-10-7-20-8-32-7 4-13 14-16 26z" fill="url(#tip' + u + ')"/><path d="M62 150c-10 26-14 60-8 96" stroke="#fff" stroke-width="2.4" opacity=".55" fill="none" stroke-linecap="round"/></g></g>' +
      /* sirip hiu kecil di belakang */
      '<path class="mc-fin" d="M152 262c16-14 36-12 40 4-10-4-18 0-24 14z" fill="#9fd0ff" stroke="#6aa9e8" stroke-width="2" stroke-linejoin="round"/>' +
      /* kaki dan sepatu */
      '<g class="mc-leg l"><rect x="101" y="248" width="15" height="36" rx="7" fill="#f6f8ff"/><rect x="99" y="262" width="19" height="7" rx="3" fill="#c7d3e6"/><path d="M95 282h27v10q0 9-9 9h-10q-8 0-8-9z" fill="#bfe0ff"/><path d="M95 296h27v2q0 4-9 4h-10q-8 0-8-4z" fill="#fff"/><path d="M100 288h12" stroke="#8fb6e6" stroke-width="2" stroke-linecap="round"/></g>' +
      '<g class="mc-leg r"><rect x="124" y="248" width="15" height="36" rx="7" fill="#f6f8ff"/><rect x="122" y="262" width="19" height="7" rx="3" fill="#c7d3e6"/><path d="M118 282h27v10q0 9-9 9h-10q-8 0-8-9z" fill="#bfe0ff"/><path d="M118 296h27v2q0 4-9 4h-10q-8 0-8-4z" fill="#fff"/><path d="M123 288h12" stroke="#8fb6e6" stroke-width="2" stroke-linecap="round"/></g>' +
      /* badan: leher, jaket puffer, kerah, ritsleting, saku, lencana perisai */
      '<g class="mc-body">' +
      '<rect x="112" y="168" width="16" height="26" rx="6" fill="#ffd9c8"/>' +
      '<path d="M84 196Q120 184 156 196L168 262Q120 278 72 262Z" fill="url(#jk' + u + ')"/>' +
      '<path d="M80 222Q120 234 160 222M76 244Q120 256 164 244" stroke="#fff" stroke-width="2.2" fill="none" opacity=".6" stroke-linecap="round"/>' +
      '<path d="M120 198V262" stroke="#8aa4c8" stroke-width="2.2" stroke-dasharray="3 2.5"/><rect x="116.5" y="206" width="7" height="10" rx="2.5" fill="#9bb3d6"/>' +
      '<rect x="132" y="238" width="18" height="12" rx="3" fill="none" stroke="#8fb3dd" stroke-width="1.8"/>' +
      '<path d="M104 210l8 3v6.5c0 5-3.4 8.6-8 10.2-4.6-1.6-8-5.2-8-10.2V213z" fill="url(#badge' + u + ')"/><path d="M100 220l3 3 5.5-6" stroke="#0b1230" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M92 190L148 190 152 203Q120 213 88 203Z" fill="#eaf4ff" stroke="#a9c8ec" stroke-width="1.6"/>' +
      '</g>' +
      /* lengan: lengan jaket + gauntlet mecha */
      '<g class="mc-arm l"><path d="M90 200C70 206 60 222 58 240" stroke="#c4e0ff" stroke-width="22" stroke-linecap="round" fill="none"/>' + gauntlet(47, 240) + '</g>' +
      '<g class="mc-arm r"><path d="M150 200C170 206 180 222 182 240" stroke="#c4e0ff" stroke-width="22" stroke-linecap="round" fill="none"/>' + gauntlet(171, 240) + '</g>' +
      /* kepala */
      '<g class="mc-head">' +
      '<g class="mc-ear"><path d="M48 110L22 62 30 58 64 98Z" fill="#eef3fb" stroke="#9fb0cc" stroke-width="2" stroke-linejoin="round"/><path class="mc-glow" d="M50 104L33 72" stroke="#5eead4" stroke-width="2.6" stroke-linecap="round"/><circle cx="60" cy="120" r="17" fill="#e6edf8" stroke="#9fb0cc" stroke-width="2"/><circle cx="60" cy="120" r="9" fill="#8fb6ff"/><circle class="mc-glow" cx="60" cy="120" r="4.5" fill="#5eead4"/></g>' +
      '<g class="mc-ear"><path d="M192 110L218 62 210 58 176 98Z" fill="#eef3fb" stroke="#9fb0cc" stroke-width="2" stroke-linejoin="round"/><path class="mc-glow" d="M190 104L207 72" stroke="#5eead4" stroke-width="2.6" stroke-linecap="round"/><circle cx="180" cy="120" r="17" fill="#e6edf8" stroke="#9fb0cc" stroke-width="2"/><circle cx="180" cy="120" r="9" fill="#8fb6ff"/><circle class="mc-glow" cx="180" cy="120" r="4.5" fill="#5eead4"/></g>' +
      '<path d="M62 112C62 76 88 58 120 58s58 18 58 54c0 38-22 64-58 68-36-4-58-30-58-68z" fill="#ffe9dd"/>' +
      '<ellipse class="mc-blush" cx="88" cy="143" rx="11" ry="6" fill="#ff8fa8"/><ellipse class="mc-blush" cx="152" cy="143" rx="11" ry="6" fill="#ff8fa8"/>' +
      eye(u, 96, 'L') + eye(u, 144, 'R') +
      '<path d="M120 139l1.6 2.4" stroke="#e8b3a3" stroke-width="2" stroke-linecap="round"/>' +
      '<g class="b b-norm"><path d="M84 101Q96 95 110 100M130 100Q144 95 156 101" stroke="#9db4e8" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>' +
      '<g class="b b-up"><path d="M84 95Q96 88 110 93M130 93Q144 88 156 95" stroke="#9db4e8" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>' +
      '<g class="b b-sad"><path d="M84 105L110 97M156 105L130 97" stroke="#9db4e8" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>' +
      '<g class="b b-angry"><path d="M84 95L110 106M156 95L130 106" stroke="#8aa3df" stroke-width="3.6" fill="none" stroke-linecap="round"/></g>' +
      '<g class="m m-smile"><path d="M110 151Q120 161 130 151" stroke="#c0536f" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>' +
      '<g class="m m-open"><path d="M107 149H133Q131 168 120 168T107 149Z" fill="#8a2f4a"/><ellipse cx="120" cy="163" rx="7" ry="3.4" fill="#ff8fa8"/></g>' +
      '<g class="m m-grin"><path d="M108 150Q120 157 132 150Q129 163 120 163T108 150Z" fill="#8a2f4a"/><path d="M110 151Q120 156 130 151" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></g>' +
      '<g class="m m-o"><ellipse cx="120" cy="157" rx="5.5" ry="7.5" fill="#8a2f4a"/></g>' +
      '<g class="m m-frown"><path d="M110 161Q120 150 130 161" stroke="#c0536f" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>' +
      '<g class="m m-grump"><path d="M109 158Q114.5 150 120 158T131 158" stroke="#c0536f" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '<g class="m m-pout"><path d="M108 156Q114 150 120 156T132 156" stroke="#c0536f" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>' +
      '<g class="m m-wavy"><path d="M108 155Q112 150 116 155T124 155T132 155" stroke="#c0536f" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
      '<g class="m m-cat"><path d="M107 150Q113.5 161 120 152Q126.5 161 133 150" stroke="#c0536f" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '<g class="m m-flat"><path d="M112 156H128" stroke="#c0536f" stroke-width="3.2" stroke-linecap="round"/></g>' +
      /* poni, rambut samping, ahoge */
      '<path d="M58 108C56 60 86 42 120 42s64 18 62 66l-4-2-6 10-10-10-12 12-12-12-12 12-12-12-12 12-10-10-6 10z" fill="url(#hair' + u + ')"/>' +
      '<path d="M60 100C54 130 54 158 58 176c8 6 14 0 14-10-2-26-2-50 0-66zM180 100c6 30 6 58 2 76-8 6-14 0-14-10 2-26 2-50 0-66z" fill="url(#hair' + u + ')"/>' +
      '<path d="M90 60C102 54 118 52 136 56" stroke="#fff" stroke-width="3" opacity=".75" fill="none" stroke-linecap="round"/>' +
      '<path d="M150 62l10 10M160 62l-10 10" stroke="#5eead4" stroke-width="3.4" stroke-linecap="round" opacity=".9"/>' +
      '<g class="mc-ant"><path d="M122 44C112 30 130 22 126 8" stroke="#dfe9ff" stroke-width="4" fill="none" stroke-linecap="round"/></g>' +
      /* efek ekspresi */
      '<path class="x x-sweat" d="M172 92c-6 9-7 15-1 18 6 2 9-3 7-9z" fill="#8fd8ff" stroke="#fff" stroke-width="1"/>' +
      '<path class="x x-tear" d="M88 146c-4 8-5 13-.5 15 5 1 7-4 4.5-9z" fill="#8fd8ff" stroke="#fff" stroke-width="1"/>' +
      '<g class="x x-vein" stroke="#ff5470" stroke-width="3.4" stroke-linecap="round" fill="none"><path d="M160 76Q166 78 166 84M176 76Q170 78 170 84M160 96Q166 94 166 88M176 96Q170 94 170 88"/></g>' +
      '<g class="x x-zap"><path class="z1" d="M40 206l-17 17 11 3-15 21 28-19-12-3z"/><path class="z2" d="M200 206l17 17-11 3 15 21-28-19 12-3z"/><path class="z1" d="M30 262l-12 8 8 2-9 12 17-11-8-2z"/><path class="z2" d="M210 262l12 8-8 2 9 12-17-11 8-2z"/><circle class="z1" cx="64" cy="232" r="3"/><circle class="z2" cx="176" cy="232" r="3"/></g>' +
      '<g class="x x-alert"><rect x="112" y="-38" width="16" height="30" rx="7" fill="#ff6b81"/><circle cx="120" cy="2" r="5.5" fill="#ff6b81"/></g>' +
      '<g class="x x-quest"><path d="M156 20c0-10 8-16 17-16s16 6 16 14c0 11-14 11-14 22" stroke="#c4a7ff" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="175" cy="50" r="3.8" fill="#c4a7ff"/></g>' +
      '<g class="x x-think"><circle cx="168" cy="62" r="4" fill="#cfd6ff"/><circle cx="180" cy="48" r="6" fill="#cfd6ff"/><circle cx="196" cy="30" r="9" fill="#cfd6ff"/></g>' +
      '<g class="x x-zzz" fill="#cfe3ff" font-family="Sora,Segoe UI,sans-serif" font-weight="800"><text class="z z1" x="166" y="66" font-size="16">z</text><text class="z z2" x="180" y="44" font-size="22">z</text><text class="z z3" x="198" y="18" font-size="28">z</text></g>' +
      '<g class="x x-sparkle" fill="#f3d9a4"><path class="mc-sp s1" d="M44 70l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path class="mc-sp s2" d="M200 74l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/><path class="mc-sp s3" d="M130 -10l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>' +
      '<g class="x x-hearts">' + heart(94, 50, 'h1') + heart(120, 40, 'h2') + heart(148, 50, 'h3') + '</g>' +
      /* tangan menutup mata (pose peek) */
      '<g class="mc-cover"><rect x="78" y="112" width="36" height="26" rx="12" fill="#cfd9ea" stroke="#8698b8" stroke-width="2"/><rect x="126" y="112" width="36" height="26" rx="12" fill="#cfd9ea" stroke="#8698b8" stroke-width="2"/><path d="M84 116v18M92 114v22M100 114v22M108 116v18M132 116v18M140 114v22M148 114v22M156 116v18" stroke="#b1bfd6" stroke-width="2" stroke-linecap="round"/></g>' +
      '</g>' +
      /* tangan yang mengelus dari atas */
      '<g class="mc-hand"><rect x="102" y="-34" width="36" height="28" rx="14" fill="#f4f7ff" stroke="#c9d2ff" stroke-width="2"/><rect x="111" y="-10" width="18" height="12" rx="4" fill="#5b66e8"/><path d="M110 -20h20" stroke="#c9d2ff" stroke-width="2" stroke-linecap="round"/></g>' +
      '</g></svg>';
  }

  /* ------------------------------------------------------------------ */
  /* Instans                                                             */
  /* ------------------------------------------------------------------ */
  var registry = [];

  /** Efek layar kena setrum: kilat putih, lalu layar gelap sebentar dan kembali normal.
   *  Dilewati bila pengguna memilih "kurangi gerakan" (menghindari kedipan layar yang tidak nyaman). */
  function shockScreen() {
    if (reduce) return;
    var o = document.getElementById('tg-zap');
    if (!o) { o = document.createElement('div'); o.id = 'tg-zap'; o.setAttribute('aria-hidden', 'true'); document.body.appendChild(o); }
    o.classList.remove('on'); void o.offsetWidth; o.classList.add('on');
    document.body.classList.add('tg-shock');
    setTimeout(function () { o.classList.remove('on'); document.body.classList.remove('tg-shock'); }, 1450);
  }
  var lastInteract = Date.now();

  /** Menyalakan satu instans karakter di elemen host. */
  function build(host) {
    if (host.dataset.mcReady) return;
    host.dataset.mcReady = '1';
    var isStatic = host.hasAttribute('data-static');
    var isHead = host.getAttribute('data-crop') === 'head';
    host.classList.add('mecha');
    host.setAttribute('data-m', 'idle');
    host.innerHTML = '<div class="mc-say" aria-live="polite"></div><div class="mc-stage"><div class="mc-drag">' + svg(host.getAttribute('data-crop')) + '</div></div>';
    var stage = host.querySelector('.mc-stage'), drag = host.querySelector('.mc-drag'), say = host.querySelector('.mc-say');
    var look = host.querySelectorAll('.mc-look');
    var state = { held: false, lifted: false, x0: 0, y0: 0, timer: 0, sayTimer: 0, poseTimer: 0, pats: 0, pokes: 0, pokeAt: 0, holdTimer: 0, lastTap: 0, target: null, lookX: 0, lookY: 0, asleep: false, idleTimer: 0 };
    var inst = { el: host, state: state };

    function setLook(x, y) { for (var i = 0; i < look.length; i++) look[i].style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)'; }

    inst.mood = function (name, ms) {
      var m = MOODS[name] || MOODS.idle;
      host.setAttribute('data-eyes', m.eyes); host.setAttribute('data-mouth', m.mouth); host.setAttribute('data-brow', m.brow);
      host.setAttribute('data-fx', m.fx); host.setAttribute('data-pose', m.pose || ''); host.setAttribute('data-m', name);
      state.asleep = name === 'sleepy';
      clearTimeout(state.timer);
      if (ms) state.timer = setTimeout(function () { if (!state.held && !host.classList.contains('patting')) inst.mood('idle'); }, ms);
    };
    /** Pose sementara tanpa mengubah ekspresi (cheer, spin, wave, jump, peek). */
    inst.pose = function (name, ms) {
      host.setAttribute('data-pose', name || '');
      clearTimeout(state.poseTimer);
      if (ms) state.poseTimer = setTimeout(function () { if (host.getAttribute('data-pose') === name) host.setAttribute('data-pose', (MOODS[host.getAttribute('data-m')] || {}).pose || ''); }, ms);
    };
    inst.say = function (text, ms) {
      if (!say || !text) return;
      say.textContent = text; say.classList.add('show');
      clearTimeout(state.sayTimer);
      state.sayTimer = setTimeout(function () { say.classList.remove('show'); }, ms || 2800);
    };
    /** Mata mengikuti sebuah elemen (misalnya kolom formulir). null = kembali mengikuti kursor. */
    inst.lookAt = function (el) { state.target = el || null; if (el) aimAt(el); else setLook(0, 0); };
    inst.peek = function (on) { if (on) inst.mood('peek'); else if (host.getAttribute('data-m') === 'peek') inst.mood('idle'); };
    inst.wave = function () { inst.pose('wave', 1600); };
    inst.wake = function () { if (state.asleep) { inst.mood('alert', 900); inst.say(pick(LINES.wake), 2200); window.Sound.play('surprise'); setTimeout(function () { inst.mood('idle'); }, 950); } lastInteract = Date.now(); };
    inst.mood('idle');

    function aimAt(el) {
      var r = host.getBoundingClientRect(), t = el.getBoundingClientRect();
      var dx = (t.left + t.width / 2) - (r.left + r.width / 2), dy = (t.top + t.height / 2) - (r.top + r.height * .4);
      var d = Math.max(1, Math.sqrt(dx * dx + dy * dy)), k = Math.min(1, d / 220);
      setLook(dx / d * 3 * k, dy / d * 3 * k);
    }

    /** Karakter menyetrum pengguna: badan bergetar, petir muncul, layar berkedip hitam, lalu memberi peringatan. */
    function zap() {
      state.zapping = true; host.classList.add('zapping');
      inst.mood('zap'); inst.say(L('ZAP! Sudah kubilang!', 'ZAP! I warned you!'), 1500);
      window.Sound.play('zap'); shockScreen();
      setTimeout(function () {
        host.classList.remove('zapping'); state.zapping = false;
        inst.mood('annoyed', 3600); window.Sound.play('hmph');
        inst.say(L('Awas ya, kalau bikin aku kesel lagi, kusetrum lagi!', 'Careful, annoy me again and I will zap you again!'), 4400);
      }, 1500);
    }

    /* Pupil mengikuti kursor (perangkat mouse saja, dibatasi rAF) */
    if (!coarse && !host.hasAttribute('data-noeyes')) {
      var raf = 0;
      document.addEventListener('pointermove', function (e) {
        if (raf || state.target || state.asleep) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = host.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * .4);
          var d = Math.max(1, Math.sqrt(dx * dx + dy * dy)), k = Math.min(1, d / 260);
          setLook(dx / d * 2.8 * k, dy / d * 2.8 * k);
          // Menoleh sedikit ke arah kursor bila kursor dekat (hanya instans penuh)
          if (!isHead && !isStatic && !state.held) {
            var near = d < r.width * 1.1;
            host.style.setProperty('--tilt', near ? (dx / r.width * 6).toFixed(2) + 'deg' : '0deg');
          }
        });
      });
    }

    if (!isStatic) {
      /* Arahkan kursor: senyum dan sapa singkat (sekali per masuk) */
      stage.addEventListener('pointerenter', function () {
        if (coarse || state.held) return;
        if (state.asleep) { inst.wake(); return; }
        if (host.getAttribute('data-m') === 'idle') { inst.mood('happy', 1400); window.Sound.play('chirp'); }
        lastInteract = Date.now();
      });
      /* Tekan, tahan (geli), angkat, dan klik dua kali (berputar) */
      stage.addEventListener('pointerdown', function (e) {
        lastInteract = Date.now();
        if (state.zapping) return;
        if (state.asleep) { inst.wake(); return; }
        state.held = true; state.lifted = false; state.x0 = e.clientX; state.y0 = e.clientY;
        host.classList.add('held'); inst.mood('annoyed');
        try { stage.setPointerCapture(e.pointerId); } catch (er) { /* diabaikan */ }
        window.Sound.play('squeak');
        clearTimeout(state.holdTimer);
        state.holdTimer = setTimeout(function () {
          if (state.held && !state.lifted) { inst.mood('giggle'); inst.say(pick(LINES.tickle), 1800); window.Sound.play('giggle'); host.classList.add('tickle'); }
        }, 650);
      });
      stage.addEventListener('pointermove', function (e) {
        if (!state.held) return;
        var dx = e.clientX - state.x0, dy = e.clientY - state.y0;
        if (!state.lifted && Math.sqrt(dx * dx + dy * dy) > 10) {
          clearTimeout(state.holdTimer); host.classList.remove('tickle');
          state.lifted = true; host.classList.add('lifted'); host.setAttribute('data-pose', 'lifted'); inst.mood('lifted');
          inst.say(pick(LINES.lift), 2200); window.Sound.play('huff');
        }
        if (state.lifted) drag.style.transform = 'translate(' + Math.max(-90, Math.min(90, dx)) + 'px,' + Math.max(-110, Math.min(70, dy)) + 'px) rotate(' + Math.max(-14, Math.min(14, dx / 8)) + 'deg)';
      });
      var release = function () {
        if (!state.held) return;
        clearTimeout(state.holdTimer);
        var wasLifted = state.lifted, wasTickled = host.classList.contains('tickle');
        state.held = false; state.lifted = false;
        host.classList.remove('held', 'lifted', 'tickle'); host.setAttribute('data-pose', '');
        drag.style.transform = '';
        var now = Date.now();
        /* Hitung ketukan beruntun: bila terlalu banyak dalam 8 detik, karakter menyetrum (bukan berputar) */
        if (!wasLifted && !wasTickled) {
          state.taps = (now - (state.tapAt || 0) < 8000) ? (state.taps || 0) + 1 : 1; state.tapAt = now;
          if (state.taps >= 5) { state.taps = 0; state.lastTap = 0; zap(); return; }
        }
        if (wasLifted) { window.Sound.play('drop'); inst.say(pick(LINES.drop), 3000); inst.mood('annoyed', 1800); window.Sound.play('hmph'); }
        else if (wasTickled) { inst.mood('happy', 1200); }
        else if (now - state.lastTap < 320 && state.taps <= 2) { // klik dua kali: berputar gembira
          state.lastTap = 0; inst.mood('cheer', 1500); inst.pose('spin', 900); inst.say(pick(LINES.spin), 1800); window.Sound.play('whee');
          return;
        } else {
          state.pokes = (now - state.pokeAt < 6000) ? state.pokes + 1 : 1; state.pokeAt = now;
          inst.say(state.taps >= 3 ? L('Awas ya, nanti kusetrum!', 'Careful, or I will zap you!') : pick(LINES.poke), 2400);
          inst.mood('annoyed', 1500); window.Sound.play('hmph');
        }
        state.lastTap = now;
      };
      stage.addEventListener('pointerup', release);
      stage.addEventListener('pointercancel', release);

      /* Tingkah otonom: melirik, kedip ganda, goyang ahoge, lompat kecil, dan tertidur bila lama diam */
      if (!reduce && !isHead) {
        var tick = function () {
          var idleFor = Date.now() - lastInteract;
          var m = host.getAttribute('data-m');
          if (document.hidden) return;
          if (idleFor > 50000 && m === 'idle' && !host.hasAttribute('data-nosleep')) { inst.mood('sleepy'); window.Sound.play('yawn'); return; }
          if (m !== 'idle' || state.held || state.target) return;
          var r = Math.random();
          if (r < .35) { setLook(r < .18 ? -3 : 3, -1); setTimeout(function () { if (!state.target) setLook(0, 0); }, 900 + Math.random() * 700); }
          else if (r < .55) { host.classList.add('blink2'); setTimeout(function () { host.classList.remove('blink2'); }, 700); }
          else if (r < .7) { host.classList.add('wiggle'); setTimeout(function () { host.classList.remove('wiggle'); }, 1200); }
          else if (r < .8) { inst.pose('hop', 700); }
          else if (r < .9 && host.hasAttribute('data-main') && idleFor > 15000) { inst.say(pick(LINES.idle), 3200); inst.mood('wink', 1800); }
        };
        state.idleTimer = setInterval(tick, 5200 + Math.random() * 3000);
        document.addEventListener('visibilitychange', function () { if (!document.hidden) lastInteract = Date.now(); });
      }
    }

    /* Tombol elus */
    if (host.hasAttribute('data-pat')) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn btn-gh btn-sm mc-pat'; btn.setAttribute('data-snd', 'x');
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg><span class="lbl" data-en="Pat her head">Elus kepalanya</span><b class="cnt"></b>';
      host.appendChild(btn);
      A.apply(btn);
      btn.addEventListener('click', function () {
        lastInteract = Date.now();
        if (host.classList.contains('patting')) return;
        state.pats++;
        host.classList.add('patting'); inst.mood(state.pats % 3 === 0 ? 'love' : 'pat');
        window.Sound.play('pat'); setTimeout(function () { window.Sound.play('purr'); }, 380); setTimeout(function () { window.Sound.play('giggle'); }, 1400);
        inst.say(state.pats % 5 === 0 ? L(LINES.patMany[0][0], LINES.patMany[0][1]) : pick(LINES.pat), 2600);
        btn.querySelector('.cnt').textContent = 'x' + state.pats;
        if (state.pats % 5 === 0 && window.FX) { var r = host.getBoundingClientRect(); window.FX.confetti(r.left + r.width / 2, r.top + r.height * .35, 50); }
        setTimeout(function () { host.classList.remove('patting'); inst.mood('happy', 1400); }, 2100);
      });
    }
    registry.push(inst);
    return inst;
  }

  function init(root) { A.$$('[data-mecha]', root || document).forEach(build); }
  function main() { for (var i = 0; i < registry.length; i++) if (registry[i].el.hasAttribute('data-main')) return registry[i]; return registry[0]; }

  // Interaksi apa pun di halaman menghitung sebagai "aktivitas" (menunda tidur) dan membangunkan bila tertidur
  ['pointerdown', 'keydown', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, function () { lastInteract = Date.now(); registry.forEach(function (i) { if (i.state.asleep && ev !== 'scroll') i.wake(); }); }, { passive: true, capture: true });
  });

  window.Mecha = {
    init: init,
    main: main,
    mood: function (n, ms) { var m = main(); if (m) m.mood(n, ms); },
    pose: function (n, ms) { var m = main(); if (m) m.pose(n, ms); },
    say: function (t, ms) { var m = main(); if (m) m.say(t, ms); },
    lookAt: function (el) { var m = main(); if (m) m.lookAt(el); },
    peek: function (on) { var m = main(); if (m) m.peek(on); },
    wave: function () { var m = main(); if (m) m.wave(); },
    greeting: greeting,
    /** Reaksi siap pakai untuk hasil jawaban atau analisis. */
    react: function (kind) {
      var map = {
        benar: ['cheer', ['Yeay! Benar sekali!', 'Yay! Spot on!'], 2600], salah: ['sad', ['Aduh, hampir! Yuk baca alasannya.', 'Oops, close! Read the reasons.'], 3200],
        aman: ['happy', ['Kelihatannya cukup aman, tetap verifikasi ya.', 'Looks fairly safe, still verify.'], 3000], sedang: ['worried', ['Hmm, ada yang janggal. Hati-hati.', 'Hmm, something is off. Be careful.'], 3200],
        bahaya: ['alert', ['Awas! Banyak tanda bahaya!', 'Watch out! Many red flags!'], 3400], mikir: ['thinking', ['Sebentar, aku periksa dulu...', 'One sec, let me check...'], 2400],
        bingung: ['confused', ['Hmm, aku kurang paham. Bisa jelaskan lagi?', 'Hmm, I am not sure. Can you explain more?'], 2800],
        bangga: ['proud', ['Kamu makin jago!', 'You are getting good!'], 2600],
        halo: ['wink', null, 2600]
      };
      var r = map[kind]; if (!r) return;
      var m = main(); if (!m) return;
      m.mood(r[0], r[2]); m.say(r[1] ? L(r[1][0], r[1][1]) : greeting(), r[2]);
      if (kind === 'halo') m.wave();
      if (kind === 'benar' && window.Sound) window.Sound.play('cheer');
      if (kind === 'salah' && window.Sound) window.Sound.play('aww');
    }
  };
})();
