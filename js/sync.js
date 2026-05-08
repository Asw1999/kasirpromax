// ═══════════════════════════════════════════════════════════════
//  sync.js — Turso Cloud Sync Engine
//  Baca/tulis langsung ke Turso dari browser via HTTP API.
//  Data lokal (IndexedDB) selalu jadi primary — sync berjalan
//  di background. Offline tetap kerja normal.
// ═══════════════════════════════════════════════════════════════

const Sync = (() => {
  // Config dari config.js
  function url()   { return (window.TURSO_URL   || '').replace(/\/$/, ''); }
  function token() { return  window.TURSO_TOKEN || ''; }

  const isConfigured = () => !!(url() && token());

  // ── TURSO HTTP PIPELINE ──────────────────────────────────────
  async function _sql(statements) {
    if (!isConfigured()) return null;

    const requests = statements.map(s => ({
      type: 'execute',
      stmt: { sql: s.sql, args: (s.args || []).map(_val) },
    }));
    requests.push({ type: 'close' });

    const res = await fetch(`${url()}/v2/pipeline`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body:    JSON.stringify({ requests }),
    });
    if (!res.ok) throw new Error(`Turso ${res.status}`);
    const data = await res.json();
    for (const r of data.results) {
      if (r.type === 'error') throw new Error(`SQL: ${r.error.message}`);
    }
    return data.results;
  }

  function _val(v) {
    if (v === null || v === undefined) return { type: 'null' };
    if (typeof v === 'number')  return { type: Number.isInteger(v) ? 'integer' : 'float', value: String(v) };
    return { type: 'text', value: String(v) };
  }

  function _rows(result) {
    if (!result?.response?.result?.rows) return [];
    const cols = result.response.result.cols.map(c => c.name);
    return result.response.result.rows.map(row =>
      Object.fromEntries(cols.map((c, i) => [c, row[i]?.value ?? null]))
    );
  }

  // ── INIT CLOUD TABLES ────────────────────────────────────────
  async function initTables() {
    await _sql([
      { sql: `CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY, name TEXT NOT NULL,
          cost REAL DEFAULT 0, price REAL NOT NULL,
          category TEXT DEFAULT 'Umum', barcode TEXT DEFAULT '',
          updated_at INTEGER DEFAULT 0)` },
      { sql: `CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY, date TEXT, dateISO TEXT DEFAULT '',
          atasNama TEXT DEFAULT '', items TEXT NOT NULL,
          total REAL DEFAULT 0, profit REAL DEFAULT 0,
          pay REAL DEFAULT 0, change REAL DEFAULT 0,
          payMethod TEXT DEFAULT 'TUNAI', updated_at INTEGER DEFAULT 0)` },
      { sql: `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY, value TEXT NOT NULL)` },
      { sql: `CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY, name TEXT NOT NULL,
          phone TEXT DEFAULT '', notes TEXT DEFAULT '',
          joinDate TEXT DEFAULT '', updated_at INTEGER DEFAULT 0)` },
    ]);
  }

  // ── MERGE HELPER (put per-item tanpa clear) ──────────────────
  async function _mergeToStore(store, items) {
    if (items.length === 0) return;
    const db = await DB.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      const s  = tx.objectStore(store);
      items.forEach(item => s.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror    = () => reject(tx.error);
    });
  }

  // ── PULL (cloud → lokal) ─────────────────────────────────────
  async function pull() {
    if (!isConfigured() || !navigator.onLine) return;
    try {
      await initTables();

      // Kumpulkan ID yang masih pending di queue — data ini milik lokal,
      // jangan ditimpa cloud sampai berhasil di-push.
      const pendingQueue = await DB.getQueue();
      const pendingProductIds     = new Set();
      const pendingTransactionIds = new Set();
      for (const op of pendingQueue) {
        if (['upsertProduct',  'deleteProduct',  'replaceProducts'].includes(op.type))
          (op.data ? (Array.isArray(op.data) ? op.data : [op.data]) : []).forEach(d => pendingProductIds.add(d.id));
        if (op.type === 'deleteProduct')
          pendingProductIds.add(op.id);
        if (['upsertTransaction', 'deleteTransaction'].includes(op.type))
          pendingTransactionIds.add(op.data?.id ?? op.id);
      }

      const results = await _sql([
        { sql: 'SELECT * FROM products ORDER BY name ASC' },
        { sql: 'SELECT * FROM transactions ORDER BY dateISO DESC' },
        { sql: 'SELECT key, value FROM settings' },
        { sql: 'SELECT * FROM customers ORDER BY name ASC' },
      ]);

      const prods = _rows(results[0]).map(p => ({
        id: Number(p.id), name: p.name, cost: Number(p.cost),
        price: Number(p.price), category: p.category, barcode: p.barcode,
      }));
      const trxs = _rows(results[1]).map(t => ({
        ...t, total: Number(t.total), profit: Number(t.profit),
        pay: Number(t.pay), change: Number(t.change),
        items: JSON.parse(t.items || '[]'),
      }));
      const sets = Object.fromEntries(
        _rows(results[2]).map(r => [r.key, r.value === 'true' ? true : r.value === 'false' ? false : r.value])
      );
      const custs = _rows(results[3]).map(c => ({
        id: c.id, name: c.name, phone: c.phone || '',
        notes: c.notes || '', joinDate: c.joinDate || '',
      }));

      // Filter: skip item yang punya pending op di queue (lokal lebih baru)
      const safeProds = prods.filter(p => !pendingProductIds.has(p.id));
      const safeTrxs  = trxs.filter(t => !pendingTransactionIds.has(t.id));
      const pendingCustomerIds = new Set();
      for (const op of pendingQueue) {
        if (['upsertCustomer', 'deleteCustomer'].includes(op.type))
          pendingCustomerIds.add(op.data?.id ?? op.id);
      }
      const safeCusts = custs.filter(c => !pendingCustomerIds.has(c.id));

      // Hitung pending per-tabel untuk notifikasi
      const pendingProds = prods.length - safeProds.length;
      const pendingTrxs  = trxs.length  - safeTrxs.length;

      // Merge ke IndexedDB — put per-item, tidak clear() data lokal
      await _mergeToStore('products', safeProds);
      await _mergeToStore('transactions', safeTrxs);
      await _mergeToStore('customers', safeCusts);
      if (Object.keys(sets).length > 0) await DB.saveSettings(sets);

      const skipped = pendingProds + pendingTrxs;
      _setStatus('synced', {
        products:            'ok',
        transactions:        'ok',
        pendingProducts:     pendingProds,
        pendingTransactions: pendingTrxs,
      });
      console.log(`[Sync] Pull selesai: ${safeProds.length} produk, ${safeTrxs.length} transaksi` +
        (skipped > 0 ? ` (${skipped} item di-skip karena pending push)` : ''));
    } catch (e) {
      console.warn('[Sync] Pull gagal:', e.message);
      _setStatus('error', { products: 'error', transactions: 'error' });
    }
  }

  // ── PUSH (lokal → cloud) ─────────────────────────────────────
  async function push() {
    if (!isConfigured() || !navigator.onLine) return;
    try {
      const queue = await DB.getQueue();
      if (queue.length === 0) return;

      await initTables();

      // Hitung pending per-tabel sebelum push
      let pendingProds = 0, pendingTrxs = 0;
      for (const op of queue) {
        if (['upsertProduct','deleteProduct','replaceProducts'].includes(op.type)) pendingProds++;
        if (['upsertTransaction','deleteTransaction'].includes(op.type)) pendingTrxs++;
      }
      _setStatus('syncing', {
        products:            pendingProds > 0 ? 'syncing' : 'ok',
        transactions:        pendingTrxs > 0 ? 'syncing' : 'ok',
        pendingProducts:     pendingProds,
        pendingTransactions: pendingTrxs,
      });

      for (const op of queue) {
        try {
          await _executeOp(op);
          await DB.dequeue(op.qid);
          // Kurangi counter setelah berhasil
          if (['upsertProduct','deleteProduct','replaceProducts'].includes(op.type))
            pendingProds = Math.max(0, pendingProds - 1);
          if (['upsertTransaction','deleteTransaction'].includes(op.type))
            pendingTrxs = Math.max(0, pendingTrxs - 1);
        } catch (e) {
          console.warn('[Sync] Op gagal:', op.type, e.message);
        }
      }
      _setStatus('synced', {
        products:            pendingProds === 0 ? 'ok' : 'error',
        transactions:        pendingTrxs === 0 ? 'ok' : 'error',
        pendingProducts:     pendingProds,
        pendingTransactions: pendingTrxs,
      });
    } catch (e) {
      console.warn('[Sync] Push gagal:', e.message);
      _setStatus('error', { products: 'error', transactions: 'error' });
    }
  }

  async function _executeOp(op) {
    const now = Date.now();
    switch (op.type) {
      case 'upsertProduct':
        await _sql([{ sql: 'INSERT OR REPLACE INTO products VALUES (?,?,?,?,?,?,?)',
          args: [op.data.id, op.data.name, op.data.cost ?? 0, op.data.price,
                 op.data.category ?? 'Umum', op.data.barcode ?? '', now] }]);
        break;
      case 'deleteProduct':
        await _sql([{ sql: 'DELETE FROM products WHERE id=?', args: [op.id] }]);
        break;
      case 'replaceProducts':
        const pStmts = [{ sql: 'DELETE FROM products' }];
        for (const p of op.data)
          pStmts.push({ sql: 'INSERT OR REPLACE INTO products VALUES (?,?,?,?,?,?,?)',
            args: [p.id, p.name, p.cost ?? 0, p.price, p.category ?? 'Umum', p.barcode ?? '', now] });
        await _sql(pStmts);
        break;
      case 'upsertTransaction':
        await _sql([{ sql: 'INSERT OR REPLACE INTO transactions VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          args: [op.data.id, op.data.date, op.data.dateISO ?? '', op.data.atasNama ?? '',
                 JSON.stringify(op.data.items), op.data.total ?? 0, op.data.profit ?? 0,
                 op.data.pay ?? 0, op.data.change ?? 0, op.data.payMethod ?? 'TUNAI', now] }]);
        break;
      case 'deleteTransaction':
        await _sql([{ sql: 'DELETE FROM transactions WHERE id=?', args: [op.id] }]);
        break;
      case 'upsertCustomer':
        await _sql([{ sql: 'INSERT OR REPLACE INTO customers VALUES (?,?,?,?,?,?)',
          args: [op.data.id, op.data.name, op.data.phone ?? '',
                 op.data.notes ?? '', op.data.joinDate ?? '', now] }]);
        break;
      case 'deleteCustomer':
        await _sql([{ sql: 'DELETE FROM customers WHERE id=?', args: [op.id] }]);
        break;
      case 'saveSettings':
        const sStmts = Object.entries(op.data).map(([k, v]) => ({
          sql: 'INSERT OR REPLACE INTO settings VALUES (?,?)', args: [k, String(v)],
        }));
        if (sStmts.length > 0) await _sql(sStmts);
        break;
    }
  }

  // ── SYNC STATE TRACKER ───────────────────────────────────────
  const _state = {
    global: 'offline',      // syncing | synced | error | offline
    products: 'idle',       // idle | syncing | ok | error
    transactions: 'idle',
    pendingProducts: 0,
    pendingTransactions: 0,
  };

  // ── CONFLICT NOTIFICATION ─────────────────────────────────────
  function _showConflictBanner(pendingCount) {
    let banner = document.getElementById('syncConflictBanner');

    if (pendingCount === 0) {
      if (banner) banner.remove();
      return;
    }

    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'syncConflictBanner';
      banner.style.cssText = `
        position: fixed; bottom: 72px; left: 50%; transform: translateX(-50%);
        z-index: 9999; display: flex; align-items: center; gap: 8px;
        background: #1e293b; color: #f8fafc; font-size: 12px; font-weight: 600;
        padding: 8px 14px; border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        border: 1px solid rgba(251,191,36,0.4);
        animation: slideUp 0.3s ease;
        cursor: pointer;
      `;
      // Inject animation jika belum ada
      if (!document.getElementById('syncBannerStyle')) {
        const style = document.createElement('style');
        style.id = 'syncBannerStyle';
        style.textContent = `
          @keyframes slideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `;
        document.head.appendChild(style);
      }
      // Klik banner → tap icon sync untuk detail
      banner.onclick = () => {
        document.getElementById('syncStatus')?.click();
      };
      document.body.appendChild(banner);
    }

    const plural = pendingCount === 1 ? 'item' : 'item';
    banner.innerHTML = `
      <i class="fas fa-clock-rotate-left" style="color:#fbbf24;font-size:11px"></i>
      <span>${pendingCount} ${plural} lokal belum tersync</span>
      <i class="fas fa-chevron-up" style="font-size:9px;opacity:0.5"></i>
    `;
  }

  // ── STATUS INDICATOR (rich) ───────────────────────────────────
  function _setStatus(status, opts = {}) {
    _state.global = status;
    if (opts.products    !== undefined) _state.products    = opts.products;
    if (opts.transactions !== undefined) _state.transactions = opts.transactions;
    if (opts.pendingProducts    !== undefined) _state.pendingProducts    = opts.pendingProducts;
    if (opts.pendingTransactions !== undefined) _state.pendingTransactions = opts.pendingTransactions;

    const totalPending = _state.pendingProducts + _state.pendingTransactions;
    _showConflictBanner(totalPending);

    const el = document.getElementById('syncStatus');
    if (!el) return;

    // Icon global
    const globalMap = {
      syncing: { icon: 'fa-sync fa-spin', color: '#60a5fa' },
      synced:  { icon: 'fa-cloud-arrow-up', color: '#4ade80' },
      error:   { icon: 'fa-cloud',          color: '#f87171' },
      offline: { icon: 'fa-wifi-slash',     color: '#94a3b8' },
    };
    const g = globalMap[status] || globalMap.offline;

    // Badge pending
    const badgeHtml = totalPending > 0
      ? `<span style="
            position:absolute;top:-2px;right:-2px;
            background:#f59e0b;color:#000;
            font-size:8px;font-weight:800;
            width:14px;height:14px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            line-height:1;
          ">${totalPending > 9 ? '9+' : totalPending}</span>`
      : '';

    el.style.position = 'relative';
    el.innerHTML = `
      <i class="fas ${g.icon}" style="color:${g.color};font-size:13px"></i>
      ${badgeHtml}
    `;
    el.title = _buildTooltip(status);

    // Popup detail on click (toggle)
    el.style.cursor = 'pointer';
    el.onclick = _toggleDetailPopup;
  }

  function _buildTooltip(status) {
    const labels = { syncing:'Menyinkronkan...', synced:'Tersinkron', error:'Gagal sync', offline:'Offline' };
    const pending = _state.pendingProducts + _state.pendingTransactions;
    let t = labels[status] || 'Offline';
    if (pending > 0) t += ` · ${pending} pending`;
    return t;
  }

  // ── DETAIL POPUP (per-tabel) ──────────────────────────────────
  function _toggleDetailPopup() {
    let popup = document.getElementById('syncDetailPopup');
    if (popup) { popup.remove(); return; }

    popup = document.createElement('div');
    popup.id = 'syncDetailPopup';
    popup.style.cssText = `
      position: fixed; top: 60px; right: 12px; z-index: 9999;
      background: #0f172a; color: #f1f5f9;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; padding: 14px 16px;
      font-size: 12px; font-weight: 600;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      min-width: 200px;
      animation: fadeIn 0.2s ease;
    `;
    if (!document.getElementById('syncPopupStyle')) {
      const style = document.createElement('style');
      style.id = 'syncPopupStyle';
      style.textContent = `@keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }`;
      document.head.appendChild(style);
    }

    const statusIcon = (s, pending) => {
      if (s === 'syncing') return `<i class="fas fa-sync fa-spin" style="color:#60a5fa"></i>`;
      if (s === 'error')   return `<i class="fas fa-triangle-exclamation" style="color:#f87171"></i>`;
      if (pending > 0)     return `<i class="fas fa-clock-rotate-left" style="color:#fbbf24"></i>`;
      return `<i class="fas fa-check" style="color:#4ade80"></i>`;
    };

    const rowHtml = (label, tableStatus, pending) => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="opacity:0.7">${label}</span>
        <span style="display:flex;align-items:center;gap:5px">
          ${statusIcon(tableStatus, pending)}
          ${pending > 0 ? `<span style="color:#fbbf24">${pending} pending</span>` : `<span style="color:#4ade80">OK</span>`}
        </span>
      </div>
    `;

    const globalLabel = { syncing:'Menyinkronkan...', synced:'Tersinkron', error:'Gagal sync', offline:'Offline' };
    popup.innerHTML = `
      <div style="font-size:11px;opacity:0.4;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Sync Status</div>
      ${rowHtml('Produk', _state.products, _state.pendingProducts)}
      ${rowHtml('Transaksi', _state.transactions, _state.pendingTransactions)}
      <div style="margin-top:10px;display:flex;justify-content:space-between;opacity:0.5;font-size:10px">
        <span>${globalLabel[_state.global] || 'Offline'}</span>
        <span>${new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</span>
      </div>
    `;

    document.body.appendChild(popup);
    // Tutup jika klik di luar
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!popup.contains(e.target) && e.target.id !== 'syncStatus') {
          popup.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  }

  // ── PUBLIC ───────────────────────────────────────────────────
  async function syncAll() {
    if (!isConfigured()) return;
    _setStatus('syncing', { products: 'syncing', transactions: 'syncing' });
    await push();
    await pull();
  }

  // Enqueue helper yang dipanggil dari api.js
  async function enqueue(op) {
    await DB.enqueue(op);
    // Kalau online, langsung push
    if (navigator.onLine && isConfigured()) {
      setTimeout(push, 500);
    }
  }

  // Listen event online
  window.addEventListener('online',  () => { syncAll(); });
  window.addEventListener('offline', () => { _setStatus('offline', { products: 'idle', transactions: 'idle' }); });

  return { syncAll, enqueue, isConfigured };
})();
