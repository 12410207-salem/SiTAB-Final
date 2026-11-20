// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// controllers.js — Business Logic & Entity Controllers
// ============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const Bcrypt = require('./bcrypt');
const EmailService = require('./lib/email');

// Utility to read JSON entity file
function readData(entity) {
  const filePath = path.join(DATA_DIR, `${entity}.json`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    // Buang BOM (U+FEFF) bila file JSON disimpan oleh editor Windows tertentu
    const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading data for ${entity}:`, err);
    return [];
  }
}

// Utility to write JSON entity file
function writeData(entity, data) {
  const filePath = path.join(DATA_DIR, `${entity}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Password hashing using Bcrypt ($2a$10$)
function hashPassword(password) {
  return Bcrypt.hashSync(password, 10);
}

// Generate random OTP (4-digit for delivery handover, 6-digit for email activation)
function generateOTP(digits = 4) {
  let otp = '';
  for (let i = 0; i < digits; i++) {
    otp += Math.floor(Math.random() * 10).toString();
  }
  return otp;
}

// Generate Resi code (e.g. STB-0249)
function generateResi() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `STB-${num}`;
}

// Validate email format according to SRS:
// Must be: [nomor_registrasi]@student.unklab.ac.id
// nomor registrasi: 8 characters (all digits or starts with S followed by digits) or student NIM (e.g. 105022410043)
function isValidUnklabEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  // Allow @student.unklab.ac.id or @unklab.ac.id for admin/staff
  const regex = /^([sS]?\d{7,12}|[a-zA-Z0-9._-]+)@(student\.)?unklab\.ac\.id$/;
  return regex.test(trimmed);
}

function isStrictStudentEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const regex = /^([sS]?\d{7,12})@student\.unklab\.ac\.id$/;
  return regex.test(trimmed);
}

