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
      re: rx('otp|kode\\s*verifikasi|kode\\s*keamanan|kode\\s*login|verification\\s*code|security\\s*code|one[- ]time\\s*(?:password|code)|\\d\\s*digit\\s*kode|kode\\s*\\d+\\s*digit|kode(?:nya)?\\s*(?:wa|whatsapp|sms|telegram|akun|login)|kode\\s*(?:yang\\s*)?(?:salah\\s*(?:kirim|terkirim)|nyasar|dikirim|terkirim|kami\\s*kirim|dikirimkan)|kode\\s*yang\\s*masuk|(?:kirim|berikan|sebutkan|infokan|bagikan|balas)(?:kan)?\\s*(?:kembali\\s*|ulang\\s*|ke\\s*(?:saya|aku|kami)\\s*)?(?:\\d+\\s*digit\\s*)?kode(?:nya)?(?!\\s*(?:promo|voucher|diskon|referral|undangan|booking|pesanan|pembayaran|bayar|qr|barcode|pos|etiket))|(?:send|share|forward|give|read\\s*out)\\s*(?:me\\s*)?(?:the\\s*)?(?:\\d+[- ]digit\\s*)?code'),
      title: { id: 'Meminta OTP atau kode verifikasi', en: 'Asks for an OTP or verification code' },
      explain: {
        id: 'Kode OTP atau verifikasi seharusnya tidak dibagikan kepada siapa pun. Pihak yang memintanya bisa mencoba mengambil alih akunmu.',
        en: 'OTP or verification codes should never be shared with anyone. Whoever asks for one may be trying to take over your account.'
      }
    },
    {
      id: 'secret', weight: 5,
      re: rx('kata\\s*sandi|password|pin(?:\\s*atm)?(?!\\s*(?:lokasi|location|maps|peta))|passcode|nomor\\s*kartu|card\\s*number|card\\s*details|detail\\s*kartu|data\\s*kartu|cvv|cvc|seed\\s*phrase|recovery\\s*phrase|frasa\\s*(?:pemulihan|sandi|rahasia)|private\\s*key|kunci\\s*privat|\\d+\\s*kata\\s*(?:pemulihan|rahasia|sandi)'),
      title: { id: 'Meminta kata sandi atau data kartu', en: 'Asks for a password or card data' },
      explain: {
        id: 'Permintaan data rahasia lewat pesan atau tautan adalah tanda bahaya. Jangan masukkan kredensial lewat tautan dari pengirim yang belum diverifikasi.',
        en: 'Requests for secret data through a message or link are a red flag. Never enter credentials through a link from an unverified sender.'
      }
    },
    {
      id: 'upfront', weight: 3,
      re: rx('transfer|biaya\\s*(?:administrasi|pendaftaran|aktivasi|pengiriman|pajak)|ongkir|uang\\s*muka|bayar\\s*dulu|deposit|setor(?:an)?\\s*(?:dulu|awal)|kirim(?:kan)?\\s*uang|(?:beli|belikan|isikan|kirim)(?:kan)?\\s*(?:aku\\s*)?pulsa|voucher\\s*(?:google\\s*play|steam)|biaya\\s*(?:visa|paspor|medical|keberangkatan|pelatihan|seragam)|processing\\s*fee|admin(?:istration)?\\s*fee|registration\\s*fee|pay\\s*first|upfront|send\\s*money|bayar\\s*denda|denda\\s*rp|uang\\s*tebusan|tebusan|siapkan\\s*uang|biaya\\s*(?:asuransi|provisi|pencairan|verifikasi|materai|notaris|jaminan)|(?:bayar|transfer|setor)\\s*(?:rp\\s*)?[\\d.,]+\\s*(?:ribu|rb|juta|jt)?[^\\n]{0,15}(?:seragam|pelatihan|registrasi|pendaftaran|administrasi|medical|visa|asuransi)|dp\\s*dulu|top\\s*up\\s*(?:pulsa|dulu)|pulsa\\s*dulu|pay\\s*\\$?\\d+[^\\n]{0,20}?(?:shipping|fee|tax|handling)|(?:shipping|handling|processing|customs)\\s*fee'),
      title: { id: 'Meminta pembayaran di awal', en: 'Asks for payment upfront' },
      explain: {
        id: 'Permintaan uang di awal, terutama untuk pekerjaan, hadiah, atau pencairan, perlu diverifikasi secara independen sebelum kamu membayar.',
        en: 'Requests for money upfront, especially for a job, prize, or payout, must be verified independently before you pay.'
      }
    },
    {
      id: 'urgency', weight: 3,
      re: rx('sekarang\\s*juga|hari\\s*ini\\s*saja|dalam\\s*\\d+\\s*(?:menit|jam)|segera|hangus|kesempatan\\s*terakhir|jangan\\s*sampai\\s*terlambat|akun.{0,50}(?:diblokir|ditutup|dibekukan)|akan\\s*(?:dibekukan|diblokir|ditutup|dinonaktifkan)|sebelum\\s*(?:diproses|dilaporkan|ditindak)|urgent|mendesak|slot\\s*(?:terbatas|tinggal)|kuota\\s*(?:terbatas|tinggal)|tinggal\\s*\\d+\\s*(?:slot|kursi|orang)|right\\s*now|act\\s*now|last\\s*chance|within\\s*\\d+\\s*(?:minutes|hours)|will\\s*be\\s*(?:blocked|suspended|closed)|expires?\\s*(?:today|soon)|(?:bayar|transfer|hubungi|konfirmasi|verifikasi|klik|kirim|segera|daftar|join|gabung|tukarkan|cairkan|update|ajukan)\\s*(?:\\w+\\s+){0,3}?sekarang|sekarang\\s*(?:juga|atau|sebelum)|hari\\s*ini\\s*juga|(?:akun|nomor|kartu|whatsapp|ktp|e-?ktp|rekening|paspor)[^\\n]{0,40}(?:akan\\s*)?(?:hangus|diblokir|dinonaktifkan|dibekukan|dihapus|dicabut|ditutup|dimatikan)|batas\\s*waktu|tenggat|atau\\s*(?:\\w+\\s+){0,2}?(?:akan\\s*)?(?:dikembalikan|diretur|dihentikan|diblokir|dibatalkan|hangus|dibekukan|dicabut)'),
      title: { id: 'Tekanan waktu atau ancaman', en: 'Time pressure or threats' },
      explain: {
        id: 'Tekanan agar bertindak cepat membuat orang melewatkan pemeriksaan. Berhenti sejenak dan verifikasi lewat kanal resmi.',
        en: 'Pressure to act fast makes people skip checks. Pause and verify through an official channel.'
      }
    },
    {
      id: 'prize', weight: 3,
      re: rx('memenangkan|kamu\\s*menang|anda\\s*menang|selamat.{0,40}(?:hadiah|pemenang|menang)|hadiah\\s*gratis|giveaway|undian|you\\s*(?:have\\s*)?won|congratulations|free\\s*gift|lucky\\s*winner|poin\\s*(?:reward|rewards)?[^\\n]{0,40}(?:hangus|kedaluwarsa|expired|senilai)|tukar(?:kan)?\\s*poin|cairkan\\s*(?:poin|hadiah|dana|saldo)|pencairan\\s*(?:hadiah|dana|poin)|terpilih(?:\\s*\\w+){0,4}?\\s*(?:hadiah|mendapat|menerima|pemenang)|hubungi\\s*panitia|nomor\\s*anda\\s*terpilih|airdrop|centang\\s*biru\\s*gratis|pemenang\\s*undian|anda\\s*(?:adalah\\s*)?pemenang|voucher\\s*(?:belanja|gratis)|isi\\s*survei|survei\\s*(?:singkat|berhadiah)|hadiah\\s*(?:langsung|instan)|klaim\\s*saldo|saldo\\s*gratis|you\\s*(?:have\\s*been|were|are)\\s*selected|won\\s*an?\\s*(?:iphone|car|prize)'),
      title: { id: 'Klaim hadiah atau menang mendadak', en: 'Sudden prize or winner claim' },
      explain: {
        id: 'Hadiah yang tidak kamu ikuti, atau klaim yang meminta biaya dan data pribadi, perlu diperiksa lewat akun atau situs resmi penyelenggara.',
        en: 'A prize you never entered for, or a claim that asks for fees or personal data, must be checked on the organizer\'s official account or site.'
      }
    },
    {
      id: 'job', weight: 3,
      re: rx('gaji\\s*tinggi|kerja\\s*mudah|tanpa\\s*pengalaman|lolos\\s*seleksi|diterima\\s*kerja|lowongan|part[- ]?time|kerja\\s*dari\\s*rumah|paruh\\s*waktu|kerja\\s*(?:sampingan|sambilan)|high\\s*salary|easy\\s*job|no\\s*experience|work\\s*from\\s*home|you\\s*(?:are|have\\s*been)\\s*hired|kerja\\s*di\\s*luar\\s*negeri|gaji\\s*(?:rp\\s*)?\\d[\\d.,]*\\s*(?:juta|jt)|rekrut(?:mentasi|\\s*karyawan|\\s*pegawai)?\\s*(?:tanpa\\s*tes|massal)|tanpa\\s*tes|jalur\\s*(?:khusus|dalam|belakang)|bantu\\s*lolos|bisa\\s*(?:bantu\\s*)?(?:diurus|lolos)|cpns|admin\\s*online\\s*shop|kerja\\s*santai|tugas\\s*online|kerja\\s*(?:online|via\\s*hp|pakai\\s*hp)|modal\\s*hp|penghasilan\\s*tambahan|work\\s*from\\s*home[^\\n]{0,60}?(?:earn|\\$\\d+)|earn\\s*\\$?\\d+'),
      title: { id: 'Tawaran kerja yang terlalu mudah atau tidak jelas', en: 'Job offer that is too easy or vague' },
      explain: {
        id: 'Tawaran kerja perlu identitas perusahaan dan proses rekrutmen yang bisa diverifikasi. Waspadai biaya untuk mendapatkan pekerjaan.',
        en: 'A job offer needs a verifiable company and hiring process. Be wary of any fee to get the job.'
      }
    },
    {
      id: 'task-scam', weight: 4,
      re: rx('(?:menyukai|me-?like|like|subscribe|follow|klik\\s*iklan)\\s*(?:video|postingan|konten|channel|akun|iklan|produk|toko)(?=[\\s\\S]{0,120}(?:gaji|bayaran|komisi|penghasilan|upah|dibayar|per\\s*(?:hari|tugas|video)))|(?:gaji|bayaran|komisi|penghasilan|upah)\\s*(?:rp|\\d)[\\s\\S]{0,100}?(?:menyukai|like|subscribe|follow)\\s*(?:video|postingan|konten|channel|akun)|tugas\\s*(?:like|menyukai|subscribe)|komisi\\s*per\\s*tugas|komisi[^\\n]{0,25}?per\\s*tugas|[\\d.]+\\s*(?:ribu|rb)?\\s*per\\s*tugas|deposit\\s*modal|setor\\s*modal|tugas\\s*lanjutan|paid\\s*to\\s*(?:like|rate|watch|click)|get\\s*paid\\s*(?:for|to)\\s*(?:liking|rating|watching|clicking)|\\d+\\s*klik\\s*rp|tugas\\s*(?:ke-?\\d+|berikutnya|selanjutnya)[^\\n]{0,30}?(?:deposit|setor|top\\s*up|bayar)|kerjakan\\s*\\d+\\s*tugas|rating\\s*produk[^\\n]{0,60}?(?:dapat|komisi|bayaran)|dikembalikan\\s*(?:beserta|plus|dan)\\s*komisi|(?:earn|make)\\s*(?:up\\s*to\\s*)?\\$?\\d+[^\\n]{0,30}?(?:per|a|/)\\s*day|liking\\s*(?:posts|videos)|(?:like|rate|click)\\s*(?:posts|videos|ads|products)[^\\n]{0,30}?(?:earn|paid|per\\s*day)|(?:earn|make)\\s*\\$?\\d+[^\\n]{0,30}?daily|rating\\s*products?'),
      title: { id: 'Tugas like atau klik berbayar', en: 'Paid like or click tasks' },
      explain: {
        id: 'Pekerjaan menyukai video atau mengklik iklan dengan bayaran besar adalah modus tugas palsu: awalnya dibayar kecil agar percaya, lalu korban diminta setor modal dan uangnya hilang.',
        en: 'Jobs that pay well just to like videos or click ads are a fake-task scam: you get a small payout first to build trust, then you are asked to deposit money and lose it.'
      }
    },
    {
      id: 'authority', weight: 4,
      re: rx('(?:kami|saya|aku|ini)\\s*(?:dari|adalah)?\\s*(?:pihak\\s*|petugas\\s*|oknum\\s*|tim\\s*)?(?:kepolisian|polsek|polres|polda|polri|kejaksaan|kejari|kejati|bea\\s*cukai|bnn|kpk|imigrasi|pengadilan|(?:kantor|dirjen|ditjen)\\s*pajak)|pihak\\s*(?:kepolisian|polsek|polres|polda|kejaksaan|bea\\s*cukai|bnn|pengadilan)|petugas\\s*(?:pajak|bea\\s*cukai|polisi|kepolisian|kejaksaan|bnn)|kasat\\s*(?:reskrim|narkoba|lantas)|kompol|iptu|ipda|aipda|briptu|bripka|akp|surat\\s*(?:panggilan|penangkapan|penyitaan)|penyidik|diteruskan\\s*ke\\s*(?:kejaksaan|polisi|pengadilan)|(?:this\\s*is|we\\s*are|i\\s*am)\\s*(?:from\\s*)?(?:the\\s*)?(?:police|customs|tax\\s*office|public\\s*prosecutor)|(?:kami|saya|aku|ini)\\s*(?:dari|adalah)?\\s*(?:pihak\\s*|petugas\\s*|tim\\s*|call\\s*center\\s*)?(?:ojk|kominfo|komdigi|ppatk|bpjs|dukcapil|bank\\s*indonesia|kemenkeu|mahkamah\\s*agung|polisi)|(?:info|pemberitahuan|pengumuman|peringatan|resmi)?\\s*(?:bea\\s*cukai|kejaksaan|kepolisian|imigrasi|kominfo|komdigi|ppatk|dukcapil|bnn|kpk)\\s*[:]|(?:panggilan|surat|pemberitahuan|undangan)\\s*(?:sidang\\s*)?(?:resmi\\s*)?(?:dari\\s*)?(?:pengadilan|kepolisian|kejaksaan|polres|polsek|bea\\s*cukai|kpk|bnn)|dari\\s*(?:pengadilan\\s*negeri|kejaksaan\\s*negeri|pengadilan\\s*agama)|e-?tilang|surat\\s*tilang|tilang\\s*(?:digital|elektronik)|direktorat\\s*(?:narkoba|reskrim|siber|lalu\\s*lintas)|ditresnarkoba|satresnarkoba|satreskrim|satlantas'),
      title: { id: 'Mengaku sebagai aparat atau instansi penegak hukum', en: 'Claims to be law enforcement or a government agency' },
      explain: {
        id: 'Aparat dan instansi resmi tidak menyelesaikan kasus lewat chat, telepon, atau transfer ke rekening pribadi. Tutup pesannya, lalu hubungi instansi itu lewat nomor resmi yang kamu cari sendiri.',
        en: 'Real officers and agencies do not settle cases by chat, phone call, or transfer to a personal account. Close the message, then contact the agency through an official number you look up yourself.'
      }
    },
    {
      id: 'family-emergency', weight: 4,
      re: rx('(?:anak|putra|putri|suami|istri|keluarga)\\s*(?:anda|bapak|ibu|pak|bu)(?:(?!tidak|tak\\s|jangan)[^\\n]){0,60}(?:amankan|diamankan|ditangkap|tertangkap|ditahan|kecelakaan|dirawat|masuk\\s*rumah\\s*sakit|terlibat\\s*kasus|tersangkut|diculik|disandera)|(?:your|ur)\\s*(?:son|daughter|child|husband|wife)(?:(?!not)[^\\n]){0,60}(?:arrested|detained|accident|hospital|kidnapped)'),
      title: { id: 'Kabar darurat tentang anggota keluarga', en: 'Emergency news about a family member' },
      explain: {
        id: 'Penipu sering mengabarkan keluargamu ditahan, kecelakaan, atau dirawat agar kamu panik dan langsung transfer. Hubungi keluargamu secara langsung dan jangan kirim uang sebelum memastikan.',
        en: 'Scammers often claim a relative was arrested, injured, or hospitalized so you panic and transfer money. Contact your family directly and do not send money before confirming.'
      }
    },
    {
      id: 'romance', weight: 4,
      re: rx('bertugas\\s*di\\s*(?:suriah|afghanistan|irak|yaman)|(?:paket|kiriman)\\s*hadiah\\s*(?:untukmu|untuk\\s*kamu|untuk\\s*anda)|(?:us|u\\.s\\.|american)\\s*army|army\\s*officer|stationed\\s*in|package\\s*of\\s*gold|gold\\s*bars?|next\\s*of\\s*kin|inheritance|unclaimed\\s*(?:funds|fortune)|(?:you|u)\\s*will\\s*(?:get|receive)\\s*\\d+\\s*%|(?:send|give)\\s*(?:me\\s*)?(?:your\\s*)?bank\\s*(?:details|account)|perwira\\s*(?:amerika|militer)|tentara\\s*(?:amerika|pbb)|misi\\s*perdamaian|titip\\s*(?:paket|emas|uang)|warisan\\s*(?:miliar|juta)|(?:video\\s*call|vcs|foto|video)[^\\n]{0,60}?(?:pulsa|top\\s*up\\s*(?:pulsa|dulu))|(?:pulsa|top\\s*up\\s*(?:pulsa|dulu))[^\\n]{0,60}?(?:video\\s*call|vcs|foto|video)|(?:dokter|tentara|prajurit|insinyur|engineer|perwira)\\s*(?:militer|pbb|angkatan)|(?:militer|tentara)\\s*pbb|pbb\\s*di\\s*(?:suriah|afghanistan|irak|yaman)|bertugas\\s*(?:misi|di\\s*luar\\s*negeri)'),
      title: { id: 'Pola penipuan asmara dari orang yang baru dikenal', en: 'Romance scam pattern from someone you just met' },
      explain: {
        id: 'Orang yang baru dikenal online, mengaku bertugas jauh, lalu ingin mengirim paket dan meminta biaya adalah modus penipuan asmara yang umum.',
        en: 'Someone you just met online who says they are stationed far away, wants to send a parcel, and then asks for fees is a common romance scam.'
      }
    },
    {
      id: 'gov-lure', weight: 3,
      re: rx('(?:terpilih|terdaftar|berhak)\\s*(?:sebagai\\s*)?(?:penerima\\s*)?(?:bantuan|bansos|blt|subsidi|kip|pkh)|penerima\\s*(?:bantuan\\s*sosial|bansos|blt|subsidi)|ktp\\s*(?:anda\\s*)?(?:akan\\s*)?(?:dinonaktifkan|diblokir|dicabut|kedaluwarsa)|data\\s*kependudukan[^\\n]{0,40}(?:bermasalah|dinonaktifkan|diblokir)|anda\\s*(?:mendapat|mendapatkan|menerima|berhak\\s*atas)\\s*(?:bantuan|bansos|blt|subsidi|dana\\s*bantuan)|pencairan\\s*(?:bansos|blt|subsidi|bantuan)|bansos|e-?ktp\\s*(?:anda\\s*)?(?:akan\\s*)?(?:hangus|kedaluwarsa)|update\\s*(?:data\\s*)?(?:ktp|kependudukan|nik)'),
      title: { id: 'Dalih bantuan pemerintah atau data kependudukan', en: 'Government aid or ID data pretext' },
      explain: {
        id: 'Pesan "kamu terpilih menerima bansos" atau "KTP akan dinonaktifkan" yang meminta klik tautan adalah modus umum. Cek bantuan hanya di situs dan aplikasi resmi pemerintah.',
        en: 'Messages saying you were picked for aid or that your ID will be deactivated, with a link to click, are a common trick. Check aid only on official government sites and apps.'
      }
    },
    {
      id: 'bank-lure', weight: 3,
      re: rx('perubahan\\s*tarif|tarif\\s*transfer\\s*(?:menjadi|baru)|ketik\\s*(?:ya|setuju)|balas\\s*(?:ya|setuju)|jika\\s*(?:setuju|tidak\\s*setuju)[^\\n]{0,15}(?:ketik|balas)|jika\\s*tidak\\s*setuju|biaya\\s*transaksi\\s*(?:rp|menjadi|baru)|tarif\\s*(?:baru|rp)|biaya\\s*(?:bulanan|admin\\s*bulanan)\\s*(?:rp|menjadi)|formulir\\s*(?:pembatalan|persetujuan)|bi-?fast\\s*(?:rp|menjadi)'),
      title: { id: 'Dalih perubahan tarif atau persetujuan bank', en: 'Bank fee change or consent pretext' },
      explain: {
        id: 'Modus "perubahan tarif bank, balas YA atau TIDAK" mengarahkanmu ke nomor palsu. Bank tidak meminta persetujuan lewat chat. Cek langsung di aplikasi atau kanal resmi.',
        en: 'The "bank fee change, reply YES or NO" trick leads you to a fake number. Banks do not ask for consent by chat. Check directly in the official app or channel.'
      }
    },
    {
      id: 'otp-trick', weight: 3,
      re: rx('kode[^\\n]{0,40}?(?:salah\\s*(?:kirim|terkirim|nomor)|nyasar)|(?:salah\\s*(?:kirim|terkirim)|nyasar)[^\\n]{0,40}?kode|(?:tolong|mohon|minta)\\s*(?:\\w+\\s+){0,2}?(?:kirim|berikan|sebutkan)(?:kan)?\\s*(?:kembali|ulang)|code\\s*(?:was\\s*)?(?:sent\\s*to\\s*you\\s*by\\s*mistake|sent\\s*by\\s*mistake)|kode\\s*(?:verifikasi\\s*)?(?:whatsapp|wa|telegram)[^\\n]{0,40}?salah\\s*(?:masuk|kirim)|salah\\s*masuk[^\\n]{0,40}?(?:kirimkan|kirim|berikan)'),
      title: { id: 'Dalih "kode salah kirim" lalu minta dikirimkan ulang', en: 'Pretext of a "code sent by mistake" then asking you to forward it' },
      explain: {
        id: 'Modus ini memancing kamu meneruskan kode verifikasi (misalnya WhatsApp) yang sebenarnya milik akunmu sendiri. Pelaku memakainya untuk mengambil alih akunmu.',
        en: 'This trick makes you forward a verification code (for example WhatsApp) that actually belongs to your own account. The scammer uses it to take the account over.'
      }
    },
    {
      id: 'legal-threat', weight: 4,
      re: rx('(?:anda|kamu|kau|bapak|ibu|saudara|saudari|nasabah)\\s+(?:\\w+\\s+){0,3}?(?:akan\\s+)?(?:ditangkap|dijemput\\s*paksa|dipenjara|diproses\\s*hukum|dipidanakan|dilaporkan\\s*ke\\s*(?:polisi|polda|kejaksaan|pengadilan))|dijemput\\s*paksa|surat\\s*perintah\\s*penangkapan|(?:anda|kamu|bapak|ibu|saudara|rekening\\s*(?:anda|kamu)|nomor\\s*(?:anda|kamu))\\s*(?:\\w+\\s+){0,4}?(?:terindikasi|terlibat|tersangkut|dilaporkan|dipanggil|digunakan|dipakai)\\s*(?:\\w+\\s+){0,3}?(?:kasus|perkara|tindak\\s*pidana|pencucian\\s*uang|narkoba|penipuan|pidana|sebagai\\s*(?:saksi|tersangka))|terindikasi\\s*pencucian\\s*uang|(?:you|your)\\s*(?:\\w+\\s+){0,3}?(?:will|may)\\s*be\\s*(?:arrested|prosecuted|charged)'),
      title: { id: 'Ancaman ditangkap atau diproses hukum', en: 'Threat of arrest or legal action' },
      explain: {
        id: 'Penipu memakai ancaman penangkapan, panggilan sidang, atau tuduhan pencucian uang agar kamu panik dan membayar. Proses hukum yang asli tidak berjalan lewat chat atau telepon dengan permintaan uang.',
        en: 'Scammers use threats of arrest, court summons, or money-laundering accusations to make you panic and pay. Real legal processes do not run through chat or phone calls that ask for money.'
      }
    },
    {
      id: 'callback', weight: 2,
      re: rx('(?:hubungi|menghubungi|telepon|telpon|telp|chat|call|whatsapp|wa|sms)[^\\n]{0,60}?(?:\\+?62|\\b0)8\\d[\\d\\s.-]{6,12}\\d'),
      title: { id: 'Menyuruh menghubungi nomor ponsel pribadi', en: 'Tells you to contact a personal mobile number' },
      explain: {
        id: 'Lembaga resmi memakai nomor kantor atau kanal resmi, bukan nomor ponsel pribadi dari pesan. Cari sendiri nomor resminya.',
        en: 'Official organizations use office numbers or official channels, not a personal mobile number from a message. Look up the official number yourself.'
      }
    },
    {
      id: 'account-alert', weight: 3,
      re: rx('aktivitas\\s*(?:mencurigakan|tidak\\s*biasa|tidak\\s*dikenal)|login\\s*(?:mencurigakan|tidak\\s*dikenal)|(?:konfirmasi|verifikasi)\\s*(?:identitas|akun|data(?:\\s*diri)?)|(?:konfirmasi|verifikasi)\\s*(?:\\w+\\s+){0,3}?(?:dengan\\s*)?(?:mengirim|kirim)|melanggar\\s*(?:hak\\s*cipta|kebijakan|ketentuan|aturan)|(?:dilaporkan|terdeteksi)\\s*(?:melanggar|mencurigakan)|akan\\s*(?:dihapus|dinonaktifkan)|ajukan\\s*banding|account\\s*(?:has\\s*been\\s*)?(?:limited|suspended|locked|restricted)|verify\\s*your\\s*(?:identity|account|password)|(?:unusual|suspicious)\\s*(?:activity|login|sign-?in)|payment\\s*(?:has\\s*)?failed|update\\s*your\\s*(?:card|payment|billing)'),
      title: { id: 'Peringatan akun palsu (mencurigakan, dibatasi, perlu verifikasi)', en: 'Fake account alert (suspicious, limited, needs verification)' },
      explain: {
        id: 'Pesan "akunmu bermasalah, verifikasi sekarang" meniru peringatan resmi agar kamu memasukkan data di situs palsu. Buka aplikasi atau situs resminya sendiri untuk memeriksa.',
        en: 'A "your account has a problem, verify now" message imitates an official alert so you enter data on a fake site. Open the official app or site yourself to check.'
      }
    },
    {
      id: 'fake-tx', weight: 4,
      re: rx('(?:jika|kalau)\\s*(?:bukan|tidak\\s*merasa)[^\\n]{0,70}?(?:hubungi|telepon|chat|batalkan|pembatalan)[^\\n]{0,70}?(?:\\+?62|\\b0)8\\d|tidak\\s*merasa\\s*(?:memesan|bertransaksi|melakukan)[^\\n]{0,90}?(?:\\+?62|\\b0)8\\d|(?:hubungi|telepon|chat)[^\\n]{0,60}?(?:\\+?62|\\b0)8\\d[\\d\\s.-]{6,12}\\d[^\\n]{0,30}?(?:pembatalan|membatalkan|batalkan)|transaksi[^\\n]{0,60}?(?:luar\\s*negeri|tidak\\s*dikenal|mencurigakan)[^\\n]{0,80}?(?:hubungi|telepon|chat)[^\\n]{0,40}?(?:\\+?62|\\b0)8\\d[\\d\\s.-]{6,12}\\d|(?:jika|bila)\\s*bukan\\s*(?:anda|kamu|bapak|ibu)[^\\n]{0,40}?(?:hubungi|telepon)[^\\n]{0,40}?(?:\\+?62|\\b0)8\\d[\\d\\s.-]{6,12}\\d'),
      title: { id: 'Notifikasi transaksi palsu yang menyuruh menelepon nomor pribadi', en: 'Fake transaction notice telling you to call a personal number' },
      explain: {
        id: 'Pesan "ada transaksi atau pesanan atas namamu, hubungi nomor ini untuk membatalkan" memancing kamu menelepon penipu. Cek riwayat transaksi langsung di aplikasi resmi.',
        en: 'A "there is a transaction or order in your name, call this number to cancel" message lures you into calling the scammer. Check your transaction history directly in the official app.'
      }
    },
    {
      id: 'remote-app', weight: 5,
      re: rx('anydesk|teamviewer|rustdesk|airdroid|ultraviewer|quicksupport|remote\\s*(?:access|desktop|control)|akses\\s*jarak\\s*jauh|kendali\\s*jarak\\s*jauh|bagikan\\s*layar|share\\s*screen|screen\\s*sharing'),
      title: { id: 'Meminta memasang aplikasi kendali jarak jauh', en: 'Asks you to install a remote-control app' },
      explain: {
        id: 'Aplikasi seperti AnyDesk atau TeamViewer memberi pelaku kendali penuh atas HP atau laptopmu, termasuk melihat OTP dan m-banking. Jangan pasang atas permintaan siapa pun lewat chat atau telepon.',
        en: 'Apps like AnyDesk or TeamViewer give the caller full control of your phone or laptop, including OTPs and mobile banking. Never install one because someone asked by chat or phone.'
      }
    },
    {
      id: 'qr-trap', weight: 4,
      re: rx('scan\\s*(?:kode\\s*)?(?:qr|barcode)[^\\n]{0,60}?(?:menerima|terima|cairkan|pencairan|klaim|hadiah|refund|pengembalian|dana\\s*masuk|saldo)|(?:qr|barcode)[^\\n]{0,40}?(?:untuk\\s*menerima|agar\\s*(?:dana|uang|saldo)\\s*masuk|cairkan)|scan\\s*(?:this\\s*)?qr[^\\n]{0,40}?(?:receive|claim|refund)'),
      title: { id: 'Meminta scan QR untuk menerima uang', en: 'Asks you to scan a QR code to receive money' },
      explain: {
        id: 'Memindai QR dipakai untuk membayar atau mengirim uang keluar, bukan menerima. Pesan yang menyuruh scan QR supaya uang masuk adalah modus.',
        en: 'Scanning a QR code is used to pay or send money out, not to receive it. A message telling you to scan a QR so money arrives is a scam.'
      }
    },
    {
      id: 'advance-fee', weight: 4,
      re: rx('(?:transfer|bayar|setor|kirim|biaya|deposit|dp)[^\\n]{0,50}?(?:agar|supaya|biar|demi)\\s*(?:\\w+\\s+){0,3}?(?:cair|dicairkan|pencairan|disetujui|lolos|diterima|berangkat|bisa\\s*(?:ambil|tarik|klaim))|(?:lolos|lulus|diterima|berangkat)[^\\n]{0,60}?(?:cukup|tinggal|hanya)\\s*(?:bayar|transfer|setor)|(?:cukup|tinggal|hanya)\\s*(?:bayar|transfer|setor)[^\\n]{0,60}?(?:lolos|lulus|diterima|cair|berangkat)|(?:pay|send)[^\\n]{0,40}?(?:to\\s*(?:release|receive|unlock|claim)|so\\s*(?:that\\s*)?you\\s*can\\s*(?:receive|withdraw|claim))'),
      title: { id: 'Bayar dulu supaya dana, hadiah, atau kerja "cair"', en: 'Pay first so the money, prize, or job is "released"' },
      explain: {
        id: 'Disuruh membayar agar pinjaman cair, hadiah keluar, atau lolos kerja adalah penipuan biaya di muka. Yang sah memotong biaya dari dana atau tidak memungut sama sekali.',
        en: 'Being told to pay so a loan is released, a prize is delivered, or you get a job is an advance-fee scam. Legitimate parties deduct fees from the payout or charge nothing.'
      }
    },
    {
      id: 'offplatform', weight: 3,
      re: rx('dp\\s*dulu|bayar\\s*dulu|full\\s*transfer|pembayaran\\s*full|full\\s*payment|(?:tidak|gak|nggak|ga|no)\\s*(?:bisa\\s*|terima\\s*|menerima\\s*)?(?:cod|rekber|rekening\\s*bersama)|(?:bayar|transaksi|pembayaran)\\s*(?:di\\s*)?luar\\s*(?:aplikasi|marketplace|shopee|tokopedia|lazada|tiktok|olx)|pindah\\s*(?:chat\\s*)?(?:ke\\s*)?(?:wa|whatsapp|telegram)|pindah\\s*chat'),
      title: { id: 'Mengajak transaksi di luar jalur resmi', en: 'Pushes you to deal outside the official channel' },
      explain: {
        id: 'Penjual yang menolak COD atau rekening bersama dan mengajak bayar langsung di luar aplikasi menghilangkan perlindungan pembeli. Bayar hanya lewat fitur resmi marketplace.',
        en: 'A seller who refuses COD or escrow and pushes you to pay directly outside the app removes buyer protection. Pay only through the marketplace\'s official feature.'
      }
    },
    {
      id: 'sextortion', weight: 5,
      re: rx('(?:meretas|membobol|retas|hack(?:ed)?)\\s*(?:\\w+\\s+){0,2}?(?:webcam|kamera|perangkat|hp|akun|komputer|laptop)|merekam\\s*(?:anda|kamu)[^\\n]{0,100}?(?:kirim|sebar|viral|bayar)|(?:video|foto|rekaman)\\s*(?:pribadi\\s*|intim\\s*|bugil\\s*)?(?:anda|kamu|mu)\\b[^\\n]{0,80}?(?:kirim|sebar|viral|bayar)|(?:kirim|sebar)[^\\n]{0,40}?(?:semua|seluruh)\\s*(?:kontak|teman|keluarga)|recorded\\s*you|(?:share|send)[^\\n]{0,40}?(?:all\\s*)?your\\s*contacts'),
      title: { id: 'Ancaman rekaman atau peretasan dengan tebusan', en: 'Recording or hacking threat with a ransom demand' },
      explain: {
        id: 'Klaim "kami meretas webcam dan merekammu, bayar atau videonya disebar" hampir selalu bualan massal. Jangan bayar, jangan balas, ganti kata sandi, dan laporkan.',
        en: 'A claim that "we hacked your webcam and recorded you, pay or we leak it" is almost always a mass bluff. Do not pay or reply, change your passwords, and report it.'
      }
    },
    {
      id: 'boss-scam', weight: 3,
      re: rx('(?:ini|saya)\\s*(?:adalah\\s*)?(?:direktur|bos|atasan|pimpinan|ceo|kepala\\s*(?:divisi|bagian|dinas|sekolah))|(?:lagi|sedang)\\s*(?:rapat|meeting|di\\s*luar\\s*kota|sibuk)[^\\n]{0,50}?(?:jangan\\s*(?:telepon|telpon|call|hubungi|angkat)|tidak\\s*bisa\\s*(?:telepon|ditelepon|diangkat))|jangan\\s*(?:telepon|telpon|call|angkat\\s*telepon)|nanti\\s*(?:saya|aku)\\s*(?:ganti|jelaskan|kembalikan)|kode(?:nya)?\\s*(?:kirim|foto)\\s*ke\\s*(?:saya|aku)|(?:i\\s*am|this\\s*is)\\s*(?:your\\s*)?(?:ceo|boss|manager|director)'),
      title: { id: 'Pola penipuan atasan: minta tolong lalu melarang menelepon', en: 'Boss-impersonation pattern: asks a favor, forbids calling' },
      explain: {
        id: 'Penipu mengaku atasan, minta transfer atau voucher cepat, lalu melarangmu menelepon. Konfirmasi lewat telepon ke nomor atasan yang sudah tersimpan sebelum mengirim apa pun.',
        en: 'Scammers pose as your boss, ask for a fast transfer or vouchers, then forbid you to call. Confirm by phoning your boss\'s saved number before sending anything.'
      }
    },
    {
      id: 'link', weight: 2,
      re: rx('klik\\s*(?:link|tautan)|buka\\s*(?:link|tautan)|isi\\s*formulir|link\\s*klaim|tautan\\s*berikut|login\\s*di|klaim\\s*(?:di|lewat|melalui)\\s*(?:https?|www|[a-z0-9-]+\\.[a-z]{2,})|klik\\s*di\\s*sini|click\\s*(?:the\\s*)?(?:link|here)|open\\s*(?:the\\s*)?link|fill\\s*(?:in|out)\\s*the\\s*form|log\\s*in\\s*at|(?:verifikasi|konfirmasi|update|perbarui|tukar(?:kan)?|cairkan|klaim|ajukan\\s*banding|unduh|download|lihat\\s*(?:bukti|surat|detail|tagihan|undangan)|login|masuk|daftar|isi\\s*data(?:\\s*diri)?|segera\\s*isi)\\s*(?:\\w+\\s+){0,2}?(?:di|lewat|melalui|via|ke)\\s*(?:https?:|www\\.|[a-z0-9-]+\\.[a-z]{2,}|bit\\.ly|link|tautan)|(?:di|lewat|via|melalui)\\s*(?:link|tautan)\\s*(?:ini|berikut|di\\s*bawah)|isi\\s*data\\s*diri'),
      title: { id: 'Ajakan membuka tautan atau mengisi formulir', en: 'Pushes you to open a link or fill a form' },
      explain: {
        id: 'Jangan membuka tautan secara terburu-buru. Periksa alamat situs sendiri dan hindari memasukkan informasi sensitif pada halaman yang belum terverifikasi.',
        en: 'Do not open links in a hurry. Check the site address yourself and avoid entering sensitive information on unverified pages.'
      }
    },
    {
      id: 'impersonation', weight: 3,
      re: rx('aku\\s*ganti\\s*nomor|ganti\\s*nomor|nomor\\s*baru|pinjam\\s*(?:nomor|hp)|hp\\s*(?:ku|aku|lamaku)?\\s*(?:lagi\\s*)?(?:rusak|hilang)|mengaku\\s*dari|pihak\\s*bank|admin\\s*resmi|cs\\s*resmi|petugas\\s*bank|customer\\s*service|this\\s*is\\s*your\\s*bank|new\\s*number|changed\\s*my\\s*number|official\\s*admin|(?:hp|ponsel|handphone)\\s*(?:\\w+\\s+){0,2}?(?:jatuh|rusak|hilang|mati|kecebur|dicuri)|jatuh\\s*ke\\s*(?:got|air|toilet|sungai)|(?:mama|mah|ma|papa|pa|ibu|bu|bapak|pak)\\s*,\\s*ini\\s*[a-z]+|nomor\\s*(?:lama|yang\\s*lama)\\s*(?:hilang|tidak\\s*aktif|diblokir)'),
      title: { id: 'Mengaku sebagai pihak dekat atau resmi', en: 'Claims to be someone close or official' },
      explain: {
        id: 'Identitas pengirim bisa dipalsukan. Hubungi orang atau organisasi lewat nomor atau kanal resmi yang sudah kamu miliki.',
        en: 'Sender identity can be faked. Contact the person or organization through official numbers or channels you already have.'
      }
    },
    {
      id: 'investment', weight: 4,
      re: rx('pasti\\s*untung|profit\\s*tetap|keuntungan\\s*dijamin|untung\\s*\\d+\\s*%|modal\\s*kembali|tanpa\\s*risiko|cuan\\s*harian|profit\\s*(?:harian\\s*|mingguan\\s*)?\\d+\\s*%|dijamin\\s*(?:untung|profit|cuan)|withdraw\\s*kapan\\s*saja|deposit\\s*minimal|robot\\s*trading|trading\\s*signal|sinyal\\s*trading|member\\s*(?:sudah\\s*)?profit|guaranteed\\s*(?:profit|returns?)|risk[- ]free|double\\s*your|daily\\s*profit|akurat\\s*\\d+\\s*%|win\\s*rate|puluhan\\s*juta|ratusan\\s*juta|grup\\s*(?:vip|premium|trading|signal)|group\\s*vip|bonus\\s*referral|referral\\s*bonus|modal\\s*[\\d.,]+\\s*(?:ribu|rb|juta|jt)?\\s*jadi|arisan\\s*online|setor\\s*(?:rp\\s*)?[\\d.,]+\\s*(?:ribu|rb|juta|jt)?\\s*dapat|dapat\\s*(?:rp\\s*)?[\\d.,]+\\s*(?:juta|jt)\\s*dalam|untung\\s*besar|cuan\\s*besar|mau\\s*(?:aku|saya)\\s*ajar(?:in|kan)|ajar(?:in|kan)\\s*(?:kamu\\s*)?(?:investasi|trading)|(?:aku|saya)\\s*(?:sering|biasa)\\s*(?:investasi|trading)|deposit\\s*di\\s*platform|(?:profit|untung|keuntungan|cuan|return|imbal\\s*hasil|bagi\\s*hasil)\\s*(?:\\w+\\s+){0,2}?\\d+(?:[.,]\\d+)?\\s*%\\s*(?:per|/|tiap|setiap)?\\s*(?:hari|minggu|bulan|harian|mingguan)|\\d+\\s*%\\s*daily|(?:dapat|bisa\\s*dapat|raih|meraih|dapatkan)\\s*(?:\\w+\\s+){0,2}?\\d+(?:[.,]\\d+)?\\s*%\\s*(?:per|/|tiap|setiap)\\s*(?:hari|minggu|bulan)|\\d+(?:[.,]\\d+)?\\s*%\\s*(?:per|/|tiap|setiap)\\s*(?:hari|minggu)|berhasil\\s*withdraw|\\d+\\s*member\\s*(?:berhasil|sudah)|tarik\\s*(?:dana\\s*)?kapan\\s*saja|coach\\s*(?:\\w+\\s+){0,2}?(?:trading|investasi)|trading\\s*(?:emas|forex|kripto)\\s*(?:bersama|dengan)|bebas\\s*(?:risiko|rugi)|modal\\s*(?:rp\\s*)?[\\d.,]+\\s*(?:ribu|rb|juta|jt)?\\s*jadi|(?:kirim|transfer|setor)[^\\n]{0,30}?(?:ke\\s*)?wallet|wallet\\s*kami'),
      title: { id: 'Janji keuntungan yang tidak realistis', en: 'Unrealistic profit promise' },
      explain: {
        id: 'Janji untung pasti atau tanpa risiko adalah tanda bahaya. Jangan transfer sebelum memahami produk dan memeriksa izinnya di sumber resmi.',
        en: 'Promises of guaranteed or risk-free profit are a red flag. Do not transfer money before you understand the product and check its license with official sources.'
      }
    },
    {
      id: 'secrecy', weight: 3,
      re: rx('jangan\\s*(?:bilang|beri\\s*tahu|kasih\\s*tahu|hubungi|lapor(?:kan)?)\\s*(?:ke\\s*)?(?:siapa-?siapa|keluarga|bank|polisi)|dirahasiakan|rahasiakan|don\'t\\s*tell\\s*anyone|keep\\s*(?:this|it)\\s*(?:secret|private)|do\\s*not\\s*(?:tell|contact)'),
      title: { id: 'Meminta merahasiakan percakapan atau transaksi', en: 'Asks you to keep it secret' },
      explain: {
        id: 'Permintaan merahasiakan situasi atau menghindari verifikasi independen adalah taktik manipulasi yang umum.',
        en: 'Asking you to keep things secret or avoid independent verification is a common manipulation tactic.'
      }
    },
    {
      id: 'threat', weight: 4,
      re: rx('(?:sebar|menyebarkan|viralkan|bocorkan).{0,30}(?:foto|video|data|rahasia)|(?:data|kontak|foto|video|rahasia|aib)(?:(?!tidak|tak\\s|takkan|jangan|never|not)[^\\n]){0,60}(?:sebar|disebar|disebarkan|menyebar|diviralkan|dibocorkan|dipublikasikan)|(?:foto|video|rahasia|aib)(?:(?!tidak|tak\\s|takkan|jangan|never|not)[^\\n]){0,60}(?:saya|aku|kami)\\s*(?:viralkan|bocorkan|publikasikan|sebarkan)|kontak\\s*darurat.{0,40}(?:hubungi|telepon|kabari)|datangi\\s*(?:rumah|kantor|tempat\\s*kerja)|ancam|akan\\s*(?:saya|aku)\\s*sebar|i\\s*will\\s*(?:leak|share|expose)|expose\\s*your|leak\\s*your|(?:kami|aku|saya)\\s*(?:akan\\s*)?(?:teror|permalukan)|teror\\s*(?:keluarga|kontak|temanmu)'),
      title: { id: 'Ancaman menyebarkan data atau foto', en: 'Threat to leak data or photos' },
      explain: {
        id: 'Ancaman penyebaran foto atau data adalah pemerasan. Jangan bayar, hentikan kontak, simpan bukti, lalu laporkan.',
        en: 'Threats to leak photos or data are blackmail. Do not pay, stop contact, keep evidence, and report it.'
      }
    },
    {
      id: 'apk', weight: 5,
      re: /\.apk(?![a-z0-9])|pasang\s*aplikasi|install\s*(?:aplikasi|apk|app)|unduh\s*aplikasi\s*(?:ini|berikut)|(?:download|unduh|pasang|install)\s*(?:aplikasi|app)\s*[^\n]{0,40}?(?:untuk\s*(?:melihat|membuka|mengecek|cek|lihat)|agar)|download\s*(?:the\s*)?(?:apk|app)/i,
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
      re: /(?:paket|parcel|kiriman|barang)(?:\s*cod)?.{0,80}(?:tertahan|ditahan|gagal\s*kirim|bea\s*cukai|resi|barang\s*ilegal|narkoba|denda)|(?:paket|pesanan|kiriman)\s*cod\s*atas\s*nama|cod\s*atas\s*nama|resi\s*(?:paket|pengiriman)|package\s*(?:held|on\s*hold)|customs\s*fee|delivery\s*failed/i,
      title: { id: 'Dalih paket tertahan atau resi', en: 'Parcel on hold or receipt pretext' },
      explain: {
        id: 'Pesan paket tertahan atau biaya bea cukai dari nomor tak dikenal sering dipakai untuk menyebar tautan atau APK berbahaya.',
        en: 'Parcel-on-hold or customs fee messages from unknown numbers are often used to spread harmful links or APKs.'
      }
    },
    {
      id: 'refund', weight: 3,
      re: rx('(?:kelebihan|salah)\\s*transfer|refund|pengembalian\\s*dana|overpaid|wrong\\s*transfer|(?:paket|kiriman)[^\\n]{0,80}?(?:dikembalikan|diretur|dikirim\\s*balik)|alamat\\s*(?:anda|kakak|kamu)?\\s*(?:kurang\\s*jelas|tidak\\s*(?:lengkap|jelas|ditemukan|valid))|(?:kurir|ekspedisi|kantor\\s*pos)[^\\n]{0,60}?(?:share|kirim)\\s*(?:lokasi|alamat)'),
      title: { id: 'Dalih kelebihan transfer atau refund', en: 'Overpayment or refund pretext' },
      explain: {
        id: 'Dalih refund atau salah transfer sering dipakai untuk meminta OTP atau membuatmu membuka tautan palsu. Cek langsung di aplikasi resmi.',
        en: 'Refund or wrong-transfer stories are often used to get an OTP or make you open a fake link. Check directly in the official app.'
      }
    },
    {
      id: 'personal-account', weight: 3,
      re: rx('rekening\\s*pribadi|rek(?:ening)?[^\\n.!?]{0,40}?(?:atas\\s*nama|a[./]n\\.?)\\s*[a-z]+|\\d{6,}\\s*(?:atas\\s*nama|a[./]n\\.?)\\s*[a-z]+|transfer\\s*ke\\s*(?:rekening|rek|nomor)|kirim\\s*ke\\s*(?:rekening|rek)\\s*(?:ini|berikut)|personal\\s*account|transfer\\s*to\\s*(?:this|my)\\s*account'),
      title: { id: 'Mengarahkan pembayaran ke rekening pribadi', en: 'Directs payment to a personal account' },
      explain: {
        id: 'Lembaga, perusahaan, dan toko resmi menerima pembayaran lewat kanal resmi atau rekening atas nama perusahaan, bukan rekening perorangan. Cek nomor rekening di cekrekening.id sebelum transfer.',
        en: 'Institutions, companies, and real shops take payment through official channels or company accounts, not an individual\'s account. Check the account at cekrekening.id before transferring.'
      }
    },
    {
      id: 'loan', weight: 3,
      re: rx('pinjaman\\s*(?:cepat|instan|kilat|online|tanpa\\s*(?:jaminan|bi\\s*checking|slip))|cair\\s*(?:dalam\\s*)?\\d+\\s*(?:menit|jam)|limit\\s*(?:pinjaman|kredit)\\s*(?:sampai|hingga|up\\s*to)|dana\\s*(?:cepat|tunai)\\s*cair|instant\\s*loan|loan\\s*approved|no\\s*credit\\s*check|tanpa\\s*(?:bi\\s*checking|slik|agunan|survei|survey|slip\\s*gaji)|pinjaman\\s*cair|dana\\s*cair|bebas\\s*slik|kredit\\s*tanpa\\s*agunan'),
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
      re: rx('hubungi\\s*(?:admin|cs|customer\\s*service|hrd?|rekruter|recruiter|tim\\s*rekrutmen|petugas|penyidik|kasat|polisi)(?:\\s+[a-z]+){0,3}?\\s*(?:di|via|lewat)\\s*(?:wa|whatsapp|dm|telegram|nomor|\\+?62\\s*8|08)|dm\\s*(?:kami|admin)|chat\\s*admin\\s*(?:di|via)\\s*(?:wa|whatsapp|telegram)|layanan\\s*(?:bantuan|pengaduan)\\s*(?:resmi\\s*)?via\\s*(?:wa|whatsapp|telegram)|contact\\s*(?:our\\s*)?(?:admin|support|hr|recruiter)\\s*(?:on|via)\\s*(?:whatsapp|telegram|dm)'),
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
    jne: ['jne.co.id'], bpjs: ['bpjs-kesehatan.go.id', 'bpjsketenagakerjaan.go.id'], ojk: ['ojk.go.id'], pospay: ['posindonesia.co.id'],
    kemensos: ['kemensos.go.id'], kemendagri: ['kemendagri.go.id'], polri: ['polri.go.id'],
    dukcapil: ['kemendagri.go.id'], kominfo: ['kominfo.go.id', 'komdigi.go.id'], komdigi: ['komdigi.go.id', 'kominfo.go.id'],
    kejaksaan: ['kejaksaan.go.id'], ppatk: ['ppatk.go.id'], bnn: ['bnn.go.id'], kpk: ['kpk.go.id'], imigrasi: ['imigrasi.go.id'],
    paypal: ['paypal.com', 'paypal.me'], netflix: ['netflix.com'], meta: ['meta.com', 'meta.ai', 'facebook.com'], facebook: ['facebook.com', 'fb.com'],
    wa: ['wa.me', 'whatsapp.com'], usps: ['usps.com'], dhl: ['dhl.com', 'dhl.de', 'dhl.co.id'], telkomsel: ['telkomsel.com'], pln: ['pln.co.id'],
    anteraja: ['anteraja.id'], sicepat: ['sicepat.com'], linkaja: ['linkaja.id'], blibli: ['blibli.com'], lazada: ['lazada.co.id', 'lazada.com'],
    bsi: ['bankbsi.co.id'], cimb: ['cimbniaga.co.id'], btn: ['btn.co.id'], jenius: ['jenius.com'], apple: ['apple.com'], google: ['google.com', 'google.co.id']
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
    if (/\.apk(\?|$)|[-_/]apk(?:[-_/.?]|$)/i.test(url)) add('u-apk', 5, 'Tautan berkas APK', 'APK file link', 'Memasang APK dari luar toko resmi adalah modus umum pencurian data.', 'Installing an APK from outside official stores is a common data theft trick.');
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* 3. Analisis utama                                                   */
  /* ------------------------------------------------------------------ */
  /** Skor 0 sampai 100 menjadi tingkat: high, medium, low. */
  function levelOf(score) { return score >= 56 ? 'high' : score >= 25 ? 'medium' : 'low'; }

  /**
   * Kalimat yang justru MENASIHATI atau MENYANGKAL ("jangan bagikan OTP", "bank tidak pernah meminta PIN",
   * "tidak dipungut biaya", "waspada penipuan") dibuang sebelum pola dicocokkan, supaya imbauan dan pesan resmi
   * tidak dianggap penipuan. Pemotongan dilakukan per klausa (koma) agar penipu tidak bisa menyelipkan kata
   * "jangan" untuk menyembunyikan permintaan sungguhan di klausa lain.
   */
  var SAFE_CLAUSES = [
    /[^.!?\n,;]{0,90}\b(?:jangan|tidak|tak|hindari|never|don'?t)\s+(?:mudah\s+|pernah\s+)?(?:tergiur|tertipu|terpancing|terbujuk|percaya|gampang\s+percaya)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n,;]{0,90}\b(?:jangan|tidak\s+pernah|tak\s+pernah|tidak\s+akan\s+pernah|never|do\s+not|don'?t)\s+(?:\w+\s+){0,2}?(?:memberikan|berikan|membagikan|bagikan|menyebutkan|sebutkan|menyebarkan|sebarkan|mengirim|kirim|mentransfer|transfer|mengklik|klik|membuka|buka|menginstal|install|memasang|pasang|mengunduh|unduh|percaya|tergiur|tertipu|terpancing|share|give|send|click|open|disclose|reveal|provide|tell)\b[^.!?\n,;]*(?:\s*,\s*[^.!?\n,;]{1,24})*(?:,?\s*(?:termasuk|including|bahkan|even)[^.!?\n]*)?[.!?]?/gi,
    /[^.!?\n,;]{0,90}\b(?:tidak|tak|takkan|never)\s+(?:akan\s+pernah\s+|akan\s+|pernah\s+)(?:meminta|minta|menanyakan|menghubungi|mengirim|memungut|menyebarkan|membocorkan|menjual|membagikan|memberikan|menelepon|menawarkan|ask|request|share|sell|disclose)\b[^.!?\n,;]*(?:\s*,\s*[^.!?\n,;]{1,24})*(?:,?\s*(?:termasuk|including|bahkan|even)[^.!?\n]*)?[.!?]?/gi,
    /[^.!?\n,;]{0,90}\b(?:tidak\s+(?:ada|dipungut|dikenakan|memungut|memerlukan|perlu|membutuhkan)|tanpa|bebas|gratis|free\s+of)\s+(?:\w+\s+){0,2}?(?:biaya|bayaran|pungutan|fee|charge|deposit|modal)\b[^.!?\n,;]*[.!?]?/gi,
    /[^.!?\n]{0,140}\b(?:waspada|hati-?hati|awas|imbau|mengimbau|beware|careful|stay\s+alert)\b[^.!?\n]*\b(?:penipuan|modus|scam|phishing|hoaks|fraud|apk)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n]{0,140}\b(?:penipuan|modus|scam|phishing|fraud)\b[^.!?\n]*\b(?:waspada|hati-?hati|awas|imbau|mengimbau|beware|careful)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n]{0,140}\b(?:diimbau|mengimbau)\b[^.!?\n]*\b(?:memeriksa|mengecek|cek|legalitas|waspada|berhati-?hati|menjaga)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n,;]{0,90}\b(?:ubah|ganti|reset|atur|ubahlah|gantilah|change|set\s*up)\s+(?:\w+\s+){0,2}?(?:pin|password|kata\s*sandi|sandi|passcode)\b[^.!?\n,;]*[.!?]?/gi
  ];
  function neutralize(text) {
    var t = text;
    SAFE_CLAUSES.forEach(function (re) { t = t.replace(re, ' '); });
    return t;
  }

  /** Pesan yang hanya MENGIRIMKAN kode (OTP resmi) dan tidak meminta kode itu dikirim balik. */
  var OTP_REQUEST = /(?:kirim|berikan|sebutkan|infokan|bagikan|balas|masukkan|input|minta|tolong|mohon|share|send|give|enter|reply|forward|tell)\w*\s+(?:\w+\s+){0,3}?(?:kode|otp|code|pin|passcode|password|sandi|cvv)\b/i;
  function isOtpDelivery(text, scan, riskyUrl) {
    if (riskyUrl) return false;
    if (!/(?:otp|kode|code)[^\n]{0,40}?\b\d{4,8}\b|\b\d{4,8}\b[^\n]{0,30}?(?:otp|kode|code)/i.test(text)) return false;
    return !OTP_REQUEST.test(scan);
  }
  /** Passcode atau PIN yang hanya DIBERIKAN (undangan rapat), bukan diminta. */
  function isSecretDelivery(text, scan, riskyUrl) {
    if (riskyUrl) return false;
    if (!/(?:passcode|password|kata\s*sandi|sandi|pin)\s*(?:anda|kamu)?\s*(?:adalah|is|:|=)?\s*[:=]?\s*\d{3,8}\b/i.test(text)) return false;
    return !OTP_REQUEST.test(scan);
  }

  /** Nama merek yang sering ditiru; dipakai untuk mendeteksi pesan yang menyebut merek tetapi tautannya bukan situs resminya. */
  var CLAIM_BRANDS = ['bca', 'klikbca', 'bri', 'bni', 'mandiri', 'gopay', 'ovo', 'shopee', 'tokopedia', 'tiktok', 'instagram', 'whatsapp', 'jne', 'bpjs', 'ojk',
    'dukcapil', 'kominfo', 'komdigi', 'kejaksaan', 'polri', 'ppatk', 'paypal', 'netflix', 'telkomsel', 'pln', 'dhl', 'usps', 'bsi', 'cimb', 'btn'];
  var CLAIM_RE = new RegExp('(?:^|[^a-z0-9])(' + CLAIM_BRANDS.join('|') + ')(?![a-z0-9])', 'gi');
  function hostOf(url) {
    try { return new URL(/^https?:/i.test(url) ? url : 'http://' + url).hostname.toLowerCase(); } catch (e) { return ''; }
  }
  function isOfficialAnywhere(reg) {
    for (var b in BRANDS) if (BRANDS[b].indexOf(reg) >= 0) return true;
    return false;
  }
  function claimSignal(text, urls) {
    if (!urls.length) return null;
    var mentioned = [];
    var m;
    CLAIM_RE.lastIndex = 0;
    while ((m = CLAIM_RE.exec(text))) { var b = m[1].toLowerCase(); if (mentioned.indexOf(b) < 0) mentioned.push(b); }
    if (!mentioned.length) return null;
    for (var i = 0; i < urls.length; i++) {
      var host = hostOf(urls[i]);
      if (!host) continue;
      var reg = registrable(host);
      if (isOfficialAnywhere(reg)) continue;
      var brand = mentioned[0].toUpperCase();
      return { id: 'u-claim', weight: 3, host: host,
        title: { id: 'Menyebut ' + brand + ', tetapi tautannya bukan situs resmi (' + host + ')', en: 'Mentions ' + brand + ', but the link is not an official site (' + host + ')' },
        explain: { id: 'Pesan yang mengatasnamakan sebuah merek atau lembaga tetapi mengarahkan ke domain lain patut dicurigai. Ketik sendiri alamat resminya atau buka aplikasinya.',
          en: 'A message that speaks for a brand or agency but points to a different domain is suspicious. Type the official address yourself or open its app.' } };
    }
    return null;
  }

  /** Sinyal gabungan: tawaran/ancaman yang disusul permintaan uang adalah pola penipuan klasik. */
  var OFFER_IDS = ['prize', 'job', 'task-scam', 'loan', 'investment', 'romance', 'gov-lure'];
  var AUTH_IDS = ['authority', 'family-emergency', 'boss-scam', 'legal-threat'];
  var PAY_ASK = /(?:transfer|bayar|setor|kirim)\s*(?:dulu\s*)?(?:rp\s*)?[\d.]+|(?:transfer|bayar|setor)\s*dulu|biaya\s*\w+|deposit|uang\s*muka|tebusan|denda|pajak|pinjam(?:i|kan)?\s*(?:\w+\s+){0,2}?uang|kirim(?:kan)?\s*uang|(?:minta|butuh)\s*(?:\w+\s+){0,2}?(?:uang|transfer|pulsa)|top\s*up\s*(?:pulsa|dulu)|pulsa\s*dulu|minimal\s*(?:modal|deposit|investasi|setor)|(?:modal|deposit|setoran)\s*(?:mulai|minimal)|investasi\s*minimal|dp\s*dulu/i;
  var SOCIAL_PAY = /patungan|iuran|urunan|uang\s*kas|kas\s*(?:kelas|rt|rw|kantor|angkatan)|arisan\s*(?:keluarga|rt|ibu)|bayar\s*(?:kos|kontrakan)|uang\s*(?:kos|jajan|bulanan)/i;
  var NEW_NUMBER = /nomor\s*baru|ganti\s*nomor|(?:hp|ponsel)\s*(?:\w+\s+){0,2}?(?:rusak|hilang|jatuh)|new\s*number|changed\s*my\s*number/i;
  function hasId(found, ids) { return found.some(function (f) { return ids.indexOf(f.id) >= 0; }); }

  /** Menganalisis teks. Mengembalikan { found, score, level, urls }. */
  function analyze(text) {
    // Ratakan spasi berulang: mencegah pencocokan regex melambat pada teks berisi ribuan spasi
    text = String(text || '').replace(/[ \t\u00a0]{2,}/g, ' ');
    var scan = neutralize(text);
    var found = PATTERNS.filter(function (p) { return p.re.test(scan); })
      .map(function (p) { return { id: p.id, weight: p.weight, title: p.title, explain: p.explain }; });
    var urls = findUrls(text);
    var urlFound = [];
    urls.forEach(function (u) { urlSignals(u).forEach(function (s) { urlFound.push(s); }); });
    var claim = claimSignal(text, urls);
    var riskyUrl = urlFound.length > 0 || !!claim;
    if (isOtpDelivery(text, scan, riskyUrl)) found = found.filter(function (f) { return f.id !== 'otp'; });
    if (isSecretDelivery(text, scan, riskyUrl)) found = found.filter(function (f) { return f.id !== 'secret'; });
    // Iuran, patungan, uang kos: transfer antar orang yang saling kenal bukan tanda penipuan sendirian
    if (SOCIAL_PAY.test(scan) && !hasId(found, OFFER_IDS.concat(AUTH_IDS))) found = found.filter(function (f) { return f.id !== 'upfront' && f.id !== 'personal-account'; });
    urlFound.forEach(function (x) { found.push(x); });
    if (claim) found.push(claim);
    var payAsk = hasId(found, ['personal-account', 'advance-fee']) || PAY_ASK.test(scan);
    if (payAsk && hasId(found, OFFER_IDS)) {
      found.push({ id: 'combo-offer-pay', weight: 3,
        title: { id: 'Menawarkan sesuatu lalu meminta uang di awal', en: 'Offers something, then asks for money first' },
        explain: { id: 'Hadiah, kerja, pinjaman, atau investasi yang disusul permintaan uang di muka adalah pola penipuan biaya di muka yang paling umum.',
          en: 'A prize, job, loan, or investment followed by a request for money upfront is the most common advance-fee scam pattern.' } });
    }
    if ((payAsk || hasId(found, ['upfront'])) && (hasId(found, AUTH_IDS) || NEW_NUMBER.test(scan))) {
      found.push({ id: 'combo-authority-pay', weight: 3,
        title: { id: 'Mengaku pihak berwenang atau orang dekat lalu meminta uang', en: 'Claims to be an authority or loved one, then asks for money' },
        explain: { id: 'Aparat, lembaga, atasan, atau keluarga asli tidak meminta transfer mendadak lewat pesan. Hubungi mereka lewat nomor yang sudah kamu simpan.',
          en: 'Real officers, agencies, bosses, or relatives do not ask for sudden transfers by message. Reach them on a number you already have saved.' } });
    }
    if (payAsk && hasId(found, ['sextortion', 'legal-threat', 'threat'])) {
      found.push({ id: 'combo-coerce-pay', weight: 3,
        title: { id: 'Mengancam lalu meminta uang', en: 'Threatens, then asks for money' },
        explain: { id: 'Ancaman menyebarkan data atau memproses hukum yang disusul permintaan uang adalah pemerasan. Jangan bayar; simpan bukti dan laporkan.',
          en: 'A threat to leak data or take legal action followed by a payment request is extortion. Do not pay; keep the evidence and report it.' } });
    }
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
