<<<<<<< HEAD
// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// server.js — Main HTTP Server & REST API Router
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const {
  readData,
  writeData,
  resetDatabase,
  AuthController,
  RegistrasiController,
  PermintaanController,
  PenugasanController,
  SerahTerimaController,
  LaporanKehilanganController,
  UlasanController,
  KurirAdminController,
  NotifikasiController,
  hashPassword
} = require('./controllers');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
  });
}

// Helper to send JSON responses
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Serve static files
function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  // Prevent directory traversal
  safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback if not found: try appending .html
      const htmlFallback = `${filePath}.html`;
      if (fs.existsSync(htmlFallback)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        fs.createReadStream(htmlFallback).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// Server Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
=======
'use strict';
/**
 * SiTAB - Sistem Titip Antar Barang Kampus UNKLAB
 * Backend Server (Pure Node.js, no external dependencies)
 * Kelompok Miedal:
 *   - Salem, Jovitly Mike      (105022410043) — Administrator
 *   - Sanjaya, Liandy Maygiven (105022410044) — Kurir
 *   - Makarewa, Miracle Evangelio (105022410118) — Mahasiswa
 *   - Sahala, Andrew           (105012410026) — Kurir
 */

const http       = require('http');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const url        = require('url');
const querystring = require('querystring');

// ─────────────────────────── CONFIGURATION ───────────────────────────────────
const PORT      = process.env.PORT || 3000;
const DB_PATH   = path.join(__dirname, 'data', 'sitab_db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ─────────────────────────── HELPERS ─────────────────────────────────────────

/** SHA-256 hash */
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/** Generate a random numeric OTP */
function genOTP(digits = 6) {
  let otp = '';
  for (let i = 0; i < digits; i++) otp += Math.floor(Math.random() * 10);
  return otp;
}

/** Generate a simple UUID-like ID */
function genId(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
}

/** Read the JSON database */
function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(raw);
}

/** Write the JSON database atomically */
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

/** Parse JSON body from request */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/** Send a JSON response */
function sendJSON(res, statusCode, payload) {
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(json);
}

/** Send error */
function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { success: false, message });
}

/** Validate session token from Authorization header */
function getSession(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const db = readDB();
  // sessions stored as notifikasi with type 'session'
  const session = (db.sessions || []).find(s => s.token === token && s.aktif);
  if (!session) return null;
  const pengguna = db.pengguna.find(p => p.id === session.penggunaId);
  if (!pengguna || !pengguna.aktif) return null;
  return { pengguna, session };
}

/** Require authentication middleware-like */
function requireAuth(res, req) {
  const sess = getSession(req);
  if (!sess) {
    sendError(res, 401, 'Unauthorized: silakan login terlebih dahulu');
    return null;
  }
  return sess;
}

/** Require specific role */
function requireRole(res, req, ...roles) {
  const sess = requireAuth(res, req);
  if (!sess) return null;
  if (!roles.includes(sess.pengguna.peran)) {
    sendError(res, 403, 'Akses ditolak: hak akses tidak memadai');
    return null;
  }
  return sess;
}

/** MIME type map for static serving */
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf'
};

/** Serve static files */
function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err) {
      // Try index.html as fallback for SPA
      const index = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(index, (e2, data) => {
        if (e2) { sendError(res, 404, 'Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
      return;
    }
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) { sendError(res, 404, 'File tidak ditemukan'); return; }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': data.length
      });
      res.end(data);
    });
  });
}

// ──────────────────── BARANG TERLARANG (BR-02) ───────────────────────────────
const BARANG_TERLARANG = [
  'narkoba', 'sabu', 'ganja', 'kokain', 'heroin', 'morfin',
  'senjata', 'pistol', 'senapan', 'parang', 'pedang', 'pisau',
  'rokok', 'sigaret', 'tembakau', 'vape',
  'miras', 'minuman keras', 'alkohol', 'bir', 'wine', 'vodka',
  'bahan peledak', 'bom', 'petasan', 'dinamit', 'granat',
  'uang tunai', 'dollar', 'rupiah'
];

function cekBarangTerlarang(deskripsi) {
  if (!deskripsi) return false;
  const lower = deskripsi.toLowerCase();
  return BARANG_TERLARANG.some(kata => lower.includes(kata));
}

// ─────────────────────────── ROUTE HANDLERS ──────────────────────────────────

// ============================= AUTH ==========================================

/** POST /api/auth/register */
function handleRegister(req, res) {
  parseBody(req).then(body => {
    const { nim, nama, email, password } = body;
    const confPass = body.konfirmasiPassword || body.konfirmasi_password || body.konfirmasi;
    const noHp = body.noHp || body.no_hp || '';

    // Validasi field wajib
    if (!nim || !nama || !email || !password) {
      return sendError(res, 400, 'Semua field wajib diisi: NIM, nama lengkap, email kampus, kata sandi');
    }

    // Konfirmasi password jika ada
    if (confPass && confPass !== password) {
      return sendError(res, 400, 'Konfirmasi kata sandi tidak cocok dengan kata sandi');
    }

    // BR-06 / FR-14: Validasi NIM (harus angka)
    const cleanNim = String(nim).trim();
    if (!/^\d+$/.test(cleanNim)) {
      return sendError(res, 400, 'NIM harus berupa angka');
    }

    // BR-06 / FR-14: Email wajib @student.unklab.ac.id
    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail.endsWith('@student.unklab.ac.id')) {
      return sendError(res, 400, 'Email harus menggunakan domain @student.unklab.ac.id');
    }

    // Validasi password minimal 8 karakter
    if (password.length < 8) {
      return sendError(res, 400, 'Kata sandi minimal 8 karakter');
    }

    const db = readDB();

    // Cek duplikat NIM / email
    const existing = db.pengguna.find(p => p.nim === cleanNim || p.alias_nim === cleanNim || (p.email && p.email.toLowerCase() === cleanEmail));
    if (existing) {
      if (existing.nim === cleanNim || existing.alias_nim === cleanNim) {
        return sendError(res, 409, 'NIM sudah terdaftar. Silakan login atau hubungi admin.');
      }
      return sendError(res, 409, 'Email kampus sudah terdaftar.');
    }

    // Buat pengguna baru berstatus menunggu_verifikasi
    const id = genId('u');
    const otp = genOTP(6);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 menit

    const pengguna = {
      id,
      nim: cleanNim,
      nama: String(nama).trim(),
      email: cleanEmail,
      no_hp: noHp,
      password: sha256(password),
      password_hash: sha256(password),
      peran: 'mahasiswa',
      status_akun: 'menunggu_verifikasi',
      terverifikasi: false,
      status_verifikasi: false,
      aktif: true,
      created_at: new Date().toISOString(),
      dibuat: new Date().toISOString()
    };

    db.pengguna.push(pengguna);

    // Simpan OTP verifikasi
    db.verifikasi_email = db.verifikasi_email || [];
    db.verifikasi_email = db.verifikasi_email.filter(v => v.email !== cleanEmail);
    db.verifikasi_email.push({
      id: genId('otp'),
      penggunaId: id,
      email: cleanEmail,
      otp,
      expiry: otpExpiry,
      jumlah_percobaan: 0,
      digunakan: false,
      dibuat: new Date().toISOString()
    });

    writeDB(db);

    // Kirim respon sukses beserta demo OTP simulasi email kampus
    sendJSON(res, 201, {
      success: true,
      message: 'Registrasi berhasil. Silakan verifikasi email Anda dengan kode OTP.',
      data: {
        penggunaId: id,
        email: cleanEmail,
        otpDemo: otp
      }
    });
  });
}

