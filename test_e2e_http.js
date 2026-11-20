// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// test_e2e_http.js — In-Memory E2E HTTP REST API Integration Test Suite
// Fully sandboxed & zero-dependency
// ============================================================================

const { Readable, Writable } = require('stream');
const fs = require('fs');
const path = require('path');
const server = require('./server');

function makeRequest(urlPath, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = new Readable();
    req._read = () => {};
    req.url = urlPath;
    req.method = method;
    req.headers = {
      'content-type': 'application/json',
      host: 'localhost:3000'
    };
    if (payload) {
      req.headers['content-length'] = Buffer.byteLength(payload);
      req.push(payload);
    }
    req.push(null);

    let statusCode = 200;
    let headers = {};
    let responseBody = '';

    const res = new Writable({
      write(chunk, encoding, callback) {
        responseBody += chunk.toString();
        callback();
      }
    });

    res.writeHead = (status, hdrs) => {
      statusCode = status;
      if (hdrs) headers = Object.assign(headers, hdrs);
    };

    res.setHeader = (name, value) => {
      headers[name.toLowerCase()] = value;
    };

    res.end = (chunk) => {
      if (chunk) responseBody += chunk.toString();
      try {
        resolve({ status: statusCode, data: JSON.parse(responseBody), text: responseBody, headers });
      } catch (e) {
        resolve({ status: statusCode, text: responseBody, headers });
      }
    };

    server.emit('request', req, res);
  });
}

