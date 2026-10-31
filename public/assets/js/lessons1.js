/**
 * lessons1.js : kategori dan chapter latihan 1 sampai 20.
 *
 * Format satu chapter: C(kategori, [judul ID, judul EN], [pengirim ID, EN], [pesan ID, EN], [pilihan1, pilihan2, pilihan3])
 * Format satu pilihan: O(teks ID, teks EN, benar?(1/0), alasan ID, alasan EN)
 * Semua contoh FIKTIF: nama merek dan tautan hanya rekaan untuk latihan.
 * Urutan pilihan diacak otomatis saat ditampilkan.
 */
(function () {
  'use strict';
  var TGL = window.TGL = { cats: [], list: [] };
  TGL.cats = [
    { k: 'job', id: 'Lowongan kerja', en: 'Job offers', c: '#5eead4' },
    { k: 'prize', id: 'Hadiah dan giveaway', en: 'Prizes and giveaways', c: '#f3d9a4' },
    { k: 'people', id: 'Penyamaran', en: 'Impersonation', c: '#ff9bb3' },
    { k: 'money', id: 'Investasi dan pinjaman', en: 'Investment and loans', c: '#8b9cff' },
    { k: 'link', id: 'Tautan dan phishing', en: 'Links and phishing', c: '#ffb454' },
    { k: 'account', id: 'Akun dan kata sandi', en: 'Accounts and passwords', c: '#7ee0ff' },
    { k: 'shop', id: 'Belanja dan pembayaran', en: 'Shopping and payments', c: '#a3e635' },
    { k: 'social', id: 'Medsos dan hoaks', en: 'Social media and hoaxes', c: '#c4a7ff' }
  ];
  function O(ti, te, ok, ri, re) { return { t: { id: ti, en: te }, ok: !!ok, r: { id: ri, en: re } }; }
  window.TGL_O = O;
  window.TGL_C = function (cat, title, from, msg, opts) {
    TGL.list.push({ n: TGL.list.length + 1, cat: cat, title: { id: title[0], en: title[1] }, from: { id: from[0], en: from[1] }, msg: { id: msg[0], en: msg[1] }, opts: opts });
  };
  var C = window.TGL_C;

  /* ---------------- Lowongan kerja ---------------- */
  C('job', ['Biaya seragam sebelum kerja', 'Uniform fee before the job'], ['HRD PT Nusa Karya (WhatsApp)', 'HR of Nusa Karya Ltd (WhatsApp)'],
    ['Selamat, kamu lolos! Transfer Rp350.000 untuk seragam dan pelatihan hari ini agar kursimu aman.', 'Congrats, you passed! Transfer Rp350,000 for uniform and training today to secure your seat.'], [
      O('Transfer sekarang supaya tidak hangus', 'Transfer now so I do not lose it', 0, 'Perusahaan yang sah tidak memungut biaya rekrutmen. Tekanan "hari ini" membuatmu tidak sempat memeriksa.', 'Legitimate employers do not charge recruitment fees. The "today" pressure stops you from checking.'),
      O('Tolak membayar, cek perusahaan lewat situs dan kontak resmi yang kamu cari sendiri', 'Refuse to pay and check the company through its official site and contacts you find yourself', 1, 'Tepat. Biaya di awal adalah tanda utama lowongan palsu, dan verifikasi mandiri memutus kendali penipu.', 'Right. An upfront fee is the main sign of a fake job, and verifying on your own breaks the scammer\'s control.'),
      O('Tawar biayanya jadi Rp150.000', 'Haggle the fee down to Rp150,000', 0, 'Menawar berarti menganggap biaya itu wajar. Masalahnya bukan nominal, tetapi permintaan bayar di awal.', 'Haggling treats the fee as normal. The problem is not the amount but paying upfront.')]);
  C('job', ['Tugas like dan subscribe berbayar', 'Paid like-and-subscribe tasks'], ['Admin "Kerja Santai Online"', '"Easy Online Work" admin'],
    ['Like video, dapat Rp10.000 per tugas. Setelah 3 tugas gratis, naik level dengan deposit Rp200.000 agar komisi lebih besar.', 'Like videos, earn Rp10,000 per task. After 3 free tasks, level up with a Rp200,000 deposit for bigger commissions.'], [
      O('Lanjut deposit, 3 tugas pertama kan benar-benar dibayar', 'Deposit, since the first 3 tasks really paid', 0, 'Bayaran kecil di awal adalah umpan untuk membangun kepercayaan. Setoran berikutnya makin besar dan sulit ditarik.', 'Small early payouts are bait to build trust. Later deposits get bigger and are hard to withdraw.'),
      O('Berhenti dan jangan setor. Tugas yang menuntut deposit adalah skema penipuan', 'Stop and do not deposit. Tasks that demand a deposit are a scam scheme', 1, 'Benar. Pekerjaan sungguhan membayar kamu, bukan sebaliknya.', 'Correct. Real jobs pay you, not the other way around.'),
      O('Ajak teman ikut supaya dapat bonus', 'Invite friends to get a bonus', 0, 'Kamu akan menyeret orang lain ke skema yang sama dan ikut menyebarkan kerugian.', 'You would drag others into the same scheme and spread the losses.')]);
  C('job', ['Wawancara minta KTP dan selfie', 'Interview asks for ID and selfie'], ['Rekruter via chat', 'Recruiter via chat'],
    ['Wawancara lewat chat saja. Kirim foto KTP dan selfie memegang KTP untuk verifikasi, kontrak menyusul.', 'The interview is by chat only. Send a photo of your ID and a selfie holding it for verification, contract to follow.'], [
      O('Kirim semuanya supaya cepat diproses', 'Send everything so it is processed fast', 0, 'KTP dan selfie KTP dipakai untuk membuka pinjaman atau akun atas namamu.', 'ID photos and ID selfies are used to open loans or accounts in your name.'),
      O('Kirim KTP saja tanpa selfie', 'Send only the ID without the selfie', 0, 'KTP saja tetap bisa disalahgunakan. Risikonya hanya sedikit lebih kecil.', 'The ID alone can still be misused. The risk is only slightly smaller.'),
      O('Minta wawancara resmi dan identitas perusahaan dulu, kirim data hanya setelah terverifikasi', 'Ask for a proper interview and company identity first, share data only once verified', 1, 'Tepat. Data identitas baru diberikan setelah pihak penerimanya terbukti sah.', 'Right. Identity data is shared only after the receiving party is proven genuine.')]);
  C('job', ['Magang luar negeri bayar visa', 'Overseas internship visa fee'], ['"Perekrut" magang Jepang', '"Recruiter" for a Japan internship'],
    ['Magang di Jepang gaji Rp25 juta. Bayar Rp8 juta ke rekening pribadi saya untuk visa, tiket ditanggung.', 'Internship in Japan, Rp25 million pay. Pay Rp8 million to my personal account for the visa, ticket covered.'], [
      O('Transfer, visa memang mahal', 'Transfer, visas are expensive', 0, 'Visa diurus lewat jalur resmi, bukan rekening pribadi perorangan.', 'Visas go through official channels, not an individual\'s personal account.'),
      O('Minta foto paspor perekrut sebagai bukti', 'Ask for a photo of the recruiter\'s passport as proof', 0, 'Foto dokumen mudah dipalsukan dan tidak membuktikan program itu ada.', 'Document photos are easy to fake and do not prove the program exists.'),
      O('Periksa program lewat kampus atau instansi resmi dan jangan bayar ke rekening pribadi', 'Check the program through your campus or an official agency and never pay a personal account', 1, 'Betul. Program resmi bisa dikonfirmasi lewat lembaga yang bertanggung jawab.', 'Correct. Genuine programs can be confirmed with the responsible institution.')]);
  C('job', ['Formulir kerja minta PIN ATM', 'Job form asks for ATM PIN'], ['Formulir "HRD Karir Cepat"', '"Fast Career HR" form'],
    ['Isi formulir berikut termasuk nomor rekening dan PIN ATM untuk uji coba transfer gaji pertama.', 'Fill in this form including your account number and ATM PIN for a test of your first salary transfer.'], [
      O('Isi semuanya, formulirnya resmi karena dibuat di Google', 'Fill everything, it is official because it is on Google', 0, 'Formulir bisa dibuat siapa saja. Nama platform bukan jaminan pembuatnya tepercaya.', 'Anyone can create a form. The platform name does not make its creator trustworthy.'),
      O('Isi PIN lalu ganti setelah selesai', 'Fill in the PIN and change it afterwards', 0, 'Begitu PIN terkirim, penipu bisa langsung memakainya sebelum kamu sempat menggantinya.', 'Once the PIN is sent, scammers can use it before you get a chance to change it.'),
      O('Jangan isi PIN. Pemberi kerja sah tidak pernah memintanya, dan laporkan formulirnya', 'Never enter the PIN. Genuine employers never ask for it. Report the form', 1, 'Benar. PIN tidak boleh dibagikan kepada siapa pun, apa pun alasannya.', 'Correct. A PIN must never be shared with anyone, whatever the reason.')]);

  /* ---------------- Hadiah dan giveaway ---------------- */
  C('prize', ['Menang undian, bayar ongkir', 'Won a draw, pay shipping'], ['SMS "Panitia Undian Nasional"', '"National Draw Committee" SMS'],
    ['Selamat! Kamu pemenang undian Rp50 juta. Bayar ongkos kirim Rp500.000 agar hadiah dikirim.', 'Congratulations! You won Rp50 million. Pay Rp500,000 shipping so the prize can be sent.'], [
      O('Bayar, ongkirnya kecil dibanding hadiahnya', 'Pay, the fee is small compared to the prize', 0, 'Nominal kecil adalah umpan. Setelah membayar biasanya muncul biaya lain.', 'A small amount is bait. After paying, more fees usually appear.'),
      O('Abaikan, kamu tidak ikut undian apa pun. Cek lewat akun resmi penyelenggara bila ragu', 'Ignore it, you never entered any draw. Check the organizer\'s official account if unsure', 1, 'Tepat. Hadiah yang tidak kamu ikuti dan meminta biaya hampir pasti penipuan.', 'Right. A prize you did not enter that asks for a fee is almost certainly a scam.'),
      O('Balas dan minta bukti kemenangan', 'Reply and ask for proof of winning', 0, 'Penipu bisa membuat "bukti" palsu dalam menit. Membalas juga menandai nomormu aktif.', 'Scammers can fabricate "proof" in minutes. Replying also marks your number as active.')]);
  C('prize', ['Giveaway minta login', 'Giveaway asks you to log in'], ['Akun @giveaway.cuan.id', '@giveaway.cuan.id account'],
    ['Klaim hadiah! Masuk dengan akun Instagram kamu lewat tautan ini untuk verifikasi pemenang.', 'Claim your prize! Log in with your Instagram account through this link to verify the winner.'], [
      O('Login, halamannya mirip Instagram asli', 'Log in, the page looks like the real Instagram', 0, 'Tampilan mudah ditiru. Yang menentukan adalah alamat situsnya, bukan rupanya.', 'Looks are easy to copy. What matters is the site address, not appearance.'),
      O('Login pakai akun cadangan saja', 'Log in with a spare account', 0, 'Akun cadangan tetap bisa diambil alih, dan kata sandinya sering sama dengan akun utama.', 'A spare account can still be taken over, and its password is often the same as your main one.'),
      O('Jangan login lewat tautan. Periksa apakah akun giveaway itu asli dan diumumkan resmi', 'Do not log in through a link. Check whether the giveaway account is genuine and officially announced', 1, 'Benar. Penyelenggara sah tidak meminta kata sandi untuk memberi hadiah.', 'Correct. Genuine organizers never ask for your password to give a prize.')]);
  C('prize', ['Voucher gratis dan sebar ke 10 grup', 'Free voucher, share to 10 groups'], ['Pop-up survei "Voucher Rp500.000"', '"Rp500,000 voucher" survey pop-up'],
    ['Isi survei 2 menit, dapat voucher Rp500.000. Setelah itu bagikan ke 10 grup agar voucher aktif.', 'Complete a 2 minute survey for a Rp500,000 voucher. Then share it to 10 groups to activate it.'], [
      O('Isi survei saja, tidak usah dibagikan', 'Fill in the survey but do not share it', 0, 'Data pribadi yang kamu isi tetap terkumpul dan bisa dijual atau disalahgunakan.', 'The personal data you enter is still collected and can be sold or abused.'),
      O('Bagikan ke 10 grup demi voucher', 'Share to 10 groups for the voucher', 0, 'Kamu menyebarkan penipuan ke orang yang percaya padamu.', 'You would spread the scam to people who trust you.'),
      O('Tutup halaman. Voucher resmi diumumkan di kanal resmi merek, bukan lewat paksaan membagikan', 'Close the page. Real vouchers are announced on the brand\'s official channels, not by forcing shares', 1, 'Tepat. Syarat "sebarkan dulu" adalah cara penipuan menyebar sendiri.', 'Right. A "share first" condition is how scams spread by themselves.')]);
  C('prize', ['Hadiah provider berkas APK', 'Carrier prize APK file'], ['SMS "Provider Seluler"', '"Mobile Carrier" SMS'],
    ['Kamu terpilih! Unduh aplikasi hadiah di tautan ini (hadiah.apk) lalu login untuk mengambil poinmu.', 'You were selected! Download the prize app at this link (hadiah.apk) and log in to collect your points.'], [
      O('Pasang, antivirus di HP akan melindungiku', 'Install it, my phone antivirus will protect me', 0, 'APK berbahaya bisa membaca SMS dan OTP, dan tidak selalu tertangkap antivirus.', 'A harmful APK can read SMS and OTPs and is not always caught by antivirus.'),
      O('Jangan pasang APK dari luar toko resmi. Hapus pesan dan laporkan nomornya', 'Never install an APK from outside official stores. Delete the message and report the number', 1, 'Benar. Aplikasi resmi hanya dipasang dari toko aplikasi resmi.', 'Correct. Genuine apps are installed only from official app stores.'),
      O('Pasang di HP lama yang jarang dipakai', 'Install it on an old phone I rarely use', 0, 'Akun yang login dan kontak di HP itu tetap bisa bocor.', 'Accounts logged in and contacts on that phone can still leak.')]);
  C('prize', ['Transfer verifikasi kecil', 'Small verification transfer'], ['DM "influencer" terverifikasi palsu', 'Fake "verified influencer" DM'],
    ['Kak, kamu menang giveaway! Transfer Rp5.000 dulu untuk verifikasi rekening, hadiah Rp2 juta langsung kami kirim.', 'You won a giveaway! Transfer Rp5,000 first to verify your account, then we send the Rp2 million prize.'], [
      O('Transfer saja, cuma Rp5.000', 'Just transfer it, it is only Rp5,000', 0, 'Transfer kecil membuktikan rekeningmu aktif dan membuka pintu permintaan berikutnya.', 'A small transfer proves your account is active and opens the door to the next request.'),
      O('Kirim nomor rekening saja supaya hadiah masuk', 'Send my account number so the prize can arrive', 0, 'Nomor rekening dan nama pemilik bisa dipakai untuk penipuan lanjutan.', 'Your account number and holder name can be used for follow-up scams.'),
      O('Abaikan dan laporkan akunnya. Hadiah sungguhan tidak memerlukan transfer dari pemenang', 'Ignore and report the account. Real prizes never need a transfer from the winner', 1, 'Tepat. Pemberi hadiah tidak meminta uang dari penerima.', 'Right. Prize givers do not ask the recipient for money.')]);
  /* ---------------- Penyamaran ---------------- */
  C('people', ['Teman ganti nomor minta uang', 'A friend\'s new number asks for money'], ['Nomor baru "Dimas"', 'New number "Dimas"'],
    ['Hai, ini aku Dimas. Nomor lama hilang. Bisa transfer Rp1.500.000? Mendesak, nanti kuganti.', 'Hi, it is Dimas. I lost my old number. Can you transfer Rp1,500,000? Urgent, I will pay you back.'], [
      O('Transfer karena kasihan', 'Transfer out of sympathy', 0, 'Rasa iba adalah pintu masuk penipu. Identitasnya belum dipastikan.', 'Sympathy is the scammer\'s way in. The identity has not been confirmed.'),
      O('Telepon nomor lama Dimas atau hubungi teman bersama sebelum mengirim apa pun', 'Call Dimas\'s old number or contact a mutual friend before sending anything', 1, 'Betul. Verifikasi lewat jalur lain memastikan itu benar dia.', 'Correct. Verifying through another channel confirms it is really him.'),
      O('Tanya pertanyaan pribadi lewat chat saja', 'Ask personal questions by chat only', 0, 'Penipu sering sudah mengumpulkan info dari medsos. Suara atau video lebih sulit dipalsukan.', 'Scammers often gather info from social media. Voice or video is harder to fake.')]);
  C('people', ['"Ibu" pakai nomor baru', '"Mom" on a new number'], ['Nomor tak dikenal mengaku Ibu', 'Unknown number claiming to be Mom'],
    ['Nak, HP ibu rusak, ini nomor baru. Tolong transfer ke rekening teman ibu ya, jangan bilang ayah dulu.', 'Hey, my phone broke, this is my new number. Please transfer to a friend\'s account, and do not tell Dad yet.'], [
      O('Transfer, orang tua yang minta', 'Transfer, my parent is asking', 0, 'Dua tanda bahaya sekaligus: nomor baru dan permintaan merahasiakan dari keluarga.', 'Two red flags at once: a new number and a request to hide it from family.'),
      O('Minta foto ibu sebagai bukti', 'Ask for a photo of her as proof', 0, 'Foto mudah diambil dari medsos dan tidak membuktikan siapa yang mengetik.', 'Photos are easy to take from social media and do not prove who is typing.'),
      O('Telepon nomor ibu yang lama atau tanya ayah dan keluarga dulu', 'Call her old number or ask Dad and the family first', 1, 'Tepat. Verifikasi lewat nomor lama dan keluarga memutus skenario penipu.', 'Right. Verifying via the old number and family breaks the scammer\'s script.')]);
  C('people', ['Kurir minta pasang aplikasi resi', 'Courier asks for a receipt app'], ['SMS "Kurir Cepat Express"', '"Fast Courier Express" SMS'],
    ['Paketmu gagal dikirim. Lihat foto resi dan alamat di aplikasi ini: resi-paket.apk', 'Your parcel failed to deliver. See the receipt photo and address in this app: resi-paket.apk'], [
      O('Pasang aplikasinya agar paket tidak hilang', 'Install the app so the parcel is not lost', 0, 'Berkas APK dari pesan adalah modus pencurian data yang sangat umum.', 'An APK from a message is a very common data theft trick.'),
      O('Balas "STOP" agar pesannya berhenti', 'Reply "STOP" to end the messages', 0, 'Membalas mengonfirmasi nomormu aktif, sehingga makin banyak pesan serupa datang.', 'Replying confirms your number is active, so more such messages follow.'),
      O('Jangan pasang. Cek resi lewat aplikasi atau situs resmi ekspedisi dan marketplace tempatmu belanja', 'Do not install it. Check the receipt in the courier\'s or marketplace\'s official app or site', 1, 'Benar. Status paket sungguhan bisa dicek di kanal resmi tanpa aplikasi tambahan.', 'Correct. Real parcel status can be checked on official channels without extra apps.')]);
  C('people', ['Telepon "CS bank" minta OTP', '"Bank support" call asks for OTP'], ['Telepon "Bank Nusa"', '"Bank Nusa" phone call'],
    ['Ada transaksi Rp9 juta yang mencurigakan. Untuk memblokirnya, sebutkan kode OTP yang baru masuk ke HP Anda.', 'There is a suspicious Rp9 million transaction. To block it, read out the OTP you just received.'], [
      O('Sebutkan OTP agar transaksinya diblokir', 'Read out the OTP so it gets blocked', 0, 'OTP justru dipakai untuk menyetujui transaksi atau mengambil alih akun.', 'The OTP is exactly what approves a transaction or takes over an account.'),
      O('Minta nama dan ID petugas dulu', 'Ask for the officer\'s name and ID first', 0, 'Nama dan ID bisa dikarang di tempat. Kamu tetap bicara dengan pihak yang menelepon.', 'Names and IDs can be invented on the spot. You are still talking to whoever called.'),
      O('Tutup telepon lalu hubungi nomor resmi di kartu atau aplikasi bank', 'Hang up and call the official number on your card or in the bank app', 1, 'Tepat. Kamu yang memulai panggilan ke kanal resmi, bukan sebaliknya.', 'Right. You start the call to the official channel, not the other way round.')]);
  C('people', ['"Dosen" minta beli voucher', 'A fake lecturer wants vouchers'], ['Chat "Pak Hendra"', '"Mr. Hendra" chat'],
    ['Ini Pak Hendra, saya sedang rapat. Tolong belikan 5 voucher game Rp500.000 dan kirim kodenya, rahasiakan dulu ya.', 'This is Mr. Hendra, I am in a meeting. Please buy 5 Rp500,000 game vouchers and send the codes, keep it quiet for now.'], [
      O('Belikan segera, dosen yang minta', 'Buy them now, my lecturer asked', 0, 'Otoritas palsu ditambah permintaan merahasiakan adalah pola klasik impersonasi.', 'Fake authority plus a request for secrecy is the classic impersonation pattern.'),
      O('Beli 1 voucher dulu sebagai tes', 'Buy 1 voucher first as a test', 0, 'Kode voucher yang terkirim tidak bisa ditarik kembali, berapa pun jumlahnya.', 'A voucher code, once sent, cannot be taken back, however few there are.'),
      O('Verifikasi lewat kanal resmi kampus atau telepon langsung ke dosen', 'Verify through official campus channels or call the lecturer directly', 1, 'Betul. Permintaan mendadak dari atasan harus dikonfirmasi lewat jalur lain.', 'Correct. A sudden request from a superior must be confirmed through another channel.')]);

  /* ---------------- Investasi dan pinjaman ---------------- */
  C('money', ['Cuan harian 5 persen', '5 percent daily profit'], ['Grup "Emas Digital Sultan"', '"Digital Gold Sultan" group'],
    ['Untung 5% per hari, modal kembali. Minimal Rp1 juta, dibatasi 20 slot, banyak testimoni di grup!', '5% profit per day, capital back. Minimum Rp1 million, only 20 slots, lots of testimonials in the group!'], [
      O('Coba dulu dengan Rp1 juta', 'Try it with Rp1 million first', 0, 'Janji untung pasti adalah tanda bahaya terbesar. Uang yang disetor sering tidak bisa ditarik.', 'A guaranteed profit promise is the biggest red flag. Deposited money often cannot be withdrawn.'),
      O('Ikut karena banyak testimoni', 'Join because there are many testimonials', 0, 'Testimoni mudah dibuat, bahkan oleh akun palsu di grup yang sama.', 'Testimonials are easy to produce, even by fake accounts in the same group.'),
      O('Cek izin penawar di OJK atau Kontak OJK 157 sebelum menyetor apa pun', 'Check the offerer\'s license with OJK or Kontak OJK 157 before paying anything', 1, 'Tepat. Investasi sah berizin dan tidak menjanjikan untung tanpa risiko.', 'Right. Legitimate investments are licensed and never promise risk-free profit.')]);
  C('money', ['Pinjol minta akses kontak', 'Loan app wants your contacts'], ['Aplikasi "Pinjam Kilat"', '"Quick Loan" app'],
    ['Pinjaman cair 5 menit tanpa jaminan. Izinkan akses kontak, galeri, dan lokasi agar disetujui.', 'Loan paid in 5 minutes, no collateral. Allow access to contacts, gallery, and location to get approved.'], [
      O('Izinkan, aku butuh uang cepat', 'Allow it, I need money fast', 0, 'Kontak dan galeri sering dipakai untuk meneror dan mempermalukan saat penagihan.', 'Contacts and photos are often used to harass and shame you during collection.'),
      O('Pinjam nominal kecil dulu', 'Borrow a small amount first', 0, 'Izin akses tetap diminta, jadi risiko penyalahgunaan datamu sama saja.', 'The same access is still requested, so the risk of data abuse stays the same.'),
      O('Batalkan. Pilih penyelenggara pinjaman yang terdaftar dan diawasi OJK', 'Cancel. Choose a lender that is registered and supervised by OJK', 1, 'Benar. Penyelenggara resmi punya aturan penagihan dan perlindungan data.', 'Correct. Licensed lenders follow collection and data protection rules.')]);
  C('money', ['Robot trading dan pajak penarikan', 'Trading bot and withdrawal tax'], ['Admin "AI Trading Pro"', '"AI Trading Pro" admin'],
    ['Robot AI profit pasti 30% per bulan. Untuk menarik dana, bayar dulu pajak 10% ke rekening perusahaan.', 'The AI bot gives guaranteed 30% monthly profit. To withdraw, first pay 10% tax into the company account.'], [
      O('Bayar pajaknya agar dana bisa ditarik', 'Pay the tax so I can withdraw', 0, 'Biaya penarikan di muka adalah jebakan. Setelah dibayar, biaya lain akan muncul.', 'A withdrawal fee upfront is a trap. After paying, other fees will appear.'),
      O('Tambah modal supaya saldo cukup untuk tarik', 'Add more capital so the balance is enough to withdraw', 0, 'Menambah setoran memperbesar kerugian tanpa membuka akses dana.', 'Adding deposits increases your loss without unlocking your money.'),
      O('Berhenti setor, simpan bukti, dan laporkan ke IASC atau Kontak OJK 157', 'Stop depositing, keep evidence, and report to IASC or Kontak OJK 157', 1, 'Tepat. Segera menghentikan setoran dan melapor memberi peluang terbaik.', 'Right. Stopping deposits and reporting quickly gives the best chance.')]);
  C('money', ['Ajak teman dapat bonus', 'Invite friends for a bonus'], ['Seminar "Bisnis Passive Income"', '"Passive Income Business" seminar'],
    ['Ajak 3 teman dan kamu dapat bonus. Semakin banyak downline, semakin besar penghasilan pasifmu.', 'Bring 3 friends and get a bonus. The more downlines, the bigger your passive income.'], [
      O('Ajak teman terdekat dulu', 'Invite my closest friends first', 0, 'Keuntungan yang bergantung pada rekrutmen adalah ciri skema piramida, dan temanmu ikut dirugikan.', 'Profit that depends on recruitment is a pyramid scheme trait, and your friends would lose too.'),
      O('Ikut karena produknya benar-benar ada', 'Join because the product really exists', 0, 'Produk sering dijadikan kedok. Yang dinilai: uang datang dari penjualan atau dari anggota baru?', 'The product is often a cover. Ask: does the money come from sales or from new members?'),
      O('Tolak. Jika untung utamanya dari merekrut anggota, itu skema piramida', 'Decline. If profit mainly comes from recruiting members, it is a pyramid scheme', 1, 'Tepat. Skema seperti ini runtuh ketika rekrutan baru berhenti.', 'Right. Such schemes collapse when new recruits stop coming.')]);
  C('money', ['Bayar untuk hapus riwayat SLIK', 'Pay to erase credit history'], ['Iklan "Jasa Bersih SLIK"', '"Credit Clean-up" ad'],
    ['Kami bisa membersihkan riwayat SLIK agar pinjamanmu disetujui. Biaya Rp2 juta, bayar dulu.', 'We can clean your credit record so your loan gets approved. Fee Rp2 million, pay first.'], [
      O('Bayar karena butuh pinjaman', 'Pay because I need the loan', 0, 'Riwayat kredit resmi tidak bisa dihapus lewat bayaran kepada pihak luar.', 'Official credit records cannot be erased by paying an outside party.'),
      O('Bayar separuh dulu, sisanya setelah beres', 'Pay half now, the rest when done', 0, 'Separuh uangmu sudah hilang dan jasa itu tidak pernah ada.', 'Half of your money is gone and the service never existed.'),
      O('Tolak. Urus pelunasan atau pertanyaan ke bank dan OJK secara resmi', 'Decline. Handle repayment or questions with the bank and OJK officially', 1, 'Benar. Perbaikan riwayat kredit dilakukan dengan melunasi, bukan membayar calo.', 'Correct. Credit history improves by repaying, not by paying a middleman.')]);
})();