// ============================================================================
// 1. AuthController (UC-01)
// ============================================================================
class AuthController {
  static login(email, password) {
    if (!email || !password || email.trim() === '' || password.trim() === '') {
      return { success: false, code: 'EMPTY_FIELDS', message: 'Email kampus dan password wajib diisi.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const penggunaList = readData('pengguna');
    const user = penggunaList.find(u => u.email_kampus.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, code: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' };
    }

    if (!Bcrypt.compareSync(password, user.password_hash)) {
      return { success: false, code: 'INVALID_CREDENTIALS', message: 'Email atau password salah.' };
    }

    // Check account status
    if (user.status_akun === 'nonaktif') {
      return {
        success: false,
        code: 'ACCOUNT_INACTIVE',
        message: 'Akun Anda dinonaktifkan. Silakan hubungi administrator.'
      };
    }

    if (user.status_akun === 'belum_diverifikasi') {
      return {
        success: false,
        code: 'ACCOUNT_UNVERIFIED',
        message: 'Akun belum diverifikasi. Silakan periksa email kampus untuk kode verifikasi.',
        email: user.email_kampus,
        id_pengguna: user.id_pengguna
      };
    }

    // Determine role & courier approval status
    let effectiveRole = user.peran;
    if (effectiveRole === 'kurir') {
      const kurirList = readData('kurir');
      const kurirRecord = kurirList.find(k => k.id_pengguna === user.id_pengguna);
      if (!kurirRecord || kurirRecord.status_verifikasi !== 'disetujui') {
        // Calon kurir yang belum disetujui masuk sebagai mahasiswa
        effectiveRole = 'mahasiswa';
      }
    }

    // id_kurir dipakai klien agar aksi kurir selalu tercatat atas nama kurir yang login
    let idKurir = null;
    if (effectiveRole === 'kurir') {
      const kr = readData('kurir').find(k => k.id_pengguna === user.id_pengguna);
      idKurir = kr ? kr.id_kurir : null;
    }

    // Determine dashboard redirection
    let dashboard = 'dashboard-mahasiswa';
    if (effectiveRole === 'administrator') {
      dashboard = 'dashboard-administrator';
    } else if (effectiveRole === 'kurir') {
      dashboard = 'dashboard-kurir';
    }

    return {
      success: true,
      message: 'Login berhasil.',
      user: {
        id_pengguna: user.id_pengguna,
        nama: user.nama,
        email_kampus: user.email_kampus,
        no_hp: user.no_hp,
        peran: effectiveRole,
        id_kurir: idKurir,
        status_akun: user.status_akun
      },
      dashboard
    };
  }
}

// ============================================================================
// 2. RegistrasiController (UC-16, UC-17, UC-18)
// ============================================================================
class RegistrasiController {
  static validasiDataMahasiswa({ nama, email_kampus, no_hp, password, konfirmasi_password }) {
    if (!nama || !email_kampus || !no_hp || !password || !konfirmasi_password) {
      return { valid: false, message: 'Semua kolom wajib diisi.' };
    }

    const cleanEmail = email_kampus.trim().toLowerCase();
    if (!isValidUnklabEmail(cleanEmail)) {
      return {
        valid: false,
        field: 'email_kampus',
        message: 'Email harus email mahasiswa UNKLAB (format nomor_registrasi@student.unklab.ac.id).'
      };
    }

    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(no_hp.trim())) {
      return {
        valid: false,
        field: 'no_hp',
        message: 'Nomor telepon hanya boleh berisi angka (10–15 digit).'
      };
    }

    if (password.length < 8) {
      return {
        valid: false,
        field: 'password',
        message: 'Password minimal 8 karakter.'
      };
    }

    if (password !== konfirmasi_password) {
      return {
        valid: false,
        field: 'konfirmasi_password',
        message: 'Konfirmasi password tidak sama dengan password.'
      };
    }

    return { valid: true };
  }

  static cekEmailTersedia(email_kampus) {
    const cleanEmail = email_kampus.trim().toLowerCase();
    const penggunaList = readData('pengguna');
    const existing = penggunaList.find(u => u.email_kampus.toLowerCase() === cleanEmail);
    if (existing) {
      return {
        tersedia: false,
        status_akun: existing.status_akun,
        id_pengguna: existing.id_pengguna
      };
    }
    return { tersedia: true };
  }

  static daftarkanMahasiswa({ nama, email_kampus, no_hp, password, konfirmasi_password }) {
    const val = this.validasiDataMahasiswa({ nama, email_kampus, no_hp, password, konfirmasi_password });
    if (!val.valid) {
      return { success: false, field: val.field, message: val.message };
    }

    const cleanEmail = email_kampus.trim().toLowerCase();
    const checkEmail = this.cekEmailTersedia(cleanEmail);
    if (!checkEmail.tersedia) {
      if (checkEmail.status_akun === 'belum_diverifikasi') {
        return {
          success: false,
          code: 'EMAIL_UNVERIFIED_EXISTS',
          message: 'Email sudah terdaftar namun belum diverifikasi. Silakan masukkan kode verifikasi Anda.',
          email: cleanEmail,
          id_pengguna: checkEmail.id_pengguna
        };
      }
      return {
        success: false,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email kampus sudah terdaftar. Silakan login atau gunakan email lain.'
      };
    }

    const penggunaList = readData('pengguna');
    const newId = penggunaList.length > 0 ? Math.max(...penggunaList.map(u => u.id_pengguna)) + 1 : 1;

    const newUser = {
      id_pengguna: newId,
      nama: nama.trim(),
      email_kampus: cleanEmail,
      no_hp: no_hp.trim(),
      password_hash: hashPassword(password),
      peran: 'mahasiswa',
      status_akun: 'belum_diverifikasi',
      waktu_daftar: new Date().toISOString()
    };

    penggunaList.push(newUser);
    writeData('pengguna', penggunaList);

    // Create 6-digit OTP verification record
    const otp = this.buatKodeVerifikasi(newId);
    EmailService.sendVerificationOTP(cleanEmail, otp, newUser.nama);

    return {
      success: true,
      message: 'Registrasi berhasil. Kode verifikasi 6 digit telah dikirim ke email kampus Anda.',
      id_pengguna: newId,
      email_kampus: cleanEmail,
      demo_kode: otp // Returned for easy local testing
    };
  }

  static buatKodeVerifikasi(id_pengguna) {
    const verifikasiList = readData('verifikasi_email');
    // Invalidate previous active codes for this user
    verifikasiList.forEach(v => {
      if (v.id_pengguna === id_pengguna && v.status === 'menunggu') {
        v.status = 'kedaluwarsa';
      }
    });

    const kode = generateOTP(6);
    const now = new Date();
    const expire = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins

    const newVerif = {
      id_verifikasi: verifikasiList.length > 0 ? Math.max(...verifikasiList.map(v => v.id_verifikasi)) + 1 : 1,
      id_pengguna,
      kode_verifikasi: kode,
      kode_plain: kode,
      waktu_dibuat: now.toISOString(),
      waktu_kedaluwarsa: expire.toISOString(),
      jumlah_percobaan: 0,
      status: 'menunggu'
    };

    verifikasiList.push(newVerif);
    writeData('verifikasi_email', verifikasiList);
    return kode;
  }

  static verifikasiEmail(email_kampus, kode) {
    if (!email_kampus || !kode) {
      return { success: false, message: 'Email kampus dan kode verifikasi wajib diisi.' };
    }

    const cleanEmail = email_kampus.trim().toLowerCase();
    const penggunaList = readData('pengguna');
    const user = penggunaList.find(u => u.email_kampus.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    if (user.status_akun === 'aktif') {
      return { success: true, message: 'Akun sudah aktif. Silakan langsung login.' };
    }

    const verifikasiList = readData('verifikasi_email');
    const verif = verifikasiList.find(v => v.id_pengguna === user.id_pengguna && v.status === 'menunggu');

    if (!verif) {
      return {
        success: false,
        code: 'NO_ACTIVE_CODE',
        message: 'Tidak ada kode verifikasi aktif. Silakan kirim ulang kode verifikasi.'
      };
    }

    // Check expiration
    const now = new Date();
    if (new Date(verif.waktu_kedaluwarsa) < now) {
      verif.status = 'kedaluwarsa';
      writeData('verifikasi_email', verifikasiList);
      return {
        success: false,
        code: 'CODE_EXPIRED',
        message: 'Kode verifikasi telah kedaluwarsa (lebih dari 15 menit). Silakan kirim ulang kode.'
      };
    }

    // Check failed attempts
    if (verif.jumlah_percobaan >= 5) {
      verif.status = 'kedaluwarsa';
      writeData('verifikasi_email', verifikasiList);
      return {
        success: false,
        code: 'MAX_ATTEMPTS_EXCEEDED',
        message: 'Percobaan salah telah mencapai batas 5 kali. Silakan minta kode verifikasi baru.'
      };
    }

    // Compare code
    if (verif.kode_verifikasi.toString() !== kode.toString().trim()) {
      verif.jumlah_percobaan += 1;
      writeData('verifikasi_email', verifikasiList);
      const remaining = 5 - verif.jumlah_percobaan;
      return {
        success: false,
        code: 'INVALID_CODE',
        message: `Kode verifikasi salah. Sisa percobaan: ${remaining}.`
      };
    }

    // Code is correct: activate account
    verif.status = 'terpakai';
    writeData('verifikasi_email', verifikasiList);

    user.status_akun = 'aktif';
    writeData('pengguna', penggunaList);

    // Send welcome notification
    NotifikasiController.kirimNotifikasi(
      user.id_pengguna,
      null,
      'Selamat! Akun SiTAB Anda telah aktif. Anda kini dapat menggunakan layanan titip-antar kampus.'
    );

    return {
      success: true,
      message: 'Email berhasil diverifikasi! Akun Anda kini aktif. Silakan masuk.'
    };
  }

  static kirimUlangKode(email_kampus) {
    const cleanEmail = email_kampus.trim().toLowerCase();
    const penggunaList = readData('pengguna');
    const user = penggunaList.find(u => u.email_kampus.toLowerCase() === cleanEmail);

    if (!user) {
      return { success: false, message: 'Email tidak ditemukan.' };
    }

    const kode = this.buatKodeVerifikasi(user.id_pengguna);
    EmailService.sendVerificationOTP(cleanEmail, kode, user.nama);
    return {
      success: true,
      message: 'Kode verifikasi baru 6 digit telah dikirim ke email kampus Anda.',
      demo_kode: kode
    };
  }

  static daftarkanKurir({
    id_pengguna,
    nama,
    email_kampus,
    no_hp,
    password,
    konfirmasi_password,
    jadwal = [],
    setuju_kode_etik
  }) {
    if (!setuju_kode_etik) {
      return {
        success: false,
        field: 'setuju_kode_etik',
        message: 'Anda wajib menyetujui Kode Etik Kurir SiTAB.'
      };
    }

    if (!jadwal || jadwal.length === 0) {
      return {
        success: false,
        field: 'jadwal',
        message: 'Jadwal ketersediaan minimal harus memiliki satu shift.'
      };
    }

    let userTargetId = id_pengguna;

    // If new user registering as courier
    if (!userTargetId) {
      const regMahasiswa = this.daftarkanMahasiswa({
        nama,
        email_kampus,
        no_hp,
        password,
        konfirmasi_password
      });

      if (!regMahasiswa.success) {
        return regMahasiswa;
      }
      userTargetId = regMahasiswa.id_pengguna;
    }

    // Check if courier application already exists
    const kurirList = readData('kurir');
    const existingKurir = kurirList.find(k => k.id_pengguna === userTargetId);
    if (existingKurir && existingKurir.status_verifikasi === 'menunggu_verifikasi') {
      return {
        success: false,
        message: 'Pengajuan kurir Anda sedang menunggu verifikasi administrator.'
      };
    }
    if (existingKurir && existingKurir.status_verifikasi === 'disetujui') {
      return {
        success: false,
        message: 'Anda sudah terdaftar sebagai kurir aktif.'
      };
    }

    let kurirId;
    if (existingKurir && existingKurir.status_verifikasi === 'ditolak') {
      // BR-10: Pengajuan yang ditolak dapat diajukan kembali
      existingKurir.status_verifikasi = 'menunggu_verifikasi';
      existingKurir.status_ketersediaan = 'tidak tersedia';
      existingKurir.alasan_penolakan = null;
      existingKurir.waktu_pengajuan = new Date().toISOString();
      kurirId = existingKurir.id_kurir;
      writeData('kurir', kurirList);
    } else {
      kurirId = kurirList.length > 0 ? Math.max(...kurirList.map(k => k.id_kurir)) + 1 : 1;

      const newKurir = {
        id_kurir: kurirId,
        id_pengguna: userTargetId,
        status_verifikasi: 'menunggu_verifikasi',
        status_ketersediaan: 'tidak tersedia',
        rating_rata: 5.0,
        waktu_pengajuan: new Date().toISOString(),
        setuju_kode_etik: true,
        alasan_penolakan: null
      };

      kurirList.push(newKurir);
      writeData('kurir', kurirList);
    }

    // Save shifts
    const jadwalList = readData('jadwal_kurir');
    jadwal.forEach(j => {
      const jId = jadwalList.length > 0 ? Math.max(...jadwalList.map(item => item.id_jadwal)) + 1 : 1;
      jadwalList.push({
        id_jadwal: jId,
        id_kurir: kurirId,
        hari: j.hari,
        jam_mulai: j.jam_mulai,
        jam_selesai: j.jam_selesai
      });
    });
    writeData('jadwal_kurir', jadwalList);

    // Notify administrator
    const admin = readData('pengguna').find(u => u.peran === 'administrator');
    if (admin) {
      NotifikasiController.kirimNotifikasi(
        admin.id_pengguna,
        null,
        `Pengajuan kurir baru dari mahasiswa (${nama || 'Pelamar'}) menunggu verifikasi.`
      );
    }

    return {
      success: true,
      message: 'Pendaftaran kurir berhasil diajukan dan menunggu verifikasi administrator.',
      id_kurir: kurirId,
      id_pengguna: userTargetId
    };
  }
}

// ============================================================================
// 3. PermintaanController (UC-02, UC-03, UC-05, UC-10)
// ============================================================================
class PermintaanController {
  static ajukanTitip({ id_pemesan, deskripsi_barang, foto_barang, id_lokasi_asal, nama_penerima }) {
    if (!id_pemesan || !deskripsi_barang || !id_lokasi_asal) {
      return { success: false, message: 'Detail barang dan lokasi drop point wajib diisi.' };
    }

    if (!foto_barang || foto_barang.trim() === '') {
      return { success: false, field: 'foto_barang', message: 'Foto barang wajib diunggah untuk penitipan di drop point.' };
    }

    // Check prohibited items (BR-02)
    const lowerDesc = deskripsi_barang.toLowerCase();
    const prohibitedKeywords = [
      'uang tunai', 'narkoba', 'ganja', 'sabu', 'senjata', 'pistol',
      'bom', 'peledak', 'bensin', 'minyak tanah', 'alkohol keras',
      'emas batangan', 'intan', 'berlian', 'makanan basi'
    ];

    for (const keyword of prohibitedKeywords) {
      if (lowerDesc.includes(keyword)) {
        return {
          success: false,
          code: 'PROHIBITED_ITEM',
          message: 'Permintaan ditolak: Barang termasuk kategori terlarang (BR-02).'
        };
      }
    }

    const permintaanList = readData('permintaan');
    const newId = permintaanList.length > 0 ? Math.max(...permintaanList.map(p => p.id_permintaan)) + 1 : 1;
    const resi = generateResi();
    const otp = generateOTP(4);
    const now = new Date().toISOString();

    const newPermintaan = {
      id_permintaan: newId,
      kode_resi: resi,
      id_pemesan,
      nama_penerima: (nama_penerima && nama_penerima.trim()) || 'Penerima Mandiri',
      jenis: 'titip',
      deskripsi_barang: deskripsi_barang.trim(),
      foto_barang,
      id_lokasi_asal: parseInt(id_lokasi_asal),
      id_lokasi_tujuan: parseInt(id_lokasi_asal), // same drop point
      status: 'Menunggu',
      estimasi_waktu: 0,
      waktu_dibuat: now
    };

    permintaanList.push(newPermintaan);
    writeData('permintaan', permintaanList);

    // Record Status Log
    const riwayatList = readData('riwayat_status');
    riwayatList.push({
      id_riwayat: riwayatList.length > 0 ? Math.max(...riwayatList.map(r => r.id_riwayat)) + 1 : 1,
      id_permintaan: newId,
      status: 'Menunggu',
      waktu: now,
      id_pengubah: id_pemesan
    });
    writeData('riwayat_status', riwayatList);

    // Record SerahTerima OTP
    const serahTerimaList = readData('serah_terima');
    serahTerimaList.push({
      id_serah_terima: serahTerimaList.length > 0 ? Math.max(...serahTerimaList.map(s => s.id_serah_terima)) + 1 : 1,
      id_permintaan: newId,
      jenis: 'penitipan',
      foto_bukti: foto_barang,
      kode_otp: otp,
      waktu: now
    });
    writeData('serah_terima', serahTerimaList);

    // Record Transaksi
    const transaksiList = readData('transaksi');
    transaksiList.push({
      id_transaksi: transaksiList.length > 0 ? Math.max(...transaksiList.map(t => t.id_transaksi)) + 1 : 1,
      id_permintaan: newId,
      biaya_jasa: 2000,
      honor_kurir: 0,
      metode_pembayaran: 'Saldo Digital',
      status_bayar: 'lunas',
      waktu: now
    });
    writeData('transaksi', transaksiList);

    // Send Notification
    NotifikasiController.kirimNotifikasi(
      id_pemesan,
      newId,
      `Penitipan ${resi} berhasil diajukan. Letakkan barang di loker dengan kode OTP ${otp}.`
    );

    return {
      success: true,
      message: 'Penitipan barang berhasil diajukan.',
      permintaan: newPermintaan,
      kode_otp: otp
    };
  }

  static pesanAntar({ id_pemesan, deskripsi_barang, id_lokasi_asal, id_lokasi_tujuan, nama_penerima, ruangan_tujuan }) {
    if (!id_pemesan || !deskripsi_barang || !id_lokasi_asal || !id_lokasi_tujuan) {
      return { success: false, message: 'Detail barang, lokasi jemput, dan tujuan wajib diisi.' };
    }

    if (parseInt(id_lokasi_asal) === parseInt(id_lokasi_tujuan)) {
      return {
        success: false,
        field: 'id_lokasi_tujuan',
        message: 'Lokasi penjemputan dan lokasi tujuan pengantaran tidak boleh sama.'
      };
    }

    const permintaanList = readData('permintaan');
    const newId = permintaanList.length > 0 ? Math.max(...permintaanList.map(p => p.id_permintaan)) + 1 : 1;
    const resi = generateResi();
    const otp = generateOTP(4);
    const now = new Date().toISOString();

    const newPermintaan = {
      id_permintaan: newId,
      kode_resi: resi,
      id_pemesan,
      nama_penerima: (nama_penerima && nama_penerima.trim()) || 'Penerima Barang',
      ruangan_tujuan: (ruangan_tujuan && ruangan_tujuan.trim()) || 'Lobi Utama / Ruangan Tujuan',
      jenis: 'antar',
      deskripsi_barang: deskripsi_barang.trim(),
      foto_barang: null,
      id_lokasi_asal: parseInt(id_lokasi_asal),
      id_lokasi_tujuan: parseInt(id_lokasi_tujuan),
      status: 'Menunggu',
      estimasi_waktu: 15,
      waktu_dibuat: now
    };

    permintaanList.push(newPermintaan);
    writeData('permintaan', permintaanList);

    // Record Status Log
    const riwayatList = readData('riwayat_status');
    riwayatList.push({
      id_riwayat: riwayatList.length > 0 ? Math.max(...riwayatList.map(r => r.id_riwayat)) + 1 : 1,
      id_permintaan: newId,
      status: 'Menunggu',
      waktu: now,
      id_pengubah: id_pemesan
    });
    writeData('riwayat_status', riwayatList);

    // Record SerahTerima OTP (Recipient will hold this OTP)
    const serahTerimaList = readData('serah_terima');
    serahTerimaList.push({
      id_serah_terima: serahTerimaList.length > 0 ? Math.max(...serahTerimaList.map(s => s.id_serah_terima)) + 1 : 1,
      id_permintaan: newId,
      jenis: 'pengambilan',
      foto_bukti: null,
      kode_otp: otp,
      waktu: now
    });
    writeData('serah_terima', serahTerimaList);

    // Record Transaksi
    const transaksiList = readData('transaksi');
    transaksiList.push({
      id_transaksi: transaksiList.length > 0 ? Math.max(...transaksiList.map(t => t.id_transaksi)) + 1 : 1,
      id_permintaan: newId,
      biaya_jasa: 5000,
      honor_kurir: 5000,
      metode_pembayaran: 'Tunai',
      status_bayar: 'belum',
      waktu: now
    });
    writeData('transaksi', transaksiList);

    // Try auto assign courier
    const assignResult = PenugasanController.tugaskanOtomatis(newId);

    // Send Notification
    NotifikasiController.kirimNotifikasi(
      id_pemesan,
      newId,
      `Pesanan ${resi} dibuat. Kode OTP Anda: ${otp}. Berikan ke kurir saat barang sampai.`
    );

    return {
      success: true,
      message: 'Pesanan pengantaran berhasil dibuat.',
      permintaan: newPermintaan,
      kode_otp: otp,
      penugasan: assignResult
    };
  }

  static lacakStatus(id_permintaan) {
    const pList = readData('permintaan');
    const item = pList.find(p => p.id_permintaan === parseInt(id_permintaan));
    if (!item) {
      return { success: false, message: 'Permintaan tidak ditemukan.' };
    }

    const lokasiList = readData('lokasi');
    const asal = lokasiList.find(l => l.id_lokasi === item.id_lokasi_asal);
    const tujuan = lokasiList.find(l => l.id_lokasi === item.id_lokasi_tujuan);

    const riwayatList = readData('riwayat_status').filter(r => r.id_permintaan === item.id_permintaan);
    const serahTerima = readData('serah_terima').find(s => s.id_permintaan === item.id_permintaan);

    // Get assigned courier if any
    const penugasan = readData('penugasan').find(pen => pen.id_permintaan === item.id_permintaan);
    let kurirInfo = null;
    if (penugasan) {
      const kurir = readData('kurir').find(k => k.id_kurir === penugasan.id_kurir);
      if (kurir) {
        const pengguna = readData('pengguna').find(u => u.id_pengguna === kurir.id_pengguna);
        kurirInfo = {
          id_kurir: kurir.id_kurir,
          nama: pengguna ? pengguna.nama : 'Kurir Kampus',
          no_hp: pengguna ? pengguna.no_hp : '',
          rating_rata: kurir.rating_rata
        };
      }
    }

    // Check if review already submitted
    const ulasan = readData('ulasan').find(u => u.id_permintaan === item.id_permintaan);

    return {
      success: true,
      permintaan: {
        ...item,
        lokasi_asal: asal ? asal.nama_lokasi : '',
        lokasi_tujuan: tujuan ? tujuan.nama_lokasi : '',
        kode_otp: serahTerima ? serahTerima.kode_otp : null,
        kurir: kurirInfo,
        riwayat_status: riwayatList,
        sudah_diulas: !!ulasan
      }
    };
  }

  static perbaruiStatus(id_permintaan, status_baru, id_pengubah) {
    const validStatus = ['Menunggu', 'Dijemput', 'Dalam Perjalanan', 'Terkirim'];
    if (!validStatus.includes(status_baru)) {
      return { success: false, message: 'Status tidak valid.' };
    }

    const permintaanList = readData('permintaan');
    const item = permintaanList.find(p => p.id_permintaan === parseInt(id_permintaan));
    if (!item) {
      return { success: false, message: 'Permintaan tidak ditemukan.' };
    }

    item.status = status_baru;
    writeData('permintaan', permintaanList);

    const now = new Date().toISOString();
    const riwayatList = readData('riwayat_status');
    riwayatList.push({
      id_riwayat: riwayatList.length > 0 ? Math.max(...riwayatList.map(r => r.id_riwayat)) + 1 : 1,
      id_permintaan: item.id_permintaan,
      status: status_baru,
      waktu: now,
      id_pengubah
    });
    writeData('riwayat_status', riwayatList);

    // Notifications
    NotifikasiController.kirimNotifikasi(
      item.id_pemesan,
      item.id_permintaan,
      `Status pesanan ${item.kode_resi} kini: ${status_baru}.`
    );

    return { success: true, message: `Status diperbarui menjadi ${status_baru}.` };
  }

  /**
   * Pembaruan status oleh kurir/admin lewat API (BUGFIX).
   * - Identitas kurir diambil dari akun yang login (id_pengubah), BUKAN dari id_kurir kiriman klien.
   *   Sebelumnya klien selalu mengirim id_kurir=1, sehingga pesanan kurir lain dialihkan ke kurir 1
   *   dan hilang dari dashboard kurir yang sedang login (tombol Input OTP tidak pernah muncul).
   * - Urutan status wajib: Menunggu -> Dijemput -> Dalam Perjalanan. 'Terkirim' HANYA lewat verifikasi OTP.
   */
  static perbaruiStatusOlehPengguna({ id_permintaan, status, id_pengubah, id_kurir }) {
    const urutan = { 'Menunggu': 0, 'Dijemput': 1, 'Dalam Perjalanan': 2 };
    if (status === 'Terkirim') {
      return { success: false, code: 'OTP_REQUIRED', message: 'Status Terkirim hanya dapat diset lewat verifikasi OTP serah-terima.' };
    }
    if (!(status in urutan)) {
      return { success: false, message: 'Status tidak valid.' };
    }

    const idPermintaan = parseInt(id_permintaan);
    const item = readData('permintaan').find(p => p.id_permintaan === idPermintaan);
    if (!item) return { success: false, message: 'Permintaan tidak ditemukan.' };
    if (item.jenis !== 'antar') {
      return { success: false, message: 'Hanya pesanan pengantaran yang diproses oleh kurir.' };
    }
    if (item.status === 'Terkirim') {
      return { success: false, message: 'Pesanan ini sudah selesai (Terkirim).' };
    }

    const actor = readData('pengguna').find(u => u.id_pengguna === parseInt(id_pengubah));
    if (!actor || actor.status_akun !== 'aktif') {
      return { success: false, code: 'FORBIDDEN', message: 'Akun tidak dikenali atau tidak aktif.' };
    }

    const kurirList = readData('kurir');
    let kurirActor = null;
    if (actor.peran === 'kurir') {
      kurirActor = kurirList.find(k => k.id_pengguna === actor.id_pengguna && k.status_verifikasi === 'disetujui');
      if (!kurirActor) {
        return { success: false, code: 'FORBIDDEN', message: 'Akun kurir Anda belum disetujui administrator.' };
      }
    } else if (actor.peran === 'administrator') {
      kurirActor = id_kurir ? kurirList.find(k => k.id_kurir === parseInt(id_kurir)) : null;
    } else {
      return { success: false, code: 'FORBIDDEN', message: 'Hanya kurir atau administrator yang dapat mengubah status pengantaran.' };
    }

    const penugasanList = readData('penugasan');
    const penugasan = penugasanList.find(p => p.id_permintaan === idPermintaan);

    if (item.status === 'Menunggu') {
      // Mengambil tugas: kurir yang menekan tombol menjadi penanggung jawab pesanan.
      if (status !== 'Dijemput') {
        return { success: false, message: 'Pesanan harus dijemput terlebih dahulu.' };
      }
      if (!kurirActor) {
        return { success: false, message: 'Pilih kurir yang bertugas.' };
      }
      if (!penugasan) {
        penugasanList.push({
          id_penugasan: penugasanList.length > 0 ? Math.max(...penugasanList.map(p => p.id_penugasan)) + 1 : 1,
          id_permintaan: idPermintaan,
          id_kurir: kurirActor.id_kurir,
          metode: 'manual',
          waktu_ditugaskan: new Date().toISOString()
        });
        writeData('penugasan', penugasanList);
      } else if (penugasan.id_kurir !== kurirActor.id_kurir) {
        penugasan.id_kurir = kurirActor.id_kurir;
        penugasan.metode = 'manual';
        penugasan.waktu_ditugaskan = new Date().toISOString();
        writeData('penugasan', penugasanList);
      }
    } else {
      // Sudah dijemput: hanya kurir penanggung jawab (atau admin) yang boleh melanjutkan.
      if (actor.peran === 'kurir' && (!penugasan || penugasan.id_kurir !== kurirActor.id_kurir)) {
        return { success: false, code: 'FORBIDDEN', message: 'Pesanan ini ditangani kurir lain.' };
      }
      if (urutan[status] !== urutan[item.status] + 1) {
        return { success: false, message: `Status tidak dapat diubah dari "${item.status}" ke "${status}".` };
      }
    }

    return this.perbaruiStatus(idPermintaan, status, actor.id_pengguna);
  }
}

// ============================================================================
// 4. PenugasanController (UC-04)
// ============================================================================
class PenugasanController {
  static cariKurirTersedia() {
    const kurirList = readData('kurir');
    return kurirList.filter(k => k.status_verifikasi === 'disetujui' && k.status_ketersediaan === 'tersedia');
  }

  static tugaskanOtomatis(id_permintaan) {
    const availableCouriers = this.cariKurirTersedia();
    if (availableCouriers.length === 0) {
      return { assigned: false, message: 'Tidak ada kurir yang sedang bertugas/tersedia.' };
    }

    // Select courier with highest rating or first available
    const chosen = availableCouriers[0];
    return this.tugaskan(id_permintaan, chosen.id_kurir, 'otomatis');
  }

  static tugaskan(id_permintaan, id_kurir, metode = 'manual') {
    const penugasanList = readData('penugasan');
    const existing = penugasanList.find(p => p.id_permintaan === parseInt(id_permintaan));
    const now = new Date().toISOString();

    if (existing) {
      existing.id_kurir = parseInt(id_kurir);
      existing.metode = metode;
      existing.waktu_ditugaskan = now;
      writeData('penugasan', penugasanList);
    } else {
      penugasanList.push({
        id_penugasan: penugasanList.length > 0 ? Math.max(...penugasanList.map(p => p.id_penugasan)) + 1 : 1,
        id_permintaan: parseInt(id_permintaan),
        id_kurir: parseInt(id_kurir),
        metode,
        waktu_ditugaskan: now
      });
      writeData('penugasan', penugasanList);
    }

    const permintaan = readData('permintaan').find(p => p.id_permintaan === parseInt(id_permintaan));
    const kurir = readData('kurir').find(k => k.id_kurir === parseInt(id_kurir));

    if (kurir) {
      // Notify courier
      NotifikasiController.kirimNotifikasi(
        kurir.id_pengguna,
        id_permintaan,
        `Tugas baru: Pengantaran ${permintaan ? permintaan.kode_resi : ''} ditugaskan kepada Anda.`
      );
    }

    if (permintaan) {
      // Notify customer
      NotifikasiController.kirimNotifikasi(
        permintaan.id_pemesan,
        id_permintaan,
        `Pesanan ${permintaan.kode_resi} telah ditugaskan ke kurir.`
      );
    }

    return { assigned: true, id_kurir, metode };
  }
}

// ============================================================================
// 5. SerahTerimaController (UC-07)
// ============================================================================
class SerahTerimaController {
  static verifikasiSerahTerima({ id_permintaan, kode_otp, foto_bukti, id_pengubah }) {
    if (!id_permintaan || !kode_otp) {
      return { success: false, message: 'Nomor pesanan dan kode OTP wajib diisi.' };
    }

    const serahTerimaList = readData('serah_terima');
    const record = serahTerimaList.find(s => s.id_permintaan === parseInt(id_permintaan));

    if (!record) {
      return { success: false, message: 'Data serah-terima pesanan tidak ditemukan.' };
    }

    if (record.kode_otp !== kode_otp.toString().trim()) {
      return { success: false, code: 'INVALID_OTP', message: 'Kode OTP serah-terima salah.' };
    }

    // BUGFIX: OTP hanya sah sekali & pada tahap yang benar (cegah serah-terima ganda / sebelum dijemput)
    const itemCek = readData('permintaan').find(p => p.id_permintaan === parseInt(id_permintaan));
    if (!itemCek) {
      return { success: false, message: 'Permintaan tidak ditemukan.' };
    }
    if (itemCek.status === 'Terkirim') {
      return { success: false, code: 'ALREADY_DONE', message: 'Serah-terima pesanan ini sudah selesai sebelumnya.' };
    }
    if (itemCek.jenis === 'antar' && itemCek.status === 'Menunggu') {
      return { success: false, code: 'NOT_PICKED_UP', message: 'Pesanan belum dijemput kurir. Tekan "Jemput Barang" dan "Mulai Antar" terlebih dahulu.' };
    }

    const now = new Date().toISOString();
    record.foto_bukti = foto_bukti || record.foto_bukti || '/uploads/bukti-serahterima.jpg';
    record.waktu = now;
    writeData('serah_terima', serahTerimaList);

    // Update status to Terkirim
    PermintaanController.perbaruiStatus(id_permintaan, 'Terkirim', id_pengubah);

    // Mark transaction as lunas
    const transaksiList = readData('transaksi');
    const tr = transaksiList.find(t => t.id_permintaan === parseInt(id_permintaan));
    if (tr) {
      tr.status_bayar = 'lunas';
      writeData('transaksi', transaksiList);
    }

    const item = readData('permintaan').find(p => p.id_permintaan === parseInt(id_permintaan));
    let returnMsg = 'Serah-terima barang berhasil diverifikasi. Pesanan selesai!';
    if (item && item.jenis === 'titip') {
      returnMsg = 'Pengambilan barang titipan mandiri dari loker berhasil diverifikasi! Transaksi selesai.';
      NotifikasiController.kirimNotifikasi(
        item.id_pemesan,
        item.id_permintaan,
        `Barang titipan ${item.kode_resi} telah berhasil diambil kembali secara mandiri dari loker drop point.`
      );
    } else if (item && item.jenis === 'antar') {
      returnMsg = 'Serah-terima pengantaran barang ke ruangan tujuan/pos berhasil diverifikasi!';
      NotifikasiController.kirimNotifikasi(
        item.id_pemesan,
        item.id_permintaan,
        `Pengantaran ${item.kode_resi} selesai! Barang telah diserahkan di ruangan tujuan/pos.`
      );
    }

    return {
      success: true,
      message: returnMsg
    };
  }
}

// ============================================================================
// 6. LaporanKehilanganController (UC-11, UC-12)
// ============================================================================
class LaporanKehilanganController {
  static laporKehilangan({ id_permintaan, id_pelapor, deskripsi }) {
    if (!id_permintaan || !id_pelapor || !deskripsi || deskripsi.trim() === '') {
      return { success: false, message: 'Pilih pesanan dan sertakan kronologi kejadian.' };
    }

    const pList = readData('permintaan');
    const item = pList.find(p => p.id_permintaan === parseInt(id_permintaan));

    if (!item) {
      return { success: false, message: 'Permintaan tidak terdaftar dalam sistem.' };
    }

    if (item.id_pemesan !== parseInt(id_pelapor)) {
      return { success: false, message: 'Anda hanya dapat melaporkan pesanan milik Anda sendiri.' };
    }

    const laporanList = readData('laporan_kehilangan');
    const newId = laporanList.length > 0 ? Math.max(...laporanList.map(l => l.id_laporan)) + 1 : 1;

    const newLaporan = {
      id_laporan: newId,
      id_permintaan: parseInt(id_permintaan),
      id_pelapor: parseInt(id_pelapor),
      deskripsi: deskripsi.trim(),
      status: 'diterima',
      tindak_lanjut: null,
      id_admin: null
    };

    laporanList.push(newLaporan);
    writeData('laporan_kehilangan', laporanList);

    // Notify all admins
    const admins = readData('pengguna').filter(u => u.peran === 'administrator');
    admins.forEach(admin => {
      NotifikasiController.kirimNotifikasi(
        admin.id_pengguna,
        item.id_permintaan,
        `Laporan kehilangan baru diajukan untuk pesanan ${item.kode_resi}.`
      );
    });

    return {
      success: true,
      message: 'Laporan kehilangan telah dikirim dan akan segera ditindaklanjuti oleh administrator.',
      id_laporan: newId
    };
  }

  static tindakLanjuti({ id_laporan, status, tindak_lanjut, id_admin }) {
    const laporanList = readData('laporan_kehilangan');
    const laporan = laporanList.find(l => l.id_laporan === parseInt(id_laporan));

    if (!laporan) {
      return { success: false, message: 'Laporan tidak ditemukan.' };
    }

    laporan.status = status;
    laporan.tindak_lanjut = tindak_lanjut || laporan.tindak_lanjut;
    laporan.id_admin = id_admin || laporan.id_admin;
    writeData('laporan_kehilangan', laporanList);

    // Notify complainant
    NotifikasiController.kirimNotifikasi(
      laporan.id_pelapor,
      laporan.id_permintaan,
      `Tindak lanjut laporan: Status kini ${status}. Catatan: ${tindak_lanjut || '-'}`
    );

    return { success: true, message: 'Status laporan berhasil diperbarui.' };
  }
}

// ============================================================================
// 7. UlasanController (UC-13)
// ============================================================================
class UlasanController {
  static beriUlasan({ id_permintaan, rating, komentar, id_pemberi }) {
    if (!id_permintaan || !rating) {
      return { success: false, message: 'Nomor pesanan dan nilai bintang rating wajib diisi.' };
    }

    const rNum = parseInt(rating);
    if (rNum < 1 || rNum > 5) {
      return { success: false, message: 'Rating harus antara 1 sampai 5.' };
    }

    const pList = readData('permintaan');
    const item = pList.find(p => p.id_permintaan === parseInt(id_permintaan));
    if (!item) {
      return { success: false, message: 'Pesanan tidak ditemukan.' };
    }

    if (item.status !== 'Terkirim') {
      return { success: false, message: 'Rating hanya dapat diberikan untuk pesanan yang sudah Terkirim.' };
    }

    // Check if already reviewed
    const ulasanList = readData('ulasan');
    const existing = ulasanList.find(u => u.id_permintaan === item.id_permintaan);
    if (existing) {
      return { success: false, message: 'Anda sudah pernah memberikan ulasan untuk pesanan ini.' };
    }

    // Find courier
    const penugasan = readData('penugasan').find(pen => pen.id_permintaan === item.id_permintaan);
    const id_kurir = penugasan ? penugasan.id_kurir : null;

    const newId = ulasanList.length > 0 ? Math.max(...ulasanList.map(u => u.id_ulasan)) + 1 : 1;
    const newUlasan = {
      id_ulasan: newId,
      id_permintaan: item.id_permintaan,
      id_kurir,
      id_pemberi: parseInt(id_pemberi),
      rating: rNum,
      komentar: komentar ? komentar.trim() : ''
    };

    ulasanList.push(newUlasan);
    writeData('ulasan', ulasanList);

    // Recalculate courier average rating
    if (id_kurir) {
      const kurirList = readData('kurir');
      const kurir = kurirList.find(k => k.id_kurir === id_kurir);
      if (kurir) {
        const kurirReviews = ulasanList.filter(u => u.id_kurir === id_kurir);
        const sum = kurirReviews.reduce((acc, curr) => acc + curr.rating, 0);
        kurir.rating_rata = parseFloat((sum / kurirReviews.length).toFixed(1));
        writeData('kurir', kurirList);
      }
    }

    return {
      success: true,
      message: 'Terima kasih! Ulasan dan rating Anda berhasil disimpan.'
    };
  }
}

// ============================================================================
// 8. KurirAdminController (UC-09, UC-14, UC-15)
// ============================================================================
class KurirAdminController {
  static getDashboardStats() {
    const transaksiList = readData('transaksi');
    const kurirList = readData('kurir');
    const laporanList = readData('laporan_kehilangan');
    const permintaanList = readData('permintaan');

    const totalTransaksi = transaksiList.length;
    const kurirOnDuty = kurirList.filter(k => k.status_ketersediaan === 'tersedia' || k.status_ketersediaan === 'bertugas').length;
    const laporanPending = laporanList.filter(l => l.status !== 'selesai').length;

    // locker utilization (Gedung GK1 has 12 lockers, 4 active titip items)
    const activeTitip = permintaanList.filter(p => p.jenis === 'titip' && p.status !== 'Terkirim').length;
    const utilisasiLoker = Math.min(100, Math.round(((activeTitip + 8) / 12) * 100));

    return {
      totalTransaksi,
      kurirOnDuty,
      utilisasiLoker: `${utilisasiLoker}%`,
      laporanPending
    };
  }

  static verifikasiPengajuanKurir({ id_kurir, keputusan, alasan_penolakan, id_admin }) {
    const kurirList = readData('kurir');
    const kurir = kurirList.find(k => k.id_kurir === parseInt(id_kurir));
    if (!kurir) {
      return { success: false, message: 'Data kurir tidak ditemukan.' };
    }

    const penggunaList = readData('pengguna');
    const user = penggunaList.find(u => u.id_pengguna === kurir.id_pengguna);

    if (keputusan === 'setujui') {
      kurir.status_verifikasi = 'disetujui';
      kurir.status_ketersediaan = 'tersedia';
      kurir.alasan_penolakan = null;
      writeData('kurir', kurirList);

      if (user) {
        user.peran = 'kurir';
        writeData('pengguna', penggunaList);
        NotifikasiController.kirimNotifikasi(
          user.id_pengguna,
          null,
          'Selamat! Pengajuan Anda sebagai kurir mahasiswa SiTAB telah disetujui.'
        );
      }
      return { success: true, message: 'Pengajuan kurir telah disetujui.' };
    } else {
      kurir.status_verifikasi = 'ditolak';
      kurir.alasan_penolakan = alasan_penolakan || 'Persyaratan tidak memenuhi kriteria.';
      writeData('kurir', kurirList);

      if (user) {
        user.peran = 'mahasiswa';
        writeData('pengguna', penggunaList);
        NotifikasiController.kirimNotifikasi(
          user.id_pengguna,
          null,
          `Pengajuan kurir Anda ditolak. Alasan: ${kurir.alasan_penolakan}`
        );
      }
      return { success: true, message: 'Pengajuan kurir telah ditolak dengan alasan.' };
    }
  }

  static toggleStatusPengguna(id_pengguna, status_baru) {
    const penggunaList = readData('pengguna');
    const user = penggunaList.find(u => u.id_pengguna === parseInt(id_pengguna));
    if (!user) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    user.status_akun = status_baru;
    writeData('pengguna', penggunaList);
    return { success: true, message: `Status pengguna berhasil diubah menjadi ${status_baru}.` };
  }

  static updateJadwalKurir(id_kurir, jadwalBaru) {
    if (!jadwalBaru || jadwalBaru.length === 0) {
      return { success: false, message: 'Jadwal tidak boleh kosong.' };
    }

    const jadwalList = readData('jadwal_kurir').filter(j => j.id_kurir !== parseInt(id_kurir));
    jadwalBaru.forEach(j => {
      const newId = jadwalList.length > 0 ? Math.max(...jadwalList.map(item => item.id_jadwal)) + 1 : 1;
      jadwalList.push({
        id_jadwal: newId,
        id_kurir: parseInt(id_kurir),
        hari: j.hari,
        jam_mulai: j.jam_mulai,
        jam_selesai: j.jam_selesai
      });
    });

    writeData('jadwal_kurir', jadwalList);
    return { success: true, message: 'Jadwal kurir berhasil diperbarui.' };
  }

  static toggleKetersediaanKurir(id_kurir, ketersediaan) {
    const kurirList = readData('kurir');
    const kurir = kurirList.find(k => k.id_kurir === parseInt(id_kurir));
    if (!kurir) {
      return { success: false, message: 'Kurir tidak ditemukan.' };
    }
    kurir.status_ketersediaan = ketersediaan;
    writeData('kurir', kurirList);
    return { success: true, message: `Status ketersediaan diubah menjadi ${ketersediaan}.` };
  }
}

// ============================================================================
// 9. NotifikasiController (UC-06)
// ============================================================================
class NotifikasiController {
  static kirimNotifikasi(id_pengguna, id_permintaan, pesan) {
    const notifikasiList = readData('notifikasi');
    const newId = notifikasiList.length > 0 ? Math.max(...notifikasiList.map(n => n.id_notifikasi)) + 1 : 1;

    notifikasiList.push({
      id_notifikasi: newId,
      id_pengguna: parseInt(id_pengguna),
      id_permintaan: id_permintaan ? parseInt(id_permintaan) : null,
      pesan,
      sudah_dibaca: false,
      waktu: new Date().toISOString()
    });

    writeData('notifikasi', notifikasiList);
    return newId;
  }

  static getNotifikasi(id_pengguna) {
    const notif = readData('notifikasi').filter(n => n.id_pengguna === parseInt(id_pengguna));
    return notif.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
  }

  static tandaiDibaca(id_notifikasi) {
    const notifikasiList = readData('notifikasi');
    const item = notifikasiList.find(n => n.id_notifikasi === parseInt(id_notifikasi));
    if (item) {
      item.sudah_dibaca = true;
      writeData('notifikasi', notifikasiList);
      return true;
    }
    return false;
  }
}

// Reset database to standard initial baseline state
function resetDatabase() {
  const initialPengguna = [
    {
      id_pengguna: 1,
      nama: "Salem, Jovitly Mike",
      email_kampus: "12410207@student.unklab.ac.id",
      no_hp: "081234567801",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "administrator",
      status_akun: "aktif",
      waktu_daftar: "2026-11-01T08:00:00.000Z"
    },
    {
      id_pengguna: 2,
      nama: "Salem, Jovitly Mike (NIM)",
      email_kampus: "105022410043@student.unklab.ac.id",
      no_hp: "081234567801",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "administrator",
      status_akun: "aktif",
      waktu_daftar: "2026-11-01T08:00:00.000Z"
    },
    {
      id_pengguna: 3,
      nama: "Samuel Anasim",
      email_kampus: "12410208@student.unklab.ac.id",
      no_hp: "081234567802",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "kurir",
      status_akun: "aktif",
      waktu_daftar: "2026-11-02T09:00:00.000Z"
    },
    {
      id_pengguna: 4,
      nama: "Sanjaya, Liandy Maygiven",
      email_kampus: "105022410044@student.unklab.ac.id",
      no_hp: "081234567803",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "kurir",
      status_akun: "aktif",
      waktu_daftar: "2026-11-03T10:00:00.000Z"
    },
    {
      id_pengguna: 5,
      nama: "Makarewa, Miracle Evangelio",
      email_kampus: "105022410118@student.unklab.ac.id",
      no_hp: "081234567804",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "mahasiswa",
      status_akun: "aktif",
      waktu_daftar: "2026-11-04T11:00:00.000Z"
    },
    {
      id_pengguna: 6,
      nama: "Sahala, Andrew",
      email_kampus: "105012410026@student.unklab.ac.id",
      no_hp: "081234567805",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "mahasiswa",
      status_akun: "aktif",
      waktu_daftar: "2026-11-05T12:00:00.000Z"
    },
    {
      id_pengguna: 7,
      nama: "Michelle Lumentut",
      email_kampus: "12410601@student.unklab.ac.id",
      no_hp: "081234567806",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "mahasiswa",
      status_akun: "aktif",
      waktu_daftar: "2026-11-06T13:00:00.000Z"
    },
    {
      id_pengguna: 8,
      nama: "Lumintang, Evangelio",
      email_kampus: "12410999@student.unklab.ac.id",
      no_hp: "081234567899",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "mahasiswa",
      status_akun: "nonaktif",
      waktu_daftar: "2026-11-07T14:00:00.000Z"
    },
    {
      id_pengguna: 9,
      nama: "Santoso, Abdillah",
      email_kampus: "12410888@student.unklab.ac.id",
      no_hp: "081234567888",
      password_hash: "$2a$10$cr17nzIA2tK9K/V9stycoe7umn1tcM4IvQCjx245HY04Gtjy36hFK",
      peran: "mahasiswa",
      status_akun: "belum_diverifikasi",
      waktu_daftar: "2026-11-08T15:00:00.000Z"
    }
  ];

  const initialKurir = [
    {
      id_kurir: 1,
      id_pengguna: 3,
      status_verifikasi: "disetujui",
      status_ketersediaan: "tersedia",
      rating_rata: 4.9,
      waktu_pengajuan: "2026-11-02T09:30:00.000Z",
      setuju_kode_etik: true,
      alasan_penolakan: null
    },
    {
      id_kurir: 2,
      id_pengguna: 4,
      status_verifikasi: "disetujui",
      status_ketersediaan: "tersedia",
      rating_rata: 5.0,
      waktu_pengajuan: "2026-11-03T10:30:00.000Z",
      setuju_kode_etik: true,
      alasan_penolakan: null
    }
  ];

  const initialJadwalKurir = [
    { id_jadwal: 1, id_kurir: 1, hari: "Kamis", jam_mulai: "13:00", jam_selesai: "17:00" },
    { id_jadwal: 2, id_kurir: 1, hari: "Jumat", jam_mulai: "09:00", jam_selesai: "12:00" },
    { id_jadwal: 3, id_kurir: 1, hari: "Minggu", jam_mulai: "13:00", jam_selesai: "16:00" },
    { id_jadwal: 4, id_kurir: 2, hari: "Senin", jam_mulai: "10:00", jam_selesai: "15:00" }
  ];

  const initialLokasi = [
    { id_lokasi: 1, nama_lokasi: "Gedung GK1 · Lantai 1", jenis: "drop point", keterangan: "Sebelah lobi utama loker. Jam operasional 07.00–20.00 WITA. Kapasitas: 8/12 loker tersedia." },
    { id_lokasi: 2, nama_lokasi: "Perpustakaan Pusat", jenis: "drop point", keterangan: "Lobi lantai 1 loket penitipan resmi." },
    { id_lokasi: 3, nama_lokasi: "Asrama Crystal", jenis: "gedung", keterangan: "Lobi utama asrama putri." },
    { id_lokasi: 4, nama_lokasi: "Asrama Edelweiss", jenis: "gedung", keterangan: "Lobi utama asrama putri." },
    { id_lokasi: 5, nama_lokasi: "Asrama Jasmine", jenis: "gedung", keterangan: "Lobi utama asrama putri." },
    { id_lokasi: 6, nama_lokasi: "Kantin Pusat", jenis: "gedung", keterangan: "Pusat kuliner kampus UNKLAB." },
    { id_lokasi: 7, nama_lokasi: "Fakultas Ilmu Komputer (FIK)", jenis: "gedung", keterangan: "Lantai 1 koridor depan lab komputer." },
    { id_lokasi: 8, nama_lokasi: "Gedung GK2 · Lantai 1", jenis: "drop point", keterangan: "Lobi loker drop point barat." },
    { id_lokasi: 9, nama_lokasi: "Pos Satpam Gerbang Utama", jenis: "drop point", keterangan: "Drop point pos satpam depan gerbang UNKLAB." }
  ];

  const initialPermintaan = [
    {
      id_permintaan: 1,
      kode_resi: "STB-0248",
      id_pemesan: 5,
      nama_penerima: "Gabriella Manoppo",
      jenis: "antar",
      deskripsi_barang: "Buku referensi (2 buah), dalam tote bag krem.",
      foto_barang: "/uploads/buku-referensi.jpg",
      id_lokasi_asal: 2,
      id_lokasi_tujuan: 3,
      status: "Dalam Perjalanan",
      estimasi_waktu: 15,
      waktu_dibuat: "2026-11-12T14:12:00.000Z"
    },
    {
      id_permintaan: 2,
      kode_resi: "STB-0252",
      id_pemesan: 5,
      nama_penerima: "Michelle Lumentut",
      jenis: "titip",
      deskripsi_barang: "Buku Algoritma, sampul biru",
      foto_barang: "/uploads/buku-algoritma.jpg",
      id_lokasi_asal: 1,
      id_lokasi_tujuan: 1,
      status: "Menunggu",
      estimasi_waktu: 0,
      waktu_dibuat: "2026-11-12T09:30:00.000Z"
    },
    {
      id_permintaan: 3,
      kode_resi: "STB-0001",
      id_pemesan: 5,
      nama_penerima: "Andrew Sahala",
      jenis: "antar",
      deskripsi_barang: "Dokumen tugas akhir dan flashdisk",
      foto_barang: null,
      id_lokasi_asal: 2,
      id_lokasi_tujuan: 7,
      status: "Dijemput",
      estimasi_waktu: 12,
      waktu_dibuat: "2026-11-11T13:00:00.000Z"
    },
    {
      id_permintaan: 4,
      kode_resi: "STB-0002",
      id_pemesan: 6,
      nama_penerima: "Miracle Makarewa",
      jenis: "antar",
      deskripsi_barang: "Kabel charger type-c dan mouse wireless",
      foto_barang: null,
      id_lokasi_asal: 6,
      id_lokasi_tujuan: 3,
      status: "Terkirim",
      estimasi_waktu: 10,
      waktu_dibuat: "2026-11-10T15:00:00.000Z"
    }
  ];

  const initialPenugasan = [
    { id_penugasan: 1, id_permintaan: 1, id_kurir: 1, metode: "otomatis", waktu_ditugaskan: "2026-11-12T14:15:00.000Z" },
    { id_penugasan: 2, id_permintaan: 3, id_kurir: 2, metode: "manual", waktu_ditugaskan: "2026-11-11T13:05:00.000Z" },
    { id_penugasan: 3, id_permintaan: 4, id_kurir: 1, metode: "otomatis", waktu_ditugaskan: "2026-11-10T15:05:00.000Z" }
  ];

  const initialRiwayatStatus = [
    { id_riwayat: 1, id_permintaan: 1, status: "Menunggu", waktu: "2026-11-12T14:12:00.000Z", id_pengubah: 5 },
    { id_riwayat: 2, id_permintaan: 1, status: "Dijemput", waktu: "2026-11-12T14:20:00.000Z", id_pengubah: 3 },
    { id_riwayat: 3, id_permintaan: 1, status: "Dalam Perjalanan", waktu: "2026-11-12T14:24:00.000Z", id_pengubah: 3 },
    { id_riwayat: 4, id_permintaan: 2, status: "Menunggu", waktu: "2026-11-12T09:30:00.000Z", id_pengubah: 5 },
    { id_riwayat: 5, id_permintaan: 3, status: "Menunggu", waktu: "2026-11-11T13:00:00.000Z", id_pengubah: 5 },
    { id_riwayat: 6, id_permintaan: 3, status: "Dijemput", waktu: "2026-11-11T13:10:00.000Z", id_pengubah: 4 },
    { id_riwayat: 7, id_permintaan: 4, status: "Menunggu", waktu: "2026-11-10T15:00:00.000Z", id_pengubah: 6 },
    { id_riwayat: 8, id_permintaan: 4, status: "Dijemput", waktu: "2026-11-10T15:15:00.000Z", id_pengubah: 3 },
    { id_riwayat: 9, id_permintaan: 4, status: "Dalam Perjalanan", waktu: "2026-11-10T15:20:00.000Z", id_pengubah: 3 },
    { id_riwayat: 10, id_permintaan: 4, status: "Terkirim", waktu: "2026-11-10T15:35:00.000Z", id_pengubah: 3 }
  ];

  const initialSerahTerima = [
    { id_serah_terima: 1, id_permintaan: 1, jenis: "pengambilan", foto_bukti: null, kode_otp: "4829", waktu: "2026-11-12T14:20:00.000Z" },
    { id_serah_terima: 2, id_permintaan: 2, jenis: "penitipan", foto_bukti: "/uploads/buku-algoritma.jpg", kode_otp: "5123", waktu: "2026-11-12T09:30:00.000Z" },
    { id_serah_terima: 3, id_permintaan: 3, jenis: "pengambilan", foto_bukti: null, kode_otp: "9012", waktu: "2026-11-11T13:10:00.000Z" },
    { id_serah_terima: 4, id_permintaan: 4, jenis: "pengambilan", foto_bukti: "/uploads/bukti-serahterima.jpg", kode_otp: "7731", waktu: "2026-11-10T15:35:00.000Z" }
  ];

  const initialTransaksi = [
    { id_transaksi: 1, id_permintaan: 1, biaya_jasa: 5000, honor_kurir: 5000, metode_pembayaran: "Tunai", status_bayar: "belum", waktu: "2026-11-12T14:12:00.000Z" },
    { id_transaksi: 2, id_permintaan: 2, biaya_jasa: 2000, honor_kurir: 0, metode_pembayaran: "Saldo Digital", status_bayar: "lunas", waktu: "2026-11-12T09:30:00.000Z" },
    { id_transaksi: 3, id_permintaan: 3, biaya_jasa: 5000, honor_kurir: 5000, metode_pembayaran: "Tunai", status_bayar: "belum", waktu: "2026-11-11T13:00:00.000Z" },
    { id_transaksi: 4, id_permintaan: 4, biaya_jasa: 5000, honor_kurir: 5000, metode_pembayaran: "Tunai", status_bayar: "lunas", waktu: "2026-11-10T15:00:00.000Z" }
  ];

  const initialLaporan = [
    {
      id_laporan: 1,
      id_permintaan: 1,
      id_pelapor: 5,
      deskripsi: "Barang terlambat dan sempat belum ada kabar saat penjemputan.",
      status: "diproses",
      tindak_lanjut: "Admin Salem telah memverifikasi posisi kurir Samuel Anasim yang sedang menuju lokasi pengantaran.",
      id_admin: 1
    }
  ];

  const initialUlasan = [
    {
      id_ulasan: 1,
      id_permintaan: 4,
      id_kurir: 1,
      id_pemberi: 6,
      rating: 5,
      komentar: "Tepat waktu, ramah, dan barang aman sekali sampai tujuan. Terima kasih kurir Samuel!"
    }
  ];

  const initialNotifikasi = [
    {
      id_notifikasi: 1,
      id_pengguna: 5,
      id_permintaan: 3,
      pesan: "Pesanan STB-0001 diambil kurir. Kurir Sanjaya sedang menuju lokasi penjemputan.",
      sudah_dibaca: false,
      waktu: "2026-11-11T13:10:00.000Z"
    },
    {
      id_notifikasi: 2,
      id_pengguna: 5,
      id_permintaan: 2,
      pesan: "Penitipan STB-0252 berhasil. Barang tersimpan di loker Gedung GK1 Lantai 1.",
      sudah_dibaca: true,
      waktu: "2026-11-12T09:35:00.000Z"
    },
    {
      id_notifikasi: 3,
      id_pengguna: 1,
      id_permintaan: null,
      pesan: "Laporan kehilangan baru diajukan untuk pesanan STB-0248.",
      sudah_dibaca: false,
      waktu: "2026-11-12T14:30:00.000Z"
    }
  ];

  const initialVerifikasi = [
    {
      id_verifikasi: 1,
      id_pengguna: 9,
      kode_verifikasi: "824915",
      kode_plain: "824915",
      waktu_dibuat: "2026-11-20T12:55:00.000Z",
      waktu_kedaluwarsa: "2026-11-20T13:10:00.000Z",
      jumlah_percobaan: 0,
      status: "menunggu"
    }
  ];

  writeData('pengguna', initialPengguna);
  writeData('kurir', initialKurir);
  writeData('jadwal_kurir', initialJadwalKurir);
  writeData('lokasi', initialLokasi);
  writeData('permintaan', initialPermintaan);
  writeData('penugasan', initialPenugasan);
  writeData('riwayat_status', initialRiwayatStatus);
  writeData('serah_terima', initialSerahTerima);
  writeData('transaksi', initialTransaksi);
  writeData('laporan_kehilangan', initialLaporan);
  writeData('ulasan', initialUlasan);
  writeData('notifikasi', initialNotifikasi);
  writeData('verifikasi_email', initialVerifikasi);
}

// Export controllers & helper methods
module.exports = {
  readData,
  writeData,
  resetDatabase,
  hashPassword,
  generateOTP,
  generateResi,
  isValidUnklabEmail,
  isStrictStudentEmail,
  AuthController,
  RegistrasiController,
  PermintaanController,
  PenugasanController,
  SerahTerimaController,
  LaporanKehilanganController,
  UlasanController,
  KurirAdminController,
  NotifikasiController
};
