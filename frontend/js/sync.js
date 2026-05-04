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
    ]);
  }

  // ── PULL (cloud → lokal) ─────────────────────────────────────
  async function pull() {
    if (!isConfigured() || !navigator.onLine) return;
    try {
      await initTables();
      const results = await _sql([
        { sql: 'SELECT * FROM products ORDER BY name ASC' },
        { sql: 'SELECT * FROM transactions ORDER BY dateISO DESC' },
        { sql: 'SELECT key, value FROM settings' },
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

      // Simpan ke IndexedDB
      if (prods.length > 0) await DB.putAll('products', prods);
      if (trxs.length  > 0) await DB.putAll('transactions', trxs);
      if (Object.keys(sets).length > 0) await DB.saveSettings(sets);

      _setStatus('synced');
      console.log(`[Sync] Pull selesai: ${prods.length} produk, ${trxs.length} transaksi`);
    } catch (e) {
      console.warn('[Sync] Pull gagal:', e.message);
      _setStatus('error');
    }
  }

  // ── PUSH (lokal → cloud) ─────────────────────────────────────
  async function push() {
    if (!isConfigured() || !navigator.onLine) return;
    try {
      const queue = await DB.getQueue();
      if (queue.length === 0) return;

      await initTables();
      for (const op of queue) {
        try {
          await _executeOp(op);
          await DB.dequeue(op.qid);
        } catch (e) {
          console.warn('[Sync] Op gagal:', op.type, e.message);
        }
      }
      _setStatus('synced');
    } catch (e) {
      console.warn('[Sync] Push gagal:', e.message);
      _setStatus('error');
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
      case 'saveSettings':
        const sStmts = Object.entries(op.data).map(([k, v]) => ({
          sql: 'INSERT OR REPLACE INTO settings VALUES (?,?)', args: [k, String(v)],
        }));
        if (sStmts.length > 0) await _sql(sStmts);
        break;
    }
  }

  // ── STATUS INDICATOR ─────────────────────────────────────────
  function _setStatus(status) {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const map = {
      syncing: { icon: 'fa-sync fa-spin', color: 'text-blue-400',  title: 'Menyinkronkan...' },
      synced:  { icon: 'fa-cloud',        color: 'text-green-400', title: 'Tersinkron'        },
      error:   { icon: 'fa-cloud',        color: 'text-red-400',   title: 'Gagal sync'        },
      offline: { icon: 'fa-wifi-slash',   color: 'text-slate-400', title: 'Offline'           },
    };
    const s = map[status] || map.offline;
    el.innerHTML = `<i class="fas ${s.icon} ${s.color} text-xs" title="${s.title}"></i>`;
  }

  // ── PUBLIC ───────────────────────────────────────────────────
  async function syncAll() {
    if (!isConfigured()) return;
    _setStatus('syncing');
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
  window.addEventListener('offline', () => { _setStatus('offline'); });

  return { syncAll, enqueue, isConfigured };
})();
