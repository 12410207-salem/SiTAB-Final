# 📦 SiTAB UNKLAB
## Sistem Titip Antar Barang Kampus UNKLAB

> Platform digital pengiriman barang antar mahasiswa di lingkungan kampus Universitas Klabat (UNKLAB) — aman, terverifikasi OTP, dan terlacak secara real-time.

---

## 🏆 Tim Pengembang — Kelompok Miedal

| No | Nama | NIM | Peran |
|----|------|-----|-------|
| 1 | Salem, Jovitly Mike | 105022410043 | Ketua & Full-Stack Developer |
| 2 | Sanjaya, Liandy Maygiven | 105022410044 | Backend Developer |
| 3 | Makarewa, Miracle Evangelio | 105022410118 | Frontend Developer |
| 4 | Sahala, Andrew | 105012410026 | Database & Config Specialist |

**Institusi:** Fakultas Ilmu Komputer (FIK), Universitas Klabat — 2024

---

## ✨ Fitur Sistem

| Fitur | Keterangan |
|-------|------------|
| 🔐 Autentikasi Aman | Login NIM + Password, verifikasi email OTP 6 digit |
| 📦 Titip Barang | Simpan barang di drop point loker kampus |
| 🚴 Antar Barang | Pesan kurir untuk pengantaran antar gedung/asrama |
| 📡 Tracking Real-Time | Lacak status kiriman: Menunggu → Dijemput → Dalam Perjalanan → Terkirim |
| 🔑 Verifikasi OTP Serah Terima | Konfirmasi 4 digit wajib saat penyerahan barang |
| ⭐ Sistem Rating | Ulasan bintang + tag + komentar untuk setiap kurir |
| 📋 Laporan Kehilangan | Mekanisme pelaporan dan tindak lanjut admin |
| 👨‍💼 Panel Admin | Kelola pengguna, promosi kurir, statistik sistem |
| 🔔 Notifikasi | Notifikasi real-time setiap perubahan status |
| 🛡️ Validasi Barang Terlarang | Cegah pengiriman barang berbahaya/ilegal |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER CLIENT                      │
│         HTML5 + CSS3 + Vanilla JavaScript               │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP Request/Response
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   NODE.JS SERVER                        │
│                    (server.js)                          │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Auth Layer  │  │  API Router  │  │ Static Files  │  │
│  │  (Session)  │  │  (Endpoints) │  │  (public/)    │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────────┘  │
│         │                │                               │
│  ┌──────▼────────────────▼──────────────────────────┐   │
│  │              Business Logic Layer                 │   │
│  │  BR-01 Autentikasi  │  BR-04 OTP Serah Terima    │   │
│  │  BR-02 Barang Larang│  BR-05 Satu Ulasan/Trx     │   │
│  │  BR-03 Shift Kurir  │  BR-06 Email Student       │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                 │
│  ┌─────────────────────▼────────────────────────────┐   │
│  │            Data Access Layer (fs/JSON)            │   │
│  └─────────────────────┬────────────────────────────┘   │
└────────────────────────┼────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              data/sitab_db.json                         │
│  pengguna │ kurir │ lokasi │ permintaan │ transaksi      │
│  jadwal_kurir │ penugasan │ riwayat_status │ ulasan      │
│  serah_terima │ laporan_kehilangan │ notifikasi          │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 Struktur Folder

```
SiTAB_UNKLAB/
│
├── server.js              # Server Backend Node.js (24 Endpoint REST API murni, tanpa npm packages)
├── test_logic.js          # Skrip pengujian otomatis 103 checks integritas data & aturan bisnis
├── package.json           # Konfigurasi npm scripts (npm start, npm test)
├── .gitignore             # Konfigurasi ignore file untuk push GitHub
├── start.bat              # Launcher opsional Windows
├── README.md              # Dokumentasi lengkap sistem
│
├── data/
│   └── sitab_db.json      # Database JSON 13 tabel (pengguna, kurir, permintaan, lokasi, dll.)
│
└── public/
    └── index.html         # Frontend Interaktif SPA lengkap (12+ Layar L-01 s/d L-12 sesuai Figma)
```

---

## 🚀 Cara Menjalankan dari Terminal VS Code

### 1. Buka Proyek di VS Code
Buka folder proyek ini di Visual Studio Code (`File > Open Folder...`).

### 2. Buka Terminal Terintegrasi VS Code
Tekan kombinasi tombol **``Ctrl + ` ``** (Backtick) atau pilih menu **Terminal > New Terminal**.

### 3. Jalankan Pengujian Otomatis (Opsional / Bagus saat Presentasi)
```bash
npm test
# atau: node test_logic.js
```
*Akan menjalankan 103 pengujian logika bisnis dan database dengan hasil 100% PASS.*

### 4. Jalankan Server
```bash
npm start
# atau: node server.js
```

Terminal akan menampilkan banner resmi:
```text
╔══════════════════════════════════════════════════════╗
║   SiTAB — Sistem Titip Antar Barang Kampus UNKLAB   ║
║                 Kelompok Miedal                     ║
╠══════════════════════════════════════════════════════╣
║  Server berjalan di http://localhost:3000           ║
╚══════════════════════════════════════════════════════╝
```
Setiap aktivitas di peramban (klik tombol, login, pesan barang, verifikasi OTP) akan langsung tercatat secara live di terminal VS Code!

### 5. Buka Peramban
Buka browser favorit Anda (Chrome, Edge, Firefox) dan akses:
👉 **`http://localhost:3000`**