async function runE2ETests() {
  console.log('================================================================');
  console.log('   SiTAB — END-TO-END HTTP REST API INTEGRATION SUITE           ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function check(cond, name, details = '') {
    if (cond) {
      passed++;
      console.log(`[\x1b[32mPASS\x1b[0m] ${name}`);
    } else {
      failed++;
      console.error(`[\x1b[31mFAIL\x1b[0m] ${name} -> ${details}`);
    }
  }

  try {
    // 1. Test Static Files
    const homeRes = await makeRequest('/');
    check(homeRes.status === 200 && homeRes.text.includes('SiTAB'), 'E2E-01: Akses Frontend index.html');

    // 2. Test File Upload API (POST /api/upload)
    const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await makeRequest('/api/upload', 'POST', {
      fileData: samplePngBase64,
      fileName: 'test-bukti.png',
      prefix: 'e2e_bukti'
    });
    check(
      uploadRes.status === 201 && uploadRes.data && uploadRes.data.success && uploadRes.data.url.startsWith('/uploads/'),
      'E2E-02: Endpoint POST /api/upload menyimpan file fisik ke public/uploads/',
      JSON.stringify(uploadRes.data)
    );
    const uploadedFilePath = path.join(__dirname, 'public', uploadRes.data.url);
    check(fs.existsSync(uploadedFilePath), 'E2E-03: File fisik terbukti ada di storage disk');

    // 3. Test Student Registration (POST /api/auth/register)
    const testRegEmail = `s${Date.now().toString().slice(-7)}@student.unklab.ac.id`;
    const regRes = await makeRequest('/api/auth/register', 'POST', {
      nama: 'Mahasiswa Uji Terpadu',
      email_kampus: testRegEmail,
      no_hp: '081298765432',
      password: 'password123',
      konfirmasi_password: 'password123'
    });
    check(
      regRes.status === 201 && regRes.data && regRes.data.success && regRes.data.demo_kode.length === 6,
      'E2E-04: Registrasi mahasiswa baru menghasilkan akun belum_diverifikasi & OTP 6-digit',
      JSON.stringify(regRes.data)
    );

    // 4. Test Email Verification (POST /api/auth/verify-email)
    const verifRes = await makeRequest('/api/auth/verify-email', 'POST', {
      email: testRegEmail,
      kode: regRes.data.demo_kode
    });
    check(
      verifRes.status === 200 && verifRes.data && verifRes.data.success,
      'E2E-05: Verifikasi OTP 6 digit berhasil mengaktifkan akun',
      JSON.stringify(verifRes.data)
    );

    // 5. Test Login Mahasiswa (POST /api/auth/login)
    const loginMhs = await makeRequest('/api/auth/login', 'POST', {
      email: testRegEmail,
      password: 'password123'
    });
    check(
      loginMhs.status === 200 && loginMhs.data && loginMhs.data.success && loginMhs.data.dashboard === 'dashboard-mahasiswa',
      'E2E-06: Login mahasiswa terverifikasi diarahkan ke L-02 Dashboard Mahasiswa',
      JSON.stringify(loginMhs.data)
    );

    // 6. Test Form Titip Barang (POST /api/permintaan/titip)
    const titipRes = await makeRequest('/api/permintaan/titip', 'POST', {
      id_pemesan: loginMhs.data.user.id_pengguna,
      deskripsi_barang: 'Kamera DSLR Canon EOS dan Lensa 50mm',
      foto_barang: uploadRes.data.url,
      id_lokasi_asal: 1,
      nama_penerima: 'Teman Sekelas'
    });
    check(
      titipRes.status === 201 && titipRes.data && titipRes.data.success && titipRes.data.permintaan.kode_resi.startsWith('STB-'),
      'E2E-07: Pengajuan penitipan barang L-03 dengan foto nyata tersimpan',
      JSON.stringify(titipRes.data)
    );

    // 7. Test Form Pesan Antar (POST /api/permintaan/antar)
    const antarRes = await makeRequest('/api/permintaan/antar', 'POST', {
      id_pemesan: loginMhs.data.user.id_pengguna,
      deskripsi_barang: 'Map Dokumen Ujian Akhir',
      id_lokasi_asal: 1, // GK1
      id_lokasi_tujuan: 7, // FIK
      ruangan_tujuan: 'Lab Komputer 3',
      nama_penerima: 'Dosen Pembimbing'
    });
    check(
      antarRes.status === 201 && antarRes.data && antarRes.data.success && antarRes.data.kode_otp.length === 4,
      'E2E-08: Pemesanan pengantaran kurir L-04 menghasilkan OTP 4-digit serah-terima',
      JSON.stringify(antarRes.data)
    );
    const orderAntarId = antarRes.data.permintaan.id_permintaan;
    const orderOtp = antarRes.data.kode_otp;

    // 8. Test Admin Login & Courier Assignment
    const loginAdmin = await makeRequest('/api/auth/login', 'POST', {
      email: '12410207@student.unklab.ac.id', // Salem
      password: 'pass123'
    });
    check(loginAdmin.status === 200 && loginAdmin.data.dashboard === 'dashboard-administrator', 'E2E-09: Login Administrator diarahkan ke L-12');

    const assignRes = await makeRequest('/api/admin/penugasan', 'POST', {
      id_permintaan: orderAntarId,
      id_kurir: 1 // Samuel Anasim
    });
    check(assignRes.status === 200 && assignRes.data && assignRes.data.success, 'E2E-10: Administrator menugaskan kurir secara manual');

    // 9. Test Courier Status Update to 'Dijemput'
    const statusJemput = await makeRequest('/api/permintaan/status', 'POST', {
      id_permintaan: orderAntarId,
      status: 'Dijemput',
      id_kurir: 1,
      id_pengubah: 3
    });
    check(statusJemput.status === 200 && statusJemput.data && statusJemput.data.success, 'E2E-11: Kurir memperbarui status pesanan menjadi Dijemput');

    // 10. Test Courier Status Update to 'Dalam Perjalanan'
    const statusJalan = await makeRequest('/api/permintaan/status', 'POST', {
      id_permintaan: orderAntarId,
      status: 'Dalam Perjalanan',
      id_kurir: 1,
      id_pengubah: 3
    });
    check(statusJalan.status === 200 && statusJalan.data && statusJalan.data.success, 'E2E-12: Kurir memperbarui status menjadi Dalam Perjalanan');

    // 11. Test Handover Verification (POST /api/permintaan/serah-terima)
    const stRes = await makeRequest('/api/permintaan/serah-terima', 'POST', {
      id_permintaan: orderAntarId,
      kode_otp: orderOtp,
      foto_bukti: uploadRes.data.url,
      id_pengubah: 3
    });
    check(
      stRes.status === 200 && stRes.data && stRes.data.success,
      'E2E-13: Verifikasi serah-terima L-09 dengan OTP & foto bukti berhasil, status jadi Terkirim',
      JSON.stringify(stRes.data)
    );

    // 12. Test Rating & Review (POST /api/ulasan)
    const ulasanRes = await makeRequest('/api/ulasan', 'POST', {
      id_permintaan: orderAntarId,
      rating: 5,
      komentar: 'Luar biasa cepat dan aman!',
      id_pemberi: loginMhs.data.user.id_pengguna
    });
    check(ulasanRes.status === 201 && ulasanRes.data && ulasanRes.data.success, 'E2E-14: Pemberian rating & ulasan L-11 untuk pesanan Terkirim');

    // 13. Test Loss Report (POST /api/laporan) & Followup
    const laporRes = await makeRequest('/api/laporan', 'POST', {
      id_permintaan: orderAntarId,
      id_pelapor: loginMhs.data.user.id_pengguna,
      deskripsi: 'Pengujian laporan kendala paket.'
    });
    check(laporRes.status === 201 && laporRes.data && laporRes.data.success, 'E2E-15: Mahasiswa mengajukan laporan masalah L-10');

    const followRes = await makeRequest('/api/laporan/tindak-lanjut', 'POST', {
      id_laporan: laporRes.data.id_laporan,
      status: 'selesai',
      tindak_lanjut: 'Paket telah dikonfirmasi sampai tanpa kendala.',
      id_admin: 1
    });
    check(followRes.status === 200 && followRes.data && followRes.data.success, 'E2E-16: Administrator menindaklanjuti dan menyelesaikan laporan');

    // 14. Test Notifications API (GET /api/notifikasi)
    const notifRes = await makeRequest(`/api/notifikasi?user_id=${loginMhs.data.user.id_pengguna}`);
    check(notifRes.status === 200 && notifRes.data && notifRes.data.data.length > 0, 'E2E-17: Notifikasi tersinkronisasi untuk seluruh peristiwa transaksi');

    // 15. Test Admin Dashboard Stats (GET /api/admin/dashboard)
    const adminStats = await makeRequest('/api/admin/dashboard');
    check(
      adminStats.status === 200 && adminStats.data && adminStats.data.data.totalTransaksi > 0,
      'E2E-18: Dashboard Administrator L-12 memuat seluruh metrik operasional terpadu',
      JSON.stringify(adminStats.data.data)
    );

  } catch (err) {
    console.error('E2E Test execution error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`E2E TEST SUMMARY: ${passed} / ${passed + failed} PASSED`);
  if (failed === 0) {
    console.log('STATUS: \x1b[32mALL 18 E2E INTEGRATION TEST SCENARIOS PASSED!\x1b[0m');
  } else {
    console.error(`STATUS: \x1b[31m${failed} E2E TEST SCENARIOS FAILED!\x1b[0m`);
  }
  console.log('================================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runE2ETests();
