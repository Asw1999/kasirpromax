// ═══════════════════════════════════════════════════════════════
//  data.js — Global State (offline-first, dari IndexedDB)
// ═══════════════════════════════════════════════════════════════

let products     = [];
let cart         = [];
let transactions = [];
let customers    = [];   // database pelanggan / member
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

    const [prods, trxs, sets, custs] = await Promise.all([
      API.getProducts(),
      API.getTransactions(),
      API.getSettings(),
      API.getCustomers(),
    ]);
    products     = prods;
    transactions = trxs;
    settings     = sets;
    customers    = custs;
  } catch (e) {
    console.error('[data] Gagal load data:', e.message);
    throw e;
  }
}

function persistProducts()     { /* handled inline via API */ }
function persistTransactions() { /* handled inline via API */ }
function persistSettings()     { /* handled inline via API */ }
