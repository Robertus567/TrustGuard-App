/**
 * fx.js : efek visual bersama: ripple tombol, sorotan kursor pada kartu, kemiringan 3D,
 * animasi muncul saat scroll, dan konfeti.
 */
(function () {
  'use strict';
  var $$ = window.TGApp.$$;
  var coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches;

  /* Ripple pada tombol dan chip */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.btn,.chip');
    if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, sp = document.createElement('span');
    sp.className = 'rip';
    sp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(sp);
    setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 750);
  });

  /* Sorotan kursor (.spot) dan kemiringan 3D (.tilt), hanya untuk perangkat dengan mouse */
  var raf = 0;
  if (!coarse) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest && e.target.closest('.spot,.tilt');
      if (!el || raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
        if (el.classList.contains('tilt')) el.style.transform = 'perspective(900px) rotateX(' + ((y / r.height - .5) * -7).toFixed(2) + 'deg) rotateY(' + ((x / r.width - .5) * 9).toFixed(2) + 'deg) translateY(-4px)';
      });
    });
    document.addEventListener('pointerout', function (e) {
      var el = e.target.closest && e.target.closest('.tilt');
      if (el && !el.contains(e.relatedTarget)) el.style.transform = '';
    });
  }

  /* Muncul saat scroll */
  function reveal(root) {
    var items = $$('.rv:not(.vis)', root);
    if (!('IntersectionObserver' in window)) { items.forEach(function (i) { i.classList.add('vis'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('vis'); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (i) { io.observe(i); });
    // Pengaman: apa pun yang terjadi, semua konten terlihat setelah 3 detik
    setTimeout(function () { items.forEach(function (i) { i.classList.add('vis'); }); }, 3000);
  }

  /* Konfeti */
  var canvas, c2, parts = [], running = false;
  var COLORS = ['#5eead4', '#8b9cff', '#f3d9a4', '#ff9bb3', '#ffffff', '#4ade80'];
  function loop() {
    c2.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(function (p) { return p.life > 0 && p.y < canvas.height + 40; });
    parts.forEach(function (p) {
      p.vy += .22; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      c2.save(); c2.globalAlpha = Math.min(1, p.life / 30); c2.translate(p.x, p.y); c2.rotate(p.rot); c2.fillStyle = p.c;
      if (p.shape === 0) c2.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6);
      else if (p.shape === 1) { c2.beginPath(); c2.arc(0, 0, p.s / 2.4, 0, 6.3); c2.fill(); }
      else { c2.beginPath(); for (var i = 0; i < 5; i++) { c2.lineTo(Math.cos(i * 1.2566 - 1.57) * p.s / 1.6, Math.sin(i * 1.2566 - 1.57) * p.s / 1.6); c2.lineTo(Math.cos(i * 1.2566 - .94) * p.s / 3.6, Math.sin(i * 1.2566 - .94) * p.s / 3.6); } c2.closePath(); c2.fill(); }
      c2.restore();
    });
    if (parts.length) requestAnimationFrame(loop); else { running = false; c2.clearRect(0, 0, canvas.width, canvas.height); }
  }
  function confetti(x, y, n) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    if (!canvas) {
      canvas = document.createElement('canvas'); canvas.className = 'fx-canvas'; canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas); c2 = canvas.getContext('2d');
    }
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    n = n || 90;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, s: 6 + Math.random() * 9, c: COLORS[i % COLORS.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 90 + Math.random() * 60, shape: i % 3 });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  /** Kilatan layar hijau (benar) atau merah (salah). */
  function flash(kind) {
    var f = document.createElement('div'); f.className = 'flash ' + kind; document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
  }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  window.FX = { confetti: confetti, flash: flash, shake: shake, reveal: reveal };
})();
