/**
 * TrustGuard - mesin aturan (rule-based) dan penyensor data sensitif.
 *
 * File ini dipakai di dua tempat:
 *  1. Browser  : halaman Scanner dan demo di beranda (berjalan lokal, tidak mengirim data).
 *  2. Server   : api/chat.js memakainya untuk analisis awal dan jawaban cadangan.
 *
 * Penting: hasilnya adalah PETUNJUK AWAL yang bisa dijelaskan, bukan vonis.
 * Pesan tanpa tanda bahaya belum tentu aman.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TG = factory();
})(this, function () {
  'use strict';

  /** Membuat regex dari daftar alternatif, dengan batas kata yang aman untuk Safari lama (tanpa lookbehind). */
  function rx(alts) {
    return new RegExp('(?:^|[^a-z0-9])(?:' + alts + ')(?![a-z0-9])', 'i');
  }

  /* ------------------------------------------------------------------ */
  /* 1. Pola tanda bahaya pada isi pesan                                 */
  /* ------------------------------------------------------------------ */
  var PATTERNS = [
    {
      id: 'otp', weight: 5,
      re: rx('otp|kode\\s*verifikasi|kode\\s*keamanan|kode\\s*login|verification\\s*code|security\\s*code|one[- ]time\\s*(?:password|code)'),
      title: { id: 'Meminta OTP atau kode verifikasi', en: 'Asks for an OTP or verification code' },
      explain: {
        id: 'Kode OTP atau verifikasi seharusnya tidak dibagikan kepada siapa pun. Pihak yang memintanya bisa mencoba mengambil alih akunmu.',
        en: 'OTP or verification codes should never be shared with anyone. Whoever asks for one may be trying to take over your account.'
      }
    },
    {
      id: 'secret', weight: 5,
      re: rx('kata\\s*sandi|password|pin(?:\\s*atm)?|passcode|nomor\\s*kartu|card\\s*number|cvv|cvc'),
      title: { id: 'Meminta kata sandi atau data kartu', en: 'Asks for a password or card data' },
      explain: {
        id: 'Permintaan data rahasia lewat pesan atau tautan adalah tanda bahaya. Jangan masukkan kredensial lewat tautan dari pengirim yang belum diverifikasi.',
        en: 'Requests for secret data through a message or link are a red flag. Never enter credentials through a link from an unverified sender.'
      }
    },
    {
      id: 'upfront', weight: 3,
      re: rx('transfer|biaya\\s*(?:administrasi|pendaftaran|aktivasi|pengiriman|pajak)|ongkir|uang\\s*muka|bayar\\s*dulu|deposit|setor(?:an)?\\s*(?:dulu|awal)|processing\\s*fee|admin(?:istration)?\\s*fee|registration\\s*fee|pay\\s*first|upfront|send\\s*money'),
      title: { id: 'Meminta pembayaran di awal', en: 'Asks for payment upfront' },
      explain: {
        id: 'Permintaan uang di awal, terutama untuk pekerjaan, hadiah, atau pencairan, perlu diverifikasi secara independen sebelum kamu membayar.',
        en: 'Requests for money upfront, especially for a job, prize, or payout, must be verified independently before you pay.'
      }
    },
    {
      id: 'urgency', weight: 3,
      re: rx('sekarang\\s*juga|hari\\s*ini\\s*saja|dalam\\s*\\d+\\s*(?:menit|jam)|segera|hangus|kesempatan\\s*terakhir|jangan\\s*sampai\\s*terlambat|akun.{0,25}(?:diblokir|ditutup|dibekukan)|right\\s*now|act\\s*now|last\\s*chance|within\\s*\\d+\\s*(?:minutes|hours)|will\\s*be\\s*(?:blocked|suspended|closed)|expires?\\s*(?:today|soon)'),
      title: { id: 'Tekanan waktu atau ancaman', en: 'Time pressure or threats' },
      explain: {
        id: 'Tekanan agar bertindak cepat membuat orang melewatkan pemeriksaan. Berhenti sejenak dan verifikasi lewat kanal resmi.',
        en: 'Pressure to act fast makes people skip checks. Pause and verify through an official channel.'
      }
    },
    {
      id: 'prize', weight: 3,
      re: rx('memenangkan|kamu\\s*menang|anda\\s*menang|selamat.{0,40}(?:hadiah|pemenang|menang)|hadiah\\s*gratis|giveaway|undian|you\\s*(?:have\\s*)?won|congratulations|free\\s*gift|lucky\\s*winner'),
      title: { id: 'Klaim hadiah atau menang mendadak', en: 'Sudden prize or winner claim' },
      explain: {
        id: 'Hadiah yang tidak kamu ikuti, atau klaim yang meminta biaya dan data pribadi, perlu diperiksa lewat akun atau situs resmi penyelenggara.',
        en: 'A prize you never entered for, or a claim that asks for fees or personal data, must be checked on the organizer\'s official account or site.'
      }
    },
    {
      id: 'job', weight: 3,
      re: rx('gaji\\s*tinggi|kerja\\s*mudah|tanpa\\s*pengalaman|lolos\\s*seleksi|diterima\\s*kerja|lowongan|part[- ]?time|kerja\\s*dari\\s*rumah|high\\s*salary|easy\\s*job|no\\s*experience|work\\s*from\\s*home|you\\s*(?:are|have\\s*been)\\s*hired'),
      title: { id: 'Tawaran kerja yang terlalu mudah atau tidak jelas', en: 'Job offer that is too easy or vague' },
      explain: {
        id: 'Tawaran kerja perlu identitas perusahaan dan proses rekrutmen yang bisa diverifikasi. Waspadai biaya untuk mendapatkan pekerjaan.',
        en: 'A job offer needs a verifiable company and hiring process. Be wary of any fee to get the job.'
      }
    },
    {
      id: 'link', weight: 2,
      re: rx('klik\\s*(?:link|tautan)|buka\\s*(?:link|tautan)|isi\\s*formulir|link\\s*klaim|tautan\\s*berikut|login\\s*di|klik\\s*di\\s*sini|click\\s*(?:the\\s*)?(?:link|here)|open\\s*(?:the\\s*)?link|fill\\s*(?:in|out)\\s*the\\s*form|log\\s*in\\s*at'),
      title: { id: 'Ajakan membuka tautan atau mengisi formulir', en: 'Pushes you to open a link or fill a form' },
      explain: {
        id: 'Jangan membuka tautan secara terburu-buru. Periksa alamat situs sendiri dan hindari memasukkan informasi sensitif pada halaman yang belum terverifikasi.',
        en: 'Do not open links in a hurry. Check the site address yourself and avoid entering sensitive information on unverified pages.'
      }
    },
    {
      id: 'impersonation', weight: 3,
      re: rx('aku\\s*ganti\\s*nomor|ganti\\s*nomor|nomor\\s*baru|mengaku\\s*dari|pihak\\s*bank|admin\\s*resmi|cs\\s*resmi|petugas\\s*bank|customer\\s*service|this\\s*is\\s*your\\s*bank|new\\s*number|changed\\s*my\\s*number|official\\s*admin'),
      title: { id: 'Mengaku sebagai pihak dekat atau resmi', en: 'Claims to be someone close or official' },
      explain: {
        id: 'Identitas pengirim bisa dipalsukan. Hubungi orang atau organisasi lewat nomor atau kanal resmi yang sudah kamu miliki.',
        en: 'Sender identity can be faked. Contact the person or organization through official numbers or channels you already have.'
      }
    },
    {
      id: 'investment', weight: 4,
      re: rx('pasti\\s*untung|profit\\s*tetap|keuntungan\\s*dijamin|untung\\s*\\d+\\s*%|modal\\s*kembali|tanpa\\s*risiko|cuan\\s*harian|guaranteed\\s*(?:profit|returns?)|risk[- ]free|double\\s*your|daily\\s*profit'),
      title: { id: 'Janji keuntungan yang tidak realistis', en: 'Unrealistic profit promise' },
      explain: {
        id: 'Janji untung pasti atau tanpa risiko adalah tanda bahaya. Jangan transfer sebelum memahami produk dan memeriksa izinnya di sumber resmi.',
        en: 'Promises of guaranteed or risk-free profit are a red flag. Do not transfer money before you understand the product and check its license with official sources.'
      }
    },
    {
      id: 'secrecy', weight: 3,
      re: rx('jangan\\s*(?:bilang|beri\\s*tahu|kasih\\s*tahu|hubungi)\\s*(?:siapa-?siapa|keluarga|bank|polisi)|dirahasiakan|rahasiakan|don\'t\\s*tell\\s*anyone|keep\\s*(?:this|it)\\s*(?:secret|private)|do\\s*not\\s*(?:tell|contact)'),
      title: { id: 'Meminta merahasiakan percakapan atau transaksi', en: 'Asks you to keep it secret' },
      explain: {
        id: 'Permintaan merahasiakan situasi atau menghindari verifikasi independen adalah taktik manipulasi yang umum.',
        en: 'Asking you to keep things secret or avoid independent verification is a common manipulation tactic.'
      }
    },
    {
      id: 'threat', weight: 4,
      re: rx('(?:sebar|menyebarkan|viralkan|bocorkan).{0,30}(?:foto|video|data|rahasia)|ancam|akan\\s*(?:saya|aku)\\s*sebar|i\\s*will\\s*(?:leak|share|expose)|expose\\s*your|leak\\s*your'),
      title: { id: 'Ancaman menyebarkan data atau foto', en: 'Threat to leak data or photos' },
      explain: {
        id: 'Ancaman penyebaran foto atau data adalah pemerasan. Jangan bayar, hentikan kontak, simpan bukti, lalu laporkan.',
        en: 'Threats to leak photos or data are blackmail. Do not pay, stop contact, keep evidence, and report it.'
      }
    },
    {
      id: 'apk', weight: 5,
      re: /\.apk(?![a-z0-9])|pasang\s*aplikasi|install\s*(?:aplikasi|apk|app)|unduh\s*aplikasi\s*(?:ini|berikut)|download\s*(?:the\s*)?(?:apk|app)/i,
      title: { id: 'Meminta memasang aplikasi dari luar toko resmi', en: 'Asks you to install an app from outside official stores' },
      explain: {
        id: 'Memasang APK dari pesan adalah modus pencurian data yang umum, misalnya berkedok undangan atau resi paket.',
        en: 'Installing an APK from a message is a common data theft trick, for example disguised as an invitation or parcel receipt.'
      }
    },
    {
      id: 'identity', weight: 3,
      re: /(?:foto|kirim|fotokan).{0,15}(?:ktp|selfie)|selfie\s*(?:dengan|pegang)\s*ktp|send\s*(?:a\s*)?(?:photo\s*of\s*)?(?:your\s*)?(?:id|selfie)/i,
      title: { id: 'Meminta foto KTP atau selfie identitas', en: 'Asks for an ID photo or ID selfie' },
      explain: {
        id: 'Data identitas bisa dipakai membuka pinjaman atau akun atas namamu. Berikan hanya ke pihak yang sudah terverifikasi.',
        en: 'Identity data can be used to open loans or accounts in your name. Share it only with verified parties.'
      }
    },
    {
      id: 'parcel', weight: 3,
      re: /(?:paket|parcel).{0,40}(?:tertahan|ditahan|gagal\s*kirim|bea\s*cukai|resi)|resi\s*(?:paket|pengiriman)|package\s*(?:held|on\s*hold)|customs\s*fee|delivery\s*failed/i,
      title: { id: 'Dalih paket tertahan atau resi', en: 'Parcel on hold or receipt pretext' },
      explain: {
        id: 'Pesan paket tertahan atau biaya bea cukai dari nomor tak dikenal sering dipakai untuk menyebar tautan atau APK berbahaya.',
        en: 'Parcel-on-hold or customs fee messages from unknown numbers are often used to spread harmful links or APKs.'
      }
    },
    {
      id: 'refund', weight: 3,
      re: rx('(?:kelebihan|salah)\\s*transfer|refund|pengembalian\\s*dana|overpaid|wrong\\s*transfer'),
      title: { id: 'Dalih kelebihan transfer atau refund', en: 'Overpayment or refund pretext' },
      explain: {
        id: 'Dalih refund atau salah transfer sering dipakai untuk meminta OTP atau membuatmu membuka tautan palsu. Cek langsung di aplikasi resmi.',
        en: 'Refund or wrong-transfer stories are often used to get an OTP or make you open a fake link. Check directly in the official app.'
      }
    },
    {
      id: 'personal-account', weight: 3,
      re: rx('rekening\\s*pribadi|rek(?:ening)?\\s*(?:atas\\s*nama|a\\.?n\\.?)\\s*[a-z]|transfer\\s*ke\\s*(?:rekening|rek|nomor)|kirim\\s*ke\\s*(?:rekening|rek)\\s*(?:ini|berikut)|personal\\s*account|transfer\\s*to\\s*(?:this|my)\\s*account'),
      title: { id: 'Mengarahkan pembayaran ke rekening pribadi', en: 'Directs payment to a personal account' },
      explain: {
        id: 'Lembaga, perusahaan, dan toko resmi menerima pembayaran lewat kanal resmi atau rekening atas nama perusahaan, bukan rekening perorangan. Cek nomor rekening di cekrekening.id sebelum transfer.',
        en: 'Institutions, companies, and real shops take payment through official channels or company accounts, not an individual\'s account. Check the account at cekrekening.id before transferring.'
      }
    },
    {
      id: 'loan', weight: 3,
      re: rx('pinjaman\\s*(?:cepat|instan|kilat|online|tanpa\\s*(?:jaminan|bi\\s*checking|slip))|cair\\s*(?:dalam\\s*)?\\d+\\s*(?:menit|jam)|limit\\s*(?:pinjaman|kredit)\\s*(?:sampai|hingga|up\\s*to)|dana\\s*(?:cepat|tunai)\\s*cair|instant\\s*loan|loan\\s*approved|no\\s*credit\\s*check'),
      title: { id: 'Tawaran pinjaman cepat tanpa syarat', en: 'Quick loan offer with no requirements' },
      explain: {
        id: 'Pinjaman "cair dalam menit tanpa syarat" yang datang lewat pesan biasanya dari pinjol ilegal dengan bunga dan penagihan yang merugikan. Cek daftar pinjol berizin di OJK sebelum mengisi data apa pun.',
        en: 'Loans that "disburse in minutes with no requirements" and arrive by message usually come from illegal lenders with abusive interest and collection. Check OJK\'s licensed lender list before entering any data.'
      }
    },
    {
      id: 'too-good', weight: 2,
      re: rx('diskon\\s*(?:[89]\\d|100)\\s*%|harga\\s*(?:miring|super\\s*murah|di\\s*bawah\\s*pasar)|cuma\\s*rp\\s*\\d|flash\\s*sale\\s*khusus|stok\\s*terbatas\\s*hari\\s*ini|promo\\s*khusus\\s*kamu|(?:[89]\\d|100)\\s*%\\s*off|only\\s*for\\s*you|limited\\s*stock\\s*today'),
      title: { id: 'Tawaran yang terlalu bagus untuk jadi nyata', en: 'Offer that is too good to be true' },
      explain: {
        id: 'Harga jauh di bawah pasar dan promo "khusus kamu" dipakai untuk mematikan kewaspadaan. Bandingkan dengan toko resmi dan bayar hanya lewat kanal resmi marketplace.',
        en: 'Prices far below market and "just for you" promos are used to lower your guard. Compare with official shops and pay only through the marketplace\'s official channel.'
      }
    },
    {
      id: 'fake-cs', weight: 3,
      re: rx('hubungi\\s*(?:admin|cs|customer\\s*service)\\s*(?:kami\\s*)?(?:di|via|lewat)\\s*(?:wa|whatsapp|dm|telegram|nomor)|dm\\s*(?:kami|admin)|chat\\s*admin\\s*(?:di|via)\\s*(?:wa|whatsapp|telegram)|layanan\\s*(?:bantuan|pengaduan)\\s*(?:resmi\\s*)?via\\s*(?:wa|whatsapp|telegram)|contact\\s*(?:our\\s*)?(?:admin|support)\\s*(?:on|via)\\s*(?:whatsapp|telegram|dm)'),
      title: { id: 'Layanan pelanggan lewat WhatsApp atau DM pribadi', en: 'Customer service via personal WhatsApp or DM' },
      explain: {
        id: 'Akun layanan pelanggan palsu menjaring korban lewat kolom komentar, DM, dan nomor WhatsApp pribadi. Hubungi hanya kanal resmi yang tertera di situs atau aplikasi resminya.',
        en: 'Fake customer service accounts hunt victims through comments, DMs, and personal WhatsApp numbers. Contact only the official channels listed on the official site or app.'
      }
    }
  ];

  /* ------------------------------------------------------------------ */
  /* 2. Pemeriksaan tautan                                               */
  /* ------------------------------------------------------------------ */
  var SHORTENERS = ['bit.ly', 'tinyurl.com', 's.id', 't.co', 'cutt.ly', 'rb.gy', 'is.gd', 'shorturl.at'];
  var RISKY_TLD = /\.(xyz|top|click|icu|vip|cfd|sbs|rest|buzz|monster|cyou|lol|gq|tk|ml)$/;
  /** Merek yang sering ditiru beserta domain resminya (untuk mendeteksi domain tiruan). */
  var BRANDS = {
    bca: ['bca.co.id'], klikbca: ['klikbca.com'], bri: ['bri.co.id'], mandiri: ['bankmandiri.co.id'], bni: ['bni.co.id'],
    gopay: ['gopay.co.id', 'gojek.com'], dana: ['dana.id'], ovo: ['ovo.id'], shopee: ['shopee.co.id', 'shopee.com'],
    tokopedia: ['tokopedia.com'], tiktok: ['tiktok.com'], instagram: ['instagram.com'], whatsapp: ['whatsapp.com'],
    jne: ['jne.co.id'], bpjs: ['bpjs-kesehatan.go.id', 'bpjsketenagakerjaan.go.id'], ojk: ['ojk.go.id'], pospay: ['posindonesia.co.id']
  };

  /** Mengambil domain induk, memperhitungkan akhiran seperti .co.id. */
  function registrable(host) {
    var parts = host.split('.');
    var take = /(co|go|or|ac|web|my|sch)\.id$/.test(host) ? 3 : 2;
    return parts.slice(-take).join('.');
  }

  /** Menemukan tautan di dalam teks (maksimal 5). */
  function findUrls(text) {
    var re = /(?:https?:\/\/|www\.)[^\s<>"')]+|(?:^|[\s(])((?:[a-z0-9-]+\.)+(?:com|id|net|org|xyz|top|click|link|info|site|online|shop|vip|icu|cc|me|ly|is|gl|co)(?:\/[^\s]*)?)(?=[\s,.)]|$)/gi;
    var out = [];
    var m;
    while ((m = re.exec(text)) && out.length < 5) out.push((m[1] || m[0]).trim());
    return out;
  }

  /** Memeriksa satu tautan dan mengembalikan daftar sinyal. */
  function urlSignals(url) {
    var out = [];
    var host;
    try { host = new URL(/^https?:/i.test(url) ? url : 'http://' + url).hostname.toLowerCase(); } catch (e) { return out; }
    var reg = registrable(host);
    function add(id, weight, tid, ten, eid, een) {
      out.push({ id: id, weight: weight, host: host, title: { id: tid + ' (' + host + ')', en: ten + ' (' + host + ')' }, explain: { id: eid, en: een } });
    }
    if (SHORTENERS.indexOf(reg) >= 0) add('u-short', 2, 'Tautan dipendekkan', 'Shortened link', 'Tautan pendek menyembunyikan tujuan sebenarnya. Minta tautan aslinya atau pratinjau tujuannya lebih dulu.', 'Short links hide the real destination. Ask for the original link or preview the destination first.');
    if (/^\d+(\.\d+){3}$/.test(host)) add('u-ip', 4, 'Alamat berupa angka IP', 'Address is a raw IP number', 'Situs resmi hampir selalu memakai nama domain, bukan angka IP.', 'Official sites almost always use a domain name, not an IP number.');
    if (host.indexOf('xn--') >= 0) add('u-puny', 4, 'Domain memakai karakter penyerupa', 'Domain uses look-alike characters', 'Huruf tertentu bisa meniru huruf lain agar tampak seperti situs asli.', 'Some characters can imitate others so the site looks genuine.');
    if (RISKY_TLD.test(host)) add('u-tld', 2, 'Domain berakhiran yang sering disalahgunakan', 'Domain ending often abused', 'Ekstensi murah seperti .xyz atau .top sering dipakai situs sekali pakai. Ini bukan bukti, tetapi perlu waspada.', 'Cheap endings like .xyz or .top are often used by throwaway sites. Not proof, but be careful.');
    var tokens = host.split(/[.-]/);
    for (var brand in BRANDS) {
      if (tokens.indexOf(brand) >= 0 && BRANDS[brand].indexOf(reg) < 0) {
        add('u-brand', 5, 'Nama domain meniru merek ' + brand.toUpperCase(), 'Domain imitates the ' + brand.toUpperCase() + ' brand',
          'Domain memuat nama merek tetapi bukan domain resmi yang kami kenal (' + BRANDS[brand][0] + '). Ketik sendiri alamat resminya.',
          'The domain contains a brand name but is not the official domain we know (' + BRANDS[brand][0] + '). Type the official address yourself.');
        break;
      }
    }
    if (/\.apk(\?|$)/i.test(url)) add('u-apk', 5, 'Tautan berkas APK', 'APK file link', 'Memasang APK dari luar toko resmi adalah modus umum pencurian data.', 'Installing an APK from outside official stores is a common data theft trick.');
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 3. Analisis utama                                                   */
  /* ------------------------------------------------------------------ */
  /** Skor 0 sampai 100 menjadi tingkat: high, medium, low. */
  function levelOf(score) { return score >= 56 ? 'high' : score >= 25 ? 'medium' : 'low'; }

  /** Menganalisis teks. Mengembalikan { found, score, level, urls }. */
  function analyze(text) {
    text = String(text || '');
    var found = PATTERNS.filter(function (p) { return p.re.test(text); })
      .map(function (p) { return { id: p.id, weight: p.weight, title: p.title, explain: p.explain }; });
    var urls = findUrls(text);
    urls.forEach(function (u) { urlSignals(u).forEach(function (s) { found.push(s); }); });
    var total = found.reduce(function (sum, x) { return sum + x.weight; }, 0);
    var score = Math.min(100, total * 8);
    return { found: found, score: score, level: levelOf(score), urls: urls };
  }

  /* ------------------------------------------------------------------ */
  /* 4. Penyensor data sensitif                                          */
  /* ------------------------------------------------------------------ */
  /** Urutan penting: pola yang lebih spesifik dijalankan lebih dulu. */
  var REDACTORS = [
    { kind: 'otp', re: /\b(otp|kode(?:\s+(?:verifikasi|otp|keamanan|login))?|verification\s*code|code|pin)((?:\s+[a-z]{1,10}){0,3}\s*[:=]?\s*)\d{4,8}\b/gi, to: '$1$2[kode]' },
    { kind: 'password', re: /\b(password|kata\s*sandi|sandi|passcode)(\s*(?:adalah|is|:|=)\s*)\S+/gi, to: '$1$2[disamarkan]' },
    { kind: 'card', re: /\b\d{4}(?:[ -]\d{4}){2,3}\b/g, to: '[nomor kartu]' },
    { kind: 'id-number', re: /\b\d{16}\b/g, to: '[nomor KTP atau kartu]' },
    { kind: 'phone', re: /(?:\+?62|\b0)8\d[\d\s-]{7,12}\d/g, to: '[nomor telepon]' },
    { kind: 'email', re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, to: '[email]' },
    { kind: 'long-number', re: /\b\d{10,15}\b/g, to: '[nomor panjang]' }
  ];

  /** Menyamarkan data sensitif. Mengembalikan { text, count, kinds }. */
  function redact(text) {
    var out = String(text || '');
    var count = 0;
    var kinds = [];
    REDACTORS.forEach(function (r) {
      out = out.replace(r.re, function () {
        count++;
        if (kinds.indexOf(r.kind) < 0) kinds.push(r.kind);
        // Susun ulang hasil sesuai pola pengganti ($1, $2 untuk grup yang ditangkap)
        var args = arguments;
        return r.to.replace(/\$(\d)/g, function (_, n) { return args[Number(n)] || ''; });
      });
    });
    return { text: out, count: count, kinds: kinds };
  }

  return { patterns: PATTERNS, analyze: analyze, redact: redact, levelOf: levelOf, findUrls: findUrls };
});
