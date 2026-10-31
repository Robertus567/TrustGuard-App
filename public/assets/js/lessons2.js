/**
 * lessons2.js : chapter latihan 21 sampai 40 (tautan, akun, belanja, medsos).
 * Format sama dengan lessons1.js. Semua contoh FIKTIF.
 */
(function () {
  'use strict';
  var C = window.TGL_C, O = window.TGL_O;

  /* ---------------- Tautan dan phishing ---------------- */
  C('link', ['SMS bank dengan domain aneh', 'Bank SMS with a strange domain'], ['SMS "Bank Nusa"', '"Bank Nusa" SMS'],
    ['Akun Anda dibekukan. Verifikasi di banknusa-verifikasi.xyz sekarang juga.', 'Your account is frozen. Verify at banknusa-verifikasi.xyz right now.'], [
      O('Klik, namanya mengandung nama bank', 'Click it, the name contains the bank\'s name', 0, 'Siapa pun bisa membuat domain yang memuat nama bank. Domain resmi bank tidak berakhiran .xyz.', 'Anyone can register a domain containing a bank\'s name. A bank\'s official domain does not end in .xyz.'),
      O('Klik tapi jangan isi data apa pun', 'Click but do not enter any data', 0, 'Lebih aman tidak membuka sama sekali. Halaman palsu bisa memancing atau memasang skrip.', 'It is safer not to open it at all. Fake pages can bait you or load scripts.'),
      O('Jangan klik. Buka aplikasi resmi bank atau ketik alamat resminya sendiri', 'Do not click. Open the bank\'s official app or type its official address yourself', 1, 'Tepat. Verifikasi lewat jalur yang kamu mulai sendiri.', 'Right. Verify through a route you start yourself.')]);
  C('link', ['Tautan pendek dari nomor asing', 'Short link from an unknown number'], ['Nomor tak dikenal', 'Unknown number'],
    ['Foto kamu viral! Lihat di bit.ly/f0t0kmu', 'Your photo went viral! See it at bit.ly/f0t0kmu'], [
      O('Klik karena penasaran', 'Click out of curiosity', 0, 'Rasa penasaran adalah umpan. Tautan pendek menyembunyikan tujuan sebenarnya.', 'Curiosity is the bait. A short link hides the real destination.'),
      O('Kirim ke teman dan tanya apakah aman', 'Forward it to friends and ask if it is safe', 0, 'Kamu justru menyebarkan tautan berbahaya ke orang lain.', 'You would spread a harmful link to other people.'),
      O('Abaikan dan blokir. Pesan memancing emosi dari orang asing tidak perlu ditanggapi', 'Ignore and block. An emotional lure from a stranger needs no reply', 1, 'Benar. Tujuan tautan pendek tidak terlihat, jadi jangan dibuka dari pengirim tak dikenal.', 'Correct. A short link\'s destination is hidden, so do not open it from unknown senders.')]);
  C('link', ['Email akun akan ditutup', 'Email says account will close'], ['support@akun-tokokita.co', 'support@akun-tokokita.co'],
    ['Akunmu akan ditutup dalam 24 jam. Klik tombol Pulihkan Akun untuk mempertahankannya.', 'Your account will be closed in 24 hours. Click Restore Account to keep it.'], [
      O('Klik Pulihkan Akun agar tidak ditutup', 'Click Restore Account so it stays open', 0, 'Batas 24 jam dibuat untuk menekanmu. Tombol di email bisa mengarah ke halaman palsu.', 'The 24 hour limit is meant to pressure you. A button in an email can lead to a fake page.'),
      O('Balas email dan tanya kebenarannya', 'Reply to the email to ask if it is real', 0, 'Balasan akan sampai ke pelaku, bukan ke layanan resmi.', 'Your reply goes to the attacker, not to the official service.'),
      O('Buka aplikasi resmi langsung dan lihat pemberitahuan di dalamnya', 'Open the official app directly and check notifications there', 1, 'Tepat. Jika memang ada masalah, akan terlihat di dalam aplikasi resmi.', 'Right. If there is a real problem, it will show inside the official app.')]);
  C('link', ['Stiker QR di meja kafe', 'QR sticker on a cafe table'], ['Meja kafe', 'Cafe table'],
    ['Stiker QR "Bayar di sini" tampak ditempel di atas QR asli di meja kafe.', 'A "Pay here" QR sticker seems to be stuck over the real QR code on a cafe table.'], [
      O('Pindai saja, ada logo QRIS', 'Just scan it, it has the QRIS logo', 0, 'Logo bisa ditempel siapa saja. QR palsu mengalihkan uang ke rekening penipu.', 'Anyone can print a logo. A fake QR sends your money to a scammer\'s account.'),
      O('Pindai lalu cek nama merchant setelah membayar', 'Scan and check the merchant name after paying', 0, 'Pengecekan harus sebelum membayar, karena sesudahnya uang sudah pindah.', 'Checking must happen before paying, because afterwards the money is gone.'),
      O('Tanya kasir, dan cocokkan nama merchant di aplikasi dengan nama kafe sebelum membayar', 'Ask the cashier and match the merchant name in your app with the cafe before paying', 1, 'Betul. Nama merchant yang tampil sebelum konfirmasi adalah pemeriksaan terbaik.', 'Correct. The merchant name shown before you confirm is the best check.')]);
  C('link', ['Wi-Fi gratis minta kartu kredit', 'Free Wi-Fi asks for a credit card'], ['Halaman login Wi-Fi mal', 'Mall Wi-Fi login page'],
    ['Wi-Fi gratis. Masukkan nomor kartu kredit untuk verifikasi usia sebelum terhubung.', 'Free Wi-Fi. Enter your credit card number to verify your age before connecting.'], [
      O('Masukkan, katanya hanya verifikasi usia', 'Enter it, it is only age verification', 0, 'Wi-Fi publik yang sah tidak membutuhkan nomor kartu. Itu cara mencuri data kartu.', 'Genuine public Wi-Fi does not need a card number. This is a way to steal card data.'),
      O('Masukkan kartu lama yang jarang dipakai', 'Enter an old card I rarely use', 0, 'Kartu lama tetap punya limit dan bisa disalahgunakan.', 'An old card still has a limit and can be abused.'),
      O('Jangan masukkan. Putuskan koneksi dan pakai data seluler', 'Do not enter it. Disconnect and use mobile data', 1, 'Tepat. Menghindari jaringan mencurigakan jauh lebih aman.', 'Right. Avoiding a suspicious network is much safer.')]);

  /* ---------------- Akun dan kata sandi ---------------- */
  C('account', ['Kode WhatsApp "salah kirim"', '"Wrongly sent" WhatsApp code'], ['Kontak yang akunnya diretas', 'A contact whose account was hacked'],
    ['Maaf, kode verifikasi WhatsApp salah terkirim ke nomormu. Bisa kirim balik kodenya?', 'Sorry, a WhatsApp verification code was sent to you by mistake. Can you send it back?'], [
      O('Kirim balik karena itu sopan', 'Send it back to be polite', 0, 'Kode itu dipakai pelaku untuk mengambil alih akun WhatsApp-mu.', 'The attacker uses that code to take over your WhatsApp account.'),
      O('Kirim sebagian angkanya saja', 'Send only some of the digits', 0, 'Sebagian angka tetap membantu penyerang dan tetap melanggar aturan "jangan dibagikan".', 'Part of the digits still helps the attacker and still breaks the "never share" rule.'),
      O('Jangan kirim. Aktifkan verifikasi dua langkah dan beri tahu temanmu lewat jalur lain', 'Do not send it. Turn on two-step verification and tell your friend through another channel', 1, 'Betul. Kode verifikasi tidak boleh dibagikan, siapa pun yang meminta.', 'Correct. A verification code must never be shared, whoever asks.')]);
  C('account', ['Notifikasi login perangkat asing', 'Login from an unknown device'], ['Notifikasi keamanan akun', 'Account security alert'],
    ['Ada login ke akunmu dari perangkat baru di negara lain, dan itu bukan kamu.', 'Your account was accessed from a new device in another country and it was not you.'], [
      O('Abaikan, mungkin hanya kesalahan sistem', 'Ignore it, probably a system glitch', 0, 'Menunda memberi waktu bagi pelaku untuk mengunci akunmu.', 'Waiting gives the attacker time to lock you out.'),
      O('Klik tautan di notifikasi untuk mengamankan akun', 'Click the link in the notification to secure the account', 0, 'Tautan di pesan bisa palsu. Buka aplikasi atau situs resmi dengan cara sendiri.', 'A link in a message can be fake. Open the official app or site yourself.'),
      O('Ganti kata sandi lewat aplikasi resmi, keluarkan semua sesi, dan aktifkan verifikasi dua langkah', 'Change the password in the official app, sign out all sessions, and turn on two-step verification', 1, 'Tepat. Langkah ini memutus akses pelaku dan memperkuat akunmu.', 'Right. These steps cut off the attacker and strengthen your account.')]);
  C('account', ['Satu kata sandi untuk semua', 'One password for everything'], ['Berita kebocoran data', 'Data breach news'],
    ['Kamu memakai satu kata sandi untuk email, medsos, dan e-wallet. Ada kabar salah satu layanan itu mengalami kebocoran data.', 'You use one password for email, social media, and e-wallet. One of those services reportedly had a data breach.'], [
      O('Ganti hanya kata sandi layanan yang bocor', 'Change only the breached service\'s password', 0, 'Kata sandi yang sama di akun lain sudah ikut terancam. Penyerang akan mencobanya di mana-mana.', 'The same password on other accounts is already at risk. Attackers will try it everywhere.'),
      O('Tambah angka di akhir kata sandi lama', 'Add a number to the end of my old password', 0, 'Variasi kecil mudah ditebak oleh alat otomatis.', 'Small variations are easy for automated tools to guess.'),
      O('Buat kata sandi unik di tiap akun, mulai dari email, dan aktifkan verifikasi dua langkah', 'Make a unique password per account, starting with email, and turn on two-step verification', 1, 'Betul. Email utama adalah kunci pemulihan semua akun lain.', 'Correct. Your main email is the recovery key for all other accounts.')]);
  C('account', ['Pop-up virus minta menelepon', 'Virus pop-up asks you to call'], ['Pop-up di browser', 'Browser pop-up'],
    ['PERINGATAN! Perangkatmu terinfeksi 5 virus. Segera hubungi 0812-0000-1111 untuk bantuan teknisi.', 'WARNING! Your device is infected with 5 viruses. Call 0812-0000-1111 now for a technician.'], [
      O('Telepon nomornya untuk minta bantuan', 'Call the number for help', 0, 'Nomor itu milik penipu yang akan meminta akses jarak jauh atau pembayaran.', 'That number belongs to a scammer who will ask for remote access or payment.'),
      O('Unduh pembersih yang ditawarkan pop-up', 'Download the cleaner the pop-up offers', 0, 'Tombol unduh itu sendiri biasanya perangkat lunak berbahaya.', 'The download itself is usually the malware.'),
      O('Tutup tab atau browser, jangan telepon, lalu jalankan pemindaian dari aplikasi keamanan resmi', 'Close the tab or browser, do not call, then scan with an official security app', 1, 'Benar. Peringatan sungguhan tidak muncul sebagai pop-up berisi nomor telepon.', 'Correct. Real warnings do not appear as pop-ups with a phone number.')]);
  C('account', ['Akunmu mengirim tautan aneh', 'Your account sends strange links'], ['Pesan dari teman', 'Message from a friend'],
    ['Temanmu bilang akun Instagram-mu mengirim tautan investasi, padahal kamu tidak merasa mengirimnya.', 'A friend says your Instagram account sent an investment link, but you did not send anything.'], [
      O('Hapus aplikasi dan anggap selesai', 'Delete the app and call it done', 0, 'Akun tetap berada di tangan pelaku walau aplikasinya dihapus.', 'The account stays in the attacker\'s hands even if you delete the app.'),
      O('Posting klarifikasi saja', 'Just post a clarification', 0, 'Klarifikasi tanpa mengamankan akun membuat pelaku terus beraksi.', 'A clarification without securing the account lets the attacker keep going.'),
      O('Ganti kata sandi dari perangkat aman, keluarkan semua sesi, aktifkan verifikasi dua langkah, lalu peringatkan teman', 'Change the password from a safe device, sign out all sessions, enable two-step verification, then warn friends', 1, 'Tepat. Amankan akun dulu, baru beri tahu orang lain agar tidak klik.', 'Right. Secure the account first, then tell others not to click.')]);

  /* ---------------- Belanja dan pembayaran ---------------- */
  C('shop', ['HP murah, transfer penuh', 'Cheap phone, full transfer'], ['Akun toko di medsos', 'Social media shop account'],
    ['iPhone baru Rp3 juta, stok terakhir. Transfer penuh ke rekening pribadi, tidak bisa COD.', 'Brand new iPhone for Rp3 million, last stock. Full transfer to a personal account, no cash on delivery.'], [
      O('Transfer separuh dulu', 'Transfer half first', 0, 'Separuh uangmu tetap hilang jika penjualnya palsu. Harga jauh di bawah pasar adalah tanda bahaya.', 'Half your money is still lost if the seller is fake. A price far below market is a red flag.'),
      O('Percaya karena banyak testimoni', 'Trust it because of many testimonials', 0, 'Testimoni bisa dibuat atau dicuri dari toko lain.', 'Testimonials can be made up or stolen from other shops.'),
      O('Pakai pembayaran resmi marketplace atau rekber, dan cek rekening di cekrekening.id', 'Use the marketplace\'s official payment or escrow and check the account at cekrekening.id', 1, 'Tepat. Jalur resmi menahan uang sampai barang diterima.', 'Right. Official channels hold the money until you receive the item.')]);
  C('shop', ['Pembeli "kelebihan transfer"', 'Buyer "overpaid"'], ['Chat pembeli', 'Buyer chat'],
    ['Maaf, aku kelebihan transfer Rp2 juta. Tolong kembalikan dulu ya, ini screenshot bukti transfernya.', 'Sorry, I overpaid by Rp2 million. Please refund it first, here is a screenshot of the transfer.'], [
      O('Kembalikan karena buktinya terlihat asli', 'Refund it because the proof looks real', 0, 'Screenshot mudah dipalsukan dan bukan bukti uang sudah masuk.', 'Screenshots are easy to fake and do not prove the money arrived.'),
      O('Kirim barang dulu, selisihnya diurus nanti', 'Ship the item first, sort out the difference later', 0, 'Kamu kehilangan barang dan uang bila transfernya palsu.', 'You lose both the item and the money if the transfer is fake.'),
      O('Cek mutasi rekening sendiri lewat aplikasi bank. Jika tidak ada dana masuk, jangan kembalikan apa pun', 'Check your own account statement in the bank app. If no funds arrived, refund nothing', 1, 'Benar. Satu-satunya bukti yang sah adalah mutasi di rekeningmu.', 'Correct. The only valid proof is the statement in your own account.')]);
  C('shop', ['Diajak bayar di luar marketplace', 'Asked to pay outside the marketplace'], ['Penjual di marketplace', 'Marketplace seller'],
    ['Chat di sini saja ya, bayar langsung ke rekening saya biar lebih murah dari harga di marketplace.', 'Let us chat here instead, pay my account directly so it is cheaper than the marketplace price.'], [
      O('Pindah dan bayar langsung karena lebih murah', 'Move over and pay directly because it is cheaper', 0, 'Di luar platform tidak ada perlindungan pembeli jika barang tidak datang.', 'Outside the platform there is no buyer protection if the item never arrives.'),
      O('Bayar setengah saja dulu', 'Pay only half first', 0, 'Risiko tetap sama, hanya kerugiannya yang lebih kecil.', 'The risk is the same, only the loss is smaller.'),
      O('Tetap bertransaksi lewat platform agar dana dan sengketa terlindungi', 'Keep transacting on the platform so funds and disputes stay protected', 1, 'Tepat. Penjual yang menghindari platform patut dicurigai.', 'Right. A seller who avoids the platform is suspicious.')]);
  C('shop', ['Tiket konser dari calo', 'Concert tickets from a scalper'], ['DM "penjual tiket"', '"Ticket seller" DM'],
    ['Tiket konser sold out, aku ada 2 harga normal. Transfer dulu, e-tiket dikirim H-1.', 'The concert is sold out, I have 2 tickets at face value. Transfer first, e-tickets sent the day before.'], [
      O('Transfer karena tiketnya langka', 'Transfer because the tickets are scarce', 0, 'Kelangkaan adalah alasan klasik untuk menekan pembeli. Tiket bisa fiktif atau dijual ganda.', 'Scarcity is the classic reason to pressure buyers. Tickets can be fake or sold twice.'),
      O('Minta foto tiketnya sebagai bukti', 'Ask for a photo of the ticket as proof', 0, 'Foto tiket bisa disalin dan dijual ke banyak orang.', 'A ticket photo can be copied and sold to many people.'),
      O('Beli hanya dari penjual atau platform resmi penyelenggara', 'Buy only from the organizer\'s official seller or platform', 1, 'Betul. Tiket resmi terikat pada sistem penyelenggara dan bisa diverifikasi.', 'Correct. Official tickets are tied to the organizer\'s system and can be verified.')]);
  C('shop', ['Refund palsu dari "admin"', 'Fake refund from an "admin"'], ['Chat "Admin Toko Resmi"', '"Official Store Admin" chat'],
    ['Pesananmu dibatalkan. Refund diproses, kirim kode OTP yang masuk agar dana kembali ke rekeningmu.', 'Your order was cancelled. A refund is being processed, send the OTP you receive so the money returns to your account.'], [
      O('Kirim OTP agar uangnya kembali', 'Send the OTP so I get my money back', 0, 'Refund tidak pernah membutuhkan OTP. Kode itu justru dipakai untuk menarik uangmu.', 'A refund never needs an OTP. That code is used to take your money.'),
      O('Klik tautan refund yang dikirim admin', 'Click the refund link the admin sent', 0, 'Tautan itu bisa mengarah ke halaman pencuri data.', 'That link can lead to a data-stealing page.'),
      O('Cek status pesanan di aplikasi marketplace dan hubungi layanan pelanggan resmi dari dalam aplikasi', 'Check the order status in the marketplace app and contact official support from inside it', 1, 'Tepat. Status dan refund sungguhan terlihat di dalam aplikasi resmi.', 'Right. Real status and refunds show up inside the official app.')]);

  /* ---------------- Medsos dan hoaks ---------------- */
  C('social', ['Kenalan romantis minta uang darurat', 'Online romance asks for emergency money'], ['Kenalan online "Alex"', 'Online acquaintance "Alex"'],
    ['Sayang, koperku ditahan bea cukai di bandara. Bisa kirim Rp4 juta? Kuganti begitu aku sampai.', 'Darling, my suitcase is held at customs. Can you send Rp4 million? I will repay you when I arrive.'], [
      O('Kirim, aku percaya padanya', 'Send it, I trust him', 0, 'Penipuan asmara membangun kedekatan lama lalu meminta uang saat "darurat".', 'Romance scams build closeness over time, then ask for money in an "emergency".'),
      O('Kirim sebagian saja', 'Send only part of it', 0, 'Permintaan akan berlanjut dengan alasan baru dan jumlah lebih besar.', 'Requests will continue with new reasons and bigger amounts.'),
      O('Berhenti transfer, minta video call langsung, dan ceritakan ke orang yang kamu percaya', 'Stop transfers, ask for a live video call, and tell someone you trust', 1, 'Tepat. Menolak video call dan terus meminta uang adalah tanda bahaya.', 'Right. Refusing video calls while asking for money is a red flag.')]);
  C('social', ['Ancaman menyebar foto pribadi', 'Threat to leak private photos'], ['Akun anonim', 'Anonymous account'],
    ['Aku punya fotomu. Kirim Rp3 juta atau kusebar ke semua kontakmu.', 'I have your photos. Send Rp3 million or I will share them with all your contacts.'], [
      O('Bayar saja agar selesai', 'Just pay to end it', 0, 'Membayar biasanya tidak menghentikan ancaman. Pelaku akan meminta lagi.', 'Paying usually does not stop the threats. The attacker will ask again.'),
      O('Negosiasi harga yang lebih rendah', 'Negotiate a lower price', 0, 'Berinteraksi memberi pelaku kendali dan menunjukkan kamu takut.', 'Engaging gives the attacker control and shows that you are scared.'),
      O('Jangan bayar, hentikan kontak, simpan bukti, blokir, dan laporkan ke platform serta pihak berwajib', 'Do not pay, stop contact, keep evidence, block, and report to the platform and the authorities', 1, 'Benar. Ini pemerasan. Kamu tidak sendirian dan bisa mencari bantuan, misalnya lewat SAPA 129.', 'Correct. This is blackmail. You are not alone and can seek help, for example through SAPA 129.')]);
  C('social', ['Broadcast "sebarkan sebelum jam 12"', '"Share before noon" broadcast'], ['Grup keluarga', 'Family group chat'],
    ['SEBARKAN! Besok air PDAM diracun, jangan minum. Kirim ke 10 grup sebelum jam 12.', 'SHARE! Tap water will be poisoned tomorrow, do not drink it. Send to 10 groups before noon.'], [
      O('Sebarkan, lebih baik berjaga-jaga', 'Share it, better safe than sorry', 0, 'Hoaks yang disebar menimbulkan panik dan kerugian nyata bagi banyak orang.', 'A spread hoax causes panic and real harm to many people.'),
      O('Sebarkan dengan tambahan "belum tentu benar"', 'Share it with a note "might not be true"', 0, 'Tambahan itu biasanya terpotong, dan pesannya tetap menyebar.', 'That note is usually cut off, and the message still spreads.'),
      O('Jangan sebarkan. Cek dulu di situs pemerintah, media tepercaya, atau situs cek fakta', 'Do not share it. Check government sites, trusted media, or fact-checking sites first', 1, 'Tepat. Desakan "sebarkan sekarang" adalah ciri hoaks.', 'Right. An urgent "share now" demand is a hoax trait.')]);
  C('social', ['Posting foto tiket dengan barcode', 'Posting a ticket photo with a barcode'], ['Dirimu sendiri', 'Yourself'],
    ['Kamu ingin memposting foto boarding pass dan resi paket di medsos.', 'You want to post a photo of your boarding pass and parcel receipt on social media.'], [
      O('Posting utuh, hanya foto biasa', 'Post it whole, it is just a photo', 0, 'Barcode dan nomor di dalamnya bisa dibaca dan dipakai untuk mengubah pesanan atau mengakses data.', 'Barcodes and numbers can be read and used to alter bookings or access data.'),
      O('Posting di story saja karena hilang 24 jam', 'Post it in a story since it disappears in 24 hours', 0, 'Orang bisa menangkap layar kapan saja dalam 24 jam itu.', 'Anyone can screenshot it at any time within those 24 hours.'),
      O('Tutup barcode, nama, dan nomor sebelum memposting', 'Cover the barcode, name, and numbers before posting', 1, 'Betul. Menyensor data pribadi mengurangi risiko tanpa menghilangkan keseruan berbagi.', 'Correct. Covering personal data cuts risk without losing the fun of sharing.')]);
  C('social', ['Suara adik tiruan AI', 'A cloned voice of your sibling'], ['Telepon nomor tak dikenal', 'Call from an unknown number'],
    ['Suara mirip adikmu: "Kak, aku kecelakaan! Tolong transfer Rp5 juta sekarang, jangan telepon siapa-siapa!"', 'A voice like your sibling: "Sis, I had an accident! Please transfer Rp5 million now, do not call anyone!"'], [
      O('Transfer, suaranya persis adikku', 'Transfer, it sounds exactly like my sibling', 0, 'Suara kini bisa ditiru dengan teknologi AI. Kemiripan suara bukan bukti identitas.', 'Voices can now be cloned with AI. A similar voice is not proof of identity.'),
      O('Tanya beberapa hal lewat telepon yang sama', 'Ask a few questions on the same call', 0, 'Pelaku bisa menjawab dari informasi yang sudah ia kumpulkan, dan ia menekanmu agar tidak menutup telepon.', 'The caller can answer from information already gathered and pressures you not to hang up.'),
      O('Tutup telepon lalu hubungi adikmu lewat nomor tersimpan, atau tanyakan kata sandi keluarga', 'Hang up and call your sibling on their saved number, or ask for the family passphrase', 1, 'Tepat. Kata sandi keluarga dan menelepon balik memutus penyamaran.', 'Right. A family passphrase and calling back break the impersonation.')]);
})();
