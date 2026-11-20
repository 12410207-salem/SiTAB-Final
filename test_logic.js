// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// test_logic.js — Automatic Black-Box Test Suite (TC-01 through TC-41)
// ============================================================================

const {
  AuthController,
  RegistrasiController,
  PermintaanController,
  PenugasanController,
  SerahTerimaController,
  LaporanKehilanganController,
  UlasanController,
  KurirAdminController,
  NotifikasiController,
  readData,
  writeData,
  resetDatabase
} = require('./controllers');

// Reset database to ensure completely idempotent test execution
resetDatabase();

let passedCount = 0;
let failedCount = 0;

function assert(condition, testId, description, detail = '') {
  if (condition) {
    passedCount++;
    console.log(`[\x1b[32mPASS\x1b[0m] ${testId}: ${description}`);
  } else {
    failedCount++;
    console.error(`[\x1b[31mFAIL\x1b[0m] ${testId}: ${description} -> ${detail}`);
  }
}

console.log('================================================================');
console.log('   SiTAB — AUTOMATED BLACK-BOX TEST SUITE (TC-01 s.d. TC-41)   ');
console.log('================================================================\n');

// ----------------------------------------------------------------------------
// TC-01: Login mahasiswa dengan email kampus dan password yang benar
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('105022410118@student.unklab.ac.id', 'pass123');
  assert(
    res.success && res.dashboard === 'dashboard-mahasiswa' && res.user.nama.includes('Makarewa'),
    'TC-01',
    'Login mahasiswa dengan email kampus dan password yang benar',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-02: Login dengan password salah
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('105022410118@student.unklab.ac.id', 'passSalah123');
  assert(
    !res.success && res.message.includes('Email atau password salah'),
    'TC-02',
    'Login dengan password salah menampilkan pesan kesalahan generic',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-03: Ajukan penitipan dengan data lengkap
// ----------------------------------------------------------------------------
{
  const res = PermintaanController.ajukanTitip({
    id_pemesan: 5,
    deskripsi_barang: 'Buku Catatan Pemrograman Web',
    foto_barang: '/uploads/buku-catatan.jpg',
    id_lokasi_asal: 1,
    nama_penerima: 'Michelle Lumentut'
  });
  assert(
    res.success && res.permintaan.status === 'Menunggu' && res.kode_otp.length === 4,
    'TC-03',
    'Ajukan penitipan barang dengan data lengkap dan foto',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-04: Ajukan penitipan tanpa foto barang
// ----------------------------------------------------------------------------
{
  const res = PermintaanController.ajukanTitip({
    id_pemesan: 5,
    deskripsi_barang: 'Flashdisk Hitam 64GB',
    foto_barang: '',
    id_lokasi_asal: 1,
    nama_penerima: 'Andrew Sahala'
  });
  assert(
    !res.success && res.field === 'foto_barang',
    'TC-04',
    'Ajukan penitipan tanpa foto barang ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-05: Pesan antar dengan data valid
// ----------------------------------------------------------------------------
let testOrderAntarId = null;
let testOrderAntarOtp = null;
{
  const res = PermintaanController.pesanAntar({
    id_pemesan: 5,
    deskripsi_barang: 'Dokumen Skripsi Jilid Softcover',
    id_lokasi_asal: 2, // Perpustakaan
    id_lokasi_tujuan: 3, // Asrama Crystal
    nama_penerima: 'Gabriella'
  });
  testOrderAntarId = res.permintaan ? res.permintaan.id_permintaan : null;
  testOrderAntarOtp = res.kode_otp;
  assert(
    res.success && res.permintaan.status === 'Menunggu' && res.permintaan.estimasi_waktu > 0,
    'TC-05',
    'Pesan antar dengan data valid dan rute berbeda',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-06: Pesan antar dengan lokasi jemput sama dengan tujuan
// ----------------------------------------------------------------------------
{
  const res = PermintaanController.pesanAntar({
    id_pemesan: 5,
    deskripsi_barang: 'Kotak Pensil',
    id_lokasi_asal: 3,
    id_lokasi_tujuan: 3,
    nama_penerima: 'Teman'
  });
  assert(
    !res.success && res.field === 'id_lokasi_tujuan',
    'TC-06',
    'Pesan antar dengan lokasi jemput sama dengan tujuan ditolak',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-07: Penugasan otomatis ke kurir tersedia
// ----------------------------------------------------------------------------
{
  const res = PenugasanController.tugaskanOtomatis(testOrderAntarId);
  assert(
    res.assigned === true && res.metode === 'otomatis',
    'TC-07',
    'Penugasan otomatis pesanan ke kurir yang tersedia',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-08: Pembaruan status oleh kurir terlihat oleh mahasiswa (UC-05, UC-10)
// ----------------------------------------------------------------------------
{
  PermintaanController.perbaruiStatus(testOrderAntarId, 'Dijemput', 3);
  const track = PermintaanController.lacakStatus(testOrderAntarId);
  assert(
    track.success && track.permintaan.status === 'Dijemput',
    'TC-08',
    'Pembaruan status oleh kurir terbaca di menu lacak status mahasiswa',
    JSON.stringify(track)
  );
}

// ----------------------------------------------------------------------------
// TC-09: Notifikasi saat status berubah (UC-06)
// ----------------------------------------------------------------------------
{
  const notifs = NotifikasiController.getNotifikasi(5);
  const hasStatusNotif = notifs.some(n => n.id_permintaan === testOrderAntarId);
  assert(
    hasStatusNotif,
    'TC-09',
    'Notifikasi perubahan status tercatat dan tersimpan untuk pemesan',
    `Found ${notifs.length} notifications`
  );
}

// ----------------------------------------------------------------------------
// TC-10: Verifikasi serah-terima dengan kode benar (UC-07)
// ----------------------------------------------------------------------------
{
  const res = SerahTerimaController.verifikasiSerahTerima({
    id_permintaan: testOrderAntarId,
    kode_otp: testOrderAntarOtp,
    foto_bukti: '/uploads/bukti-serahterima.jpg',
    id_pengubah: 3
  });
  const checkStatus = PermintaanController.lacakStatus(testOrderAntarId);
  assert(
    res.success && checkStatus.permintaan.status === 'Terkirim',
    'TC-10',
    'Verifikasi serah-terima dengan kode OTP benar dan status menjadi Terkirim',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-11: Verifikasi serah-terima dengan kode salah (UC-07)
// ----------------------------------------------------------------------------
{
  const res = SerahTerimaController.verifikasiSerahTerima({
    id_permintaan: testOrderAntarId,
    kode_otp: '0000',
    foto_bukti: null,
    id_pengubah: 3
  });
  assert(
    !res.success && res.code === 'INVALID_OTP',
    'TC-11',
    'Verifikasi serah-terima dengan kode OTP salah ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-12: Melihat riwayat transaksi (UC-08)
// ----------------------------------------------------------------------------
{
  const allPermintaan = readData('permintaan');
  const userPermintaan = allPermintaan.filter(p => p.id_pemesan === 5);
  assert(
    userPermintaan.length > 0,
    'TC-12',
    'Pengguna dapat melihat daftar transaksi miliknya',
    `User 5 has ${userPermintaan.length} transactions`
  );
}

// ----------------------------------------------------------------------------
// TC-13: Mengubah jadwal kurir (UC-09)
// ----------------------------------------------------------------------------
{
  const newSchedule = [
    { hari: 'Senin', jam_mulai: '08:00', jam_selesai: '12:00' },
    { hari: 'Kamis', jam_mulai: '13:00', jam_selesai: '17:00' }
  ];
  const res = KurirAdminController.updateJadwalKurir(1, newSchedule);
  const checkJadwal = readData('jadwal_kurir').filter(j => j.id_kurir === 1);
  assert(
    res.success && checkJadwal.length === 2 && checkJadwal[0].jam_mulai === '08:00',
    'TC-13',
    'Jadwal kurir berhasil diperbarui dan tersimpan',
    JSON.stringify(checkJadwal)
  );
}

// ----------------------------------------------------------------------------
// TC-14: Perhitungan biaya jasa dan honor tugas selesai (UC-09)
// ----------------------------------------------------------------------------
{
  const trList = readData('transaksi');
  const tr = trList.find(t => t.id_permintaan === testOrderAntarId);
  assert(
    tr && tr.biaya_jasa === 5000 && tr.honor_kurir === 5000 && tr.status_bayar === 'lunas',
    'TC-14',
    'Biaya jasa dan honor kurir dihitung dan dicatat pada tugas selesai',
    JSON.stringify(tr)
  );
}

// ----------------------------------------------------------------------------
// TC-15: Lapor kehilangan barang (UC-11)
// ----------------------------------------------------------------------------
let testLaporanId = null;
{
  const res = LaporanKehilanganController.laporKehilangan({
    id_permintaan: testOrderAntarId,
    id_pelapor: 5,
    deskripsi: 'Barang sempat tertinggal di lobi drop point sebelum dijemput.'
  });
  testLaporanId = res.id_laporan;
  assert(
    res.success && testLaporanId > 0,
    'TC-15',
    'Laporan kehilangan barang berhasil diajukan dan masuk ke sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-16: Beri rating setelah barang Terkirim (UC-13)
// ----------------------------------------------------------------------------
{
  const res = UlasanController.beriUlasan({
    id_permintaan: testOrderAntarId,
    rating: 5,
    komentar: 'Pengantaran sangat cepat dan barang sampai tanpa cacat!',
    id_pemberi: 5
  });
  assert(
    res.success,
    'TC-16',
    'Mahasiswa berhasil memberi rating dan ulasan untuk pesanan Terkirim',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-17: Dashboard administrator menampilkan ringkasan (UC-14)
// ----------------------------------------------------------------------------
{
  const stats = KurirAdminController.getDashboardStats();
  assert(
    stats.totalTransaksi > 0 && typeof stats.utilisasiLoker === 'string',
    'TC-17',
    'Dashboard administrator berhasil menampilkan ringkasan operasional',
    JSON.stringify(stats)
  );
}

// ----------------------------------------------------------------------------
// TC-18: Administrator menindaklanjuti laporan kehilangan (UC-12)
// ----------------------------------------------------------------------------
{
  const res = LaporanKehilanganController.tindakLanjuti({
    id_laporan: testLaporanId,
    status: 'selesai',
    tindak_lanjut: 'Barang telah ditemukan dan diserahkan kembali ke pemilik.',
    id_admin: 1
  });
  assert(
    res.success,
    'TC-18',
    'Administrator menindaklanjuti dan menyelesaikan laporan kehilangan',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-19: Administrator memverifikasi pengajuan kurir (UC-15)
// ----------------------------------------------------------------------------
{
  // Create a pending courier application
  const regUser = RegistrasiController.daftarkanKurir({
    id_pengguna: 6, // Sahala, Andrew
    jadwal: [{ hari: 'Senin', jam_mulai: '08:00', jam_selesai: '12:00' }],
    setuju_kode_etik: true
  });
  const kurirId = regUser.id_kurir;
  const res = KurirAdminController.verifikasiPengajuanKurir({
    id_kurir: kurirId,
    keputusan: 'setujui',
    id_admin: 1
  });
  const userCheck = readData('pengguna').find(u => u.id_pengguna === 6);
  assert(
    res.success && userCheck.peran === 'kurir',
    'TC-19',
    'Administrator menyetujui pengajuan kurir dan peran akun berubah jadi kurir',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-20: Login mahasiswa kurir diarahkan ke dashboard kurir (UC-01)
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('12410208@student.unklab.ac.id', 'pass123'); // Samuel Anasim
  assert(
    res.success && res.dashboard === 'dashboard-kurir' && res.user.peran === 'kurir',
    'TC-20',
    'Login mahasiswa kurir diarahkan ke Dashboard Kurir',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-21: Login administrator diarahkan ke dashboard administrator (UC-01)
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('12410207@student.unklab.ac.id', 'pass123'); // Salem
  assert(
    res.success && res.dashboard === 'dashboard-administrator' && res.user.peran === 'administrator',
    'TC-21',
    'Login administrator diarahkan ke Dashboard Administrator',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-22: Login dengan email kampus tidak terdaftar (UC-01)
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('99999999@student.unklab.ac.id', 'pass123');
  assert(
    !res.success && res.code === 'INVALID_CREDENTIALS',
    'TC-22',
    'Login dengan email kampus tidak terdaftar ditolak dengan pesan generic',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-23: Login dengan akun nonaktif (UC-01)
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('12410999@student.unklab.ac.id', 'pass123'); // Lumintang
  assert(
    !res.success && res.code === 'ACCOUNT_INACTIVE',
    'TC-23',
    'Login akun nonaktif ditolak dan meminta hubungi administrator',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-24: Login dengan kolom kosong (UC-01)
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('', '');
  assert(
    !res.success && res.code === 'EMPTY_FIELDS',
    'TC-24',
    'Login dengan kolom kosong ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-25: Login dengan akun yang belum diverifikasi (UC-01)
// ----------------------------------------------------------------------------
{
  const res = AuthController.login('12410888@student.unklab.ac.id', 'pass123'); // Santoso
  assert(
    !res.success && res.code === 'ACCOUNT_UNVERIFIED',
    'TC-25',
    'Login akun belum diverifikasi diarahkan ke verifikasi email',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-26: Registrasi dengan data lengkap dan valid (UC-16)
// ----------------------------------------------------------------------------
let registeredTestEmail = '12410777@student.unklab.ac.id';
let registeredDemoOtp = null;
{
  const res = RegistrasiController.daftarkanMahasiswa({
    nama: 'Jonathan Aso',
    email_kampus: registeredTestEmail,
    no_hp: '081234567777',
    password: 'password123',
    konfirmasi_password: 'password123'
  });
  registeredDemoOtp = res.demo_kode;
  assert(
    res.success && res.demo_kode && res.demo_kode.length === 6,
    'TC-26',
    'Registrasi dengan data lengkap dan valid membuat akun belum_diverifikasi',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-27: Registrasi dengan kolom kosong (UC-16)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanMahasiswa({
    nama: '',
    email_kampus: '12410776@student.unklab.ac.id',
    no_hp: '081234567776',
    password: 'password123',
    konfirmasi_password: 'password123'
  });
  assert(
    !res.success && res.message.includes('wajib diisi'),
    'TC-27',
    'Registrasi dengan kolom kosong ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-28: Registrasi dengan email di luar domain UNKLAB (UC-16)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanMahasiswa({
    nama: 'Budi Santoso',
    email_kampus: 'budi@gmail.com',
    no_hp: '081234567775',
    password: 'password123',
    konfirmasi_password: 'password123'
  });
  assert(
    !res.success && res.field === 'email_kampus',
    'TC-28',
    'Registrasi dengan email non-UNKLAB ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-29: Registrasi dengan email kampus yang sudah terdaftar (UC-16)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanMahasiswa({
    nama: 'Salem Clone',
    email_kampus: '12410207@student.unklab.ac.id',
    no_hp: '081234567774',
    password: 'password123',
    konfirmasi_password: 'password123'
  });
  assert(
    !res.success && res.code === 'EMAIL_ALREADY_EXISTS',
    'TC-29',
    'Registrasi dengan email yang sudah ada ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-30: Registrasi dengan konfirmasi password tidak sama (UC-16)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanMahasiswa({
    nama: 'Matthew Pangemanan',
    email_kampus: '12410773@student.unklab.ac.id',
    no_hp: '081234567773',
    password: 'password123',
    konfirmasi_password: 'bedaPassword123'
  });
  assert(
    !res.success && res.field === 'konfirmasi_password',
    'TC-30',
    'Registrasi dengan password konfirmasi berbeda ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-31: Registrasi dengan format data tidak valid (UC-16)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanMahasiswa({
    nama: 'Willy Mantiri',
    email_kampus: '12410772@student.unklab.ac.id',
    no_hp: '0812abcde', // invalid phone
    password: 'short', // < 8 chars
    konfirmasi_password: 'short'
  });
  assert(
    !res.success,
    'TC-31',
    'Registrasi dengan format telepon atau password < 8 karakter ditolak',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-32: Verifikasi email dengan kode benar lalu login (UC-17)
// ----------------------------------------------------------------------------
{
  const verifRes = RegistrasiController.verifikasiEmail(registeredTestEmail, registeredDemoOtp);
  const loginRes = AuthController.login(registeredTestEmail, 'password123');
  assert(
    verifRes.success && loginRes.success && loginRes.user.status_akun === 'aktif',
    'TC-32',
    'Verifikasi email kode benar mengaktifkan akun dan berhasil login',
    JSON.stringify({ verifRes, loginRes })
  );
}

// ----------------------------------------------------------------------------
// TC-33: Verifikasi email dengan kode salah atau kedaluwarsa (UC-17)
// ----------------------------------------------------------------------------
{
  // Test with Santoso's unverified account
  const res = RegistrasiController.verifikasiEmail('12410888@student.unklab.ac.id', '000000');
  assert(
    !res.success && res.code === 'INVALID_CODE',
    'TC-33',
    'Verifikasi email dengan kode salah ditolak dan hitungan percobaan bertambah',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-34: Kirim ulang kode verifikasi (UC-17)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.kirimUlangKode('12410888@student.unklab.ac.id');
  assert(
    res.success && res.demo_kode && res.demo_kode.length === 6,
    'TC-34',
    'Kirim ulang kode verifikasi menghasilkan 6-digit OTP baru',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-35: Registrasi kurir dengan data lengkap dan valid (UC-18)
// ----------------------------------------------------------------------------
let regKurirEmail = '12410555@student.unklab.ac.id';
let regKurirId = null;
{
  const res = RegistrasiController.daftarkanKurir({
    nama: 'Vincent Lumabiang',
    email_kampus: regKurirEmail,
    no_hp: '081234567555',
    password: 'password123',
    konfirmasi_password: 'password123',
    jadwal: [{ hari: 'Rabu', jam_mulai: '13:00', jam_selesai: '17:00' }],
    setuju_kode_etik: true
  });
  regKurirId = res.id_kurir;
  assert(
    res.success && res.id_kurir > 0,
    'TC-35',
    'Registrasi calon kurir lengkap tersimpan berstatus menunggu verifikasi',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-36: Registrasi kurir tanpa persetujuan kode etik atau jadwal (UC-18)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanKurir({
    nama: 'Solarbesain',
    email_kampus: '12410554@student.unklab.ac.id',
    no_hp: '081234567554',
    password: 'password123',
    konfirmasi_password: 'password123',
    jadwal: [],
    setuju_kode_etik: false
  });
  assert(
    !res.success && (res.field === 'setuju_kode_etik' || res.field === 'jadwal'),
    'TC-36',
    'Registrasi kurir tanpa kode etik atau jadwal ditolak sistem',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-37: Registrasi kurir dengan email yang sudah terdaftar (UC-18)
// ----------------------------------------------------------------------------
{
  const res = RegistrasiController.daftarkanKurir({
    nama: 'Salem Jovitly',
    email_kampus: '12410207@student.unklab.ac.id',
    no_hp: '081234567801',
    password: 'password123',
    konfirmasi_password: 'password123',
    jadwal: [{ hari: 'Senin', jam_mulai: '08:00', jam_selesai: '12:00' }],
    setuju_kode_etik: true
  });
  assert(
    !res.success,
    'TC-37',
    'Registrasi kurir dengan email yang sudah terdaftar ditolak',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-38: Mahasiswa yang sudah punya akun mengajukan diri sebagai kurir (UC-18)
// ----------------------------------------------------------------------------
let existingStudentKurirId = null;
{
  const res = RegistrasiController.daftarkanKurir({
    id_pengguna: 7, // Michelle Lumentut
    jadwal: [{ hari: 'Jumat', jam_mulai: '13:00', jam_selesai: '16:00' }],
    setuju_kode_etik: true
  });
  existingStudentKurirId = res.id_kurir;
  assert(
    res.success && res.id_kurir > 0,
    'TC-38',
    'Mahasiswa aktif berhasil mengajukan diri sebagai kurir dari dashboard',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-39: Login calon kurir yang pengajuannya belum disetujui (UC-01, UC-18)
// ----------------------------------------------------------------------------
{
  // Michelle is mahasiswa and applied for kurir, still pending approval
  const res = AuthController.login('12410601@student.unklab.ac.id', 'pass123');
  assert(
    res.success && res.dashboard === 'dashboard-mahasiswa' && res.user.peran === 'mahasiswa',
    'TC-39',
    'Calon kurir yang belum disetujui masuk sebagai mahasiswa ke Dashboard Mahasiswa',
    JSON.stringify(res)
  );
}

// ----------------------------------------------------------------------------
// TC-40: Administrator menyetujui pengajuan hasil registrasi kurir (UC-15)
// ----------------------------------------------------------------------------
{
  const res = KurirAdminController.verifikasiPengajuanKurir({
    id_kurir: existingStudentKurirId,
    keputusan: 'setujui',
    id_admin: 1
  });
  const checkLogin = AuthController.login('12410601@student.unklab.ac.id', 'pass123');
  assert(
    res.success && checkLogin.dashboard === 'dashboard-kurir' && checkLogin.user.peran === 'kurir',
    'TC-40',
    'Administrator menyetujui kurir dan login berikutnya masuk Dashboard Kurir',
    JSON.stringify(checkLogin)
  );
}

// ----------------------------------------------------------------------------
// TC-41: Administrator menolak pengajuan kurir dengan alasan (UC-15)
// ----------------------------------------------------------------------------
{
  const res = KurirAdminController.verifikasiPengajuanKurir({
    id_kurir: regKurirId,
    keputusan: 'tolak',
    alasan_penolakan: 'Jadwal shift bentrok dengan jam wajib kuliah umum.',
    id_admin: 1
  });
  const kurirData = readData('kurir').find(k => k.id_kurir === regKurirId);
  assert(
    res.success && kurirData.status_verifikasi === 'ditolak' && kurirData.alasan_penolakan.includes('bentrok'),
    'TC-41',
    'Administrator menolak pengajuan kurir dengan alasan dan tersimpan di database',
    JSON.stringify(kurirData)
  );
}

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedCount} / ${passedCount + failedCount} PASSED`);
if (failedCount === 0) {
  console.log('STATUS: \x1b[32mALL 41 TEST CASES PASSED SUCCESSFULLY!\x1b[0m');
} else {
  console.error(`STATUS: \x1b[31m${failedCount} TEST CASES FAILED!\x1b[0m`);
}
console.log('================================================================\n');

process.exit(failedCount > 0 ? 1 : 0);
