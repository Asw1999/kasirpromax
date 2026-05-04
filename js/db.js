// ═══════════════════════════════════════════════════════════════
//  db.js — IndexedDB Storage (Primary, always works offline)
//  Interface sama seperti API lama supaya file lain tidak perlu diubah.
// ═══════════════════════════════════════════════════════════════

const DB = (() => {
  const DB_NAME    = 'kasirpromax';
  const DB_VERSION = 1;
  let _db = null;

  // ── OPEN / INIT ─────────────────────────────────────────────
  function open() {
    return new Promise((resolve, reject) => {
      if (_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('products'))
          db.createObjectStore('products', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('transactions'))
          db.createObjectStore('transactions', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings'))
          db.createObjectStore('settings', { keyPath: 'key' });
        // Queue untuk operasi yang belum tersync ke cloud
        if (!db.objectStoreNames.contains('syncQueue'))
          db.createObjectStore('syncQueue', { keyPath: 'qid', autoIncrement: true });
      };

      req.onsuccess  = e => { _db = e.target.result; resolve(_db); };
      req.onerror    = e => reject(e.target.error);
    });
  }

  // ── GENERIC STORE HELPERS ────────────────────────────────────
  async function getAll(store) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  }

  async function put(store, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(value);
      req.onsuccess = () => resolve(value);
      req.onerror   = () => reject(req.error);
    });
  }

  async function del(store, key) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function putAll(store, items) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const s  = tx.objectStore(store);
      s.clear();
      items.forEach(item => s.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  // ── SYNC QUEUE ───────────────────────────────────────────────
  async function enqueue(op) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('syncQueue', 'readwrite');
      const req = tx.objectStore('syncQueue').add({ ...op, ts: Date.now() });
      req.onsuccess = () => resolve();
      req.onerror   = () => reject(req.error);
    });
  }

  async function dequeue(qid) { return del('syncQueue', qid); }

  async function getQueue() { return getAll('syncQueue'); }

  // ── SETTINGS HELPERS ─────────────────────────────────────────
  async function getSettings() {
    const rows = await getAll('settings');
    const obj  = { shop: 'WARUNG PINTAR', address: '', phone: '', cashier: 'Admin', showTunaiKembali: true };
    rows.forEach(r => { obj[r.key] = r.value; });
    return obj;
  }

  async function saveSettings(data) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const s  = tx.objectStore('settings');
      Object.entries(data).forEach(([key, value]) => s.put({ key, value }));
      tx.oncomplete = () => resolve(data);
      tx.onerror    = () => reject(tx.error);
    });
  }

  return { open, getAll, put, del, putAll, enqueue, dequeue, getQueue, getSettings, saveSettings };
})();