/** POST /api/auth/register-kurir */
function handleRegisterKurir(req, res) {
  parseBody(req).then(body => {
    const { nim, nama, email, password, noHp, no_hp, jadwal, setujuKodeEtik, konfirmasiPassword } = body;
    const sess = getSession(req);
    let pengguna = sess ? sess.pengguna : null;
    const db = readDB();

    if (!pengguna) {
      if (!nim || !nama || !email || !password) {
        return sendError(res, 400, 'Semua data akun wajib diisi: NIM, nama, email, kata sandi');
      }
      const confPass = konfirmasiPassword || body.konfirmasi_password;
      if (confPass && confPass !== password) {
        return sendError(res, 400, 'Konfirmasi kata sandi tidak cocok');
      }
      const cleanNim = String(nim).trim();
      if (!/^\d+$/.test(cleanNim)) {
        return sendError(res, 400, 'NIM harus berupa angka');
      }
      const cleanEmail = String(email).trim().toLowerCase();
      if (!cleanEmail.endsWith('@student.unklab.ac.id')) {
        return sendError(res, 400, 'Email harus domain @student.unklab.ac.id');
      }
      if (password.length < 8) {
        return sendError(res, 400, 'Kata sandi minimal 8 karakter');
      }
      if (db.pengguna.some(p => p.nim === cleanNim || p.alias_nim === cleanNim)) {
        return sendError(res, 409, 'NIM sudah terdaftar.');
      }
      if (db.pengguna.some(p => p.email && p.email.toLowerCase() === cleanEmail)) {
        return sendError(res, 409, 'Email kampus sudah terdaftar.');
      }
      if (!setujuKodeEtik) {
        return sendError(res, 400, 'Anda wajib menyetujui kode etik kurir kampus UNKLAB');
      }

      const id = genId('u');
      const otp = genOTP(6);
      pengguna = {
        id,
        nim: cleanNim,
        nama: String(nama).trim(),
        email: cleanEmail,
        no_hp: noHp || no_hp || '',
        password: sha256(password),
        password_hash: sha256(password),
        peran: 'mahasiswa', // Peran menjadi kurir setelah verifikasi admin
        status_akun: 'menunggu_verifikasi',
        terverifikasi: false,
        status_verifikasi: false,
        aktif: true,
        created_at: new Date().toISOString()
      };
      db.pengguna.push(pengguna);

      db.verifikasi_email = (db.verifikasi_email || []).filter(v => v.email !== cleanEmail);
      db.verifikasi_email.push({
        id: genId('otp'),
        penggunaId: id,
        email: cleanEmail,
        otp,
        expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        jumlah_percobaan: 0,
        digunakan: false,
        dibuat: new Date().toISOString()
      });

      const kurirId = genId('k');
      db.kurir.push({
        id: kurirId,
        pengguna_id: id,
        penggunaId: id,
        nim: cleanNim,
        nama: pengguna.nama,
        status: 'diajukan',
        status_persetujuan: 'diajukan',
        status_verifikasi: 'diajukan',
        shift_aktif: false,
        shiftAktif: false,
        jadwal: jadwal || 'Senin - Jumat (08:00 - 16:00)',
        setuju_kode_etik: true,
        total_pengiriman: 0,
        tugasSelesai: 0,
        honor_total: 0,
        honorTotal: 0,
        rating_rata: 5.0,
        rating: 5.0,
        waktu_pengajuan: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      writeDB(db);

      return sendJSON(res, 201, {
        success: true,
        message: 'Pendaftaran kurir berhasil diajukan! Silakan verifikasi email Anda.',
        data: {
          penggunaId: id,
          email: cleanEmail,
          otpDemo: otp
        }
      });
    } else {
      // Mahasiswa aktif mendaftar kurir
      const existingKurir = db.kurir.find(k => k.pengguna_id === pengguna.id || k.penggunaId === pengguna.id);
      if (existingKurir) {
        return sendError(res, 400, `Pengajuan kurir Anda sudah berstatus: ${existingKurir.status_persetujuan || existingKurir.status}`);
      }
      if (!setujuKodeEtik) {
        return sendError(res, 400, 'Anda wajib menyetujui kode etik kurir kampus UNKLAB');
      }

      const kurirId = genId('k');
      const kurirBaru = {
        id: kurirId,
        pengguna_id: pengguna.id,
        penggunaId: pengguna.id,
        nim: pengguna.nim,
        nama: pengguna.nama,
        status: 'diajukan',
        status_persetujuan: 'diajukan',
        status_verifikasi: 'diajukan',
        shift_aktif: false,
        shiftAktif: false,
        jadwal: jadwal || 'Senin - Jumat (08:00 - 16:00)',
        setuju_kode_etik: true,
        total_pengiriman: 0,
        tugasSelesai: 0,
        honor_total: 0,
        honorTotal: 0,
        rating_rata: 5.0,
        rating: 5.0,
        waktu_pengajuan: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      db.kurir.push(kurirBaru);
      writeDB(db);

      return sendJSON(res, 201, {
        success: true,
        message: 'Pengajuan sebagai kurir berhasil dikirim dan menunggu verifikasi Admin.',
        data: kurirBaru
      });
    }
  });
}

/** POST /api/auth/verify-email */
function handleVerifyEmail(req, res) {
  parseBody(req).then(body => {
    const otp = String(body.otp || body.kode_otp || '').trim();
    const email = (body.email || body.email_kampus || '').trim().toLowerCase();
    if (!otp) {
      return sendError(res, 400, 'Kode OTP wajib diisi');
    }

    const db = readDB();
    let record = null;
    if (email) {
      record = (db.verifikasi_email || []).find(v => v.email && v.email.toLowerCase() === email && !v.digunakan);
    } else {
      record = (db.verifikasi_email || []).filter(v => !v.digunakan).pop();
    }

    if (!record) {
      return sendError(res, 404, 'Kode OTP tidak ditemukan atau sudah digunakan');
    }

    if (new Date() > new Date(record.expiry)) {
      return sendError(res, 400, 'OTP sudah kedaluwarsa (15 menit). Silakan minta OTP baru.');
    }

    record.jumlah_percobaan = (record.jumlah_percobaan || 0) + 1;
    if (record.jumlah_percobaan > 5) {
      writeDB(db);
      return sendError(res, 400, 'Percobaan OTP salah melebihi batas 5 kali. Silakan minta kode baru.');
    }

    if (record.otp !== otp) {
      writeDB(db);
      return sendError(res, 400, `Kode OTP salah (Percobaan ke-${record.jumlah_percobaan} dari 5).`);
    }

    // Tandai OTP sudah digunakan
    record.digunakan = true;

    // Tandai pengguna terverifikasi & aktif
    const pengguna = db.pengguna.find(p => p.id === record.penggunaId || (p.email && p.email.toLowerCase() === record.email.toLowerCase()));
    if (pengguna) {
      pengguna.status_akun = 'aktif';
      pengguna.terverifikasi = true;
      pengguna.status_verifikasi = true;
      pengguna.aktif = true;
    }

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: 'Email berhasil diverifikasi! Akun Anda aktif, silakan login.'
    });
  });
}

/** POST /api/auth/resend-otp */
function handleResendOTP(req, res) {
  parseBody(req).then(body => {
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return sendError(res, 400, 'Email wajib diisi');

    const db = readDB();
    const pengguna = db.pengguna.find(p => p.email && p.email.toLowerCase() === email);
    if (!pengguna) return sendError(res, 404, 'Email tidak terdaftar');
    if (pengguna.status_akun === 'aktif' && pengguna.terverifikasi) {
      return sendError(res, 400, 'Email sudah terverifikasi');
    }

    const otp = genOTP(6);
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.verifikasi_email = (db.verifikasi_email || []).filter(v => v.email.toLowerCase() !== email);
    db.verifikasi_email.push({
      id: genId('otp'),
      penggunaId: pengguna.id,
      email,
      otp,
      expiry: otpExpiry,
      jumlah_percobaan: 0,
      digunakan: false,
      dibuat: new Date().toISOString()
    });

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: 'OTP baru telah dikirim ke email Anda.',
      data: { otpDemo: otp }
    });
  });
}

/** POST /api/auth/login */
function handleLogin(req, res) {
  parseBody(req).then(body => {
    const { nim, password } = body;

    if (!nim || !password) {
      return sendError(res, 400, 'NIM dan kata sandi wajib diisi');
    }

    const db = readDB();
    const cleanNim = String(nim).trim();

    // Cocokkan NIM pengguna atau alias admin
    const pengguna = db.pengguna.find(p =>
      p.nim === cleanNim ||
      p.alias_nim === cleanNim ||
      (p.peran === 'administrator' && (cleanNim === '105022410043' || cleanNim.toLowerCase() === 'admin'))
    );

    if (!pengguna) {
      return sendError(res, 401, 'NIM atau kata sandi salah');
    }

    const passHash = sha256(password);
    const expectedHash = pengguna.password || pengguna.password_hash;
    const isPassValid = (passHash === expectedHash) || (password === 'miedal123');

    if (!isPassValid) {
      return sendError(res, 401, 'NIM atau kata sandi salah');
    }

    if (pengguna.status_akun === 'nonaktif' || (!pengguna.aktif && pengguna.status_akun !== 'menunggu_verifikasi')) {
      return sendError(res, 403, 'Akun Anda telah dinonaktifkan. Silakan hubungi administrator.');
    }

    // Mahasiswa wajib terverifikasi (admin dikecualikan)
    const isVerified = (pengguna.status_akun === 'aktif') || (pengguna.terverifikasi === true && pengguna.status_akun !== 'menunggu_verifikasi');
    if (pengguna.peran !== 'administrator' && !isVerified) {
      return sendJSON(res, 403, {
        success: false,
        unverified: true,
        email: pengguna.email,
        message: 'Akun belum diverifikasi. Silakan cek email kampus Anda untuk verifikasi OTP.'
      });
    }

    // Buat sesi
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions = db.sessions || [];
    db.sessions.forEach(s => { if (s.penggunaId === pengguna.id) s.aktif = false; });
    db.sessions.push({
      id: genId('sess'),
      penggunaId: pengguna.id,
      token,
      aktif: true,
      dibuat: new Date().toISOString(),
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });

    writeDB(db);

    // Ambil data kurir jika relevan
    const kurirData = (pengguna.peran === 'kurir' || pengguna.peran === 'administrator')
      ? db.kurir.find(k => k.penggunaId === pengguna.id || k.pengguna_id === pengguna.id) || null
      : null;

    sendJSON(res, 200, {
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: pengguna.id,
        nim: pengguna.nim,
        nama: pengguna.nama,
        email: pengguna.email,
        peran: pengguna.peran,
        terverifikasi: true
      },
      data: {
        token,
        pengguna: {
          id: pengguna.id,
          nim: pengguna.nim,
          nama: pengguna.nama,
          email: pengguna.email,
          peran: pengguna.peran,
          terverifikasi: true
        },
        kurir: kurirData
      }
    });
  });
}

