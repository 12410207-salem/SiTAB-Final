// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// auth.js — Client-Side Authentication & Session Controller
// ============================================================================

const Auth = {
  // Demo accounts
  DEMO_ACCOUNTS: {
    mahasiswa: {
      email: '105022410118@student.unklab.ac.id',
      pass: 'pass123',
      name: 'Makarewa, Miracle Evangelio'
    },
    kurir: {
      email: '12410208@student.unklab.ac.id',
      pass: 'pass123',
      name: 'Sanuel Anasim'
    },
    admin: {
      email: '12410207@student.unklab.ac.id',
      pass: 'pass123',
      name: 'Salem, Jovitly Mike'
    }
  },

  getUser() {
    try {
      const data = localStorage.getItem('sitab_session');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setUser(user, role) {
    localStorage.setItem('sitab_session', JSON.stringify({ ...user, role }));
  },

  logout() {
    localStorage.removeItem('sitab_session');
    window.location.href = 'index.html';
  },

  fillDemo(role) {
    const acc = this.DEMO_ACCOUNTS[role];
    if (!acc) return;

    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');

    if (emailInput && passInput) {
      emailInput.value = acc.email;
      passInput.value = acc.pass;

      // Update pills UI
      document.querySelectorAll('.role-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.role === role);
      });
    }
  },

  async handleLogin(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: 'Gagal terhubung ke server SiTAB.' };
    }
  },

  async handleRegister(userData) {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal melakukan registrasi.' };
    }
  },

  async handleVerifyEmail(email, kode) {
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, kode })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal memverifikasi email.' };
    }
  },

  async handleResendCode(email) {
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal mengirim ulang kode.' };
    }
  },

  async handleRegisterKurir(kurirData) {
    try {
      const res = await fetch('/api/auth/register-kurir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kurirData)
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Gagal mendaftar sebagai kurir.' };
    }
  }
};