---

## 🐙 Panduan Upload ke GitHub

Jalankan perintah berikut di Terminal VS Code untuk mengunggah proyek ini ke repository GitHub Anda:

```bash
# 1. Inisialisasi Git repository
git init

# 2. Tambahkan semua file proyek
git add .

# 3. Lakukan commit awal
git commit -m "feat: Sistem SiTAB Kampus UNKLAB Full Implementation (Kelompok Miedal)"

# 4. Ubah branch utama menjadi main
git branch -M main

# 5. Hubungkan ke remote repository GitHub Anda (ganti URL di bawah dengan link repo Anda)
git remote add origin https://github.com/USERNAME-ANDA/sitab-unklab.git

# 6. Push kode ke GitHub
git push -u origin main
```

---

## 🎬 Skenario Alur Demonstrasi saat Presentasi

Untuk presentasi tugas akhir di depan dosen / penguji, ikuti urutan skenario berikut:

### Skenario 1: Registrasi Mahasiswa Baru (FR-14, FR-15)
1. Di halaman login, pilih tab **🎓 Mahasiswa**, lalu klik tautan **"Daftar Mahasiswa"**.
2. Masukkan data mahasiswa baru:
   - NIM: Contoh `105022410099` (wajib angka)
   - Nama: Nama Anda sendiri
   - Email: `105022410099@student.unklab.ac.id` (harus `@student.unklab.ac.id`)
   - Kata Sandi: `unklab2024` (min. 8 karakter)
3. Klik **"Daftar Sekarang"**.
4. Sistem membuka layar verifikasi email OTP dan menampilkan kode OTP 6 digit.
5. Masukkan 6 digit kode OTP lalu klik **"Verifikasi"** → Akun langsung aktif!

### Skenario 2: Login Mahasiswa & Buat Pesanan (L-01, L-02, L-03, L-04)
1. Masuk menggunakan NIM dan kata sandi yang baru dibuat (atau gunakan akun `105022410118` / `miedal123`).
2. Masuk ke **Beranda Mahasiswa**:
   - Tunjukkan **Hero Card Navy Blue** pengiriman aktif `#STB-0248`.
   - Tunjukkan **Visualizer Loker 12-Segmen** di Drop Point Gedung GK1.
3. Klik **"Titip Barang"**: Pilih drop point loker, kategori dokumen/elektronik, ukuran Medium, konfirmasi penitipan loker.
4. Klik **"Pesan Antar"**: Pilih titik jemput Perpustakaan, tujuan Asrama Crystal, pilih layanan Express, pesan kurir.
5. Masuk ke menu **"Lacak"**: Tunjukkan 4-tahap vertical stepper dan **kartu kode OTP pengamanan 4 digit**.

### Skenario 3: Dashboard Kurir Kampus (L-08, L-09)
1. Keluar (*Logout*) lalu masuk sebagai Kurir Resmi:
   - NIM: `105022410044` | Sandi: `miedal123` (Sanjaya, Liandy Maygiven)
2. Tunjukkan **Toggle Shift Aktif** dan total honor shift.
3. Buka tugas antar, klik **"Ambil Barang"** → **"Mulai Jalan"**.
4. Klik **"Verifikasi Serah-Terima"**: Masukkan kode OTP penerima dan foto bukti serah terima → Status pesanan otomatis menjadi *Terkirim* dan honor kurir bertambah!

### Skenario 4: Dashboard Administrator Kemahasiswaan (L-12)
1. Keluar (*Logout*) lalu masuk sebagai Administrator:
   - NIM: `105022410043` (atau `admin`) | Sandi: `miedal123` (Salem, Jovitly Mike)
2. Tunjukkan statistik operasional kampus: total transaksi, kurir on-duty, utilisasi loker.
3. Buka tab **"Manajemen Kurir"** → Tunjukkan fitur **Verifikasi Pengajuan Kurir Baru** dan **Promosi Kurir**:
   - Tinjau pengajuan kurir yang masuk dari mahasiswa dan klik **"Setujui"**.
   - Mahasiswa tersebut langsung dipromosikan menjadi kurir resmi tanpa perlu registrasi ulang!

---

## 🔑 Kredensial Pengujian (Kelompok Miedal)

> [!NOTE]
> Semua akun bawaan di bawah ini menggunakan kata sandi: **`miedal123`**. Akun dapat diakses melalui form login di `http://localhost:3000`.