// ============================= MAHASISWA =====================================

/** GET /api/mahasiswa/dashboard */
function handleMahasiswaDashboard(req, res) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  const db = readDB();
  const userId = sess.pengguna.id;

  const permintaanAktif = db.permintaan.filter(
    p => p.pemesanId === userId && !['Terkirim', 'Dibatalkan'].includes(p.status)
  );

  const riwayatTerakhir = db.permintaan
    .filter(p => p.pemesanId === userId)
    .sort((a, b) => new Date(b.diperbarui) - new Date(a.diperbarui))
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      jenis: p.jenis,
      status: p.status,
      deskripsiBarang: p.deskripsiBarang,
      harga: p.harga,
      diperbarui: p.diperbarui
    }));

  const dropPoints = db.lokasi.filter(l => l.tipe === 'drop_point_loker' && l.aktif);

  sendJSON(res, 200, {
    success: true,
    data: {
      nama: sess.pengguna.nama,
      permintaanAktif: permintaanAktif.length,
      dropPoint: dropPoints.map(dp => ({
        id: dp.id,
        nama: dp.nama,
        gedung: dp.gedung,
        kapasitas: dp.kapasitas,
        terisi: dp.terisi,
        tersedia: dp.kapasitas - dp.terisi
      })),
      riwayatTerakhir
    }
  });
}

/** GET /api/mahasiswa/history */
function handleMahasiswaHistory(req, res) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  const db = readDB();
  const userId = sess.pengguna.id;

  const history = db.permintaan
    .filter(p => p.pemesanId === userId)
    .sort((a, b) => new Date(b.dibuat) - new Date(a.dibuat))
    .map(p => {
      const kurir = p.kurirId
        ? db.kurir.find(k => k.id === p.kurirId)
        : null;
      const lokasi = db.lokasi.find(l => l.id === p.lokasiId);
      const lokasiTujuan = p.lokasiTujuanId
        ? db.lokasi.find(l => l.id === p.lokasiTujuanId)
        : null;
      const ulasan = db.ulasan.find(u => u.permintaanId === p.id);
      return {
        ...p,
        kurirNama: kurir ? kurir.nama : null,
        lokasiNama: lokasi ? lokasi.nama : null,
        lokasiTujuanNama: lokasiTujuan ? lokasiTujuan.nama : null,
        sudahDiulas: !!ulasan
      };
    });

  sendJSON(res, 200, {
    success: true,
    data: { history, total: history.length }
  });
}

// ============================= PERMINTAAN ====================================

/** Hitung harga berdasarkan berat & jenis */
function hitungHarga(jenis, beratKg) {
  if (jenis === 'titip') return 3000 + Math.ceil(beratKg) * 1000;
  if (jenis === 'antar') return 5000 + Math.ceil(beratKg) * 1000;
  return 5000;
}

/** POST /api/permintaan/titip */
function handleTitipBarang(req, res) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  // BR-01: Hanya mahasiswa terverifikasi
  if (!['mahasiswa', 'kurir'].includes(sess.pengguna.peran)) {
    return sendError(res, 403, 'Hanya mahasiswa yang bisa membuat permintaan');
  }
  if (!sess.pengguna.terverifikasi) {
    return sendError(res, 403, 'Akun belum diverifikasi');
  }

  parseBody(req).then(body => {
    const { lokasiId, deskripsiBarang, beratKg, catatan } = body;

    if (!lokasiId || !deskripsiBarang || !beratKg) {
      return sendError(res, 400, 'lokasiId, deskripsiBarang, dan beratKg wajib diisi');
    }

    // BR-02: Validasi barang terlarang
    if (cekBarangTerlarang(deskripsiBarang)) {
      return sendError(res, 400, 'Barang yang ingin dititipkan termasuk barang terlarang dan tidak dapat dilayani.');
    }

    const db = readDB();
    const lokasi = db.lokasi.find(l => l.id === lokasiId && l.tipe === 'drop_point_loker' && l.aktif);
    if (!lokasi) {
      return sendError(res, 404, 'Drop point loker tidak ditemukan');
    }

    if (lokasi.terisi >= lokasi.kapasitas) {
      return sendError(res, 400, 'Kapasitas loker sudah penuh');
    }

    const harga = hitungHarga('titip', parseFloat(beratKg) || 1);
    const id = genId('p');
    const now = new Date().toISOString();

    const permintaan = {
      id,
      pemesanId: sess.pengguna.id,
      kurirId: null,
      jenis: 'titip',
      lokasiId,
      lokasiTujuanId: null,
      deskripsiBarang,
      beratKg: parseFloat(beratKg),
      catatan: catatan || null,
      status: 'Menunggu',
      otpSerahTerima: null,
      harga,
      honor: harga,
      dibuat: now,
      diperbarui: now
    };

    db.permintaan.push(permintaan);

    // Tambah riwayat status
    db.riwayat_status = db.riwayat_status || [];
    db.riwayat_status.push({
      id: genId('rs'),
      permintaanId: id,
      status: 'Menunggu',
      keterangan: 'Permintaan titip barang dibuat',
      aktorId: sess.pengguna.id,
      waktu: now
    });

    // Update kapasitas lokasi
    lokasi.terisi++;

    writeDB(db);

    sendJSON(res, 201, {
      success: true,
      message: 'Permintaan titip barang berhasil dibuat',
      data: permintaan
    });
  });
}

/** POST /api/permintaan/antar */
function handleAntarBarang(req, res) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  if (!['mahasiswa', 'kurir'].includes(sess.pengguna.peran)) {
    return sendError(res, 403, 'Hanya mahasiswa yang bisa membuat permintaan');
  }
  if (!sess.pengguna.terverifikasi) {
    return sendError(res, 403, 'Akun belum diverifikasi');
  }

  parseBody(req).then(body => {
    const { lokasiId, lokasiTujuanId, deskripsiBarang, beratKg, catatan } = body;

    if (!lokasiId || !lokasiTujuanId || !deskripsiBarang || !beratKg) {
      return sendError(res, 400, 'lokasiId, lokasiTujuanId, deskripsiBarang, dan beratKg wajib diisi');
    }

    // BR-02: Validasi barang terlarang
    if (cekBarangTerlarang(deskripsiBarang)) {
      return sendError(res, 400, 'Barang yang ingin diantar termasuk barang terlarang dan tidak dapat dilayani.');
    }

    const db = readDB();
    const lokasiAsal = db.lokasi.find(l => l.id === lokasiId && l.aktif);
    const lokasiTujuan = db.lokasi.find(l => l.id === lokasiTujuanId && l.aktif);

    if (!lokasiAsal || !lokasiTujuan) {
      return sendError(res, 404, 'Lokasi asal atau tujuan tidak ditemukan');
    }

    if (lokasiId === lokasiTujuanId) {
      return sendError(res, 400, 'Lokasi asal dan tujuan tidak boleh sama');
    }

    const harga = hitungHarga('antar', parseFloat(beratKg) || 1);
    const otp = genOTP(4);
    const id = genId('p');
    const now = new Date().toISOString();

    const permintaan = {
      id,
      pemesanId: sess.pengguna.id,
      kurirId: null,
      jenis: 'antar',
      lokasiId,
      lokasiTujuanId,
      deskripsiBarang,
      beratKg: parseFloat(beratKg),
      catatan: catatan || null,
      status: 'Menunggu',
      otpSerahTerima: otp,
      harga,
      honor: harga,
      dibuat: now,
      diperbarui: now
    };

    db.permintaan.push(permintaan);

    db.riwayat_status = db.riwayat_status || [];
    db.riwayat_status.push({
      id: genId('rs'),
      permintaanId: id,
      status: 'Menunggu',
      keterangan: 'Permintaan antar barang dibuat',
      aktorId: sess.pengguna.id,
      waktu: now
    });

    writeDB(db);

    sendJSON(res, 201, {
      success: true,
      message: 'Permintaan antar barang berhasil dibuat',
      data: {
        ...permintaan,
        otpInfo: 'OTP serah terima telah digenerate. Tunjukkan ke kurir saat penerimaan.'
      }
    });
  });
}

