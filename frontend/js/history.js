// ═══════════════════════════════════════════════════════════════
//  history.js — Riwayat Penjualan, Edit Transaksi,
//               Export/Import Backup Data
// ═══════════════════════════════════════════════════════════════

// ── RENDER HISTORY ────────────────────────────────────────────
function renderHistory() {
    const list       = document.getElementById('fullHistoryList');
    const dateFilter = document.getElementById('historyDate').value;
    let filtered     = transactions;

    if (dateFilter) {
        filtered = transactions.filter(t =>
            t.dateISO ? t.dateISO === dateFilter
                      : t.date.includes(new Date(dateFilter).toLocaleDateString('id-ID'))
        );
    }

    const methodColors = {
        TUNAI:    'bg-emerald-50 text-emerald-600',
        TRANSFER: 'bg-blue-50 text-blue-600',
        QRIS:     'bg-purple-50 text-purple-600',
        KREDIT:   'bg-orange-50 text-orange-600',
    };

    if (filtered.length === 0) {
        list.innerHTML = '<p class="text-center py-20 text-slate-300 italic">Belum ada data</p>';
        return;
    }

    list.innerHTML = [...filtered].reverse().map(t => {
        const mc = methodColors[t.payMethod || 'TUNAI'] || methodColors.TUNAI;
        return `
        <div class="bg-white p-5 rounded-[2rem] border border-slate-100 card-shadow">
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] font-black text-blue-600">${t.id}</span>
                <div class="flex items-center gap-2">
                    <span class="text-[9px] px-2 py-1 rounded-lg font-black ${mc}">${t.payMethod || 'TUNAI'}</span>
                    <span class="text-[9px] text-slate-400 font-bold uppercase">${t.date}</span>
                </div>
            </div>
            <div class="space-y-1 mb-4">
                ${t.items.map((i, idx) => `
                    <p class="text-[10px] text-slate-500 font-bold flex gap-1.5">
                        <span class="text-slate-300 w-4 text-right flex-shrink-0">${idx + 1}.</span>
                        <span>${i.name.toUpperCase()} (x${i.qty})</span>
                    </p>`).join('')}
            </div>
            <div class="flex justify-between items-center pt-3 border-t mb-3">
                <div>
                    <p class="text-[8px] text-slate-400 font-bold uppercase">Laba</p>
                    <p class="text-xs font-black text-emerald-500">Rp ${t.profit.toLocaleString()}</p>
                </div>
                <div class="text-right">
                    <p class="text-[8px] text-slate-400 font-bold uppercase">Total</p>
                    <p class="text-lg font-black text-slate-800">Rp ${t.total.toLocaleString()}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
                <button onclick="openEditTrx('${t.id}')"
                    class="bg-amber-50 text-amber-600 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform border border-amber-100">
                    <i class="fas fa-pen"></i> Edit
                </button>
                <button onclick="reprintReceipt('${t.id}')"
                    class="bg-slate-100 text-slate-600 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
                    <i class="fas fa-print"></i> Cetak
                </button>
                <button onclick="reprintBluetooth('${t.id}')"
                    class="bg-emerald-600 text-white py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
                    <i class="fas fa-bluetooth-b"></i> BT
                </button>
            </div>
        </div>`;
    }).join('');
}

