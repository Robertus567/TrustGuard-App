/**
 * boot.js : dijalankan paling awal di <head>.
 * Menandai bahwa JS aktif, mendeteksi browser dalam aplikasi (Instagram, Facebook, TikTok, dll),
 * memasang bahasa tersimpan, dan menghitung tinggi layar yang akurat untuk browser seluler.
 */
(function () {
  var d = document.documentElement;
  d.className += ' js';
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|musical_ly|Snapchat|Twitter|MicroMessenger/i.test(navigator.userAgent)) d.className += ' inapp';
  try { var l = localStorage.getItem('tg-lang'); if (l === 'en' || l === 'id') d.lang = l; } catch (e) { /* penyimpanan diblokir, abaikan */ }
  function setH() { d.style.setProperty('--app-h', (window.innerHeight || 700) + 'px'); }
  setH();
  window.addEventListener('resize', setH);
  window.addEventListener('orientationchange', function () { setTimeout(setH, 250); });
})();