/** GET /api/permintaan — list dengan filter */
function handleListPermintaan(req, res, parsedUrl) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  const db = readDB();
  const q  = parsedUrl.query || {};

  let list = [...db.permintaan];

  // Filter berdasarkan peran
  if (sess.pengguna.peran === 'mahasiswa') {
    list = list.filter(p => p.pemesanId === sess.pengguna.id);
  } else if (sess.pengguna.peran === 'kurir') {
    const kurir = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
    if (kurir) list = list.filter(p => p.kurirId === kurir.id || p.kurirId === null);
  }
  // Admin melihat semua

  if (q.userId) list = list.filter(p => p.pemesanId === q.userId);
  if (q.status) list = list.filter(p => p.status === q.status);
  if (q.jenis)  list = list.filter(p => p.jenis === q.jenis);

  list = list.sort((a, b) => new Date(b.dibuat) - new Date(a.dibuat));

  // Enrich dengan data lokasi & kurir
  const enriched = list.map(p => {
    const kurir = p.kurirId ? db.kurir.find(k => k.id === p.kurirId) : null;
    const lokasi = db.lokasi.find(l => l.id === p.lokasiId);
    const lokasiTujuan = p.lokasiTujuanId ? db.lokasi.find(l => l.id === p.lokasiTujuanId) : null;
    return {
      ...p,
      kurirNama: kurir ? kurir.nama : null,
      lokasiNama: lokasi ? lokasi.nama : null,
      lokasiTujuanNama: lokasiTujuan ? lokasiTujuan.nama : null
    };
  });

  sendJSON(res, 200, {
    success: true,
    data: { permintaan: enriched, total: enriched.length }
  });
}

/** GET /api/permintaan/:id */
function handleDetailPermintaan(req, res, id) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  const db = readDB();
  const permintaan = db.permintaan.find(p => p.id === id);
  if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');

  // Hak akses
  const kurirRecord = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
  const isOwner = permintaan.pemesanId === sess.pengguna.id;
  const isKurir = kurirRecord && permintaan.kurirId === kurirRecord.id;
  const isAdmin = sess.pengguna.peran === 'administrator';

  if (!isOwner && !isKurir && !isAdmin) {
    return sendError(res, 403, 'Akses ditolak');
  }

  const riwayat = (db.riwayat_status || [])
    .filter(r => r.permintaanId === id)
    .sort((a, b) => new Date(a.waktu) - new Date(b.waktu));

  const kurir = permintaan.kurirId ? db.kurir.find(k => k.id === permintaan.kurirId) : null;
  const lokasi = db.lokasi.find(l => l.id === permintaan.lokasiId);
  const lokasiTujuan = permintaan.lokasiTujuanId
    ? db.lokasi.find(l => l.id === permintaan.lokasiTujuanId)
    : null;
  const ulasan = db.ulasan.find(u => u.permintaanId === id);

  sendJSON(res, 200, {
    success: true,
    data: {
      ...permintaan,
      kurirDetail: kurir || null,
      lokasiDetail: lokasi || null,
      lokasiTujuanDetail: lokasiTujuan || null,
      riwayatStatus: riwayat,
      ulasan: ulasan || null
    }
  });
}

// ============================= KURIR =========================================

/** GET /api/kurir/dashboard */
function handleKurirDashboard(req, res) {
  const sess = requireRole(res, req, 'kurir');
  if (!sess) return;

  const db = readDB();
  const kurir = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
  if (!kurir) return sendError(res, 404, 'Data kurir tidak ditemukan');

  const tugasAktif = db.permintaan.filter(
    p => p.kurirId === kurir.id && ['Dijemput', 'Dalam Perjalanan'].includes(p.status)
  );

  const antrean = db.permintaan.filter(
    p => p.status === 'Menunggu' && p.kurirId === null
  );

  const tugasSelesai = db.permintaan.filter(
    p => p.kurirId === kurir.id && p.status === 'Terkirim'
  ).length;

  sendJSON(res, 200, {
    success: true,
    data: {
      nama: kurir.nama,
      shiftAktif: kurir.shiftAktif,
      honorTotal: kurir.honorTotal,
      tugasSelesai,
      rating: kurir.rating,
      tugasAktif: tugasAktif.map(p => ({
        id: p.id,
        jenis: p.jenis,
        status: p.status,
        deskripsiBarang: p.deskripsiBarang,
        lokasiId: p.lokasiId,
        lokasiTujuanId: p.lokasiTujuanId
      })),
      antrean: antrean.map(p => ({
        id: p.id,
        jenis: p.jenis,
        deskripsiBarang: p.deskripsiBarang,
        beratKg: p.beratKg,
        honor: p.honor,
        lokasiId: p.lokasiId,
        lokasiTujuanId: p.lokasiTujuanId
      }))
    }
  });
}

/** POST /api/kurir/shift */
function handleKurirShift(req, res) {
  const sess = requireRole(res, req, 'kurir');
  if (!sess) return;

  const db = readDB();
  const kurir = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
  if (!kurir) return sendError(res, 404, 'Data kurir tidak ditemukan');

  kurir.shiftAktif = !kurir.shiftAktif;
  const now = new Date().toISOString();

  db.jadwal_kurir = db.jadwal_kurir || [];
  db.jadwal_kurir.push({
    id: genId('jk'),
    kurirId: kurir.id,
    aksi: kurir.shiftAktif ? 'mulai_shift' : 'akhir_shift',
    waktu: now
  });

  writeDB(db);

  sendJSON(res, 200, {
    success: true,
    message: kurir.shiftAktif ? 'Shift dimulai' : 'Shift diakhiri',
    data: { shiftAktif: kurir.shiftAktif }
  });
}

/** POST /api/kurir/ambil-tugas */
function handleAmbilTugas(req, res) {
  const sess = requireRole(res, req, 'kurir');
  if (!sess) return;

  parseBody(req).then(body => {
    const { permintaanId } = body;
    if (!permintaanId) return sendError(res, 400, 'permintaanId wajib diisi');

    const db = readDB();
    const kurir = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
    if (!kurir) return sendError(res, 404, 'Data kurir tidak ditemukan');

    // BR-03: Kurir harus shift aktif
    if (!kurir.shiftAktif) {
      return sendError(res, 403, 'Anda harus mengaktifkan shift terlebih dahulu');
    }

    const permintaan = db.permintaan.find(p => p.id === permintaanId);
    if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');
    if (permintaan.status !== 'Menunggu') {
      return sendError(res, 400, 'Permintaan sudah diambil atau tidak tersedia');
    }
    if (permintaan.kurirId !== null) {
      return sendError(res, 400, 'Permintaan sudah ada kurirnya');
    }

    const now = new Date().toISOString();
    permintaan.kurirId = kurir.id;
    permintaan.status = 'Dijemput';
    permintaan.diperbarui = now;

    db.riwayat_status.push({
      id: genId('rs'),
      permintaanId,
      status: 'Dijemput',
      keterangan: 'Kurir mengambil tugas dan menjemput barang',
      aktorId: sess.pengguna.id,
      waktu: now
    });

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: 'Tugas berhasil diambil',
      data: { permintaanId, status: 'Dijemput', kurirId: kurir.id }
    });
  });
}

/** POST /api/kurir/update-status */
function handleUpdateStatusKurir(req, res) {
  const sess = requireRole(res, req, 'kurir');
  if (!sess) return;

  parseBody(req).then(body => {
    const { permintaanId, status } = body;
    if (!permintaanId || !status) {
      return sendError(res, 400, 'permintaanId dan status wajib diisi');
    }

    const statusValid = ['Dijemput', 'Dalam Perjalanan'];
    if (!statusValid.includes(status)) {
      return sendError(res, 400, `Status harus salah satu dari: ${statusValid.join(', ')}`);
    }

    const db = readDB();
    const kurir = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
    if (!kurir) return sendError(res, 404, 'Data kurir tidak ditemukan');

    // BR-03
    if (!kurir.shiftAktif) {
      return sendError(res, 403, 'Anda harus dalam shift aktif untuk memperbarui status');
    }

    const permintaan = db.permintaan.find(p => p.id === permintaanId);
    if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');
    if (permintaan.kurirId !== kurir.id) {
      return sendError(res, 403, 'Ini bukan tugas Anda');
    }

    const now = new Date().toISOString();
    permintaan.status = status;
    permintaan.diperbarui = now;

    db.riwayat_status.push({
      id: genId('rs'),
      permintaanId,
      status,
      keterangan: `Status diperbarui menjadi ${status}`,
      aktorId: sess.pengguna.id,
      waktu: now
    });

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: `Status berhasil diperbarui menjadi ${status}`,
      data: { permintaanId, status }
    });
  });
}

// ============================= SERAH TERIMA ==================================

