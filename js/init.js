// ═══════════════════════════════════════════════════════════════
//  init.js — App Initialization (offline-first)
// ═══════════════════════════════════════════════════════════════

// ── DARK MODE (sebelum render) ─────────────────────────────────
if (localStorage.getItem('wp_darkmode') === '1') {
  document.body.classList.add('dark-mode');
}

// ── APP BOOT ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  if (localStorage.getItem('wp_darkmode') === '1') {
    const btn = document.getElementById('darkModeBtn');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-sun"></i>';
      btn.className = 'w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-yellow-400';
    }
  }

  // Loading screen
  const loadingEl = document.createElement('div');
  loadingEl.id = 'appLoading';
  loadingEl.style.cssText = 'position:fixed;inset:0;background:white;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99998;gap:12px;';
  loadingEl.innerHTML = `
    <div style="width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
    <p style="font-size:13px;font-weight:bold;color:#94a3b8;">Memuat data...</p>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  document.body.appendChild(loadingEl);

  // Load dari IndexedDB (selalu berhasil, bahkan offline)
  try {
    await loadAllData();
  } catch (e) {
    console.error('[init] loadAllData error:', e);
  }

  loadingEl.remove();

  // Boot normal
  switchView('home');
  refreshDashboard();
  setTimeout(initRipples, 300);

  // Sync ke cloud di background (kalau ada koneksi + config)
  if (Sync.isConfigured()) {
    setTimeout(() => Sync.syncAll(), 1500);
  } else {
    // Tidak ada config sync — sembunyikan status icon
    const el = document.getElementById('syncStatus');
    if (el) el.style.display = 'none';
  }

  // ── SERVICE WORKER (Combo A+B) ────────────────────────────
  // Strategi: deteksi update otomatis (A), tampilkan popup pilihan (B).
  // User bisa pilih update sekarang atau nanti — aman untuk kasir yang
  // sedang transaksi. Auto-reload hanya terjadi setelah user konfirmasi.
  if ('serviceWorker' in navigator) {
    let pendingWorker = null;

    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] Registered:', reg.scope);

        // Cek update setiap 30 detik — lebih responsif
        setInterval(() => reg.update(), 30 * 1000);

        // Kalau SW sudah waiting saat halaman dibuka (misal tab lama)
        if (reg.waiting && navigator.serviceWorker.controller) {
          pendingWorker = reg.waiting;
          _showUpdatePopup(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] Update ditemukan, menunggu konfirmasi user...');
              pendingWorker = nw;
              _showUpdatePopup(nw);
            }
          });
        });
      })
      .catch(e => console.warn('[SW] Registrasi gagal:', e));

    // Reload halaman saat controller berganti (dipicu setelah SKIP_WAITING)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  }

  // Tampilkan popup "Update Tersedia" — user pilih update atau nanti
  function _showUpdatePopup(worker) {
    const banner = document.getElementById('swUpdateBanner');
    if (!banner) return;

    // Tombol Update → kirim SKIP_WAITING → SW aktif → controllerchange → reload
    document.getElementById('swUpdateBtn').onclick = () => {
      banner.classList.add('hidden');
      worker.postMessage({ type: 'SKIP_WAITING' });
    };

    // Tombol Nanti → sembunyikan banner, ingatkan lagi 5 menit kemudian
    let dismissBtn = document.getElementById('swDismissBtn');
    if (!dismissBtn) {
      dismissBtn = document.createElement('button');
      dismissBtn.id = 'swDismissBtn';
      dismissBtn.textContent = 'Nanti';
      dismissBtn.className = 'text-white/70 text-xs font-bold px-2 py-2 active:opacity-50';
      document.getElementById('swUpdateBtn').insertAdjacentElement('afterend', dismissBtn);
    }
    dismissBtn.onclick = () => {
      banner.classList.add('hidden');
      // Ingatkan lagi 5 menit kemudian kalau user belum update
      setTimeout(() => {
        if (worker.state !== 'activated') _showUpdatePopup(worker);
      }, 5 * 60 * 1000);
    };

    banner.classList.remove('hidden');
  }

  // ── PWA INSTALL BANNER ─────────────────────────────────────
  let deferredPrompt  = null;
  const installBanner = document.getElementById('installBanner');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (!localStorage.getItem('pwa_dismissed'))
      installBanner.classList.remove('hidden');
  });

  document.getElementById('installBtn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.classList.add('hidden');
  });

  document.getElementById('dismissInstall').addEventListener('click', () => {
    installBanner.classList.add('hidden');
    localStorage.setItem('pwa_dismissed', '1');
  });

  if (window.matchMedia('(display-mode: standalone)').matches)
    installBanner.classList.add('hidden');
});
