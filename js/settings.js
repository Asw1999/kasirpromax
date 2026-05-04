// ═══════════════════════════════════════════════════════════════
//  settings.js — Settings Modal (API version)
// ═══════════════════════════════════════════════════════════════

function openSettings() {
  document.getElementById('setShop').value    = settings.shop    || '';
  document.getElementById('setAddress').value = settings.address || '';
  document.getElementById('setPhone').value   = settings.phone   || '';
  document.getElementById('setCashier').value = settings.cashier || '';
  _syncToggleUI();
  openModal('settingsModal');
}

function _syncToggleUI() {
  const on   = settings.showTunaiKembali !== false;
  const btn  = document.getElementById('toggleTunai');
  const knob = document.getElementById('toggleTunaiKnob');
  btn.style.backgroundColor = on ? '#2563eb' : '#cbd5e1';
  knob.style.transform      = on ? 'translateX(24px)' : 'translateX(0)';
}

function toggleTunaiKembali() {
  settings.showTunaiKembali = settings.showTunaiKembali === false ? true : false;
  _syncToggleUI();
}

async function saveSettings() {
  const shop    = document.getElementById('setShop').value.trim();
  const address = document.getElementById('setAddress').value.trim();
  const phone   = document.getElementById('setPhone').value.trim();
  const cashier = document.getElementById('setCashier').value.trim();

  if (!shop) {
    customAlert('Nama toko tidak boleh kosong!', { title: 'Form Belum Lengkap', type: 'warning' });
    return;
  }

  const newSettings = {
    ...settings, shop, address, phone, cashier,
    showTunaiKembali: settings.showTunaiKembali !== false,
  };

  try {
    const saved = await API.saveSettings(newSettings);
    settings = saved;
    closeModal('settingsModal');
    refreshDashboard();
    toast('Pengaturan toko berhasil disimpan', 'success');
  } catch (e) {
    toast('Gagal simpan pengaturan: ' + e.message, 'error');
  }
}


// ═══════════════════════════════════════════════════════════════
//  scanner.js — Barcode Scanner
// ═══════════════════════════════════════════════════════════════

function startScanner() {
  switchView('pos');
  openModal('scannerModal');
  const html5QrCode = new Html5Qrcode('reader');
  window.qrScanner  = html5QrCode;

  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      document.getElementById('searchPos').value = decodedText;
      renderPosProducts();
      stopScanner();
      const found = products.filter(p => p.barcode === decodedText);
      if (found.length === 1) addToCart(found[0].id);
    }
  );
}

function stopScanner() {
  if (window.qrScanner) {
    window.qrScanner.stop().then(() => {
      closeModal('scannerModal');
    });
  }
}
