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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

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
          const kurir = kurirList.find(k => k.id_pengguna === userId && k.status_verifikasi === 'disetujui');
          if (kurir) {
            const assignedIds = penugasanList.filter(p => p.id_kurir === kurir.id_kurir).map(p => p.id_permintaan);
            filtered = all.filter(p => assignedIds.includes(p.id_permintaan) || (p.status === 'Menunggu' && p.jenis === 'antar'));
          } else {
            // BUGFIX: bukan kurir terverifikasi -> tidak boleh melihat pesanan siapa pun
            filtered = [];
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
        // BUGFIX: kurir ditentukan dari akun yang login (id_pengubah), bukan dari id_kurir kiriman klien.
        const result = PermintaanController.perbaruiStatusOlehPengguna(body);
        const code = result.success ? 200 : (result.code === 'FORBIDDEN' ? 403 : 400);
        return sendJson(res, code, result);
      }

      if (pathname === '/api/permintaan/serah-terima' && method === 'POST') {
        const body = await parseJsonBody(req);

        // Kurir hanya boleh menyelesaikan pesanan antar yang menjadi tanggung jawabnya.
        const pelaku = readData('pengguna').find(u => u.id_pengguna === parseInt(body.id_pengubah));
        const target = readData('permintaan').find(p => p.id_permintaan === parseInt(body.id_permintaan));
        if (pelaku && pelaku.peran === 'kurir' && target && target.jenis === 'antar') {
          const kr = readData('kurir').find(k => k.id_pengguna === pelaku.id_pengguna);
          const tugas = readData('penugasan').find(p => p.id_permintaan === target.id_permintaan);
          if (!kr || !tugas || tugas.id_kurir !== kr.id_kurir) {
            return sendJson(res, 403, { success: false, code: 'FORBIDDEN', message: 'Pesanan ini bukan tugas Anda.' });
          }
        }

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
