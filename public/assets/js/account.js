/**
 * account.js : klien akun di browser (login, daftar, keluar, progres latihan).
 *
 * Prinsip:
 *  - Akun bersifat OPSIONAL. Tanpa akun semua fitur tetap jalan, hanya progres latihan yang tidak disimpan.
 *  - Sesi memakai cookie httpOnly yang dipasang server; JavaScript tidak pernah menyentuh token.
 *  - Status pengguna disimpan sebentar di sessionStorage (tg-me) supaya header langsung tampil tanpa menunggu jaringan.
 *  - Progres tamu disimpan di sessionStorage (hilang saat tab ditutup) dan ditawarkan untuk digabung saat masuk akun.
 */
(function () {
  'use strict';
  var A = window.TGApp, L = A.L;
  var me = null, enabled = null, listeners = [], ready = null;

  function cached() { try { var v = sessionStorage.getItem('tg-me'); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function remember(user, on) {
    me = user || null; enabled = on;
    try { sessionStorage.setItem('tg-me', JSON.stringify({ user: me, enabled: on })); } catch (e) { /* diabaikan */ }
    listeners.forEach(function (fn) { try { fn(me, on); } catch (e) { console.error(e); } });
  }

  /** Permintaan JSON ke API dengan penanganan error yang seragam. Mengembalikan { ok, status, j }. */
  function call(method, url, body) {
    return fetch(url, { method: method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = JSON.parse(t); } catch (e) { /* bukan JSON */ } return { ok: r.ok, status: r.status, j: j || {} }; }); })
      .catch(function () { return { ok: false, status: 0, j: { error: L('Koneksi bermasalah. Periksa internetmu lalu coba lagi.', 'Connection problem. Check your internet and try again.') } }; });
  }

  /** Memuat status login dari server (sekali per halaman). */
  function refresh() {
    ready = call('GET', '/api/auth').then(function (r) {
      if (r.status === 0) { var c = cached(); remember(c ? c.user : null, c ? c.enabled : false); return me; }
      remember(r.j.user || null, r.j.enabled !== false);
      return me;
    });
    return ready;
  }

  /* ---------- Progres tamu (sessionStorage) ---------- */
  var guest = {
    get: function () { try { return JSON.parse(sessionStorage.getItem('tg-guest-progress')) || {}; } catch (e) { return {}; } },
    set: function (p) { try { sessionStorage.setItem('tg-guest-progress', JSON.stringify(p || {})); } catch (e) { /* diabaikan */ } },
    clear: function () { try { sessionStorage.removeItem('tg-guest-progress'); } catch (e) { /* diabaikan */ } }
  };

  /** Menggabungkan dua progres: per chapter ambil yang bintangnya lebih tinggi (sama seperti aturan server). */
  function merge(a, b) {
    var out = {}, stars = window.TGLevel ? window.TGLevel.starsOf : function (p) { return p.ok ? (p.tries === 1 ? 3 : 2) : 1; };
    [a || {}, b || {}].forEach(function (src) {
      Object.keys(src).forEach(function (k) {
        var p = src[k]; if (!p) return;
        var cur = out[k];
        if (!cur || stars(p) > stars(cur) || (stars(p) === stars(cur) && p.tries < cur.tries)) out[k] = { ok: !!p.ok, tries: Math.max(1, +p.tries || 1) };
      });
    });
    return out;
  }

  var saveTimer = 0, pendingProgress = null;
  /** Menyimpan progres ke akun (ditunda sebentar agar tidak membanjiri server). */
  function saveProgress(progress) {
    if (!me) return Promise.resolve(null);
    pendingProgress = progress;
    clearTimeout(saveTimer);
    return new Promise(function (resolve) {
      saveTimer = setTimeout(function () {
        var p = pendingProgress; pendingProgress = null;
        call('PUT', '/api/progress', { progress: p, lang: A.lang() }).then(function (r) {
          if (r.ok && r.j.progress) { me.progress = r.j.progress; remember(me, enabled); }
          resolve(r.ok ? r.j.progress : null);
        });
      }, 400);
    });
  }
  // Simpan segera bila tab ditutup saat masih ada antrean
  window.addEventListener('pagehide', function () {
    if (me && pendingProgress && navigator.sendBeacon) {
      // sendBeacon hanya mengirim POST; server menerima POST sebagai padanan PUT
      try { navigator.sendBeacon('/api/progress', new Blob([JSON.stringify({ progress: pendingProgress })], { type: 'application/json' })); } catch (e) { /* diabaikan */ }
    }
  });

  window.TGAccount = {
    /** Pengguna saat ini (null bila tamu). Sebelum refresh selesai, memakai cache sessionStorage. */
    user: function () { if (me) return me; var c = cached(); return c ? c.user : null; },
    enabled: function () { if (enabled !== null) return enabled; var c = cached(); return c ? c.enabled !== false : true; },
    ready: function () { return ready || refresh(); },
    refresh: refresh,
    onChange: function (fn) { listeners.push(fn); },
    signup: function (data) { return call('POST', '/api/auth', Object.assign({ action: 'signup', lang: A.lang() }, data)).then(function (r) { if (r.ok) remember(r.j.user, true); return r; }); },
    login: function (data) { return call('POST', '/api/auth', Object.assign({ action: 'login', lang: A.lang() }, data)).then(function (r) { if (r.ok) remember(r.j.user, true); return r; }); },
    logout: function () { return call('POST', '/api/auth', { action: 'logout' }).then(function (r) { remember(null, enabled); return r; }); },
    remove: function (password) { return call('POST', '/api/auth', { action: 'delete', password: password, lang: A.lang() }).then(function (r) { if (r.ok) remember(null, enabled); return r; }); },
    guest: guest,
    merge: merge,
    saveProgress: saveProgress,
    /** Progres efektif: milik akun bila masuk, selain itu milik tamu. */
    progress: function () { var u = window.TGAccount.user(); return u ? (u.progress || {}) : guest.get(); }
  };
  refresh();
})();
