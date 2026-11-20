# SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
**Sistem Manajemen Layanan Titip-Antar Logistik Internal Kampus Berbasis Web**  
*Final Project – System Analysis and Design, Fakultas Ilmu Komputer, Universitas Klabat (UNKLAB), Airmadidi*  
*Model SDLC: Agile (Scrum) · Versi SRS: 1.5 (November 2026)*

---

## 1. Tim Pengembang (Kelompok Miedal)
| NIM | Nama | Peran | Tanggung Jawab Utama |
|---|---|---|---|
| **105022410043** | **Salem, Jovitly Mike** | **Project Manager / Admin** | Koordinasi tim, inisiasi proyek, elisitasi kebutuhan, manajemen akun & dashboard admin. |
| **105022410044** | **Sanjaya, Liandy Maygiven** | **System Analyst / Kurir** | Analisis kebutuhan, perumusan BR/FR/NFR, use case description, pengujian kurir. |
| **105022410118** | **Makarewa, Miracle Evangelio** | **Quality Assurance / Dokumentasi** | Perancangan UML/ERD, penyusunan 41 skenario pengujian black-box, dokumentasi teknis. |
| **105012410026** | **Sahala, Andrew** | **Developer / UI Designer** | Desain UI Figma (L-01 s.d. L-15), implementasi HTML/CSS/JS dan logika backend Node.js. |

---