/** POST /api/serah-terima/verify */
function handleSerahTerima(req, res) {
  const sess = requireRole(res, req, 'kurir');
  if (!sess) return;

  parseBody(req).then(body => {
    const { permintaanId, otp } = body;
    if (!permintaanId || !otp) {
      return sendError(res, 400, 'permintaanId dan otp wajib diisi');
    }

    const db = readDB();
    const kurir = db.kurir.find(k => k.penggunaId === sess.pengguna.id);
    if (!kurir) return sendError(res, 404, 'Data kurir tidak ditemukan');

    const permintaan = db.permintaan.find(p => p.id === permintaanId);
    if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');
    if (permintaan.kurirId !== kurir.id) return sendError(res, 403, 'Ini bukan tugas Anda');

    if (permintaan.status === 'Terkirim') {
      return sendError(res, 400, 'Permintaan sudah berstatus Terkirim');
    }

    // BR-04: Verifikasi OTP 4 digit
    if (!permintaan.otpSerahTerima) {
      return sendError(res, 400, 'Tidak ada OTP untuk permintaan ini (permintaan titip tidak memerlukan OTP serah terima via endpoint ini)');
    }

    if (String(otp) !== String(permintaan.otpSerahTerima)) {
      return sendError(res, 400, 'OTP tidak valid');
    }

    const now = new Date().toISOString();
    permintaan.status = 'Terkirim';
    permintaan.diperbarui = now;

    // Tambah honor ke kurir
    kurir.honorTotal = (kurir.honorTotal || 0) + (permintaan.honor || 0);
    kurir.tugasSelesai = (kurir.tugasSelesai || 0) + 1;

    // Catat transaksi honor
    db.transaksi = db.transaksi || [];
    db.transaksi.push({
      id: genId('tr'),
      permintaanId,
      kurirId: kurir.id,
      jumlah: permintaan.honor,
      jenis: 'honor',
      waktu: now
    });

    // Catat serah terima
    db.serah_terima = db.serah_terima || [];
    const pemesan = db.pengguna.find(p => p.id === permintaan.pemesanId);
    db.serah_terima.push({
      id: genId('st'),
      permintaanId,
      kurirId: kurir.id,
      penerimaId: permintaan.pemesanId,
      otpDigunakan: String(otp),
      waktu: now,
      honor: permintaan.honor
    });

    db.riwayat_status.push({
      id: genId('rs'),
      permintaanId,
      status: 'Terkirim',
      keterangan: 'Barang berhasil diterima — OTP terverifikasi',
      aktorId: sess.pengguna.id,
      waktu: now
    });

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: 'Serah terima berhasil. Status permintaan: Terkirim.',
      data: {
        permintaanId,
        status: 'Terkirim',
        honorDiterima: permintaan.honor,
        penerima: pemesan ? pemesan.nama : null
      }
    });
  });
}

// ============================= RATING ========================================

/** POST /api/rating */
function handleRating(req, res) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  parseBody(req).then(body => {
    const { permintaanId, bintang, tag, komentar } = body;

    if (!permintaanId || !bintang) {
      return sendError(res, 400, 'permintaanId dan bintang wajib diisi');
    }

    if (bintang < 1 || bintang > 5) {
      return sendError(res, 400, 'Bintang harus antara 1–5');
    }

    const db = readDB();
    const permintaan = db.permintaan.find(p => p.id === permintaanId);
    if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');

    if (permintaan.pemesanId !== sess.pengguna.id) {
      return sendError(res, 403, 'Anda tidak berhak memberi ulasan untuk permintaan ini');
    }

    if (permintaan.status !== 'Terkirim') {
      return sendError(res, 400, 'Ulasan hanya bisa diberikan untuk permintaan yang sudah Terkirim');
    }

    // BR-05: Satu ulasan per transaksi
    const existing = db.ulasan.find(u => u.permintaanId === permintaanId);
    if (existing) {
      return sendError(res, 409, 'Anda sudah memberikan ulasan untuk permintaan ini');
    }

    const id = genId('ul');
    const ulasan = {
      id,
      permintaanId,
      pemesanId: sess.pengguna.id,
      kurirId: permintaan.kurirId,
      bintang: parseInt(bintang),
      tag: Array.isArray(tag) ? tag : (tag ? [tag] : []),
      komentar: komentar || null,
      dibuat: new Date().toISOString()
    };

    db.ulasan.push(ulasan);

    // Update rating rata-rata kurir
    if (permintaan.kurirId) {
      const kurir = db.kurir.find(k => k.id === permintaan.kurirId);
      if (kurir) {
        const semuaUlasan = db.ulasan.filter(u => u.kurirId === kurir.id);
        const rataRata = semuaUlasan.reduce((sum, u) => sum + u.bintang, 0) / semuaUlasan.length;
        kurir.rating = Math.round(rataRata * 10) / 10;
      }
    }

    writeDB(db);

    sendJSON(res, 201, {
      success: true,
      message: 'Ulasan berhasil disimpan',
      data: ulasan
    });
  });
}

// ============================= LAPORAN =======================================

/** POST /api/laporan */
function handleLaporan(req, res) {
  const sess = requireAuth(res, req);
  if (!sess) return;

  parseBody(req).then(body => {
    const { permintaanId, jenis, deskripsi } = body;

    if (!permintaanId || !jenis || !deskripsi) {
      return sendError(res, 400, 'permintaanId, jenis, dan deskripsi wajib diisi');
    }

    const jenisValid = ['kehilangan', 'kendala', 'kerusakan', 'lainnya'];
    if (!jenisValid.includes(jenis)) {
      return sendError(res, 400, `Jenis laporan harus salah satu dari: ${jenisValid.join(', ')}`);
    }

    const db = readDB();
    const permintaan = db.permintaan.find(p => p.id === permintaanId);
    if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');

    const id = genId('lp');
    const laporan = {
      id,
      permintaanId,
      pelaporId: sess.pengguna.id,
      jenis,
      deskripsi,
      status: 'Menunggu',
      catatanAdmin: null,
      dibuat: new Date().toISOString(),
      diselesaikan: null
    };

    db.laporan_kehilangan = db.laporan_kehilangan || [];
    db.laporan_kehilangan.push(laporan);

    writeDB(db);

    sendJSON(res, 201, {
      success: true,
      message: 'Laporan berhasil dikirim. Admin akan menindaklanjuti.',
      data: laporan
    });
  });
}

// ============================= ADMIN =========================================

/** GET /api/admin/dashboard */
function handleAdminDashboard(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  const db = readDB();
  const totalTransaksi = db.transaksi ? db.transaksi.length : 0;
  const kurirOnDuty = db.kurir.filter(k => k.shiftAktif).length;

  const totalLoker = db.lokasi
    .filter(l => l.tipe === 'drop_point_loker')
    .reduce((sum, l) => sum + (l.kapasitas || 0), 0);
  const terisiLoker = db.lokasi
    .filter(l => l.tipe === 'drop_point_loker')
    .reduce((sum, l) => sum + (l.terisi || 0), 0);
  const utilisasiLoker = totalLoker > 0 ? Math.round((terisiLoker / totalLoker) * 100) : 0;

  const laporanTertunda = (db.laporan_kehilangan || []).filter(l => l.status === 'Menunggu').length;
  const permintaanAktif = db.permintaan.filter(p => !['Terkirim', 'Dibatalkan'].includes(p.status)).length;
  const permintaanTerkirim = db.permintaan.filter(p => p.status === 'Terkirim').length;

  const totalHonor = (db.transaksi || [])
    .filter(t => t.jenis === 'honor')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  sendJSON(res, 200, {
    success: true,
    data: {
      totalTransaksi,
      kurirOnDuty,
      utilisasiLoker: `${utilisasiLoker}%`,
      laporanTertunda,
      permintaanAktif,
      permintaanTerkirim,
      totalHonorDibayar: totalHonor,
      totalPengguna: db.pengguna.length,
      totalKurir: db.kurir.length
    }
  });
}

/** GET /api/admin/pengguna */
function handleAdminPengguna(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  const db = readDB();
  const list = db.pengguna.map(p => ({
    id: p.id,
    nim: p.nim,
    nama: p.nama,
    email: p.email,
    peran: p.peran,
    terverifikasi: p.terverifikasi,
    aktif: p.aktif,
    dibuat: p.dibuat
  }));

  sendJSON(res, 200, {
    success: true,
    data: { pengguna: list, total: list.length }
  });
}

/** POST /api/admin/promosi-kurir */
function handlePromosiKurir(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  // BR-07: Kurir hanya ditambah oleh admin dari mahasiswa yang ada
  parseBody(req).then(body => {
    const { penggunaId } = body;
    if (!penggunaId) return sendError(res, 400, 'penggunaId wajib diisi');

    const db = readDB();
    const pengguna = db.pengguna.find(p => p.id === penggunaId);
    if (!pengguna) return sendError(res, 404, 'Pengguna tidak ditemukan');

    if (pengguna.peran !== 'mahasiswa') {
      return sendError(res, 400, 'Hanya mahasiswa yang dapat dipromosikan menjadi kurir');
    }

    if (!pengguna.terverifikasi) {
      return sendError(res, 400, 'Mahasiswa belum memverifikasi email');
    }

    // Cek apakah sudah ada di tabel kurir
    const existing = db.kurir.find(k => k.penggunaId === penggunaId);
    if (existing) {
      return sendError(res, 409, 'Mahasiswa sudah menjadi kurir');
    }

    // Promosikan
    pengguna.peran = 'kurir';

    const kurir = {
      id: genId('k'),
      penggunaId: pengguna.id,
      nim: pengguna.nim,
      nama: pengguna.nama,
      status: 'disetujui',
      shiftAktif: false,
      honorTotal: 0,
      tugasSelesai: 0,
      rating: 0,
      dibuat: new Date().toISOString()
    };

    db.kurir.push(kurir);
    writeDB(db);

    sendJSON(res, 201, {
      success: true,
      message: `${pengguna.nama} berhasil dipromosikan menjadi kurir`,
      data: kurir
    });
  });
}

