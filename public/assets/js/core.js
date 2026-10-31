/**
 * core.js : fondasi bersama (penyimpanan aman, bahasa ID/EN, helper).
 * Semua halaman memuat file ini. Tidak ada data yang dikirim ke mana pun.
 */
(function () {
  'use strict';

  /* ---------- Penyimpanan lokal yang aman (cadangan ke memori jika diblokir) ---------- */
  var mem = {};
  var Store = {
    get: function (k) { try { var v = localStorage.getItem(k); return v === null ? (mem[k] === undefined ? null : mem[k]) : v; } catch (e) { return mem[k] === undefined ? null : mem[k]; } },
    set: function (k, v) { mem[k] = String(v); try { localStorage.setItem(k, v); } catch (e) { /* diabaikan */ } },
    del: function (k) { delete mem[k]; try { localStorage.removeItem(k); } catch (e) { /* diabaikan */ } },
    json: function (k, fallback) { try { return JSON.parse(Store.get(k)) || fallback; } catch (e) { return fallback; } },
    /** Menghapus semua data TrustGuard di perangkat ini. */
    clearAll: function () {
      mem = {};
      try { Object.keys(localStorage).filter(function (k) { return k.indexOf('tg-') === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { /* diabaikan */ }
      try { sessionStorage.clear(); } catch (e) { /* diabaikan */ }
    }
  };
  var Sess = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return mem['s:' + k] || null; } },
    set: function (k, v) { mem['s:' + k] = v; try { sessionStorage.setItem(k, v); } catch (e) { /* diabaikan */ } }
  };

  /* ---------- Helper DOM ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** Markdown ringan (tebal dan daftar) yang aman: teks di-escape dulu. */
  function md(text) {
    var html = esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    var out = [], list = false;
    html.split('\n').forEach(function (line) {
      var m = line.match(/^\s*[-*]\s+(.*)$/);
      if (m) { if (!list) { out.push('<ul>'); list = true; } out.push('<li>' + m[1] + '</li>'); }
      else { if (list) { out.push('</ul>'); list = false; } if (line.trim()) out.push('<p>' + line + '</p>'); }
    });
    if (list) out.push('</ul>');
    return out.join('');
  }

  /* ---------- Bahasa ---------- */
  var lang = document.documentElement.lang === 'en' ? 'en' : 'id';
  var listeners = [];
  /** Memilih teks sesuai bahasa aktif: L('Indonesia', 'English'). */
  function L(id, en) { return lang === 'en' ? en : id; }
  /** Menerjemahkan semua elemen bertanda data-en* di dalam root. Teks asli (Indonesia) disimpan di data-id*. */
  function apply(root) {
    var en = lang === 'en';
    function swap(sel, attr, set) {
      $$(sel, root).forEach(function (el) {
        var store = 'tgOrig' + attr;
        if (el.dataset[store] === undefined) el.dataset[store] = set.get(el);
        set.put(el, en ? el.getAttribute('data-en' + (attr === 'text' ? '' : '-' + attr)) : el.dataset[store]);
      });
    }
    swap('[data-en]', 'text', { get: function (e) { return e.textContent; }, put: function (e, v) { e.textContent = v; } });
    swap('[data-en-html]', 'html', { get: function (e) { return e.innerHTML; }, put: function (e, v) { e.innerHTML = v; } });
    ['ph:placeholder', 'aria:aria-label', 'title:title', 'alt:alt'].forEach(function (p) {
      var a = p.split(':');
      swap('[data-en-' + a[0] + ']', a[0], { get: function (e) { return e.getAttribute(a[1]) || ''; }, put: function (e, v) { e.setAttribute(a[1], v); } });
    });
  }
  function setLang(next, silent) {
    lang = next === 'en' ? 'en' : 'id';
    document.documentElement.lang = lang;
    Store.set('tg-lang', lang);
    apply(document);
    if (!silent) listeners.forEach(function (fn) { try { fn(lang); } catch (e) { console.error(e); } });
  }
  function onLang(fn) { listeners.push(fn); }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    void t.offsetWidth;
    t.className = 'toast show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2600);
  }

  /** Menyalin teks ke papan klip (dengan cadangan untuk browser lama). */
  function copy(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { /* diabaikan */ }
      document.body.removeChild(ta); return ok;
    }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    return Promise.resolve(fallback());
  }

  window.TGApp = { Store: Store, Sess: Sess, $: $, $$: $$, esc: esc, md: md, L: L, lang: function () { return lang; }, setLang: setLang, onLang: onLang, apply: apply, toast: toast, copy: copy };
})();