// ── EDIT TRANSACTION ─────────────────────────────────────────
function openEditTrx(trxId) {
    const t = transactions.find(x => x.id === trxId);
    if (!t) { customAlert('Transaksi tidak ditemukan!', { title: 'Data Error', type: 'error' }); return; }

    document.getElementById('editTrxId').value     = trxId;
    document.getElementById('editTrxNama').value   = t.atasNama || '';

    const itemsContainer = document.getElementById('editTrxItems');
    itemsContainer.innerHTML = (t.items || []).map((item, idx) => `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100" data-idx="${idx}">
            <p class="text-[10px] font-black text-slate-500 uppercase mb-2">${item.name}</p>
            <div class="flex gap-2 items-center">
                <div class="flex-1">
                    <label class="text-[9px] text-slate-400 font-bold uppercase">Harga</label>
                    <input type="text" inputmode="numeric" class="edit-item-price w-full p-2.5 bg-white rounded-xl outline-none text-sm font-bold border border-slate-200 focus:ring-2 focus:ring-blue-400"
                        value="${Number(item.price).toLocaleString('id-ID')}" oninput="fmtInput(this); recalcEditTotal()">
                </div>
                <div class="w-24">
                    <label class="text-[9px] text-slate-400 font-bold uppercase">Qty</label>
                    <div class="flex items-center gap-1 mt-0.5">
                        <button onclick="adjustEditQty(${idx}, -1)" class="w-7 h-7 bg-slate-200 rounded-lg text-xs font-black flex items-center justify-center active:scale-90">-</button>
                        <input type="number" class="edit-item-qty w-10 p-1 bg-white rounded-lg outline-none text-sm font-black text-center border border-slate-200 focus:ring-2 focus:ring-blue-400"
                            value="${item.qty}" min="1" oninput="recalcEditTotal()">
                        <button onclick="adjustEditQty(${idx}, 1)"  class="w-7 h-7 bg-slate-200 rounded-lg text-xs font-black flex items-center justify-center active:scale-90">+</button>
                    </div>
                </div>
                <button onclick="removeEditItem(${idx})" class="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center mt-4 active:scale-90">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        </div>`).join('');

    recalcEditTotal();
    openModal('editTrxModal');
}

function adjustEditQty(idx, delta) {
    const row   = [...document.querySelectorAll('#editTrxItems [data-idx]')].find(r => r.dataset.idx == idx);
    if (!row) return;
    const qtyEl = row.querySelector('.edit-item-qty');
    qtyEl.value = Math.max(1, (parseInt(qtyEl.value) || 1) + delta);
    recalcEditTotal();
}

function removeEditItem(idx) {
    const row = [...document.querySelectorAll('#editTrxItems [data-idx]')].find(r => r.dataset.idx == idx);
    if (row) row.remove();
    recalcEditTotal();
}

function renderEditItemSuggestions() {
    const q   = (document.getElementById('editAddItemSearch')?.value || '').toLowerCase().trim();
    const box = document.getElementById('editItemSuggestions');
    if (!box) return;
    if (!q) { box.innerHTML = ''; return; }
    const results = products.filter(p => p.name.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q)).slice(0, 6);
    if (results.length === 0) {
        box.innerHTML = '<p class="text-xs text-slate-400 text-center py-2">Produk tidak ditemukan</p>';
        return;
    }
    box.innerHTML = results.map(p => `
        <button onclick="addEditItem(${p.id})"
            class="w-full flex justify-between items-center px-3 py-2 bg-white rounded-xl border border-slate-100 active:bg-blue-50 transition-all">
            <div class="text-left">
                <p class="text-xs font-black uppercase">${p.name}</p>
                <p class="text-[9px] text-slate-400">${p.category || 'Umum'}</p>
            </div>
            <div class="text-right">
                <p class="text-xs font-black text-blue-600">Rp ${p.price.toLocaleString()}</p>
                <p class="text-[9px] text-emerald-500 font-bold">+ Tambah</p>
            </div>
        </button>`).join('');
}