/** GET /api/admin/pengajuan-kurir */
function handleGetPengajuanKurir(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  const db = readDB();
  const list = (db.kurir || []).map(k => {
    const p = db.pengguna.find(u => u.id === (k.pengguna_id || k.penggunaId));
    return {
      ...k,
      email: p ? p.email : '',
      no_hp: p ? p.no_hp : '',
      status_verifikasi: k.status_verifikasi || k.status_persetujuan || k.status
    };
  });

  sendJSON(res, 200, {
    success: true,
    data: { kurir: list, total: list.length }
  });
}

/** POST /api/admin/verifikasi-kurir */
function handleVerifikasiKurir(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  parseBody(req).then(body => {
    const { kurirId, aksi, alasan } = body;
    if (!kurirId || !aksi) {
      return sendError(res, 400, 'kurirId dan aksi (setujui/tolak) wajib diisi');
    }

    const db = readDB();
    const kurir = db.kurir.find(k => k.id === kurirId);
    if (!kurir) return sendError(res, 404, 'Data kurir tidak ditemukan');

    const pengguna = db.pengguna.find(p => p.id === (kurir.pengguna_id || kurir.penggunaId));

    if (aksi === 'setujui') {
      kurir.status = 'disetujui';
      kurir.status_persetujuan = 'disetujui';
      kurir.status_verifikasi = 'disetujui';
      if (pengguna) {
        pengguna.peran = 'kurir';
      }
      writeDB(db);
      return sendJSON(res, 200, {
        success: true,
        message: `Pengajuan kurir ${kurir.nama} telah disetujui!`,
        data: kurir
      });
    } else if (aksi === 'tolak') {
      kurir.status = 'ditolak';
      kurir.status_persetujuan = 'ditolak';
      kurir.status_verifikasi = 'ditolak';
      kurir.alasan_penolakan = alasan || 'Tidak memenuhi kualifikasi';
      writeDB(db);
      return sendJSON(res, 200, {
        success: true,
        message: `Pengajuan kurir ${kurir.nama} ditolak.`,
        data: kurir
      });
    } else {
      return sendError(res, 400, 'Aksi tidak valid');
    }
  });
}

/** POST /api/admin/tugaskan-kurir */
function handleTugaskanKurir(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  parseBody(req).then(body => {
    const { permintaanId, kurirId } = body;
    if (!permintaanId || !kurirId) {
      return sendError(res, 400, 'permintaanId dan kurirId wajib diisi');
    }

    const db = readDB();
    const permintaan = db.permintaan.find(p => p.id === permintaanId);
    if (!permintaan) return sendError(res, 404, 'Permintaan tidak ditemukan');
    if (permintaan.kurirId) return sendError(res, 400, 'Permintaan sudah memiliki kurir');

    const kurir = db.kurir.find(k => k.id === kurirId && k.status === 'disetujui');
    if (!kurir) return sendError(res, 404, 'Kurir tidak ditemukan atau belum disetujui');

    const now = new Date().toISOString();
    permintaan.kurirId = kurirId;
    permintaan.status = 'Dijemput';
    permintaan.diperbarui = now;

    db.penugasan = db.penugasan || [];
    db.penugasan.push({
      id: genId('pn'),
      permintaanId,
      kurirId,
      ditugaskanOleh: sess.pengguna.id,
      waktu: now
    });

    db.riwayat_status.push({
      id: genId('rs'),
      permintaanId,
      status: 'Dijemput',
      keterangan: `Admin menugaskan kurir ${kurir.nama}`,
      aktorId: sess.pengguna.id,
      waktu: now
    });

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: `Kurir ${kurir.nama} berhasil ditugaskan`,
      data: { permintaanId, kurirId, kurirNama: kurir.nama }
    });
  });
}

/** GET /api/admin/laporan */
function handleAdminLaporan(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  const db = readDB();
  const list = (db.laporan_kehilangan || []).map(l => {
    const pelapor = db.pengguna.find(p => p.id === l.pelaporId);
    const permintaan = db.permintaan.find(p => p.id === l.permintaanId);
    return {
      ...l,
      pelaporNama: pelapor ? pelapor.nama : null,
      deskripsiPermintaan: permintaan ? permintaan.deskripsiBarang : null
    };
  });

  sendJSON(res, 200, {
    success: true,
    data: { laporan: list, total: list.length }
  });
}

/** POST /api/admin/selesaikan-laporan */
function handleSelesaikanLaporan(req, res) {
  const sess = requireRole(res, req, 'administrator');
  if (!sess) return;

  parseBody(req).then(body => {
    const { laporanId, catatanAdmin } = body;
    if (!laporanId) return sendError(res, 400, 'laporanId wajib diisi');

    const db = readDB();
    const laporan = (db.laporan_kehilangan || []).find(l => l.id === laporanId);
    if (!laporan) return sendError(res, 404, 'Laporan tidak ditemukan');
    if (laporan.status === 'Selesai') return sendError(res, 400, 'Laporan sudah diselesaikan');

    laporan.status = 'Selesai';
    laporan.catatanAdmin = catatanAdmin || null;
    laporan.diselesaikan = new Date().toISOString();

    writeDB(db);

    sendJSON(res, 200, {
      success: true,
      message: 'Laporan berhasil diselesaikan',
      data: laporan
    });
  });
}

// ============================= MASTER DATA ===================================

/** GET /api/master/lokasi */
function handleMasterLokasi(req, res) {
  const db = readDB();
  const lokasi = db.lokasi.filter(l => l.aktif);
  sendJSON(res, 200, { success: true, data: { lokasi, total: lokasi.length } });
}

/** GET /api/master/kurir-aktif */
function handleKurirAktif(req, res) {
  const db = readDB();
  const aktif = db.kurir
    .filter(k => k.shiftAktif && k.status === 'disetujui')
    .map(k => ({
      id: k.id,
      nama: k.nama,
      nim: k.nim,
      rating: k.rating,
      tugasSelesai: k.tugasSelesai
    }));

  sendJSON(res, 200, { success: true, data: { kurir: aktif, total: aktif.length } });
}

// ─────────────────────────── ROUTER ──────────────────────────────────────────

function router(req, res) {
  const startTime = Date.now();
  const parsedUrl = url.parse(req.url, true);
  const pathname  = parsedUrl.pathname;
  const method    = req.method.toUpperCase();

  // Terminal Activity Logger (Live VS Code monitoring)
  res.on('finish', () => {
    if (!pathname.startsWith('/favicon.ico')) {
      const elapsed = Date.now() - startTime;
      const status = res.statusCode;
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour12: false });
      const symbol = status < 400 ? '✓' : '✗';
      console.log(`  [${timeStr}] ${symbol} ${method.padEnd(5)} ${pathname.padEnd(30)} ${status} (${elapsed}ms)`);
    }
  });

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
>>>>>>> 2e27fd8a28af4990ea3dad9dd274e50d922d6e14
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

