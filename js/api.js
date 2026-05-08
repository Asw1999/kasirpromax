// ═══════════════════════════════════════════════════════════════
//  api.js — Offline-first API Layer
//  Semua operasi ke IndexedDB (primary) + queue ke Turso (sync).
//  Interface sama seperti sebelumnya — file lain tidak perlu diubah.
// ═══════════════════════════════════════════════════════════════

const API = (() => {

  // ── ID GENERATOR (anti-collision) ─────────────────────────
  // Date.now() * 1000 + random(0–998) → ~16-digit integer, aman di JS Number,
  // tidak collision bahkan saat ratusan produk diimport dalam 1ms yang sama.
  function genId() {
    return Date.now() * 1000 + Math.floor(Math.random() * 999);
  }

  // ── PRODUCTS ─────────────────────────────────────────────────
  async function getProducts() {
    return DB.getAll('products').then(p => p.sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function createProduct(data) {
    const p = { ...data, id: genId(), cost: Number(data.cost) || 0, price: Number(data.price) };
    await DB.put('products', p);
    await Sync.enqueue({ type: 'upsertProduct', data: p });
    return p;
  }

  async function updateProduct(id, data) {
    const products = await DB.getAll('products');
    const idx = products.findIndex(p => String(p.id) === String(id));
    if (idx === -1) throw new Error('Produk tidak ditemukan');
    const updated = { ...products[idx], ...data,
      cost: Number(data.cost ?? products[idx].cost) || 0,
      price: Number(data.price ?? products[idx].price),
      id: products[idx].id,
    };
    await DB.put('products', updated);
    await Sync.enqueue({ type: 'upsertProduct', data: updated });
    return updated;
  }

  async function deleteProduct(id) {
    await DB.del('products', Number(id));
    await Sync.enqueue({ type: 'deleteProduct', id: Number(id) });
    return { success: true };
  }

  async function importProducts({ products: imported, mode }) {
    let existing = await DB.getAll('products');
    let inserted = 0, updated = 0;

    if (mode === 'reset') {
      existing = imported.map((p, i) => ({
        ...p, id: p.id || genId(),
        cost: Number(p.cost) || 0, price: Number(p.price),
      }));
      inserted = existing.length;
    } else {
      const nameMap = new Map(existing.map(p => [p.name.toLowerCase().trim(), p]));
      for (const [i, p] of imported.entries()) {
        const key = p.name.toLowerCase().trim();
        if (nameMap.has(key)) {
          if (mode === 'replace') {
            const old = nameMap.get(key);
            const upd = { ...old, ...p, id: old.id, cost: Number(p.cost)||0, price: Number(p.price) };
            const idx = existing.findIndex(x => x.id === old.id);
            existing[idx] = upd;
            updated++;
          }
        } else {
          const np = { ...p, id: p.id || genId(), cost: Number(p.cost)||0, price: Number(p.price) };
          existing.push(np);
          nameMap.set(key, np);
          inserted++;
        }
      }
    }

    await DB.putAll('products', existing);
    await Sync.enqueue({ type: 'replaceProducts', data: existing });
    return { success: true, inserted, updated };
  }

  // ── TRANSACTIONS ─────────────────────────────────────────────
  async function getTransactions() {
    const trxs = await DB.getAll('transactions');
    return trxs.sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));
  }

  async function createTransaction(t) {
    await DB.put('transactions', t);
    await Sync.enqueue({ type: 'upsertTransaction', data: t });
    return { success: true, id: t.id };
  }

  async function updateTransaction(id, data) {
    const trxs = await DB.getAll('transactions');
    const idx  = trxs.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('Transaksi tidak ditemukan');
    const updated = { ...trxs[idx], ...data };
    await DB.put('transactions', updated);
    await Sync.enqueue({ type: 'upsertTransaction', data: updated });
    return updated;
  }

  async function deleteTransaction(id) {
    await DB.del('transactions', id);
    await Sync.enqueue({ type: 'deleteTransaction', id });
    return { success: true };
  }

  // ── SETTINGS ─────────────────────────────────────────────────
  async function getSettings() {
    return DB.getSettings();
  }

  async function saveSettings(data) {
    const current = await DB.getSettings();
    const merged  = { ...current, ...data };
    await DB.saveSettings(merged);
    await Sync.enqueue({ type: 'saveSettings', data: merged });
    return merged;
  }

  // ── CUSTOMERS ─────────────────────────────────────────────────
  async function getCustomers() {
    const list = await DB.getAll('customers');
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async function createCustomer(data) {
    const c = {
      ...data,
      id:       crypto.randomUUID(),
      joinDate: new Date().toISOString().split('T')[0],
    };
    await DB.put('customers', c);
    await Sync.enqueue({ type: 'upsertCustomer', data: c });
    return c;
  }

  async function updateCustomer(id, data) {
    const list = await DB.getAll('customers');
    const idx  = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Pelanggan tidak ditemukan');
    const updated = { ...list[idx], ...data, id };
    await DB.put('customers', updated);
    await Sync.enqueue({ type: 'upsertCustomer', data: updated });
    return updated;
  }

  async function deleteCustomer(id) {
    await DB.del('customers', id);
    await Sync.enqueue({ type: 'deleteCustomer', id });
    return { success: true };
  }

  return {
    getProducts, createProduct, updateProduct, deleteProduct, importProducts,
    getTransactions, createTransaction, updateTransaction, deleteTransaction,
    getSettings, saveSettings,
    getCustomers, createCustomer, updateCustomer, deleteCustomer,
  };
})();