function addEditItem(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const newIdx = Date.now();
    const div    = document.createElement('div');
    div.className        = 'bg-slate-50 p-3 rounded-2xl border border-slate-100';
    div.dataset.idx      = newIdx;
    div.dataset.newitem  = '1';
    div.dataset.productid = productId;
    div.innerHTML = `
        <p class="text-[10px] font-black text-slate-500 uppercase mb-2">${p.name}</p>
        <div class="flex gap-2 items-center">
            <div class="flex-1">
                <label class="text-[9px] text-slate-400 font-bold uppercase">Harga</label>
                <input type="text" inputmode="numeric" class="edit-item-price w-full p-2.5 bg-white rounded-xl outline-none text-sm font-bold border border-slate-200 focus:ring-2 focus:ring-blue-400"
                    value="${Number(p.price).toLocaleString('id-ID')}" oninput="fmtInput(this); recalcEditTotal()">
            </div>
            <div class="w-24">
                <label class="text-[9px] text-slate-400 font-bold uppercase">Qty</label>
                <div class="flex items-center gap-1 mt-0.5">
                    <button onclick="adjustEditQtyEl(this,-1)" class="w-7 h-7 bg-slate-200 rounded-lg text-xs font-black flex items-center justify-center active:scale-90">-</button>
                    <input type="number" class="edit-item-qty w-10 p-1 bg-white rounded-lg outline-none text-sm font-black text-center border border-slate-200"
                        value="1" min="1" oninput="recalcEditTotal()">
                    <button onclick="adjustEditQtyEl(this,1)"  class="w-7 h-7 bg-slate-200 rounded-lg text-xs font-black flex items-center justify-center active:scale-90">+</button>
                </div>
            </div>
            <button onclick="this.closest('[data-idx]').remove(); recalcEditTotal();"
                class="w-8 h-8 bg-red-50 text-red-400 rounded-xl flex items-center justify-center mt-4 active:scale-90">
                <i class="fas fa-times text-xs"></i>
            </button>
        </div>`;
    document.getElementById('editTrxItems').appendChild(div);
    recalcEditTotal();
    vibrate(30);
    document.getElementById('editAddItemSearch').value  = '';
    document.getElementById('editItemSuggestions').innerHTML = '';
}

function adjustEditQtyEl(btn, delta) {
    const row   = btn.closest('[data-idx]');
    const qtyEl = row.querySelector('.edit-item-qty');
    qtyEl.value = Math.max(1, (parseInt(qtyEl.value) || 1) + delta);
    recalcEditTotal();
    vibrate(20);
}

function recalcEditTotal() {
    const rows  = document.querySelectorAll('#editTrxItems [data-idx]');
    let total   = 0;
    rows.forEach(row => {
        const price = parseRaw(row.querySelector('.edit-item-price')?.value || '0');
        const qty   = parseInt(row.querySelector('.edit-item-qty')?.value || '0') || 0;
        total += price * qty;
    });
    const totalEl = document.getElementById('editTrxTotal');
    if (totalEl) totalEl.value = total.toLocaleString('id-ID');
}

async function saveEditedTrx() {
    const trxId = document.getElementById('editTrxId').value;
    const idx   = transactions.findIndex(t => t.id === trxId);
    if (idx === -1) { customAlert('Transaksi tidak ditemukan!', { title: 'Data Error', type: 'error' }); return; }

    const trx            = transactions[idx];
    const rows           = document.querySelectorAll('#editTrxItems [data-idx]');
    const originalItems  = trx.items || [];

    const newItems = [...rows].map(row => {
        const isNew      = row.dataset.newitem === '1';
        const productId  = row.dataset.productid;
        const price      = parseRaw(row.querySelector('.edit-item-price')?.value || '0');
        const qty        = parseInt(row.querySelector('.edit-item-qty')?.value || '1') || 1;
        if (isNew && productId) {
            const p = products.find(x => String(x.id) === String(productId));
            return { id: p?.id, name: p?.name || 'Produk', cost: p?.cost || 0, price, qty, category: p?.category || '' };
        }
        const origItem = originalItems[parseInt(row.dataset.idx)] || {};
        return { ...origItem, price, qty };
    });

    if (newItems.length === 0) {
        customAlert('Transaksi harus punya minimal 1 item!', { title: 'Tidak Bisa Disimpan', type: 'warning' });
        return;
    }

    const updatedData = {
        atasNama:  document.getElementById('editTrxNama').value.trim(),
        payMethod: 'TUNAI',
        items:     newItems,
        total:     parseRaw(document.getElementById('editTrxTotal').value) || newItems.reduce((s, i) => s + i.price * i.qty, 0),
        profit:    newItems.reduce((s, i) => s + (i.price - (i.cost || 0)) * i.qty, 0),
    };

    try {
        await API.updateTransaction(trxId, updatedData);
        transactions[idx] = { ...trx, ...updatedData };
        closeModal('editTrxModal');
        renderHistory();
        refreshDashboard();
        vibrate(50);
        toast('Transaksi berhasil diperbarui', 'success');
    } catch (e) {
        toast('Gagal update transaksi: ' + e.message, 'error');
    }
}