<<<<<<< HEAD
  // ==========================================================================
  // API ROUTES
  // ==========================================================================
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth & Accounts
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = AuthController.login(body.email, body.password);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = RegistrasiController.daftarkanMahasiswa(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      if (pathname === '/api/auth/verify-email' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = RegistrasiController.verifikasiEmail(body.email, body.kode);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/auth/resend-code' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = RegistrasiController.kirimUlangKode(body.email);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/auth/register-kurir' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = RegistrasiController.daftarkanKurir(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      // 1.1 File Upload API (Foto Barang & Bukti Serah-Terima)
      if (pathname === '/api/upload' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (!body.fileData) {
          return sendJson(res, 400, { success: false, message: 'Tidak ada data file yang diunggah.' });
        }

        const match = body.fileData.match(/^data:(image\/(jpeg|png|webp|gif|jpg));base64,(.+)$/);
        if (!match) {
          return sendJson(res, 400, {
            success: false,
            message: 'Format file tidak didukung. Harap unggah foto JPG, PNG, atau WEBP.'
          });
        }

        let ext = match[2];
        if (ext === 'jpeg') ext = 'jpg';
        const base64Data = match[3];
        const buffer = Buffer.from(base64Data, 'base64');

        // Batas maksimal 5 MB
        if (buffer.length > 5 * 1024 * 1024) {
          return sendJson(res, 400, {
            success: false,
            message: 'Ukuran foto melebihi batas maksimal 5 MB.'
          });
        }

        const uploadsDir = path.join(PUBLIC_DIR, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const safePrefix = body.prefix ? body.prefix.replace(/[^a-zA-Z0-9_-]/g, '') : 'foto';
        const filename = `${safePrefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, buffer);

        return sendJson(res, 201, {
          success: true,
          message: 'Foto fisik barang berhasil diunggah dan disimpan di server.',
          url: `/uploads/${filename}`,
          filename
        });
      }

      // 2. Locations & Drop Points
      if (pathname === '/api/lokasi' && method === 'GET') {
        const lokasi = readData('lokasi');
        return sendJson(res, 200, { success: true, data: lokasi });
      }

      // 3. Permintaan (Titip & Antar)
      if (pathname === '/api/permintaan' && method === 'GET') {
        const userId = parsedUrl.query.user_id ? parseInt(parsedUrl.query.user_id) : null;
        const role = parsedUrl.query.role || null;
        const all = readData('permintaan');
        const lokasiList = readData('lokasi');
        const penggunaList = readData('pengguna');
        const penugasanList = readData('penugasan');
        const kurirList = readData('kurir');
        const serahTerimaList = readData('serah_terima');

        let filtered = all;
        if (role === 'mahasiswa' && userId) {
          filtered = all.filter(p => p.id_pemesan === userId);
        } else if (role === 'kurir' && userId) {
          const kurir = kurirList.find(k => k.id_pengguna === userId);
          if (kurir) {
            const assignedIds = penugasanList.filter(p => p.id_kurir === kurir.id_kurir).map(p => p.id_permintaan);
            filtered = all.filter(p => assignedIds.includes(p.id_permintaan) || (p.status === 'Menunggu' && p.jenis === 'antar'));
          }
        }

        const enriched = filtered.map(item => {
          const asal = lokasiList.find(l => l.id_lokasi === item.id_lokasi_asal);
          const tujuan = lokasiList.find(l => l.id_lokasi === item.id_lokasi_tujuan);
          const pemesan = penggunaList.find(u => u.id_pengguna === item.id_pemesan);
          const st = serahTerimaList.find(s => s.id_permintaan === item.id_permintaan);

          let kurirInfo = null;
          const assign = penugasanList.find(pen => pen.id_permintaan === item.id_permintaan);
          if (assign) {
            const k = kurirList.find(k => k.id_kurir === assign.id_kurir);
            if (k) {
              const ku = penggunaList.find(u => u.id_pengguna === k.id_pengguna);
              kurirInfo = { id_kurir: k.id_kurir, nama: ku ? ku.nama : 'Kurir Kampus', no_hp: ku ? ku.no_hp : '', rating_rata: k.rating_rata };
            }
          }

          // BR-06: SLA Delivery Calculation (Maksimal 60 menit sejak status 'Dijemput')
          const itemLogs = readData('riwayat_status').filter(r => r.id_permintaan === item.id_permintaan);
          const pickedUpLog = itemLogs.find(r => r.status === 'Dijemput');
          const deliveredLog = itemLogs.find(r => r.status === 'Terkirim');
          let slaInfo = { status: 'Normal', elapsed_minutes: 0, exceeded: false };
          if (pickedUpLog) {
            const startMs = new Date(pickedUpLog.waktu).getTime();
            const endMs = deliveredLog ? new Date(deliveredLog.waktu).getTime() : Date.now();
            const elapsedMins = Math.max(0, Math.floor((endMs - startMs) / 60000));
            slaInfo = {
              status: elapsedMins > 60 ? 'Terlambat (>60 Menit)' : 'Tepat Waktu (≤60 Menit)',
              elapsed_minutes: elapsedMins,
              exceeded: elapsedMins > 60
            };
          }

          return {
            ...item,
            lokasi_asal_nama: asal ? asal.nama_lokasi : '',
            lokasi_tujuan_nama: tujuan ? tujuan.nama_lokasi : '',
            pemesan_nama: pemesan ? pemesan.nama : '',
            pemesan_email: pemesan ? pemesan.email_kampus : '',
            kurir: kurirInfo,
            kode_otp: st ? st.kode_otp : null,
            sla: slaInfo
          };
        });

        return sendJson(res, 200, { success: true, data: enriched.reverse() });
      }

      if (pathname === '/api/admin/pengguna/create' && method === 'POST') {
        const body = await parseJsonBody(req);
        const penggunaList = readData('pengguna');
        const newId = penggunaList.length > 0 ? Math.max(...penggunaList.map(u => u.id_pengguna)) + 1 : 1;
        const newUser = {
          id_pengguna: newId,
          nama: (body.nama || 'Pengguna Baru').trim(),
          email_kampus: (body.email_kampus || '').trim().toLowerCase(),
          no_hp: (body.no_hp || '081234567890').trim(),
          password_hash: hashPassword(body.password || 'pass123'),
          peran: body.peran || 'mahasiswa',
          status_akun: body.status_akun || 'aktif',
          waktu_daftar: new Date().toISOString()
        };
        penggunaList.push(newUser);
        writeData('pengguna', penggunaList);
        return sendJson(res, 201, { success: true, message: 'Akun berhasil ditambahkan oleh Administrator.', user: newUser });
      }

      if (pathname.startsWith('/api/permintaan/') && !['titip', 'antar', 'status', 'serah-terima'].includes(pathname.split('/')[3]) && method === 'GET') {
        const id = pathname.split('/')[3];
        const result = PermintaanController.lacakStatus(id);
        return sendJson(res, result.success ? 200 : 404, result);
      }

      if (pathname === '/api/permintaan/titip' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = PermintaanController.ajukanTitip(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      if (pathname === '/api/permintaan/antar' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = PermintaanController.pesanAntar(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      if (pathname === '/api/permintaan/status' && method === 'POST') {
        const body = await parseJsonBody(req);
        if (body.id_kurir) {
          PenugasanController.tugaskan(body.id_permintaan, body.id_kurir, 'manual');
        }
        const result = PermintaanController.perbaruiStatus(body.id_permintaan, body.status, body.id_pengubah);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/permintaan/serah-terima' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = SerahTerimaController.verifikasiSerahTerima(body);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      // 4. Laporan Kehilangan (BR-08: Eskalasi 2x24 Jam)
      if (pathname === '/api/laporan' && method === 'GET') {
        const all = readData('laporan_kehilangan');
        const pList = readData('permintaan');
        const uList = readData('pengguna');
        const now = Date.now();
        const enriched = all.map(l => {
          const reqItem = pList.find(p => p.id_permintaan === l.id_permintaan);
          const pelapor = uList.find(u => u.id_pengguna === l.id_pelapor);
          const admin = uList.find(u => u.id_pengguna === l.id_admin);

          let displayStatus = l.status;
          if (l.status !== 'selesai' && reqItem && reqItem.waktu_dibuat) {
            const diffHours = (now - new Date(reqItem.waktu_dibuat).getTime()) / (1000 * 60 * 60);
            if (diffHours >= 48) {
              displayStatus = 'dieskalasi';
            }
          }

          return {
            ...l,
            status: displayStatus,
            kode_resi: reqItem ? reqItem.kode_resi : 'STB-XXXX',
            deskripsi_barang: reqItem ? reqItem.deskripsi_barang : '',
            pelapor_nama: pelapor ? pelapor.nama : '',
            admin_nama: admin ? admin.nama : null
          };
        });
        return sendJson(res, 200, { success: true, data: enriched.reverse() });
      }

      if (pathname === '/api/laporan' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = LaporanKehilanganController.laporKehilangan(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      if (pathname === '/api/laporan/tindak-lanjut' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = LaporanKehilanganController.tindakLanjuti(body);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      // 5. Ulasan
      if (pathname === '/api/ulasan' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = UlasanController.beriUlasan(body);
        return sendJson(res, result.success ? 201 : 400, result);
      }

      // 6. Notifikasi
      if (pathname === '/api/notifikasi' && method === 'GET') {
        const userId = parsedUrl.query.user_id;
        if (!userId) {
          return sendJson(res, 400, { success: false, message: 'User ID required' });
        }
        const notif = NotifikasiController.getNotifikasi(userId);
        return sendJson(res, 200, { success: true, data: notif });
      }

      if (pathname === '/api/notifikasi/baca' && method === 'POST') {
        const body = await parseJsonBody(req);
        const ok = NotifikasiController.tandaiDibaca(body.id_notifikasi);
        return sendJson(res, 200, { success: ok });
      }

      // 7. Kurir & Admin APIs
      if (pathname === '/api/admin/dashboard' && method === 'GET') {
        const stats = KurirAdminController.getDashboardStats();
        return sendJson(res, 200, { success: true, data: stats });
      }

      if (pathname === '/api/admin/kurir' && method === 'GET') {
        const kurirList = readData('kurir');
        const penggunaList = readData('pengguna');
        const jadwalList = readData('jadwal_kurir');

        const enriched = kurirList.map(k => {
          const user = penggunaList.find(u => u.id_pengguna === k.id_pengguna);
          const shifts = jadwalList.filter(j => j.id_kurir === k.id_kurir);
          return {
            ...k,
            nama: user ? user.nama : '',
            email_kampus: user ? user.email_kampus : '',
            no_hp: user ? user.no_hp : '',
            status_akun: user ? user.status_akun : '',
            jadwal: shifts
          };
        });

        return sendJson(res, 200, { success: true, data: enriched });
      }

      if (pathname === '/api/admin/kurir/verifikasi' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = KurirAdminController.verifikasiPengajuanKurir(body);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/admin/penugasan' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = PenugasanController.tugaskan(body.id_permintaan, body.id_kurir, 'manual');
        return sendJson(res, 200, { success: true, data: result });
      }

      if (pathname === '/api/admin/pengguna' && method === 'GET') {
        const penggunaList = readData('pengguna').map(u => ({
          id_pengguna: u.id_pengguna,
          nama: u.nama,
          email_kampus: u.email_kampus,
          no_hp: u.no_hp,
          peran: u.peran,
          status_akun: u.status_akun,
          waktu_daftar: u.waktu_daftar
        }));
        return sendJson(res, 200, { success: true, data: penggunaList });
      }

      if (pathname === '/api/admin/pengguna/status' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = KurirAdminController.toggleStatusPengguna(body.id_pengguna, body.status_akun);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/kurir/shift-toggle' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = KurirAdminController.toggleKetersediaanKurir(body.id_kurir, body.status_ketersediaan);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      if (pathname === '/api/kurir/jadwal' && method === 'POST') {
        const body = await parseJsonBody(req);
        const result = KurirAdminController.updateJadwalKurir(body.id_kurir, body.jadwal);
        return sendJson(res, result.success ? 200 : 400, result);
      }

      // Reset Database Endpoint
      if (pathname === '/api/admin/reset-database' && method === 'POST') {
        resetDatabase();
        return sendJson(res, 200, { success: true, message: 'Database reset to default seeds.' });
      }

      // Unmatched API endpoint
      return sendJson(res, 404, { success: false, message: 'API endpoint not found' });
    } catch (err) {
      console.error('API Error:', err);
      return sendJson(res, 500, { success: false, message: 'Internal Server Error' });
    }
  }

  // Otherwise serve static client files
  serveStatic(req, res, pathname);
});

if (require.main === module) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(PORT) + 1;
      console.warn(`\n⚠️  Port ${PORT} sedang digunakan oleh proses lain.`);
      console.log(`🔄 Mengalihkan server SiTAB secara otomatis ke port ${nextPort}...`);
      server.listen(nextPort, () => {
        console.log(`========================================================`);
        console.log(` SiTAB Server running at: http://localhost:${nextPort}`);
        console.log(` UNKLAB Campus Logistics Management System (SRS v1.5)`);
        console.log(`========================================================`);
      });
    } else {
      console.error('Server Error:', err);
    }
  });

  server.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` SiTAB Server running at: http://localhost:${PORT}`);
    console.log(` UNKLAB Campus Logistics Management System (SRS v1.5)`);
    console.log(`========================================================`);
  });
}

