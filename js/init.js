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

  // ── SERVICE WORKER ─────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] Registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener('statechange', () => {
            if (nw.state === 'installed' && navigator.serviceWorker.controller)
              showUpdateBanner(nw);
          });
        });
      })
      .catch(e => console.warn('[SW] Failed:', e));

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; window.location.reload(); }
    });
  }

  function showUpdateBanner(worker) {
    const banner = document.getElementById('swUpdateBanner');
    if (!banner) return;
    banner.classList.remove('hidden');
    document.getElementById('swUpdateBtn').onclick = () => {
      worker.postMessage({ type: 'SKIP_WAITING' });
      banner.classList.add('hidden');
    };
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