function deleteTransaction(trxId) {
    customConfirm(
        `Transaksi <strong>${trxId}</strong> akan dihapus permanen dan tidak dapat dikembalikan.`,
        async () => {
            try {
                await API.deleteTransaction(trxId);
                transactions = transactions.filter(t => t.id !== trxId);
                closeModal('editTrxModal');
                renderHistory();
                refreshDashboard();
                toast('Transaksi berhasil dihapus', 'success');
            } catch (e) {
                toast('Gagal hapus transaksi: ' + e.message, 'error');
            }
        },
        { title: 'Hapus Transaksi?', confirmText: 'Ya, Hapus', danger: true }
    );
}

// ── REPRINT ───────────────────────────────────────────────────
function buildReprintHTML(t) {
    const isCash = !t.payMethod || t.payMethod === 'TUNAI';
    const change = isCash ? Math.max(0, (t.pay||0) - t.total) : 0;
    const items  = Array.isArray(t.items) ? t.items : [];
    const infoRow = (label, val) => `
        <tr>
            <td style="padding:2px 0; color:#555; font-size:9pt; width:40%;">${label}</td>
            <td style="padding:2px 0; text-align:right; font-weight:bold; font-size:9pt;">${val}</td>
        </tr>`;
    return `
        <div style="text-align:center; margin-bottom:8px;">
            <h3 style="font-size:13pt; font-weight:bold; text-transform:uppercase; margin:0;">${settings.shop}</h3>
            ${settings.address ? `<p style="margin:2px 0; font-size:9pt;">${settings.address}</p>` : ''}
            ${settings.phone   ? `<p style="margin:2px 0; font-size:9pt;">Telp/WA: ${settings.phone}</p>` : ''}
        </div>
        <div style="border-top:1px dashed black; margin:6px 0;"></div>
        <table style="width:100%; border-collapse:collapse;">
            ${t.atasNama       ? infoRow('Atas Nama', t.atasNama) : ''}
            ${infoRow('No', t.id)}
            ${infoRow('Tanggal', t.date)}
            ${settings.cashier ? infoRow('Kasir', settings.cashier) : ''}
            ${infoRow('Pembayaran', t.payMethod || 'TUNAI')}
        </table>
        <div style="border-top:1px dashed black; margin:6px 0;"></div>
        <table style="width:100%; border-collapse:collapse;">
            ${items.length > 0 ? items.map(i => `
                <tr><td style="padding:3px 0 0;" colspan="2">
                    <div style="font-weight:bold; text-transform:uppercase; font-size:10pt;">${i.name || '-'}</div>
                </td></tr>
                <tr>
                    <td style="padding:0 0 4px; font-size:9pt;">Rp${(i.price||0).toLocaleString()} x ${i.qty||1}</td>
                    <td style="text-align:right; vertical-align:bottom; font-weight:bold; font-size:9pt; padding-bottom:4px;">Rp${((i.price||0)*(i.qty||1)).toLocaleString()}</td>
                </tr>`).join('')
            : '<tr><td colspan="2" style="text-align:center; padding:4px 0; opacity:0.5;">(detail tidak tersedia)</td></tr>'}
        </table>
        <div style="border-top:1px dashed black; margin:6px 0;"></div>
        <table style="width:100%; border-collapse:collapse;">
            <tr>
                <td style="font-weight:900; font-size:12pt; padding:2px 0;">TOTAL</td>
                <td style="text-align:right; font-weight:900; font-size:12pt; padding:2px 0;">Rp ${t.total.toLocaleString()}</td>
            </tr>
            ${isCash && settings.showTunaiKembali !== false ? `
                <tr>
                    <td style="font-size:9pt; padding:2px 0; color:#555;">Tunai</td>
                    <td style="text-align:right; font-size:9pt; padding:2px 0;">Rp${(t.pay||0).toLocaleString()}</td>
                </tr>
                <tr>
                    <td style="font-size:9pt; padding:2px 0; color:#555;">Kembali</td>
                    <td style="text-align:right; font-size:9pt; padding:2px 0;">Rp${change.toLocaleString()}</td>
                </tr>` : (!isCash ? `
                <tr>
                    <td style="font-size:9pt; padding:2px 0; color:#555;">Pembayaran</td>
                    <td style="text-align:right; font-size:9pt; padding:2px 0;">${t.payMethod}</td>
                </tr>` : '')}
        </table>
        <div style="border-top:1px dashed black; margin:8px 0;"></div>
        <div style="text-align:center;">
            <p style="font-style:italic; font-size:9pt;">Terima Kasih!<br>Selamat Belanja Kembali</p>
        </div>`;
}

