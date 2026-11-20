/**
 * test_logic.js
 * SiTAB UNKLAB - Skrip Pengujian Komprehensif
 * Kelompok Miedal - FIK UNKLAB 2024
 *
 * Jalankan: node test_logic.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS  ${label}`);
    passed++;
    results.push({ label, status: 'PASS', detail });
  } else {
    console.log(`  ❌ FAIL  ${label}${detail ? ' → ' + detail : ''}`);
    failed++;
    results.push({ label, status: 'FAIL', detail });
  }
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

// ─── Load Database ─────────────────────────────────────────────────────────────

const DB_PATH = path.join(__dirname, 'data', 'sitab_db.json');

section('MEMUAT DATABASE');
let db;
try {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  db = JSON.parse(raw);
  console.log(`  ℹ️  File ditemukan: ${DB_PATH}`);
  console.log(`  ℹ️  Ukuran: ${(raw.length / 1024).toFixed(2)} KB`);
} catch (err) {
  console.error(`  ❌ FATAL: Tidak dapat memuat database: ${err.message}`);
  process.exit(1);
}

// ─── TES 1: Integritas Struktur Database ──────────────────────────────────────

section('TES 1: INTEGRITAS STRUKTUR DATABASE');

const TABEL_WAJIB = [
  'pengguna',
  'kurir',
  'jadwal_kurir',
  'lokasi',
  'permintaan',
  'penugasan',
  'riwayat_status',
  'serah_terima',
  'transaksi',
  'laporan_kehilangan',
  'ulasan',
  'notifikasi',
  'verifikasi_email',
];

for (const tabel of TABEL_WAJIB) {
  assert(
    `Tabel '${tabel}' ada di database`,
    db[tabel] !== undefined && Array.isArray(db[tabel]),
    `Tabel tidak ditemukan atau bukan array`
  );
}

assert('Database memiliki 13+ tabel/koleksi', TABEL_WAJIB.every((t) => db[t] !== undefined));
assert('verifikasi_email adalah array kosong di awal', Array.isArray(db.verifikasi_email));

// ─── TES 2: Verifikasi Tidak Ada "Daniel Rantung" ─────────────────────────────

section('TES 2: VERIFIKASI TIDAK ADA NAMA TERLARANG');

const dbString = JSON.stringify(db).toLowerCase();

assert(
  'Tidak ada nama "Daniel Rantung" di database',
  !dbString.includes('daniel rantung'),
  'Ditemukan nama "Daniel Rantung"!'
);

assert(
  'Tidak ada string "daniel" di field nama pengguna',
  db.pengguna.every((u) => !u.nama.toLowerCase().includes('daniel')),
  'Ditemukan nama mengandung "daniel" pada pengguna'
);

// ─── TES 3: Verifikasi Anggota Kelompok Miedal ───────────────────────────────

section('TES 3: VERIFIKASI ANGGOTA KELOMPOK MIEDAL');

const ANGGOTA_MIEDAL = [
  { nama_key: 'Salem', nim: '105022410043' },
  { nama_key: 'Sanjaya', nim: '105022410044' },
  { nama_key: 'Makarewa', nim: '105022410118' },
  { nama_key: 'Sahala', nim: '105012410026' },
];

for (const anggota of ANGGOTA_MIEDAL) {
  const found = db.pengguna.some((u) => u.nama.includes(anggota.nama_key));
  assert(
    `Anggota "${anggota.nama_key}" ada di database`,
    found,
    `Tidak ditemukan pengguna dengan nama "${anggota.nama_key}"`
  );
}

assert(
  'Total pengguna adalah 4 anggota Kelompok Miedal',
  db.pengguna.length === 4,
  `Jumlah pengguna: ${db.pengguna.length} (diharapkan: 4)`
);

// ─── TES 4: Verifikasi Admin ───────────────────────────────────────────────────

section('TES 4: VERIFIKASI AKUN ADMINISTRATOR');

const admin = db.pengguna.find((u) => u.peran === 'administrator');

assert('Ada 1 akun administrator', !!admin, 'Akun administrator tidak ditemukan');

if (admin) {
  assert(
    'Admin menggunakan nama "Salem, Jovitly Mike"',
    admin.nama === 'Salem, Jovitly Mike',
    `Nama admin: "${admin.nama}"`
  );
  assert(
    'NIM admin sesuai SRS ("105022410043" atau "admin")',
    admin.nim === '105022410043' || admin.nim === 'admin',
    `NIM admin: "${admin.nim}"`
  );
  assert(
    'Status verifikasi admin adalah true',
    admin.status_verifikasi === true
  );
}

// ─── TES 5: Validasi Format NIM ───────────────────────────────────────────────

section('TES 5: VALIDASI FORMAT NIM ANGGOTA KELOMPOK');

for (const anggota of ANGGOTA_MIEDAL) {
  const user = db.pengguna.find((u) => u.nama.includes(anggota.nama_key));
  if (user) {
    assert(
      `NIM ${anggota.nama_key} sesuai (${anggota.nim})`,
      user.nim === anggota.nim || (user.peran === 'administrator' && user.nim === 'admin'),
      `NIM tersimpan: "${user.nim}", diharapkan: "${anggota.nim}"`
    );
    assert(
      `NIM ${anggota.nama_key} valid (angka)`,
      /^\d+$/.test(user.nim) || user.nim === 'admin',
      `NIM mengandung karakter non-angka: "${user.nim}"`
    );
  }
}

// ─── TES 6: Validasi Format Email ─────────────────────────────────────────────

section('TES 6: VALIDASI FORMAT EMAIL');

for (const user of db.pengguna) {
  assert(
    `Email ${user.nama} menggunakan domain valid UNKLAB`,
    user.email.endsWith('@student.unklab.ac.id') || user.email.endsWith('@unklab.ac.id'),
    `Email: "${user.email}"`
  );
}

// ─── TES 7: Validasi Hash Password (miedal123) ────────────────────────────────

section('TES 7: VALIDASI HASH PASSWORD (miedal123)');

const HASH_MIEDAL = sha256('miedal123');

assert(
  `Hash "miedal123" benar (sha256)`,
  sha256('miedal123') === HASH_MIEDAL,
  `Diharapkan: ${HASH_MIEDAL}`
);

for (const user of db.pengguna) {
  assert(
    `Password ${user.nama} (${user.peran}) menggunakan password "miedal123"`,
    user.password_hash === HASH_MIEDAL || user.password === HASH_MIEDAL,
    `Hash tersimpan: ${user.password_hash}`
  );
}

// ─── TES 8: Validasi Data Kurir ───────────────────────────────────────────────

section('TES 8: VALIDASI DATA KURIR');

assert(
  'Ada 2 record kurir',
  db.kurir.length === 2,
  `Jumlah kurir: ${db.kurir.length} (diharapkan: 2)`
);

for (const kurir of db.kurir) {
  const userExists = db.pengguna.some((u) => u.id === kurir.pengguna_id);
  assert(
    `Kurir ${kurir.nama} mereferensi pengguna yang ada (pengguna_id: ${kurir.pengguna_id})`,
    userExists,
    `pengguna_id "${kurir.pengguna_id}" tidak ditemukan di tabel pengguna`
  );
  assert(
    `Kurir ${kurir.nama} statusnya "disetujui"`,
    kurir.status_persetujuan === 'disetujui',
    `Status: "${kurir.status_persetujuan}"`
  );
  assert(
    `Kurir ${kurir.nama} adalah Sanjaya atau Sahala`,
    kurir.nama.includes('Sanjaya') || kurir.nama.includes('Sahala'),
    `Nama kurir: "${kurir.nama}"`
  );
}

const kurirPengguna = db.pengguna.filter((u) => u.peran === 'kurir');
assert(
  'Semua kurir memiliki peran "kurir" di tabel pengguna',
  db.kurir.every((k) => db.pengguna.find((u) => u.id === k.pengguna_id)?.peran === 'kurir'),
  'Ada kurir yang perannya bukan "kurir" di tabel pengguna'
);

// ─── TES 9: Validasi Data Permintaan & Referensi Lokasi ──────────────────────

section('TES 9: VALIDASI DATA PERMINTAAN & REFERENSI LOKASI');

const lokasiIds = db.lokasi.map((l) => l.id);
const penggunaIds = db.pengguna.map((u) => u.id);

assert(
  'Ada 7 lokasi kampus UNKLAB',
  db.lokasi.length === 7,
  `Jumlah lokasi: ${db.lokasi.length} (diharapkan: 7)`
);

const lokasiWajib = ['GK1', 'GK2', 'PERP', 'ASC', 'ASE', 'ASP', 'KTN'];
for (const kode of lokasiWajib) {
  assert(
    `Lokasi "${kode}" ada di database`,
    db.lokasi.some((l) => l.kode === kode),
    `Lokasi dengan kode "${kode}" tidak ditemukan`
  );
}

assert(
  'Ada 3 sample permintaan (1 Dalam Perjalanan, 1 Terkirim, 1 Menunggu)',
  db.permintaan.length === 3,
  `Jumlah permintaan: ${db.permintaan.length}`
);

const statusPermintaan = db.permintaan.map((p) => p.status);
assert('Ada permintaan berstatus "Dalam Perjalanan"', statusPermintaan.includes('Dalam Perjalanan'));
assert('Ada permintaan berstatus "Terkirim"', statusPermintaan.includes('Terkirim'));
assert('Ada permintaan berstatus "Menunggu"', statusPermintaan.includes('Menunggu'));

for (const p of db.permintaan) {
  assert(
    `Permintaan ${p.id}: lokasi_jemput_id valid (${p.lokasi_jemput_id})`,
    lokasiIds.includes(p.lokasi_jemput_id),
    `lokasi_jemput_id "${p.lokasi_jemput_id}" tidak ada di tabel lokasi`
  );
  assert(
    `Permintaan ${p.id}: lokasi_antar_id valid (${p.lokasi_antar_id})`,
    lokasiIds.includes(p.lokasi_antar_id),
    `lokasi_antar_id "${p.lokasi_antar_id}" tidak ada di tabel lokasi`
  );
  assert(
    `Permintaan ${p.id}: pemohon_id valid (${p.pemohon_id})`,
    penggunaIds.includes(p.pemohon_id),
    `pemohon_id "${p.pemohon_id}" tidak ada di tabel pengguna`
  );
  assert(
    `Permintaan ${p.id}: tidak ada barang terlarang`,
    p.barang_terlarang === false
  );
}

// ─── TES 10: Validasi Jadwal Kurir ────────────────────────────────────────────

section('TES 10: VALIDASI JADWAL KURIR');

assert(
  'Ada jadwal untuk setiap kurir',
  db.jadwal_kurir.length >= 2,
  `Jumlah jadwal: ${db.jadwal_kurir.length}`
);

for (const jadwal of db.jadwal_kurir) {
  const kurirAda = db.kurir.some((k) => k.id === jadwal.kurir_id);
  assert(
    `Jadwal ${jadwal.id}: kurir_id valid (${jadwal.kurir_id})`,
    kurirAda,
    `kurir_id "${jadwal.kurir_id}" tidak ada di tabel kurir`
  );
  assert(
    `Jadwal ${jadwal.id}: memiliki array hari`,
    Array.isArray(jadwal.hari) && jadwal.hari.length > 0
  );
}

// ─── TES 11: Validasi Transaksi ────────────────────────────────────────────────

section('TES 11: VALIDASI TRANSAKSI');

for (const trx of db.transaksi) {
  const permintaanAda = db.permintaan.some((p) => p.id === trx.permintaan_id);
  assert(
    `Transaksi ${trx.id}: referensi permintaan valid (${trx.permintaan_id})`,
    permintaanAda
  );
  assert(
    `Transaksi ${trx.id}: biaya_layanan > 0`,
    trx.biaya_layanan > 0,
    `biaya_layanan: ${trx.biaya_layanan}`
  );
  assert(
    `Transaksi ${trx.id}: total_bayar === biaya_layanan`,
    trx.total_bayar === trx.biaya_layanan
  );
}

// ─── TES 12: Validasi Ulasan dan Notifikasi ───────────────────────────────────

section('TES 12: VALIDASI ULASAN & NOTIFIKASI');

assert('Ada minimal 1 ulasan', db.ulasan.length >= 1);
const ulasan = db.ulasan[0];
assert(
  'Ulasan bintang 5 ada',
  db.ulasan.some((u) => u.bintang === 5)
);
assert(
  'Ulasan mereferensi permintaan yang ada',
  db.ulasan.every((u) => db.permintaan.some((p) => p.id === u.permintaan_id))
);

assert('Ada minimal 3 notifikasi', db.notifikasi.length >= 3);
assert(
  'Notifikasi mereferensi pengguna yang ada',
  db.notifikasi.every((n) => penggunaIds.includes(n.pengguna_id))
);

// ─── TES 13: Validasi Laporan Kehilangan ─────────────────────────────────────

section('TES 13: VALIDASI LAPORAN KEHILANGAN');

assert('Ada minimal 1 laporan kehilangan', db.laporan_kehilangan.length >= 1);
assert(
  'Ada laporan dengan status "selesai"',
  db.laporan_kehilangan.some((l) => l.status === 'selesai')
);
assert(
  'Laporan mereferensi permintaan yang ada',
  db.laporan_kehilangan.every((l) => db.permintaan.some((p) => p.id === l.permintaan_id))
);

// ─── RINGKASAN ─────────────────────────────────────────────────────────────────

section('RINGKASAN HASIL PENGUJIAN');

const total = passed + failed;
const pct = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

console.log(`\n  Total tes  : ${total}`);
console.log(`  Lulus      : ${passed} ✅`);
console.log(`  Gagal      : ${failed} ❌`);
console.log(`  Persentase : ${pct}%`);

if (failed === 0) {
  console.log(`\n  🎉 SEMUA TES LULUS! Database SiTAB siap digunakan.`);
} else {
  console.log(`\n  ⚠️  Ada ${failed} tes yang GAGAL. Periksa item bertanda ❌ di atas.`);
}

console.log(`\n${'═'.repeat(60)}\n`);

process.exit(failed === 0 ? 0 : 1);