## 2. Tautan Penting
- **Prototipe Figma**: [Figma Design SiTAB (L-01 s.d. L-15)](https://www.figma.com/design/OBPLClmjdDTevSRE3gcQUi/Untitled?node-id=0-1&t=sJFdQuVdDh9cWC0a-1)
- **Repository GitHub**: [https://github.com/12410207-salem/SiTAB-Final](https://github.com/12410207-salem/SiTAB-Final)

---

## 3. Akun Bawaan (Pre-Seeded Accounts)
Semua akun default menggunakan kata sandi: `pass123`

| Peran | Nama | Email Kampus UNKLAB | Password | Status Akun | Catatan |
|---|---|---|---|---|---|
| **Administrator** | **Salem, Jovitly Mike** | `12410207@student.unklab.ac.id`<br>(alias `105022410043@student.unklab.ac.id`) | `pass123` | **Aktif** | Admin utama Kemahasiswaan & TI |
| **Kurir (Labor)** | **Samuel Anasim** | `12410208@student.unklab.ac.id` | `pass123` | **Aktif** | Kurir aktif, shift Kamis/Jum/Min |
| **Kurir (Labor)** | **Sanjaya, Liandy Maygiven** | `105022410044@student.unklab.ac.id` | `pass123` | **Aktif** | Kurir aktif mitra mahasiswa |
| **Mahasiswa** | **Makarewa, Miracle Evangelio** | `105022410118@student.unklab.ac.id` | `pass123` | **Aktif** | Mahasiswa pemesan aktif |
| **Mahasiswa** | **Sahala, Andrew** | `105012410026@student.unklab.ac.id` | `pass123` | **Aktif** | Mahasiswa pemesan |
| **Mahasiswa** | **Michelle Lumentut** | `12410601@student.unklab.ac.id` | `pass123` | **Aktif** | Mahasiswa / penerima titip loker |
| **Nonaktif (Uji)** | **Lumintang, Evangelio** | `12410999@student.unklab.ac.id` | `pass123` | **Nonaktif** | Akun dinonaktifkan (Uji TC-23) |
| **Belum Verifikasi (Uji)** | **Santoso, Abdillah** | `12410888@student.unklab.ac.id` | `pass123` | **Belum Diverifikasi** | Membutuhkan kode OTP (Uji TC-25/33) |

> **Catatan Registrasi Mahasiswa Baru**:
> Email wajib menggunakan domain resmi mahasiswa UNKLAB: `[nomor_registrasi]@student.unklab.ac.id` (misalnya `12410601@student.unklab.ac.id` atau `S2410601@student.unklab.ac.id`). Password minimal 8 karakter. Setelah mendaftar, akun berstatus `belum_diverifikasi` dan wajib memasukkan kode OTP 6-digit (berlaku 15 menit, maks. 5 percobaan).

---

## 4. Struktur Direktori Proyek
```text
SiTAB-Final/
├── data/                        # Penyimpanan Data Terstruktur (13 Entitas ERD)
│   ├── pengguna.json            # Data akun pengguna (Mahasiswa, Kurir, Admin)
│   ├── kurir.json               # Profil & status ketersediaan kurir
│   ├── jadwal_kurir.json        # Shift dan ketersediaan jam kerja kurir
│   ├── lokasi.json              # Daftar drop point & lokasi gedung di UNKLAB
│   ├── permintaan.json          # Data pengajuan titip & pesan antar
│   ├── penugasan.json           # Pemetaan penugasan kurir ke permintaan
│   ├── riwayat_status.json      # Log perubahan status pengiriman
│   ├── serah_terima.json        # Record OTP & foto bukti serah-terima
│   ├── transaksi.json           # Rekapitulasi pembayaran & rincian biaya
│   ├── laporan_kehilangan.json  # Data klaim dan laporan barang hilang
│   ├── ulasan.json              # Data rating dan ulasan kinerja kurir
│   ├── notifikasi.json          # Log notifikasi sistem ke pengguna
│   └── verifikasi_email.json    # Record kode OTP 6-digit & expire time
│
├── public/                      # Front-End Assets & UI (15 Layar: L-01 s.d. L-15)
│   ├── css/
│   │   └── style.css            # Desain kustom responsif mobile-first sesuai Figma
│   ├── js/
│   │   ├── app.js               # Kontrol DOM, routing dinamis & request API
│   │   └── auth.js              # Manajemen autentikasi, sesi & demo role switcher
│   ├── uploads/                 # Media & foto bukti serah terima / barang
│   ├── index.html               # Halaman Login (L-01), Registrasi (L-13), Verif (L-14), Regis Kurir (L-15)
│   ├── dashboard.html           # Dashboard Mahasiswa (L-02), Kurir (L-08), Admin (L-12)
│   ├── titip.html               # Form Titip Barang (L-03) & Form Pesan Antar (L-04)
│   └── track.html               # Lacak Status (L-05), Notifikasi (L-06), Riwayat (L-07), OTP (L-09), Lapor (L-10), Rating (L-11)
│
├── controllers.js               # Kelas Controller Logika Bisnis & Entity Managers
├── bcrypt.js                    # Implementasi murni algoritma hashing Bcrypt ($2a$10$) zero-dependency
├── lib/                         # Modul pendukung
│   └── email.js                 # Layanan email OTP (SMTP & local test mode simulator)
├── server.js                    # Entry point server backend Node.js (Zero-dependency REST API)
├── start.bat                    # Script eksekusi instan untuk Windows
├── test_logic.js                # Otomatisasi pengujian 41 kasus uji black-box (TC-01 s.d. TC-41)
├── test_e2e_http.js             # Otomatisasi 18 skenario pengujian integrasi HTTP REST API penuh
├── package.json                 # Konfigurasi dependensi dan skrip proyek
└── README.md                    # Dokumentasi lengkap sistem
```

---

## 5. Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js**: Versi v16 atau lebih baru (v24 teruji lancar).
- Tidak membutuhkan `npm install` pihak ketiga (menggunakan Node.js native standard library sehingga zero-dependency, sangat cepat, dan bebas error native module di Windows!).

### Menjalankan Server
1. **Melalui File Batch (Windows)**:
   Klik ganda pada file `start.bat` atau jalankan di CMD/PowerShell:
   ```cmd
   start.bat
   ```
2. **Melalui Command Line**:
   ```bash
   node server.js
   ```
3. **Buka Browser**:
   Akses: [http://localhost:3000](http://localhost:3000)

### Menjalankan Pengujian Otomatis

1. **Pengujian Logika Bisnis & 41 Kasus Uji SRS (TC-01 s.d. TC-41)**:
   ```bash
   node test_logic.js
   ```
   *Hasil pengujian menampilkan 41 kasus uji `[PASS]` (100% lulus) memvalidasi seluruh ketentuan bisnis SRS.*

2. **Pengujian Integrasi End-to-End HTTP REST API**:
   ```bash
   node test_e2e_http.js
   ```
   *Hasil pengujian menampilkan 18 skenario integrasi API `[PASS]` mencakup upload foto nyata, registrasi, OTP email, login 3 role, penitipan, pemesanan kurir, serah-terima OTP, rating, laporan kehilangan, dan dashboard admin.*

3. **Menjalankan Seluruh Pengujian Sekaligus**:
   ```bash
   npm test
   npm run test:e2e
   ```

---

## 6. Cakupan 15 Layar Antarmuka (L-01 s.d. L-15)
1. **L-01: Login Pengguna** (SSO Kampus UNKLAB, demo pills switcher, validasi kredensial Bcrypt & status).
2. **L-02: Dashboard Mahasiswa** (Salam pengguna, banner pesanan aktif, quick card titip & antar, utilisasi loker GK1).
3. **L-03: Form Titip Barang** (Pilihan drop point loker, upload foto fisik asli tersimpan ke server, larangan barang berbahaya BR-02).
4. **L-04: Form Pesan Antar** (Rute jemput -> tujuan, estimasi waktu 10-15 mnt, tarif Rp5.000, ringkasan tunai).
5. **L-05: Lacak Status Barang** (Timeline real-time: Menunggu -> Dijemput -> Dalam Perjalanan -> Terkirim, info kurir, OTP 4-digit, SLA 60 menit).
6. **L-06: Notifikasi** (Pusat notifikasi status pengiriman, drop point & serah terima dengan tanda dibaca).
7. **L-07: Riwayat Transaksi** (Tab filter: Semua / Titip / Antar, detail biaya/honor, status resi).
8. **L-08: Dashboard Kurir** (Toggle switch shift aktif, total honor minggu ini, tugas aktif & selesai, jadwal shift).
9. **L-09: Verifikasi Serah-Terima** (Layar mandiri & modal: input OTP 4 digit penerima, upload foto bukti fisik asli).
10. **L-10: Lapor Kehilangan** (Pilih nomor pesanan, kronologi kejadian, eskalasi otomatis 2x24 jam BR-08).
11. **L-11: Beri Rating dan Ulasan** (Rating bintang 1-5, chip kesan: Tepat Waktu / Ramah / Barang Aman, komentar).
12. **L-12: Dashboard Administrator** (Statistik 4 metrik, tabel transaksi, penugasan kurir manual/otomatis, verifikasi kurir labor, tindak lanjut kehilangan, manajemen pengguna).
13. **L-13: Registrasi Mahasiswa** (Validasi email `@student.unklab.ac.id`, nomor telepon, password hash Bcrypt $2a$10$).
14. **L-14: Verifikasi Email** (Input OTP 6-digit email kampus, batas 15 menit & 5 percobaan, kirim ulang kode, simulator OTP lokal).
15. **L-15: Registrasi Mahasiswa Kurir (Labor)** (Jadwal shift kerja, persetujuan kode etik kurir, approval admin).