function reprintReceipt(trxId) {
    const t = transactions.find(t => t.id === trxId);
    if (!t) { customAlert('Data transaksi tidak ditemukan!', { title: 'Data Error', type: 'error' }); return; }
    document.getElementById('receiptArea').innerHTML = buildReprintHTML(t);
    window.print();
}

async function reprintBluetooth(trxId) {
    const t = transactions.find(x => x.id === trxId);
    if (!t) { customAlert('Data tidak ditemukan!', { title: 'Data Error', type: 'error' }); return; }
    await printBluetooth(t);
}

// ── EXPORT / IMPORT TRANSAKSI (BARU) ─────────────────────────

/** Export semua transaksi sebagai JSON backup */
function exportTransactions() {
    if (transactions.length === 0) {
        toast('Belum ada data transaksi untuk diexport', 'warning');
        return;
    }
    const payload = { exportDate: new Date().toISOString(), shop: settings.shop, transactions };
    const blob    = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a       = document.createElement('a');
    a.href        = URL.createObjectURL(blob);
    a.download    = `backup_transaksi_${settings.shop.replace(/\s+/g,'_')}_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.json`;
    a.click();
    toast(`${transactions.length} transaksi berhasil dibackup!`, 'success');
}

/** Export transaksi ke CSV — bisa dibuka di Excel */
function exportTransactionsCSV() {
    if (transactions.length === 0) {
        toast('Belum ada data transaksi untuk diexport', 'warning');
        return;
    }

    const header = ['No Transaksi', 'Tanggal', 'Atas Nama', 'Metode', 'Item', 'Total', 'Laba'];
    const rows   = transactions.map(t => [
        t.id,
        t.date,
        t.atasNama || '-',
        t.payMethod || 'TUNAI',
        (t.items || []).map(i => `${i.name} x${i.qty}`).join(' | '),
        t.total,
        t.profit,
    ]);

    const escape = v => `"${String(v).replace(/"/g, '""')}"`;
    const csv    = [header, ...rows].map(r => r.map(escape).join(',')).join('\n');

    // BOM (\uFEFF) supaya Excel bisa baca UTF-8 dengan benar
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a      = document.createElement('a');
    a.href       = URL.createObjectURL(blob);
    a.download   = `laporan_${settings.shop.replace(/\s+/g,'_')}_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.csv`;
    a.click();
    toast('Laporan CSV siap dibuka di Excel!', 'success');
}

/** Import backup JSON transaksi */
function importTransactions(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            // Support format: array langsung, atau {transactions:[...]}
            const imported = Array.isArray(parsed) ? parsed : (parsed.transactions || null);
            if (!imported || !Array.isArray(imported)) throw new Error('Format file backup tidak valid');

            customConfirm(
                `File berisi <strong>${imported.length} transaksi</strong>. Data akan digabung ke riwayat yang sudah ada.`,
                async () => {
                    const existingIds = new Set(transactions.map(t => t.id));
                    const newTrx      = imported.filter(t => t.id && !existingIds.has(t.id));
                    let saved = 0;
                    for (const t of newTrx) {
                        try { await API.createTransaction(t); saved++; } catch(e) {}
                    }
                    transactions = [...transactions, ...newTrx.slice(0, saved)].sort((a, b) =>
                        (a.dateISO || '').localeCompare(b.dateISO || '')
                    );
                    renderHistory();
                    refreshDashboard();
                    toast(`${saved} transaksi baru berhasil diimport!`, 'success');
                },
                { title: 'Import Backup?', confirmText: 'Ya, Gabungkan' }
            );
        } catch (err) {
            customAlert(`Gagal membaca file: ${err.message}`, { title: 'Import Gagal', type: 'error' });
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}
