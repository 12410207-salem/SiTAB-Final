// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// app.js — Dynamic View Controller & UI Interaction Engine (L-01 to L-15)
// ============================================================================

const App = {
  currentScreen: 'screen-login',
  currentUser: null,
  activeOrder: null,
  locations: [],
  orderFilter: 'Semua',

  // Escape teks dari pengguna sebelum disisipkan ke innerHTML (cegah XSS & tampilan rusak)
  esc(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Sesi dari login memakai `peran`, sesi dari localStorage memakai `role`; satukan di sini.
  roleOf(user) {
    return user ? (user.role || user.peran || '') : '';
  },

  // Simpan user login dengan kedua properti (peran & role) agar konsisten di semua layar.
  setCurrentUser(user) {
    this.currentUser = user ? { ...user, role: user.peran || user.role } : null;
    return this.currentUser;
  },

  async init() {
    this.setCurrentUser(Auth.getUser());
    this.bindGlobalEvents();
    await this.loadLocations();

    // Screen navigator dropdown
    const selectNav = document.getElementById('screen-navigator-select');
    if (selectNav) {
      selectNav.addEventListener('change', (e) => {
        this.navigateTo(e.target.value);
      });
    }

    // Toggle Desktop / Mobile frame view
    const toggleViewBtn = document.getElementById('btn-toggle-view');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', () => {
        document.body.classList.toggle('desktop-mode');
        const isDesktop = document.body.classList.contains('desktop-mode');
        toggleViewBtn.textContent = isDesktop ? '📱 Mode Mobile (Figma)' : '💻 Mode Desktop';
      });
    }

    // Hash routing listener for L-01 to L-15
    window.addEventListener('hashchange', () => this.handleHashRoute());

    // Check if initial hash is set in URL
    if (window.location.hash) {
      this.handleHashRoute();
    } else if (this.currentUser) {
      this.updateUserBadge(this.currentUser);
      this.updateRolePillHighlights(this.roleOf(this.currentUser));
      if (this.roleOf(this.currentUser) === 'administrator') {
        this.navigateTo('screen-admin');
      } else if (this.roleOf(this.currentUser) === 'kurir') {
        this.navigateTo('screen-kurir');
      } else {
        this.navigateTo('screen-mahasiswa');
      }
    } else {
      this.navigateTo('screen-login');
      Auth.fillDemo('mahasiswa');
    }

    this.checkNotifications();
  },

  showToast(msg) {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  },

  // One-click quick role switcher from top bar
  async quickSwitchRole(role) {
    let targetEmail = '105022410118@student.unklab.ac.id'; // Mahasiswa: Makarewa
    let targetName = 'Makarewa, Miracle Evangelio';
    let targetRole = 'mahasiswa';
    let targetScreen = 'screen-mahasiswa';

    if (role === 'kurir') {
      targetEmail = '12410208@student.unklab.ac.id'; // Kurir: Daniel Rantung
      targetName = 'Daniel Rantung';
      targetRole = 'kurir';
      targetScreen = 'screen-kurir';
    } else if (role === 'admin') {
      targetEmail = '12410207@student.unklab.ac.id'; // Admin: Salem
      targetName = 'Salem, Jovitly Mike';
      targetRole = 'administrator';
      targetScreen = 'screen-admin';
    }

    const res = await Auth.handleLogin(targetEmail, 'pass123');
    if (res.success) {
      Auth.setUser(res.user, res.user.peran);
      this.setCurrentUser(res.user);
      this.updateUserBadge(res.user);
      this.updateRolePillHighlights(res.user.peran);
      this.navigateTo(targetScreen);
      this.showToast(`Beralih ke akun ${targetRole.toUpperCase()}: ${targetName}`);
    } else {
      this.showToast('Gagal beralih peran: ' + res.message);
    }
  },

  updateRolePillHighlights(role) {
    document.querySelectorAll('.quick-role-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.role === role);
    });
  },

  handleHashRoute() {
    const hash = window.location.hash.replace('#', '').trim();
    if (!hash) return;

    const screenMap = {
      'L-01': 'screen-login',
      'L-02': 'screen-mahasiswa',
      'L-03': 'screen-titip',
      'L-04': 'screen-pesan-antar',
      'L-05': 'screen-lacak',
      'L-06': 'screen-notifikasi',
      'L-07': 'screen-riwayat',
      'L-08': 'screen-kurir',
      'L-09': 'screen-serah-terima',
      'L-10': 'screen-lapor',
      'L-11': 'screen-rating',
      'L-12': 'screen-admin',
      'L-13': 'screen-reg-mahasiswa',
      'L-14': 'screen-verif-email',
      'L-15': 'screen-reg-kurir'
    };

    let targetScreen = screenMap[hash.toUpperCase()] || (hash.startsWith('screen-') ? hash : null);
    if (!targetScreen || !document.getElementById(targetScreen)) return;

    // Guard: layar internal hanya untuk pengguna yang sudah login & sesuai perannya.
    const publicScreens = ['screen-login', 'screen-reg-mahasiswa', 'screen-verif-email', 'screen-reg-kurir'];
    if (!publicScreens.includes(targetScreen)) {
      const role = this.roleOf(this.currentUser);
      if (!role) {
        targetScreen = 'screen-login';
      } else {
        const adminOnly = ['screen-admin'];
        const kurirOnly = ['screen-kurir', 'screen-serah-terima'];
        const mahasiswaOnly = ['screen-mahasiswa', 'screen-titip', 'screen-pesan-antar', 'screen-lacak', 'screen-riwayat', 'screen-lapor', 'screen-rating'];
        const home = role === 'administrator' ? 'screen-admin' : (role === 'kurir' ? 'screen-kurir' : 'screen-mahasiswa');
        if ((adminOnly.includes(targetScreen) && role !== 'administrator') ||
            (kurirOnly.includes(targetScreen) && role !== 'kurir') ||
            (mahasiswaOnly.includes(targetScreen) && role !== 'mahasiswa')) {
          targetScreen = home;
        }
      }
    }
    this.navigateTo(targetScreen, false);
  },

  async handleFileUpload(inputElement, previewImgId, hiddenPathId, prefix = 'foto') {
    const file = inputElement.files && inputElement.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showToast('Ukuran foto maksimal 5 MB.');
      inputElement.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.showToast('Harap pilih file gambar (JPG, PNG, WEBP).');
      inputElement.value = '';
      return;
    }

    const previewEl = document.getElementById(previewImgId);
    const hiddenEl = document.getElementById(hiddenPathId);
    const labelEl = document.getElementById(previewImgId.replace('preview', 'label'));

    if (labelEl) {
      labelEl.innerHTML = `<span style="color:var(--accent-blue);">Mengunggah foto fisik ke server...</span>`;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      if (previewEl) {
        previewEl.src = base64Data;
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64Data,
            fileName: file.name,
            prefix
          })
        });

        const data = await res.json();
        if (data.success) {
          if (hiddenEl) hiddenEl.value = data.url;
          if (previewEl) previewEl.src = data.url;
          if (labelEl) {
            labelEl.innerHTML = `✓ ${data.filename} · <span style="color:var(--primary-teal); font-weight:700;">Tersimpan di server</span>`;
          }
          this.showToast('Foto fisik berhasil diunggah ke server!');
        } else {
          this.showToast(data.message || 'Gagal mengunggah foto.');
          if (labelEl) labelEl.textContent = 'Gagal mengunggah. Ketuk untuk coba lagi.';
        }
      } catch (err) {
        console.error('Upload Error:', err);
        this.showToast('Koneksi terputus saat mengunggah foto.');
      }
    };
    reader.readAsDataURL(file);
  },

  navigateTo(screenId, updateHash = true) {
    this.currentScreen = screenId;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
    }

    if (updateHash) {
      const reverseMap = {
        'screen-login': 'L-01',
        'screen-mahasiswa': 'L-02',
        'screen-titip': 'L-03',
        'screen-pesan-antar': 'L-04',
        'screen-lacak': 'L-05',
        'screen-notifikasi': 'L-06',
        'screen-riwayat': 'L-07',
        'screen-kurir': 'L-08',
        'screen-serah-terima': 'L-09',
        'screen-lapor': 'L-10',
        'screen-rating': 'L-11',
        'screen-admin': 'L-12',
        'screen-reg-mahasiswa': 'L-13',
        'screen-verif-email': 'L-14',
        'screen-reg-kurir': 'L-15'
      };
      const code = reverseMap[screenId] || screenId;
      window.location.hash = code;
    }

    // Update screen dropdown value
    const selectNav = document.getElementById('screen-navigator-select');
    if (selectNav) {
      selectNav.value = screenId;
    }

    // Update bottom nav active state
    this.updateBottomNav(screenId);

    // Refresh data for the active screen
    if (screenId === 'screen-mahasiswa') {
      this.loadMahasiswaDashboard();
    } else if (screenId === 'screen-kurir') {
      this.loadKurirDashboard();
    } else if (screenId === 'screen-admin') {
      this.loadAdminDashboard();
    } else if (screenId === 'screen-riwayat') {
      this.loadRiwayat();
    } else if (screenId === 'screen-titip') {
      this.populateDropPoints();
    } else if (screenId === 'screen-pesan-antar') {
      this.populateAntarLocations();
    } else if (screenId === 'screen-lacak') {
      this.loadLacakScreen();
    } else if (screenId === 'screen-notifikasi') {
      this.loadNotificationsScreen();
    } else if (screenId === 'screen-serah-terima') {
      this.loadSerahTerimaScreen();
    }
  },

  updateBottomNav(screenId) {
    const bottomNav = document.querySelector('.bottom-nav');
    if (!bottomNav) return;

    const role = this.roleOf(this.currentUser);
    const items = bottomNav.querySelectorAll('.nav-item');

    // Menu bawah menyesuaikan peran: kurir punya jalan pintas ke menu Input OTP (L-09).
    const config = role === 'kurir'
      ? [
          { label: 'Beranda', target: 'screen-kurir', action: "App.navigateTo('screen-kurir')" },
          { label: 'Input OTP', target: 'screen-serah-terima', action: "App.navigateTo('screen-serah-terima')" },
          { hidden: true },
          { label: 'Keluar', target: 'screen-login', action: 'Auth.logout()' }
        ]
      : [
          { label: 'Beranda', target: 'screen-mahasiswa', action: "App.navigateTo('screen-mahasiswa')" },
          { label: 'Barang', target: 'screen-pesan-antar', action: "App.navigateTo('screen-pesan-antar')" },
          { label: 'Riwayat', target: 'screen-riwayat', action: "App.navigateTo('screen-riwayat')" },
          { label: 'Profil', target: 'screen-login', action: 'Auth.logout()' }
        ];

    items.forEach((btn, i) => {
      const c = config[i];
      if (!c) return;
      btn.style.display = c.hidden ? 'none' : '';
      if (c.hidden) return;
      btn.dataset.target = c.target;
      btn.setAttribute('onclick', c.action);
      const span = btn.querySelector('span');
      if (span) span.textContent = c.label;
    });

    const navScreens = role === 'kurir'
      ? ['screen-kurir', 'screen-serah-terima']
      : ['screen-mahasiswa', 'screen-kurir', 'screen-riwayat', 'screen-lacak'];
    if (navScreens.includes(screenId) && role && role !== 'administrator') {
      bottomNav.style.display = 'flex';
    } else {
      bottomNav.style.display = 'none';
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.target === screenId) {
        btn.classList.add('active');
      }
    });
  },

  updateUserBadge(user) {
    const nameEls = document.querySelectorAll('.user-display-name');
    const emailEls = document.querySelectorAll('.user-display-email');
    const roleEls = document.querySelectorAll('.user-display-role');

    nameEls.forEach(el => el.textContent = user.nama || user.email_kampus);
    emailEls.forEach(el => el.textContent = user.email_kampus || '');
    roleEls.forEach(el => el.textContent = user.role || user.peran || '');
  },

  async loadLocations() {
    try {
      const res = await fetch('/api/lokasi');
      const data = await res.json();
      if (data.success) {
        this.locations = data.data;
      }
    } catch (e) {
      console.error('Error fetching locations:', e);
    }
  },

  populateDropPoints() {
    const select = document.getElementById('titip-lokasi');
    if (!select) return;
    select.innerHTML = '<option value="">-- Pilih Titik Drop Point Loker --</option>';
    this.locations.forEach(loc => {
      select.innerHTML += `<option value="${loc.id_lokasi}">${loc.nama_lokasi} (${loc.jenis})</option>`;
    });
    if (this.locations.length > 0) {
      select.value = this.locations[0].id_lokasi;
    }
  },

  populateAntarLocations() {
    const asal = document.getElementById('antar-asal');
    const tujuan = document.getElementById('antar-tujuan');
    if (!asal || !tujuan) return;

    asal.innerHTML = '<option value="">-- Pilih Lokasi Penjemputan --</option>';
    tujuan.innerHTML = '<option value="">-- Pilih Lokasi Tujuan --</option>';

    this.locations.forEach(loc => {
      asal.innerHTML += `<option value="${loc.id_lokasi}">${loc.nama_lokasi}</option>`;
      tujuan.innerHTML += `<option value="${loc.id_lokasi}">${loc.nama_lokasi}</option>`;
    });

    // Default selection
    asal.value = 2; // Perpustakaan
    tujuan.value = 3; // Asrama Crystal
  },

  // ==========================================================================
  // Mahasiswa Dashboard (L-02)
  // ==========================================================================
  async loadMahasiswaDashboard() {
    if (!this.currentUser) return;
    this.updateUserBadge(this.currentUser);

    try {
      const res = await fetch(`/api/permintaan?user_id=${this.currentUser.id_pengguna}&role=mahasiswa`);
      const data = await res.json();
      if (!data.success) return;

      const items = data.data;
      const activeItem = items.find(p => p.status !== 'Terkirim');
      const banner = document.getElementById('active-order-banner');

      if (activeItem && banner) {
        banner.style.display = 'block';
        const isTitip = activeItem.jenis === 'titip';

        banner.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="order-badge">${isTitip ? 'LOKER DROP POINT AKTIF' : 'PENGIRIMAN AKTIF'} · ${activeItem.kode_resi}</div>
            <span class="badge-status badge-${activeItem.status.toLowerCase().replace(/\s+/g, '')}">${activeItem.status}</span>
          </div>
          <div class="order-heading">${App.esc(activeItem.deskripsi_barang.substring(0, 32))}</div>
          <div class="order-route">
            <span>📍 ${activeItem.lokasi_asal_nama}</span> ➔ <span>🏁 ${activeItem.lokasi_tujuan_nama}</span>
          </div>
          ${activeItem.ruangan_tujuan ? `<div style="font-size:11px; color:#93c5fd; margin-top:2px;">🏢 Ruangan/Pos: ${App.esc(activeItem.ruangan_tujuan)}</div>` : ''}
          <div class="order-footer">
            <span>OTP: <strong style="font-size:16px; letter-spacing:2px; color:#38bdf8;">${activeItem.kode_otp || '----'}</strong></span>
            <div style="display:flex; gap:8px;">
              ${isTitip ? `
                <button class="btn btn-success" style="padding:4px 10px; font-size:11px; width:auto;" onclick="App.openAmbilMandiriModal(${activeItem.id_permintaan}, '${activeItem.kode_otp}')">🔓 Ambil Mandiri</button>
              ` : ''}
              <a href="#" onclick="App.trackOrder(${activeItem.id_permintaan}); return false;">Lacak ➔</a>
            </div>
          </div>
        `;
      } else if (banner) {
        banner.style.display = 'none';
      }

      // Recent Activity List
      const listEl = document.getElementById('mhs-recent-activity');
      if (listEl) {
        if (items.length === 0) {
          listEl.innerHTML = '<p class="text-muted" style="font-size:13px; text-align:center; padding:12px;">Belum ada aktivitas transaksi.</p>';
        } else {
          listEl.innerHTML = items.slice(0, 4).map(it => {
            const isTitip = it.jenis === 'titip';
            const isDone = it.status === 'Terkirim';
            return `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #e2e8f0;">
                <div>
                  <div style="font-size:14px; font-weight:700;">${App.esc(it.deskripsi_barang.substring(0, 25))}</div>
                  <div style="font-size:12px; color:#64748b;">${it.kode_resi} · ${it.lokasi_asal_nama} ➔ ${it.lokasi_tujuan_nama}</div>
                  <div style="font-size:11px; color:#0284c7;">${isTitip ? 'Titip Loker Drop Point' : 'Pesan Antar Kurir'}</div>
                </div>
                <div style="text-align:right;">
                  <span class="badge-status badge-${it.status.toLowerCase().replace(/\s+/g, '')}">${isDone ? 'Selesai' : it.status}</span>
                  ${isTitip && !isDone ? `
                    <div style="margin-top:4px;">
                      <button class="btn btn-outline" style="padding:2px 8px; font-size:10px;" onclick="App.openAmbilMandiriModal(${it.id_permintaan}, '${it.kode_otp}')">Ambil</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================================================
  // Kurir Dashboard (L-08)
  // ==========================================================================
  async loadKurirDashboard() {
    if (!this.currentUser) return;
    this.updateUserBadge(this.currentUser);

    try {
      const res = await fetch(`/api/permintaan?user_id=${this.currentUser.id_pengguna}&role=kurir`);
      const data = await res.json();
      if (!data.success) return;

      const items = data.data;
      const taskContainer = document.getElementById('kurir-tasks-container');
      if (!taskContainer) return;

      const activeTasks = items.filter(p => p.status !== 'Terkirim');
      const completedTasks = items.filter(p => p.status === 'Terkirim');

      // Update Honor display
      const honorCount = completedTasks.length * 5000;
      const honorEl = document.getElementById('kurir-honor-val');
      if (honorEl) {
        honorEl.textContent = `Rp${honorCount.toLocaleString('id-ID')}`;
      }

      if (activeTasks.length === 0) {
        taskContainer.innerHTML = '<p class="text-muted" style="font-size:13px; text-align:center; padding:16px; background:#fff; border-radius:12px;">Tidak ada pengantaran aktif saat ini. Anda dapat menunggu pesanan baru masuk dari mahasiswa.</p>';
      } else {
        taskContainer.innerHTML = activeTasks.map(task => `
          <div class="card" style="margin-bottom:12px; border-left:4px solid var(--primary-teal);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; color:var(--primary-navy);">${task.kode_resi}</span>
              <span class="badge-status badge-${task.status.toLowerCase().replace(/\s+/g, '')}">${task.status}</span>
            </div>
            <div style="font-size:14px; font-weight:700; margin-top:6px;">${App.esc(task.deskripsi_barang)}</div>
            <div style="font-size:12px; color:#475569; margin-top:6px; line-height:1.6;">
              <div>📍 <strong>Jemput:</strong> ${task.lokasi_asal_nama}</div>
              <div>🏁 <strong>Antar ke:</strong> ${task.lokasi_tujuan_nama}</div>
              ${task.ruangan_tujuan ? `<div style="color:#0284c7;">🏢 <strong>Ruangan/Pos:</strong> ${App.esc(task.ruangan_tujuan)}</div>` : ''}
              <div>👤 <strong>Penerima:</strong> ${App.esc(task.nama_penerima || 'Penerima')} (${App.esc(task.pemesan_nama || 'Pemesan')})</div>
            </div>
            <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
              ${task.status === 'Menunggu' ? `
                <button class="btn btn-primary" style="padding:8px 14px; font-size:12px;" onclick="App.updateKurirStatus(${task.id_permintaan}, 'Dijemput')">🚴 1. Jemput Barang di ${task.lokasi_asal_nama}</button>
              ` : ''}
              ${task.status === 'Dijemput' ? `
                <button class="btn btn-primary" style="padding:8px 14px; font-size:12px;" onclick="App.updateKurirStatus(${task.id_permintaan}, 'Dalam Perjalanan')">🚀 2. Mulai Antar ke Ruangan/Pos</button>
              ` : ''}
              ${task.status === 'Dalam Perjalanan' ? `
                <button class="btn btn-success" style="padding:8px 14px; font-size:12px;" onclick="App.openSerahTerimaModal(${task.id_permintaan}, '${task.kode_otp}')">✅ 3. Tiba di Lokasi & Input OTP Penerima</button>
              ` : ''}
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================================================
  // Admin Dashboard (L-12)
  // ==========================================================================
  async loadAdminDashboard() {
    this.updateUserBadge(this.currentUser || { nama: 'Salem, Jovitly Mike', peran: 'administrator' });

    try {
      // 1. Stats
      const statRes = await fetch('/api/admin/dashboard');
      const statData = await statRes.json();
      if (statData.success) {
        document.getElementById('admin-stat-transaksi').textContent = statData.data.totalTransaksi;
        document.getElementById('admin-stat-kurir').textContent = statData.data.kurirOnDuty;
        document.getElementById('admin-stat-loker').textContent = statData.data.utilisasiLoker;
        document.getElementById('admin-stat-laporan').textContent = statData.data.laporanPending;
      }

      // 2. Orders Table
      const orderRes = await fetch('/api/permintaan');
      const orderData = await orderRes.json();
      if (orderData.success) {
        let list = orderData.data;

        // Apply tab filter
        if (this.orderFilter === 'Menunggu') {
          list = list.filter(p => p.status === 'Menunggu');
        } else if (this.orderFilter === 'Proses') {
          list = list.filter(p => p.status === 'Dijemput' || p.status === 'Dalam Perjalanan');
        } else if (this.orderFilter === 'Selesai') {
          list = list.filter(p => p.status === 'Terkirim');
        } else if (this.orderFilter === 'Titip') {
          list = list.filter(p => p.jenis === 'titip');
        } else if (this.orderFilter === 'Antar') {
          list = list.filter(p => p.jenis === 'antar');
        }

        const tbody = document.getElementById('admin-table-orders');
        if (tbody) {
          if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:16px; color:#64748b;">Tidak ada pesanan pada filter ini.</td></tr>';
          } else {
            tbody.innerHTML = list.map(p => `
              <tr>
                <td><strong>${p.kode_resi}</strong><br><span style="font-size:10px; color:#64748b;">${p.jenis === 'titip' ? '📦 Titip Loker' : '✈️ Pesan Antar'}</span></td>
                <td>${App.esc(p.pemesan_nama)}<br><span style="font-size:10px; color:#64748b;">${App.esc(p.pemesan_email)}</span></td>
                <td>${p.lokasi_asal_nama} ➔ ${p.lokasi_tujuan_nama}${p.ruangan_tujuan ? `<br><span style="font-size:10px; color:#0284c7;">(${App.esc(p.ruangan_tujuan)})</span>` : ''}</td>
                <td>${p.kurir ? App.esc(p.kurir.nama) : '<span style="color:#b45309; font-size:11px;">Belum Ditugaskan</span>'}</td>
                <td><span class="badge-status badge-${p.status.toLowerCase().replace(/\s+/g, '')}">${p.status}</span></td>
                <td>
                  <div style="display:flex; gap:4px;">
                    ${p.status === 'Menunggu' && p.jenis === 'antar' ? `
                      <button class="btn btn-outline" style="padding:4px 8px; font-size:11px;" onclick="App.openAssignModal(${p.id_permintaan})">Tugaskan Kurir</button>
                    ` : ''}
                    <button class="btn btn-outline" style="padding:4px 8px; font-size:11px;" onclick="App.openOrderDetailModal(${p.id_permintaan})">Detail</button>
                  </div>
                </td>
              </tr>
            `).join('');
          }
        }
      }

      // 3. Couriers Tab
      const kurirRes = await fetch('/api/admin/kurir');
      const kurirData = await kurirRes.json();
      if (kurirData.success) {
        const pendingBox = document.getElementById('admin-kurir-pending');
        const listTbody = document.getElementById('admin-kurir-table');

        const pending = kurirData.data.filter(k => k.status_verifikasi === 'menunggu_verifikasi');
        if (pendingBox) {
          if (pending.length === 0) {
            pendingBox.innerHTML = '<p class="text-muted" style="font-size:12px; padding:8px;">Tidak ada pengajuan kurir yang menunggu verifikasi saat ini.</p>';
          } else {
            pendingBox.innerHTML = pending.map(k => `
              <div class="card" style="margin-bottom:10px; padding:14px; background:#f8fafc; border:1px solid #cbd5e1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-size:15px; color:var(--primary-navy);">${App.esc(k.nama)}</strong>
                  <span class="badge-status badge-menunggu">Menunggu Verifikasi</span>
                </div>
                <div style="font-size:12px; color:#475569; margin:6px 0;">
                  <div>Email: ${App.esc(k.email_kampus)} · Telp: ${App.esc(k.no_hp)}</div>
                  <div>Shift Ketersediaan: <strong>${k.jadwal.map(j => `${j.hari} (${j.jam_mulai}–${j.jam_selesai} WITA)`).join(', ')}</strong></div>
                  <div>Kode Etik: <span style="color:#15803d; font-weight:700;">✓ Disetujui</span></div>
                </div>
                <div style="margin-top:10px; display:flex; gap:8px;">
                  <button class="btn btn-success" style="padding:6px 14px; font-size:12px; width:auto;" onclick="App.verifikasiKurir(${k.id_kurir}, 'setujui')">✅ Setujui Jadi Kurir</button>
                  <button class="btn btn-danger" style="padding:6px 14px; font-size:12px; width:auto;" onclick="App.verifikasiKurir(${k.id_kurir}, 'tolak')">❌ Tolak Pengajuan</button>
                </div>
              </div>
            `).join('');
          }
        }

        if (listTbody) {
          listTbody.innerHTML = kurirData.data.map(k => `
            <tr>
              <td><strong>${App.esc(k.nama)}</strong><br><span style="font-size:10px; color:#64748b;">${App.esc(k.email_kampus)}</span></td>
              <td>⭐ ${k.rating_rata}</td>
              <td>
                <select onchange="App.toggleKurirDuty(${k.id_kurir}, this.value)" style="font-size:11px; padding:2px 6px; border-radius:6px; border:1px solid #cbd5e1;">
                  <option value="tersedia" ${k.status_ketersediaan === 'tersedia' ? 'selected' : ''}>Tersedia</option>
                  <option value="bertugas" ${k.status_ketersediaan === 'bertugas' ? 'selected' : ''}>Bertugas</option>
                  <option value="tidak tersedia" ${k.status_ketersediaan === 'tidak tersedia' ? 'selected' : ''}>Tidak Tersedia</option>
                </select>
              </td>
              <td><span class="badge-status badge-${k.status_verifikasi === 'disetujui' ? 'aktif' : 'ditolak'}">${k.status_verifikasi}</span></td>
            </tr>
          `).join('');
        }
      }

      // 4. Reports Tab
      const repRes = await fetch('/api/laporan');
      const repData = await repRes.json();
      if (repData.success) {
        const repTbody = document.getElementById('admin-table-reports');
        if (repTbody) {
          if (repData.data.length === 0) {
            repTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:#64748b;">Tidak ada laporan kehilangan saat ini.</td></tr>';
          } else {
            repTbody.innerHTML = repData.data.map(l => `
              <tr>
                <td><strong>${l.kode_resi}</strong></td>
                <td>${App.esc(l.pelapor_nama)}</td>
                <td>${App.esc(l.deskripsi)}</td>
                <td><span class="badge-status badge-${l.status === 'selesai' ? 'aktif' : 'menunggu'}">${l.status}</span></td>
                <td>
                  ${l.status !== 'selesai' ? `
                    <button class="btn btn-primary" style="padding:4px 10px; font-size:11px;" onclick="App.openFollowupModal(${l.id_laporan})">🔍 Tindak Lanjuti</button>
                  ` : `<span style="font-size:11px; color:#15803d; font-weight:600;">Selesai: ${App.esc(l.tindak_lanjut || '-')}</span>`}
                </td>
              </tr>
            `).join('');
          }
        }
      }

      // 5. Users Tab
      const usrRes = await fetch('/api/admin/pengguna');
      const usrData = await usrRes.json();
      if (usrData.success) {
        const usrTbody = document.getElementById('admin-table-users');
        if (usrTbody) {
          usrTbody.innerHTML = usrData.data.map(u => `
            <tr>
              <td><strong>${App.esc(u.nama)}</strong></td>
              <td>${App.esc(u.email_kampus)}</td>
              <td><span style="text-transform:capitalize; font-weight:600;">${u.peran}</span></td>
              <td><span class="badge-status badge-${u.status_akun}">${u.status_akun}</span></td>
              <td>
                <div style="display:flex; gap:4px;">
                  <button class="btn btn-outline" style="padding:4px 8px; font-size:11px;" onclick="App.toggleUserStatus(${u.id_pengguna}, '${u.status_akun === 'aktif' ? 'nonaktif' : 'aktif'}')">
                    ${u.status_akun === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  ${u.status_akun === 'belum_diverifikasi' ? `
                    <button class="btn btn-success" style="padding:4px 8px; font-size:11px;" onclick="App.toggleUserStatus(${u.id_pengguna}, 'aktif')">Verifikasi</button>
                  ` : ''}
                </div>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  setOrderFilter(filter) {
    this.orderFilter = filter;
    document.querySelectorAll('.filter-chip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.loadAdminDashboard();
  },

  // ==========================================================================
  // Tracking Screen (L-05)
  // ==========================================================================
  async trackOrder(orderId) {
    this.activeOrder = orderId;
    this.navigateTo('screen-lacak');
  },

  async loadLacakScreen() {
    const container = document.getElementById('lacak-content-wrapper');
    if (!container) return;

    let targetId = this.activeOrder;
    if (!targetId) {
      // Find latest order for this user
      const res = await fetch(`/api/permintaan?user_id=${this.currentUser ? this.currentUser.id_pengguna : 5}&role=mahasiswa`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        targetId = data.data[0].id_permintaan;
      }
    }

    if (!targetId) {
      container.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px;">Belum ada pesanan aktif untuk dilacak.</p>';
      return;
    }

    try {
      const res = await fetch(`/api/permintaan/${targetId}`);
      const data = await res.json();
      if (!data.success) {
        container.innerHTML = '<p class="text-danger" style="text-align:center; padding:20px;">Pesanan tidak ditemukan.</p>';
        return;
      }

      const p = data.permintaan;
      const isTitip = p.jenis === 'titip';
      const steps = isTitip 
        ? ['Menunggu', 'Terkirim']
        : ['Menunggu', 'Dijemput', 'Dalam Perjalanan', 'Terkirim'];
      
      const stepLabels = isTitip
        ? ['Tersimpan di Loker Drop Point', 'Selesai (Telah Diambil Mandiri)']
        : ['Pesanan Dibuat', 'Dijemput Kurir', 'Menuju Ruangan/Pos Tujuan', 'Terkirim & Selesai'];

      const currentIdx = steps.indexOf(p.status);

      container.innerHTML = `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:24px; font-weight:800; color:var(--primary-navy);">${p.kode_resi}</h2>
            <span class="badge-status badge-${p.status.toLowerCase().replace(/\s+/g, '')}">${p.status === 'Terkirim' ? 'Selesai' : p.status}</span>
          </div>
          <p style="font-size:13px; color:#475569; font-weight:600;">${App.esc(p.deskripsi_barang)}</p>
        </div>

        <div class="card card-navy">
          <div class="order-badge">${isTitip ? 'TITIP LOKER DROP POINT' : 'PENGANTARAN KURIR KAMPUS'}</div>
          <div style="font-size:18px; font-weight:800; margin:4px 0;">
            ${p.status === 'Terkirim' ? 'Transaksi Selesai' : (isTitip ? 'Siap Diambil di Loker' : 'Tiba sekitar 10–15 Menit')}
          </div>
          <div style="font-size:13px; color:#cbd5e1;">${p.lokasi_asal} ➔ ${p.lokasi_tujuan}</div>
          ${p.ruangan_tujuan ? `<div style="font-size:12px; color:#93c5fd; margin-top:4px;">🏢 Ruangan/Pos: ${App.esc(p.ruangan_tujuan)}</div>` : ''}
        </div>

        <div class="card">
          <h4 style="font-size:14px; font-weight:700; margin-bottom:12px;">Alur Status Pengiriman</h4>
          <div class="timeline">
            ${steps.map((st, i) => {
              const isDone = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return `
                <div class="timeline-step ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                  <div class="step-marker">${isDone ? '✓' : (i + 1)}</div>
                  <div class="step-content">
                    <div class="step-title">${stepLabels[i] || st}</div>
                    <div class="step-time">${isDone ? 'Tercatat dalam sistem' : 'Menunggu tahapan'}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${!isTitip && p.kurir ? `
          <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:700;">Kurir Mahasiswa Penanggung Jawab</div>
              <div style="font-size:15px; font-weight:800; color:var(--primary-navy);">${App.esc(p.kurir.nama)}</div>
              <div style="font-size:12px; color:#64748b;">⭐ ${p.kurir.rating_rata} · Mitra Labor Kampus</div>
            </div>
            <a href="tel:${p.kurir.no_hp || '0812'}" class="btn btn-outline" style="padding:8px 12px; border-radius:50%; font-size:14px;">📞</a>
          </div>
        ` : ''}

        ${p.status !== 'Terkirim' && p.kode_otp ? `
          <div class="card" style="text-align:center; border:2px dashed var(--primary-teal); background:#f0fdf4;">
            <div style="font-size:13px; font-weight:800; color:var(--primary-navy);">
              ${isTitip ? 'Kode OTP Pengambilan Mandiri Loker:' : 'Kode OTP Serah-Terima Anda:'}
            </div>
            <div class="otp-inputs" style="margin:12px 0;">
              ${p.kode_otp.split('').map(d => `<div class="otp-digit" style="line-height:60px; font-size:28px;">${d}</div>`).join('')}
            </div>
            <p style="font-size:12px; color:#166534; font-weight:600;">
              ${isTitip 
                ? 'Gunakan kode OTP 4 digit ini untuk membuka loker dan mengambil barang Anda kembali.' 
                : 'Berikan kode OTP 4 digit ini kepada Kurir setelah barang diterima di ruangan/pos Anda.'}
            </p>
            ${isTitip ? `
              <button class="btn btn-success" style="margin-top:12px;" onclick="App.openAmbilMandiriModal(${p.id_permintaan}, '${p.kode_otp}')">🔓 Konfirmasi Ambil Mandiri Sekarang</button>
            ` : ''}
          </div>
        ` : ''}

        ${p.status === 'Terkirim' ? `
          <div class="card" style="text-align:center; background:#ecfdf5; border-color:#a7f3d0;">
            <span style="font-size:32px;">🎉</span>
            <div style="font-size:16px; font-weight:800; color:#065f46; margin-top:4px;">
              ${isTitip ? 'Barang Telah Diambil Mandiri!' : 'Pengantaran Berhasil Diserahkan!'}
            </div>
            <p style="font-size:12px; color:#047857; margin-top:2px;">Serah terima telah tervalidasi dengan kode OTP resmi.</p>
          </div>
        ` : ''}

        <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
          ${!isTitip && p.status === 'Terkirim' && !p.sudah_diulas ? `
            <button class="btn btn-success" onclick="App.openRatingModal(${p.id_permintaan})">⭐ Beri Rating & Ulasan Kurir</button>
          ` : ''}
          <button class="btn btn-outline" style="color:#dc2626; border-color:#fee2e2;" onclick="App.openLaporModal(${p.id_permintaan})">⚠️ Lapor Kehilangan / Masalah</button>
        </div>
      `;
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================================================
  // Transaction History (L-07)
  // ==========================================================================
  async loadRiwayat(filter = 'Semua') {
    const listEl = document.getElementById('riwayat-list-container');
    if (!listEl) return;

    try {
      const res = await fetch(`/api/permintaan?user_id=${this.currentUser ? this.currentUser.id_pengguna : 5}&role=mahasiswa`);
      const data = await res.json();
      if (!data.success) return;

      let items = data.data;
      if (filter === 'Titip') {
        items = items.filter(i => i.jenis === 'titip');
      } else if (filter === 'Antar') {
        items = items.filter(i => i.jenis === 'antar');
      }

      if (items.length === 0) {
        listEl.innerHTML = '<p class="text-muted" style="text-align:center; padding:30px;">Tidak ada riwayat transaksi pada filter ini.</p>';
        return;
      }

      listEl.innerHTML = items.map(it => {
        const isTitip = it.jenis === 'titip';
        const isDone = it.status === 'Terkirim';
        return `
          <div class="card" style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:15px; font-weight:800; color:var(--primary-navy);">${App.esc(it.deskripsi_barang.substring(0, 30))}</div>
                <div style="font-size:12px; color:#64748b;">${it.kode_resi} · ${isTitip ? 'Titip Drop Point' : 'Pesan Antar'}</div>
              </div>
              <span class="badge-status badge-${it.status.toLowerCase().replace(/\s+/g, '')}">${isDone ? 'Selesai' : it.status}</span>
            </div>
            <div style="font-size:12px; color:#475569; margin:8px 0;">
              ${it.lokasi_asal_nama} ➔ ${it.lokasi_tujuan_nama}
              ${it.ruangan_tujuan ? ` (${App.esc(it.ruangan_tujuan)})` : ''}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:8px; font-size:12px;">
              <span style="font-weight:700;">Biaya: Rp${isTitip ? '2.000' : '5.000'}</span>
              <div style="display:flex; gap:8px;">
                ${isTitip && !isDone ? `
                  <button class="btn btn-outline" style="padding:2px 8px; font-size:11px;" onclick="App.openAmbilMandiriModal(${it.id_permintaan}, '${it.kode_otp}')">Ambil Mandiri</button>
                ` : ''}
                <a href="#" onclick="App.trackOrder(${it.id_permintaan}); return false;" style="color:var(--primary-teal); font-weight:700; text-decoration:none;">Detail ➔</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
    }
  },

  // ==========================================================================
  // Notifications Modal (L-06)
  // ==========================================================================
  async checkNotifications() {
    if (!this.currentUser) return;
    try {
      const res = await fetch(`/api/notifikasi?user_id=${this.currentUser.id_pengguna}`);
      const data = await res.json();
      if (data.success) {
        const unread = data.data.filter(n => !n.sudah_dibaca).length;
        document.querySelectorAll('.notif-badge').forEach(b => {
          b.textContent = unread;
          b.style.display = unread > 0 ? 'inline-flex' : 'none';
        });
      }
    } catch (e) {}
  },

  async openNotifications() {
    if (!this.currentUser) return;
    const modal = document.getElementById('modal-notifications');
    const container = document.getElementById('modal-notif-list');
    if (!modal || !container) return;

    try {
      const res = await fetch(`/api/notifikasi?user_id=${this.currentUser.id_pengguna}`);
      const data = await res.json();
      if (data.success) {
        if (data.data.length === 0) {
          container.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px;">Tidak ada notifikasi.</p>';
        } else {
          container.innerHTML = data.data.map(n => `
            <div style="padding:10px 0; border-bottom:1px solid #e2e8f0; display:flex; gap:10px; align-items:flex-start;">
              <span style="font-size:18px;">🔔</span>
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:${n.sudah_dibaca ? '500' : '700'};">${App.esc(n.pesan)}</div>
                <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${new Date(n.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA</div>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (e) {}

    modal.classList.add('active');
  },

  async loadNotificationsScreen() {
    const container = document.getElementById('full-screen-notif-list');
    if (!container) return;
    if (!this.currentUser) {
      container.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px;">Silakan login terlebih dahulu untuk melihat notifikasi.</p>';
      return;
    }

    try {
      const res = await fetch(`/api/notifikasi?user_id=${this.currentUser.id_pengguna}`);
      const data = await res.json();
      if (!data.success || data.data.length === 0) {
        container.innerHTML = '<div class="card" style="text-align:center; padding:30px;"><div style="font-size:32px; margin-bottom:8px;">🔔</div><div style="font-size:15px; font-weight:700; color:var(--text-main);">Belum Ada Notifikasi</div><p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Semua aktivitas transaksi dan operasional Anda akan muncul di sini.</p></div>';
        return;
      }

      container.innerHTML = data.data.map(n => {
        const timeStr = new Date(n.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA';
        const dateStr = new Date(n.waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `
          <div class="card" style="padding:14px; background:${n.sudah_dibaca ? '#ffffff' : '#f0fdf4'}; border-left:4px solid ${n.sudah_dibaca ? '#cbd5e1' : 'var(--primary-teal)'};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
              <div style="font-size:22px;">${n.pesan.includes('selesai') || n.pesan.includes('berhasil') ? '🎉' : (n.pesan.includes('kurir') ? '🛵' : '📦')}</div>
              <div style="flex:1;">
                <div style="font-size:13px; font-weight:${n.sudah_dibaca ? '600' : '800'}; color:var(--text-main); line-height:1.4;">${App.esc(n.pesan)}</div>
                <div style="font-size:11px; color:#94a3b8; margin-top:4px;">${dateStr} · ${timeStr}</div>
              </div>
              ${n.id_permintaan ? `
                <button class="btn btn-outline" style="padding:2px 8px; font-size:10px; width:auto; white-space:nowrap;" onclick="App.trackOrder(${n.id_permintaan})">Lacak ➔</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async markAllNotificationsRead() {
    if (!this.currentUser) return;
    try {
      const res = await fetch(`/api/notifikasi?user_id=${this.currentUser.id_pengguna}`);
      const data = await res.json();
      if (data.success) {
        for (const n of data.data.filter(it => !it.sudah_dibaca)) {
          await fetch('/api/notifikasi/baca', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_notifikasi: n.id_notifikasi })
          });
        }
        this.showToast('Seluruh notifikasi ditandai telah dibaca.');
        this.loadNotificationsScreen();
        this.checkNotifications();
      }
    } catch (e) {}
  },

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  },

  // ==========================================================================
  // Titip Barang: Ambil Mandiri Modal Handler
  // ==========================================================================
  openAmbilMandiriModal(id_permintaan, knownOtp) {
    const modal = document.getElementById('modal-ambil-mandiri');
    document.getElementById('modal-am-id').value = id_permintaan;
    const otpInput = document.getElementById('modal-am-otp');
    otpInput.value = '';
    
    const helperBox = document.getElementById('modal-am-helper');
    if (helperBox) {
      helperBox.innerHTML = `Kode OTP loker Anda: <strong style="font-size:16px; color:var(--primary-teal);">${knownOtp || '----'}</strong> <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:10px; width:auto; display:inline-block; margin-left:8px;" onclick="document.getElementById('modal-am-otp').value='${knownOtp}'">Gunakan OTP Ini</button>`;
    }

    if (modal) modal.classList.add('active');
  },

  async submitAmbilMandiri() {
    const id_permintaan = document.getElementById('modal-am-id').value;
    const otp = document.getElementById('modal-am-otp').value;

    if (!otp) {
      this.showToast('Masukkan kode OTP pengambilan.');
      return;
    }

    const res = await fetch('/api/permintaan/serah-terima', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_permintaan,
        kode_otp: otp,
        id_pengubah: this.currentUser ? this.currentUser.id_pengguna : 5
      })
    });

    const data = await res.json();
    if (data.success) {
      this.showToast(data.message || 'Pengambilan mandiri berhasil diverifikasi!');
      this.closeModal('modal-ambil-mandiri');
      this.loadMahasiswaDashboard();
      if (this.currentScreen === 'screen-lacak') {
        this.loadLacakScreen();
      }
    } else {
      this.showToast(data.message || 'OTP salah.');
    }
  },

  // ==========================================================================
  // Kurir: Serah-Terima Modal Handler
  // ==========================================================================
  openSerahTerimaModal(id_permintaan, knownOtp) {
    const modal = document.getElementById('modal-serah-terima');
    document.getElementById('modal-st-id').value = id_permintaan;
    const otpInput = document.getElementById('modal-st-otp');
    otpInput.value = '';

    const helperBox = document.getElementById('modal-st-helper');
    if (helperBox) {
      helperBox.innerHTML = `Demo Hint: OTP penerima adalah <strong style="color:var(--primary-teal);">${knownOtp || '----'}</strong> <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:10px; width:auto; display:inline-block; margin-left:8px;" onclick="document.getElementById('modal-st-otp').value='${knownOtp}'">Isi Otomatis</button>`;
    }

    if (modal) modal.classList.add('active');
  },

  async submitSerahTerima() {
    const id_permintaan = document.getElementById('modal-st-id').value;
    const otp = document.getElementById('modal-st-otp').value;
    const foto = (document.getElementById('modal-st-foto-path') && document.getElementById('modal-st-foto-path').value) || document.getElementById('modal-st-foto-preview').getAttribute('src') || '/uploads/bukti-serahterima.jpg';

    if (!otp) {
      this.showToast('Masukkan kode OTP penerima.');
      return;
    }

    const res = await fetch('/api/permintaan/serah-terima', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_permintaan,
        kode_otp: otp,
        foto_bukti: foto,
        id_pengubah: this.currentUser ? this.currentUser.id_pengguna : 3
      })
    });

    const data = await res.json();
    if (data.success) {
      this.showToast(data.message || 'Serah-terima berhasil diverifikasi!');
      this.closeModal('modal-serah-terima');
      this.loadKurirDashboard();
    } else {
      this.showToast(data.message || 'OTP salah.');
    }
  },

  // ==========================================================================
  // Full-Screen Serah-Terima Screen (L-09)
  // ==========================================================================
  async loadSerahTerimaScreen() {
    const select = document.getElementById('screen-st-order-select');
    const preview = document.getElementById('screen-st-order-preview');
    if (!select) return;

    try {
      if (!this.currentUser) return;
      const res = await fetch(`/api/permintaan?user_id=${this.currentUser.id_pengguna}&role=kurir`);
      const data = await res.json();
      if (!data.success) return;

      // Hanya pesanan yang sudah dijemput kurir yang bisa diserahterimakan (butuh OTP penerima).
      const activeTasks = data.data.filter(p => p.status === 'Dijemput' || p.status === 'Dalam Perjalanan');
      select.innerHTML = '<option value="">-- Pilih Tugas Pengantaran Aktif --</option>';

      if (activeTasks.length === 0) {
        select.innerHTML = '<option value="">Tidak ada tugas siap serah-terima</option>';
        if (preview) {
          preview.style.display = 'block';
          preview.innerHTML = '<div style="text-align:center; padding:16px; color:#93c5fd;">Belum ada tugas yang siap diserahterimakan. Jemput barang dan mulai antar dari Beranda Kurir terlebih dahulu.</div>';
        }
        const helperEl = document.getElementById('screen-st-helper');
        if (helperEl) helperEl.innerHTML = '';
        return;
      }

      activeTasks.forEach(task => {
        select.innerHTML += `<option value="${task.id_permintaan}">${task.kode_resi} — ${App.esc(task.deskripsi_barang.substring(0, 25))} (${task.status})</option>`;
      });

      if (activeTasks.length > 0) {
        select.value = activeTasks[0].id_permintaan;
        this.onSelectSerahTerimaOrder(activeTasks[0].id_permintaan, activeTasks);
      }
    } catch (e) {
      console.error(e);
    }
  },

  async onSelectSerahTerimaOrder(orderId, preloadedTasks = null) {
    const preview = document.getElementById('screen-st-order-preview');
    const helper = document.getElementById('screen-st-helper');
    if (!orderId) {
      if (preview) preview.style.display = 'none';
      if (helper) helper.innerHTML = '';
      return;
    }

    try {
      let task = null;
      if (preloadedTasks) {
        task = preloadedTasks.find(t => t.id_permintaan === parseInt(orderId));
      }
      if (!task) {
        const res = await fetch(`/api/permintaan/${orderId}`);
        const data = await res.json();
        if (data.success) task = data.permintaan;
      }

      if (task && preview) {
        preview.style.display = 'block';
        preview.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="order-badge">TUGAS PENGANTARAN · ${task.kode_resi}</span>
            <span class="badge-status badge-${task.status.toLowerCase().replace(/\s+/g, '')}">${task.status}</span>
          </div>
          <div style="font-size:16px; font-weight:800; margin:6px 0;">${App.esc(task.deskripsi_barang)}</div>
          <div style="font-size:12px; color:#cbd5e1; line-height:1.6;">
            <div>📍 <strong>Jemput:</strong> ${task.lokasi_asal_nama || task.lokasi_asal}</div>
            <div>🏁 <strong>Tujuan:</strong> ${task.lokasi_tujuan_nama || task.lokasi_tujuan}${task.ruangan_tujuan ? ` (${App.esc(task.ruangan_tujuan)})` : ''}</div>
            <div>👤 <strong>Penerima:</strong> ${App.esc(task.nama_penerima || '-')}</div>
          </div>
        `;

        if (helper) {
          helper.innerHTML = `Demo Hint: OTP penerima adalah <strong style="font-size:16px; color:var(--primary-teal);">${task.kode_otp || '----'}</strong> <button type="button" class="btn btn-outline" style="padding:2px 8px; font-size:10px; width:auto; display:inline-block; margin-left:8px;" onclick="document.getElementById('screen-st-otp').value='${task.kode_otp}'">Isi Otomatis</button>`;
        }
      }
    } catch (e) {
      console.error(e);
    }
  },

  async submitScreenSerahTerima() {
    const orderId = document.getElementById('screen-st-order-select').value;
    const otp = document.getElementById('screen-st-otp').value;
    const foto = (document.getElementById('screen-st-foto-path') && document.getElementById('screen-st-foto-path').value) || '/uploads/bukti-serahterima.jpg';

    if (!orderId) {
      this.showToast('Pilih tugas pengantaran yang diselesaikan.');
      return;
    }
    if (!otp) {
      this.showToast('Masukkan kode OTP penerima.');
      return;
    }

    const res = await fetch('/api/permintaan/serah-terima', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_permintaan: orderId,
        kode_otp: otp,
        foto_bukti: foto,
        id_pengubah: this.currentUser ? this.currentUser.id_pengguna : 3
      })
    });

    const data = await res.json();
    if (data.success) {
      this.showToast(data.message || 'Serah-terima berhasil diverifikasi!');
      this.navigateTo('screen-kurir');
    } else {
      this.showToast(data.message || 'Kode OTP salah.');
    }
  },

  async updateKurirStatus(id_permintaan, status_baru) {
    if (!this.currentUser) {
      this.showToast('Sesi berakhir. Silakan login kembali.');
      this.navigateTo('screen-login');
      return;
    }
    // Server menentukan kurir dari akun yang login (id_pengubah); id_kurir tidak lagi di-hardcode.
    const res = await fetch('/api/permintaan/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_permintaan,
        status: status_baru,
        id_pengubah: this.currentUser.id_pengguna
      })
    });
    const data = await res.json();
    if (data.success) {
      this.showToast(`Status pengantaran: ${status_baru}`);
      this.loadKurirDashboard();
    } else {
      this.showToast(data.message || 'Gagal mengubah status');
    }
  },

  // ==========================================================================
  // Admin Operations (L-12)
  // ==========================================================================
  openAssignModal(id_permintaan) {
    const modal = document.getElementById('modal-assign');
    const inputId = document.getElementById('modal-assign-id');
    const selectKurir = document.getElementById('modal-assign-kurir');
    if (inputId) inputId.value = id_permintaan;

    fetch('/api/admin/kurir')
      .then(r => r.json())
      .then(d => {
        if (d.success && selectKurir) {
          selectKurir.innerHTML = d.data.filter(k => k.status_verifikasi === 'disetujui').map(k => `
            <option value="${k.id_kurir}">${App.esc(k.nama)} (⭐${k.rating_rata} · ${k.status_ketersediaan})</option>
          `).join('');
        }
      });

    if (modal) modal.classList.add('active');
  },

  async submitAssign() {
    const id_permintaan = document.getElementById('modal-assign-id').value;
    const id_kurir = document.getElementById('modal-assign-kurir').value;

    const res = await fetch('/api/admin/penugasan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_permintaan, id_kurir })
    });
    const data = await res.json();
    if (data.success) {
      this.showToast('Kurir berhasil ditugaskan ke pesanan.');
      this.closeModal('modal-assign');
      this.loadAdminDashboard();
    }
  },

  async openOrderDetailModal(id_permintaan) {
    const modal = document.getElementById('modal-order-detail');
    const container = document.getElementById('modal-order-detail-content');
    if (!modal || !container) return;

    try {
      const res = await fetch(`/api/permintaan/${id_permintaan}`);
      const data = await res.json();
      if (data.success) {
        const p = data.permintaan;
        container.innerHTML = `
          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <h4 style="font-size:18px; font-weight:800; color:var(--primary-navy);">${p.kode_resi}</h4>
              <span class="badge-status badge-${p.status.toLowerCase().replace(/\s+/g, '')}">${p.status}</span>
            </div>
            <div style="font-size:12px; color:#64748b;">Jenis: <strong>${p.jenis === 'titip' ? 'Titip Loker' : 'Pesan Antar'}</strong></div>
          </div>
          <div style="font-size:13px; line-height:1.6; margin-bottom:12px; background:#f8fafc; padding:10px; border-radius:10px;">
            <div><strong>Barang:</strong> ${App.esc(p.deskripsi_barang)}</div>
            <div><strong>Rute:</strong> ${p.lokasi_asal} ➔ ${p.lokasi_tujuan}</div>
            ${p.ruangan_tujuan ? `<div><strong>Ruangan/Pos:</strong> ${App.esc(p.ruangan_tujuan)}</div>` : ''}
            <div><strong>Penerima:</strong> ${App.esc(p.nama_penerima || '-')}</div>
            <div><strong>Kurir:</strong> ${p.kurir ? App.esc(p.kurir.nama) : 'Belum ditugaskan'}</div>
            <div><strong>Kode OTP:</strong> <span style="font-weight:800; color:var(--primary-teal);">${p.kode_otp || '----'}</span></div>
          </div>
          <div style="font-size:12px; font-weight:700; margin-bottom:6px;">Riwayat Perubahan Status:</div>
          <div style="font-size:11px; color:#475569; max-height:100px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px; padding:6px 10px;">
            ${p.riwayat_status.map(r => `<div>• <strong>${r.status}</strong> (${new Date(r.waktu).toLocaleTimeString('id-ID')})</div>`).join('')}
          </div>
        `;
        modal.classList.add('active');
      }
    } catch (e) {
      console.error(e);
    }
  },

  async verifikasiKurir(id_kurir, keputusan) {
    let alasan = null;
    if (keputusan === 'tolak') {
      alasan = prompt('Masukkan alasan penolakan pengajuan kurir:');
      if (!alasan) return;
    }

    const res = await fetch('/api/admin/kurir/verifikasi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_kurir,
        keputusan,
        alasan_penolakan: alasan,
        id_admin: this.currentUser ? this.currentUser.id_pengguna : 1
      })
    });
    const data = await res.json();
    if (data.success) {
      this.showToast(data.message);
      this.loadAdminDashboard();
    }
  },

  async toggleKurirDuty(id_kurir, status_ketersediaan) {
    const res = await fetch('/api/kurir/shift-toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_kurir, status_ketersediaan })
    });
    const d = await res.json();
    if (d.success) {
      this.showToast(`Ketersediaan kurir diubah: ${status_ketersediaan}`);
      this.loadAdminDashboard();
    }
  },

  openFollowupModal(id_laporan) {
    const catatan = prompt('Masukkan catatan tindak lanjut laporan kehilangan:');
    if (!catatan) return;

    fetch('/api/laporan/tindak-lanjut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_laporan,
        status: 'selesai',
        tindak_lanjut: catatan,
        id_admin: this.currentUser ? this.currentUser.id_pengguna : 1
      })
    }).then(r => r.json()).then(d => {
      if (d.success) {
        this.showToast('Laporan berhasil ditindaklanjuti dan diselesaikan.');
        this.loadAdminDashboard();
      }
    });
  },

  async toggleUserStatus(id_pengguna, status_baru) {
    const res = await fetch('/api/admin/pengguna/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_pengguna, status_akun: status_baru })
    });
    const d = await res.json();
    if (d.success) {
      this.showToast(`Status pengguna diubah ke ${status_baru}`);
      this.loadAdminDashboard();
    }
  },

  async resetDatabaseSeed() {
    if (!confirm('Apakah Anda yakin ingin mereset seluruh data kembali ke data awal SRS?')) {
      return;
    }
    const res = await fetch('/api/admin/reset-database', { method: 'POST' });
    const d = await res.json();
    if (d.success) {
      this.showToast('Basis data berhasil direset ke nilai awal.');
      this.loadAdminDashboard();
    }
  },

  openLaporModal(id_permintaan) {
    this.navigateTo('screen-lapor');
    const select = document.getElementById('lapor-order-select');
    if (select && id_permintaan) {
      select.value = id_permintaan;
    }
  },

  openRatingModal(id_permintaan) {
    this.navigateTo('screen-rating');
    const input = document.getElementById('rating-order-id');
    if (input) input.value = id_permintaan;
  },

  // ==========================================================================
  // Global Event Listeners
  // ==========================================================================
  bindGlobalEvents() {
    // 1. Login Form (L-01)
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');

        errEl.classList.remove('visible');
        const res = await Auth.handleLogin(email, pass);

        if (res.success) {
          Auth.setUser(res.user, res.user.peran);
          this.setCurrentUser(res.user);
          this.updateUserBadge(res.user);
          this.updateRolePillHighlights(res.user.peran);

          if (res.dashboard === 'dashboard-administrator') {
            this.navigateTo('screen-admin');
          } else if (res.dashboard === 'dashboard-kurir') {
            this.navigateTo('screen-kurir');
          } else {
            this.navigateTo('screen-mahasiswa');
          }
          this.showToast('Selamat datang, ' + res.user.nama + '!');
        } else {
          errEl.textContent = res.message;
          errEl.classList.add('visible');

          if (res.code === 'ACCOUNT_UNVERIFIED') {
            document.getElementById('verif-email-input').value = res.email || email;
            setTimeout(() => {
              this.navigateTo('screen-verif-email');
            }, 1200);
          }
        }
      });
    }

    // 2. Registrasi Mahasiswa Form (L-13)
    const regMhsForm = document.getElementById('form-reg-mahasiswa');
    if (regMhsForm) {
      regMhsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('reg-mhs-error');
        errEl.classList.remove('visible');

        const payload = {
          nama: document.getElementById('reg-mhs-nama').value,
          email_kampus: document.getElementById('reg-mhs-email').value,
          no_hp: document.getElementById('reg-mhs-phone').value,
          password: document.getElementById('reg-mhs-pass').value,
          konfirmasi_password: document.getElementById('reg-mhs-conf').value
        };

        const res = await Auth.handleRegister(payload);
        if (res.success) {
          this.showToast('Registrasi berhasil! Masukkan kode OTP verifikasi.');
          document.getElementById('verif-email-input').value = payload.email_kampus;
          const demoInfo = document.getElementById('verif-demo-code-box');
          if (demoInfo) {
            demoInfo.innerHTML = `<strong>KODE OTP DEMO (Email Kampus):</strong> <span style="font-size:16px; font-weight:800; color:var(--primary-teal);">${res.demo_kode}</span>`;
            demoInfo.style.display = 'block';
          }
          this.navigateTo('screen-verif-email');
        } else {
          errEl.textContent = res.message;
          errEl.classList.add('visible');
        }
      });
    }

    // 3. Verifikasi Email Form (L-14)
    const verifForm = document.getElementById('form-verif-email');
    if (verifForm) {
      verifForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('verif-email-input').value;
        const codeDigits = Array.from(document.querySelectorAll('.otp-digit-input')).map(inp => inp.value).join('');
        const errEl = document.getElementById('verif-error');
        errEl.classList.remove('visible');

        const res = await Auth.handleVerifyEmail(email, codeDigits);
        if (res.success) {
          this.showToast('Akun berhasil diaktifkan! Silakan masuk.');
          this.navigateTo('screen-login');
        } else {
          errEl.textContent = res.message;
          errEl.classList.add('visible');
        }
      });
    }

    // 4. Kirim Ulang Kode Link (L-14)
    const resendBtn = document.getElementById('btn-resend-otp');
    if (resendBtn) {
      resendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('verif-email-input').value;
        if (!email) {
          this.showToast('Email kampus belum terisi.');
          return;
        }
        const res = await Auth.handleResendCode(email);
        if (res.success) {
          this.showToast('Kode baru telah dikirim.');
          const demoInfo = document.getElementById('verif-demo-code-box');
          if (demoInfo) {
            demoInfo.innerHTML = `<strong>KODE OTP BARU (Email Kampus):</strong> <span style="font-size:16px; font-weight:800; color:var(--primary-teal);">${res.demo_kode}</span>`;
            demoInfo.style.display = 'block';
          }
        }
      });
    }

    // 5. Registrasi Kurir Labor Form (L-15)
    const regKurirForm = document.getElementById('form-reg-kurir');
    if (regKurirForm) {
      regKurirForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errEl = document.getElementById('reg-kurir-error');
        errEl.classList.remove('visible');

        const payload = {
          id_pengguna: this.currentUser ? this.currentUser.id_pengguna : null,
          nama: document.getElementById('reg-kurir-nama').value,
          email_kampus: document.getElementById('reg-kurir-email').value,
          no_hp: document.getElementById('reg-kurir-phone').value,
          password: document.getElementById('reg-kurir-pass') ? document.getElementById('reg-kurir-pass').value : 'pass123',
          konfirmasi_password: document.getElementById('reg-kurir-conf') ? document.getElementById('reg-kurir-conf').value : 'pass123',
          setuju_kode_etik: document.getElementById('reg-kurir-etik').checked,
          jadwal: [
            {
              hari: document.getElementById('kurir-shift-hari').value,
              jam_mulai: document.getElementById('kurir-shift-mulai').value,
              jam_selesai: document.getElementById('kurir-shift-selesai').value
            }
          ]
        };

        const res = await Auth.handleRegisterKurir(payload);
        if (res.success) {
          this.showToast('Pengajuan kurir berhasil diajukan dan menunggu verifikasi.');
          if (this.currentUser) {
            this.navigateTo('screen-mahasiswa');
          } else {
            this.navigateTo('screen-login');
          }
        } else {
          errEl.textContent = res.message;
          errEl.classList.add('visible');
        }
      });
    }

    // 6. Form Titip Barang (L-03)
    const titipForm = document.getElementById('form-titip-barang');
    if (titipForm) {
      titipForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const desc = document.getElementById('titip-deskripsi').value;
        const loc = document.getElementById('titip-lokasi').value;
        const penerima = document.getElementById('titip-penerima').value;
        const fotoPreview = document.getElementById('titip-foto-preview');
        const fotoPathInput = document.getElementById('titip-foto-path');
        const foto = (fotoPathInput && fotoPathInput.value) || (fotoPreview ? fotoPreview.getAttribute('src') : null);

        if (!foto) {
          this.showToast('Foto fisik barang wajib diunggah.');
          return;
        }

        const res = await fetch('/api/permintaan/titip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_pemesan: this.currentUser ? this.currentUser.id_pengguna : 5,
            deskripsi_barang: desc,
            id_lokasi_asal: loc,
            nama_penerima: penerima,
            foto_barang: foto
          })
        });

        const data = await res.json();
        if (data.success) {
          this.showToast('Titip barang berhasil diajukan!');
          this.trackOrder(data.permintaan.id_permintaan);
        } else {
          this.showToast(data.message || 'Gagal mengajukan titip');
        }
      });
    }

    // 6.1 Form Screen Serah-Terima Kurir (L-09)
    const stScreenForm = document.getElementById('form-screen-serah-terima');
    if (stScreenForm) {
      stScreenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.submitScreenSerahTerima();
      });
    }

    // 7. Form Pesan Antar (L-04)
    const antarForm = document.getElementById('form-pesan-antar');
    if (antarForm) {
      antarForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const asal = document.getElementById('antar-asal').value;
        const tujuan = document.getElementById('antar-tujuan').value;
        const ruangan = document.getElementById('antar-ruangan').value;
        const desc = document.getElementById('antar-deskripsi').value;
        const penerima = document.getElementById('antar-penerima').value;

        if (asal === tujuan) {
          this.showToast('Lokasi jemput dan tujuan tidak boleh sama!');
          return;
        }

        const res = await fetch('/api/permintaan/antar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_pemesan: this.currentUser ? this.currentUser.id_pengguna : 5,
            deskripsi_barang: desc,
            id_lokasi_asal: asal,
            id_lokasi_tujuan: tujuan,
            ruangan_tujuan: ruangan,
            nama_penerima: penerima
          })
        });

        const data = await res.json();
        if (data.success) {
          this.showToast('Pesanan antar berhasil dibuat!');
          this.trackOrder(data.permintaan.id_permintaan);
        } else {
          this.showToast(data.message || 'Gagal membuat pesanan');
        }
      });
    }

    // 8. Form Lapor Kehilangan (L-10)
    const laporForm = document.getElementById('form-lapor-kehilangan');
    if (laporForm) {
      laporForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = document.getElementById('lapor-order-select').value;
        const desc = document.getElementById('lapor-deskripsi').value;

        const res = await fetch('/api/laporan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_permintaan: orderId,
            id_pelapor: this.currentUser ? this.currentUser.id_pengguna : 5,
            deskripsi: desc
          })
        });

        const data = await res.json();
        if (data.success) {
          this.showToast('Laporan berhasil dikirim ke administrator.');
          this.navigateTo('screen-mahasiswa');
        } else {
          this.showToast(data.message || 'Gagal mengirim laporan');
        }
      });
    }

    // 9. Form Beri Rating (L-11)
    const ratingForm = document.getElementById('form-beri-rating');
    if (ratingForm) {
      ratingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = document.getElementById('rating-order-id').value;
        const ratingVal = document.getElementById('rating-star-value').value;
        const komentar = document.getElementById('rating-komentar').value;

        const res = await fetch('/api/ulasan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_permintaan: orderId,
            rating: ratingVal,
            komentar,
            id_pemberi: this.currentUser ? this.currentUser.id_pengguna : 5
          })
        });

        const data = await res.json();
        if (data.success) {
          this.showToast('Ulasan dan rating Anda berhasil disimpan!');
          this.navigateTo('screen-mahasiswa');
        } else {
          this.showToast(data.message || 'Gagal memberi ulasan');
        }
      });
    }

    // 10. Admin Add User Form
    const addUserForm = document.getElementById('form-add-user');
    if (addUserForm) {
      addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          nama: document.getElementById('add-user-nama').value,
          email_kampus: document.getElementById('add-user-email').value,
          no_hp: document.getElementById('add-user-phone').value,
          peran: document.getElementById('add-user-peran').value,
          password: 'pass123'
        };

        const res = await fetch('/api/admin/pengguna/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          this.showToast('Pengguna baru berhasil ditambahkan.');
          this.closeModal('modal-add-user');
          this.loadAdminDashboard();
        }
      });
    }

    // Interactive Star Rating selection
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = parseInt(btn.dataset.val);
        document.getElementById('rating-star-value').value = val;
        document.querySelectorAll('.star-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.val) <= val);
        });
      });
    });

    // Auto-advance OTP 6-digit input boxes in L-14
    const otpBoxes = document.querySelectorAll('.otp-digit-input');
    otpBoxes.forEach((box, idx) => {
      box.addEventListener('input', (e) => {
        if (box.value.length === 1 && idx < otpBoxes.length - 1) {
          otpBoxes[idx + 1].focus();
        }
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && box.value.length === 0 && idx > 0) {
          otpBoxes[idx - 1].focus();
        }
      });
    });
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