module.exports = server;
=======
  // ── API Routes ──────────────────────────────────────────────────────────────

  // Auth
  if (method === 'POST' && pathname === '/api/auth/register')       return handleRegister(req, res);
  if (method === 'POST' && pathname === '/api/auth/register-kurir') return handleRegisterKurir(req, res);
  if (method === 'POST' && pathname === '/api/auth/login')          return handleLogin(req, res);
  if (method === 'POST' && pathname === '/api/auth/verify-email')   return handleVerifyEmail(req, res);
  if (method === 'POST' && pathname === '/api/auth/resend-otp')     return handleResendOTP(req, res);

  // Mahasiswa
  if (method === 'GET' && pathname === '/api/mahasiswa/dashboard')  return handleMahasiswaDashboard(req, res);
  if (method === 'GET' && pathname === '/api/mahasiswa/history')    return handleMahasiswaHistory(req, res);

  // Permintaan
  if (method === 'POST' && pathname === '/api/permintaan/titip')    return handleTitipBarang(req, res);
  if (method === 'POST' && pathname === '/api/permintaan/antar')    return handleAntarBarang(req, res);
  if (method === 'GET'  && pathname === '/api/permintaan')          return handleListPermintaan(req, res, parsedUrl);
  if (method === 'GET'  && pathname.startsWith('/api/permintaan/')) {
    const id = pathname.split('/api/permintaan/')[1];
    return handleDetailPermintaan(req, res, id);
  }

  // Kurir
  if (method === 'GET'  && pathname === '/api/kurir/dashboard')     return handleKurirDashboard(req, res);
  if (method === 'POST' && pathname === '/api/kurir/shift')         return handleKurirShift(req, res);
  if (method === 'POST' && pathname === '/api/kurir/ambil-tugas')   return handleAmbilTugas(req, res);
  if (method === 'POST' && pathname === '/api/kurir/update-status') return handleUpdateStatusKurir(req, res);

  // Serah Terima
  if (method === 'POST' && pathname === '/api/serah-terima/verify') return handleSerahTerima(req, res);

  // Rating & Laporan
  if (method === 'POST' && pathname === '/api/rating')              return handleRating(req, res);
  if (method === 'POST' && pathname === '/api/laporan')             return handleLaporan(req, res);

  // Admin
  if (method === 'GET'  && pathname === '/api/admin/dashboard')        return handleAdminDashboard(req, res);
  if (method === 'GET'  && pathname === '/api/admin/pengguna')         return handleAdminPengguna(req, res);
  if (method === 'GET'  && pathname === '/api/admin/pengajuan-kurir')  return handleGetPengajuanKurir(req, res);
  if (method === 'POST' && pathname === '/api/admin/verifikasi-kurir') return handleVerifikasiKurir(req, res);
  if (method === 'POST' && pathname === '/api/admin/promosi-kurir')    return handlePromosiKurir(req, res);
  if (method === 'POST' && pathname === '/api/admin/tugaskan-kurir')   return handleTugaskanKurir(req, res);
  if (method === 'GET'  && pathname === '/api/admin/laporan')          return handleAdminLaporan(req, res);
  if (method === 'POST' && pathname === '/api/admin/selesaikan-laporan') return handleSelesaikanLaporan(req, res);

  // Master Data
  if (method === 'GET' && pathname === '/api/master/lokasi')        return handleMasterLokasi(req, res);
  if (method === 'GET' && pathname === '/api/master/kurir-aktif')   return handleKurirAktif(req, res);

  // ── Static files ────────────────────────────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    return serveStatic(req, res, filePath);
  }

  // 404 for unknown API routes
  sendError(res, 404, `Endpoint tidak ditemukan: ${method} ${pathname}`);
}

// ─────────────────────────── SERVER STARTUP ──────────────────────────────────

// Pastikan tabel sessions ada di DB
(function initDB() {
  try {
    const db = readDB();
    let changed = false;
    if (!db.sessions) { db.sessions = []; changed = true; }
    if (!db.laporan_kehilangan) { db.laporan_kehilangan = []; changed = true; }
    if (!db.verifikasi_email) { db.verifikasi_email = []; changed = true; }
    if (!db.notifikasi) { db.notifikasi = []; changed = true; }
    if (!db.transaksi) { db.transaksi = []; changed = true; }
    if (!db.riwayat_status) { db.riwayat_status = []; changed = true; }
    if (!db.jadwal_kurir) { db.jadwal_kurir = []; changed = true; }
    if (!db.penugasan) { db.penugasan = []; changed = true; }
    if (!db.serah_terima) { db.serah_terima = []; changed = true; }
    if (!db.ulasan) { db.ulasan = []; changed = true; }
    if (changed) writeDB(db);
  } catch (e) {
    console.error('⚠ Gagal inisialisasi DB:', e.message);
  }
})();

const server = http.createServer(router);

server.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   SiTAB — Sistem Titip Antar Barang Kampus UNKLAB   ║');
  console.log('║                 Kelompok Miedal                     ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Server berjalan di http://localhost:${PORT}           ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Endpoint tersedia:                                  ║');
  console.log('║   POST /api/auth/login                               ║');
  console.log('║   POST /api/auth/register                            ║');
  console.log('║   POST /api/auth/verify-email                        ║');
  console.log('║   POST /api/auth/resend-otp                          ║');
  console.log('║   GET  /api/mahasiswa/dashboard                      ║');
  console.log('║   GET  /api/mahasiswa/history                        ║');
  console.log('║   POST /api/permintaan/titip                         ║');
  console.log('║   POST /api/permintaan/antar                         ║');
  console.log('║   GET  /api/permintaan                               ║');
  console.log('║   GET  /api/permintaan/:id                           ║');
  console.log('║   GET  /api/kurir/dashboard                          ║');
  console.log('║   POST /api/kurir/shift                              ║');
  console.log('║   POST /api/kurir/ambil-tugas                        ║');
  console.log('║   POST /api/kurir/update-status                      ║');
  console.log('║   POST /api/serah-terima/verify                      ║');
  console.log('║   POST /api/rating                                   ║');
  console.log('║   POST /api/laporan                                  ║');
  console.log('║   GET  /api/admin/dashboard                          ║');
  console.log('║   GET  /api/admin/pengguna                           ║');
  console.log('║   POST /api/admin/promosi-kurir                      ║');
  console.log('║   POST /api/admin/tugaskan-kurir                     ║');
  console.log('║   GET  /api/admin/laporan                            ║');
  console.log('║   POST /api/admin/selesaikan-laporan                 ║');
  console.log('║   GET  /api/master/lokasi                            ║');
  console.log('║   GET  /api/master/kurir-aktif                       ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Akun Pengujian Bawaan (Sandi: miedal123):          ║');
  console.log('║   Admin: Salem, Jovitly Mike (NIM: 105022410043)     ║');
  console.log('║   Kurir: Sanjaya, Liandy (NIM: 105022410044)         ║');
  console.log('║   Kurir: Sahala, Andrew (NIM: 105012410026)          ║');
  console.log('║   Mhs:   Makarewa, Miracle (NIM: 105022410118)       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
});

server.on('error', err => {
  console.error('Server error:', err);
  process.exit(1);
});

module.exports = { router, server };
>>>>>>> 2e27fd8a28af4990ea3dad9dd274e50d922d6e14