| Peran | NIM / Username | Kata Sandi | Nama Lengkap | Keterangan |
|-------|----------------|------------|--------------|------------|
| Administrator | `105022410043` (atau `admin`) | `miedal123` | Salem, Jovitly Mike | Admin Utama Kemahasiswaan |
| Kurir | `105022410044` | `miedal123` | Sanjaya, Liandy Maygiven | Kurir Mahasiswa (Labor) Resmi |
| Kurir | `105012410026` | `miedal123` | Sahala, Andrew | Kurir Mahasiswa (Labor) Resmi |
| Mahasiswa | `105022410118` | `miedal123` | Makarewa, Miracle Evangelio | Mahasiswa Pengguna Layanan |

*Catatan Penting: Untuk pendaftaran akun baru melalui halaman Registrasi Mahasiswa (L-13) atau Registrasi Kurir (L-15), sistem mewajibkan verifikasi OTP email kampus (`@student.unklab.ac.id`) sebelum akun diaktifkan untuk bisa login.*

---

## 📡 Daftar API Endpoint

### 🔐 Auth
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login dengan NIM & password |
| `POST` | `/api/auth/register` | Registrasi mahasiswa baru |
| `POST` | `/api/auth/verify-email` | Verifikasi OTP 6 digit email |
| `POST` | `/api/auth/resend-otp` | Kirim ulang OTP |

### 👤 Mahasiswa
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/mahasiswa/dashboard` | Dashboard (permintaan aktif, drop point) |
| `GET` | `/api/mahasiswa/history` | Riwayat semua transaksi |

### 📦 Permintaan
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/permintaan/titip` | Buat permintaan titip barang |
| `POST` | `/api/permintaan/antar` | Buat permintaan antar barang |
| `GET` | `/api/permintaan` | List permintaan (filter: userId, status, jenis) |
| `GET` | `/api/permintaan/:id` | Detail permintaan + riwayat status |

### 🚴 Kurir
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/kurir/dashboard` | Dashboard kurir (shift, honor, tugas) |
| `POST` | `/api/kurir/shift` | Toggle aktif/nonaktif shift |
| `POST` | `/api/kurir/ambil-tugas` | Ambil tugas dari antrean |
| `POST` | `/api/kurir/update-status` | Update status pengiriman |

### 🤝 Serah Terima
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/serah-terima/verify` | Verifikasi OTP 4 digit + catat honor + tandai Terkirim |

### ⭐ Rating & Laporan
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/rating` | Kirim ulasan bintang + tag + komentar |
| `POST` | `/api/laporan` | Lapor kehilangan/kendala |

### 👨‍💼 Admin
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/admin/dashboard` | Statistik sistem |
| `GET` | `/api/admin/pengguna` | Daftar semua pengguna |
| `POST` | `/api/admin/promosi-kurir` | Promosi mahasiswa → kurir resmi |
| `POST` | `/api/admin/tugaskan-kurir` | Tugaskan kurir ke pesanan |
| `GET` | `/api/admin/laporan` | Daftar laporan kehilangan |
| `POST` | `/api/admin/selesaikan-laporan` | Tindak lanjuti laporan |

### 📍 Master Data
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/master/lokasi` | Daftar drop point & gedung kampus |
| `GET` | `/api/master/kurir-aktif` | Daftar kurir yang sedang shift |

---

## 🗄️ Skema Database (sitab_db.json)

| Koleksi | Deskripsi | Jumlah Awal |
|---------|-----------|-------------|
| `pengguna` | Semua user (admin, mahasiswa, kurir) | 5 |
| `kurir` | Detail profil kurir tersetujui | 2 |
| `jadwal_kurir` | Jadwal shift per kurir | 3 |
| `lokasi` | Drop point & gedung kampus | 7 |
| `permintaan` | Pesanan titip/antar barang | 3 |
| `penugasan` | Riwayat penugasan kurir | 2 |
| `riwayat_status` | Log perubahan status pesanan | 5 |
| `serah_terima` | Log verifikasi OTP & foto bukti | 1 |
| `transaksi` | Rincian biaya & honor | 3 |
| `laporan_kehilangan` | Laporan kehilangan/kendala | 1 |
| `ulasan` | Rating & komentar mahasiswa | 1 |
| `notifikasi` | Notifikasi untuk tiap pengguna | 3 |
| `verifikasi_email` | Token OTP verifikasi email | 0 (kosong) |

---

## ⚙️ Aturan Bisnis (Business Rules)

| Kode | Aturan |
|------|--------|
| BR-01 | Hanya mahasiswa terdaftar & terverifikasi email yang bisa membuat permintaan |
| BR-02 | Validasi barang terlarang: narkoba, senjata, rokok, miras, uang tunai besar, bahan peledak |
| BR-03 | Kurir hanya dapat menerima tugas jika shift aktif |
| BR-04 | OTP 4 digit wajib match antara kurir dan penerima saat serah terima |
| BR-05 | Hanya satu ulasan per transaksi yang dapat diberikan |
| BR-06 | Registrasi hanya boleh menggunakan email domain `@student.unklab.ac.id` |
| BR-07 | Kurir hanya dapat ditambahkan oleh admin dari daftar mahasiswa yang sudah terdaftar |

---

## 📄 Lisensi

MIT License — Kelompok Miedal, Fakultas Ilmu Komputer UNKLAB, 2024
