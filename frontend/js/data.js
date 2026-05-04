// ═══════════════════════════════════════════════════════════════
//  data.js — Global State (offline-first, dari IndexedDB)
// ═══════════════════════════════════════════════════════════════

let products     = [];
let cart         = [];
let transactions = [];
let settings     = {
  shop: 'WARUNG PINTAR', address: '', phone: '', cashier: 'Admin', showTunaiKembali: true,
};

let currentCategory          = 'All';
let currentInventoryCategory = 'All';
let currentPayMethod         = 'TUNAI';

// ── LOAD DATA DARI INDEXEDDB ──────────────────────────────────
async function loadAllData() {
  try {
    // Buka IndexedDB dulu
    await DB.open();

    const [prods, trxs, sets] = await Promise.all([
      API.getProducts(),
      API.getTransactions(),
      API.getSettings(),
    ]);
    products     = prods;
    transactions = trxs;
    settings     = sets;
  } catch (e) {
    console.error('[data] Gagal load data:', e.message);
    throw e;
  }
}

function persistProducts()     { /* handled inline via API */ }
function persistTransactions() { /* handled inline via API */ }
function persistSettings()     { /* handled inline via API */ }
