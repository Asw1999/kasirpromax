// ═══════════════════════════════════════════════════════════════
//  receipt.js — Editor Resi, Print, Bluetooth ESC/POS
// ═══════════════════════════════════════════════════════════════

function processAndPreview() {
    const total    = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const profit   = cart.reduce((s, i) => s + (i.price - i.cost) * i.qty, 0);
    const isCash   = currentPayMethod === 'TUNAI';
    const pay      = isCash ? parseRaw(document.getElementById('payAmount').value) : total;
    const atasNama = (document.getElementById('atasNamaInput')?.value || '').trim();

    if (isCash && pay < total && total > 0) {
        customAlert('Nominal uang bayar kurang dari total belanja!', { title: 'Pembayaran Kurang', type: 'error' });
        return;
    }

    // Cek apakah draft yang ada masih relevan dengan cart sekarang
    // (bandingkan item IDs + qty supaya kalau cart berubah, draft di-reset)
    const cartSnapshot    = cart.map(i => `${i.id}:${i.qty}`).join(',');
    const draft           = window.pendingTrxDraft;
    const draftStillValid = draft && draft.cartSnapshot === cartSnapshot;

    // Reuse trxId & dateStr dari draft kalau masih valid, biar match saat restore
    const trxId   = draftStillValid ? draft.trxId   : 'INV-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const dateStr = draftStillValid ? draft.dateStr : new Date().toLocaleString('id-ID');

    window.pendingTrx = {
        id: trxId, date: dateStr,
        dateISO:    new Date().toISOString(),
        atasNama,
        customerId: window._selectedCustomerId || null,
        items:      [...cart],
        total, profit, pay,
        change:     isCash ? pay - total : 0,
        payMethod:  currentPayMethod,
    };
    window.currentTrxId = trxId;

    closeModal('checkoutModal');
    openModal('editorModal');

    // Restore draft kalau cart masih sama, build fresh kalau cart berubah
    if (draftStillValid) {
        _restoreCanvasFromDraft(draft);
    } else {
        window.pendingTrxDraft = null;
        _buildReceiptCanvas(atasNama, trxId, dateStr, total, pay, isCash);
        _attachDraftSaver();
    }
}

function _buildReceiptCanvas(atasNama, trxId, dateStr, total, pay, isCash) {
    const canvas   = document.getElementById('receiptEditorCanvas');
    const showTK   = settings.showTunaiKembali !== false;
    const change   = isCash ? pay - total : 0;

    const tunaiKembaliRow = isCash
        ? (showTK ? `
            <tr>
                <td class="py-0.5 text-slate-500 text-xs w-28">Tunai</td>
                <td class="py-0.5 text-right font-bold">
                    <span id="editorTunai" class="editable-field" contenteditable="true" oninput="recalcKembali()" onblur="_fmtEditorSpan(this)">Rp${pay.toLocaleString('id-ID')}</span>
                </td>
            </tr>
            <tr>
                <td class="py-0.5 text-slate-500 text-xs">Kembali</td>
                <td class="py-0.5 text-right font-bold">
                    <span id="editorKembali" class="editable-field" contenteditable="true">Rp${change.toLocaleString('id-ID')}</span>
                </td>
            </tr>` : '')
        : `<tr>
                <td class="py-0.5 text-slate-500 text-xs w-28">Pembayaran</td>
                <td class="py-0.5 text-right font-bold">
                    <span id="editorTunai" class="editable-field" contenteditable="true">${currentPayMethod}</span>
                </td>
           </tr>`;

    canvas.innerHTML = `
        <div class="text-center mb-3">
            <h3 class="editable-field text-sm font-black uppercase tracking-wide" contenteditable="true">${settings.shop}</h3>
            ${settings.address ? `<p class="editable-field text-xs" contenteditable="true">${settings.address}</p>` : ''}
            ${settings.phone   ? `<p class="editable-field text-xs" contenteditable="true">Telp/WA: ${settings.phone}</p>` : ''}
        </div>
        <div class="border-t border-dashed border-black my-2"></div>
        <table class="w-full text-xs mb-1">
            ${atasNama ? `<tr>
                <td class="py-0.5 text-slate-500 w-28">Atas Nama</td>
                <td class="py-0.5 text-right font-bold editable-field" contenteditable="true">${atasNama}</td>
            </tr>` : ''}
            <tr><td class="py-0.5 text-slate-500">No</td>      <td class="py-0.5 text-right editable-field" contenteditable="true">${trxId}</td></tr>
            <tr><td class="py-0.5 text-slate-500">Tanggal</td> <td class="py-0.5 text-right editable-field" contenteditable="true">${dateStr}</td></tr>
            ${settings.cashier ? `<tr>
                <td class="py-0.5 text-slate-500">Kasir</td>
                <td class="py-0.5 text-right editable-field" contenteditable="true">${settings.cashier}</td>
            </tr>` : ''}
            <tr><td class="py-0.5 text-slate-500">Pembayaran</td><td class="py-0.5 text-right editable-field" contenteditable="true">${currentPayMethod}</td></tr>
        </table>
        <div class="border-t border-dashed border-black my-2"></div>
        <table class="w-full mb-2" id="editorTable">
            ${cart.map(i => `
                <tr data-productid="${i.id}">
                    <td class="pt-2 pb-0.5">
                        <div class="font-bold uppercase editable-field text-xs" contenteditable="true">${i.name}</div>
                    </td>
                    <td></td>
                </tr>
                <tr data-productid="${i.id}" class="item-detail-row">
                    <td class="pb-1 text-xs">
                        Rp<span class="editable-field calc-price" contenteditable="true" oninput="recalcReceipt()">${i.price.toLocaleString('id-ID')}</span>
                        x
                        <span class="editable-field calc-qty" contenteditable="true" oninput="recalcReceipt()">${i.qty}</span>
                    </td>
                    <td class="text-right pb-1 align-bottom font-bold text-xs">Rp<span class="calc-subtotal">${(i.price * i.qty).toLocaleString('id-ID')}</span></td>
                </tr>`).join('')}
        </table>
        <div class="border-t border-dashed border-black my-2"></div>
        <table class="w-full text-xs">
            <tr>
                <td class="py-1 font-normal text-xs">TOTAL</td>
                <td class="py-1 text-right font-normal text-xs">Rp<span id="editorGrandTotal" class="editable-field" contenteditable="true" oninput="recalcKembali(); syncTotalToStorage()" onblur="_fmtEditorSpan(this)">${total.toLocaleString('id-ID')}</span></td>
            </tr>
            ${tunaiKembaliRow}
        </table>
        <div class="border-t border-dashed border-black mt-3 mb-2"></div>
        <div class="text-center mt-3">
            <p class="editable-field italic text-xs" contenteditable="true">Terima Kasih!<br>Selamat Belanja Kembali</p>
        </div>`;
}

// ── DRAFT SAVE / RESTORE ──────────────────────────────────────
// Auto-save semua editan di canvas ke window.pendingTrxDraft.
// Draft dipakai untuk restore kalau modal ditutup sebelum print.

function _attachDraftSaver() {
    const canvas = document.getElementById('receiptEditorCanvas');
    if (!canvas) return;
    // Gunakan MutationObserver supaya catch semua perubahan contenteditable
    if (window._draftObserver) window._draftObserver.disconnect();
    window._draftObserver = new MutationObserver(() => {
        if (window.pendingTrx) {
            window.pendingTrxDraft = _serializeCanvasToDraft();
        }
    });
    window._draftObserver.observe(canvas, { subtree: true, characterData: true, childList: true });
}

function _serializeCanvasToDraft() {
    const canvas = document.getElementById('receiptEditorCanvas');
    if (!canvas || !window.pendingTrx) return null;

    // Ambil semua field header
    const headerFields = [];
    canvas.querySelectorAll(':scope > div:first-child [contenteditable], table [contenteditable]').forEach((el, i) => {
        headerFields.push({ index: i, html: el.innerHTML, text: el.innerText });
    });

    // Ambil semua item di editorTable
    const items = [];
    document.querySelectorAll('#editorTable tr[data-productid]').forEach(nameRow => {
        const detailRow = nameRow.nextElementSibling;
        if (!detailRow) return;
        items.push({
            productId: nameRow.dataset.productid,
            name:  nameRow.querySelector('[contenteditable]')?.innerText || '',
            price: detailRow.querySelector('.calc-price')?.innerText || '',
            qty:   detailRow.querySelector('.calc-qty')?.innerText || '',
        });
    });

    // Ambil field footer (terima kasih, dll)
    const footerEl = canvas.querySelector('.italic[contenteditable]');

    return {
        trxId:        window.pendingTrx.id,
        dateStr:      window.pendingTrx.date,
        cartSnapshot: cart.map(i => `${i.id}:${i.qty}`).join(','),
        headerFields,
        items,
        footer:       footerEl ? footerEl.innerHTML : null,
        grandTotal:   document.getElementById('editorGrandTotal')?.innerText || '',
        tunai:        document.getElementById('editorTunai')?.innerText || '',
        kembali:      document.getElementById('editorKembali')?.innerText || '',
    };
}

function _restoreCanvasFromDraft(draft) {
    // Build canvas fresh dulu (struktur HTML tetap valid)
    const t = window.pendingTrx;
    const isCash = !t.payMethod || t.payMethod === 'TUNAI';
    _buildReceiptCanvas(t.atasNama, t.id, t.date, t.total, t.pay, isCash);

    // Restore header fields by index
    const canvas = document.getElementById('receiptEditorCanvas');
    const editables = canvas.querySelectorAll(':scope > div:first-child [contenteditable], table [contenteditable]');
    draft.headerFields.forEach(({ index, html }) => {
        if (editables[index]) editables[index].innerHTML = html;
    });

    // Restore item names, price, qty per productId
    draft.items.forEach(saved => {
        const nameRow = document.querySelector(`#editorTable tr[data-productid="${saved.productId}"]`);
        if (!nameRow) return;
        const nameEl  = nameRow.querySelector('[contenteditable]');
        const detailRow = nameRow.nextElementSibling;
        if (nameEl) nameEl.innerText = saved.name;
        if (detailRow) {
            const priceEl = detailRow.querySelector('.calc-price');
            const qtyEl   = detailRow.querySelector('.calc-qty');
            if (priceEl) priceEl.innerText = saved.price;
            if (qtyEl)   qtyEl.innerText   = saved.qty;
        }
    });

    // Restore total, tunai, kembali
    const totalEl   = document.getElementById('editorGrandTotal');
    const tunaiEl   = document.getElementById('editorTunai');
    const kembaliEl = document.getElementById('editorKembali');
    if (totalEl   && draft.grandTotal) totalEl.innerText   = draft.grandTotal;
    if (tunaiEl   && draft.tunai)      tunaiEl.innerText   = draft.tunai;
    if (kembaliEl && draft.kembali)    kembaliEl.innerText = draft.kembali;

    // Restore footer
    const footerEl = canvas.querySelector('.italic[contenteditable]');
    if (footerEl && draft.footer) footerEl.innerHTML = draft.footer;

    // Re-attach observer supaya draft tetap terupdate
    _attachDraftSaver();

    toast('Draft editan struk dipulihkan ✓', 'success');
}

function recalcReceipt() {
    let grandTotal = 0, newProfit = 0;
    document.querySelectorAll('#editorTable .item-detail-row').forEach(row => {
        const qtyEl   = row.querySelector('.calc-qty');
        const priceEl = row.querySelector('.calc-price');
        if (!qtyEl || !priceEl) return;
        const qty   = parseFloat(qtyEl.innerText.replace(/\./g, ''))  || 0;
        const price = parseFloat(priceEl.innerText.replace(/\./g, '')) || 0;
        const sub   = qty * price;
        const subEl = row.querySelector('.calc-subtotal');
        if (subEl) subEl.innerText = sub.toLocaleString('id-ID');
        grandTotal += sub;
        const product = products.find(p => String(p.id) === String(row.dataset.productid));
        newProfit += (price - (product ? product.cost : 0)) * qty;
    });

    document.getElementById('editorGrandTotal').innerText = grandTotal.toLocaleString('id-ID');
    const tunaiEl   = document.getElementById('editorTunai');
    const kembaliEl = document.getElementById('editorKembali');
    if (tunaiEl && kembaliEl) {
        const tunai    = parseRpStr(tunaiEl.innerText);
        kembaliEl.innerText = 'Rp' + Math.max(0, tunai - grandTotal).toLocaleString('id-ID');
    }
    if (window.pendingTrx) {
        window.pendingTrx.total  = grandTotal;
        window.pendingTrx.profit = newProfit;
        const t2 = tunaiEl ? parseRpStr(tunaiEl.innerText) : 0;
        window.pendingTrx.change = Math.max(0, t2 - grandTotal);
    }
}

// Auto-format angka di contenteditable span (strip non-digit, reformat dengan titik ribuan)
// Dipanggil onblur supaya tidak ganggu cursor saat mengetik
function _fmtEditorSpan(el) {
    const raw = parseRaw(el.innerText);
    if (!isNaN(raw) && raw > 0) {
        // Preserve "Rp" prefix jika ada
        const hasRp = el.innerText.trim().startsWith('Rp');
        el.innerText = (hasRp ? 'Rp' : '') + raw.toLocaleString('id-ID');
    }
}

function recalcKembali() {
    const tunaiEl   = document.getElementById('editorTunai');
    const kembaliEl = document.getElementById('editorKembali');
    const totalEl   = document.getElementById('editorGrandTotal');
    if (!tunaiEl || !kembaliEl || !totalEl) return;
    const tunai    = parseRpStr(tunaiEl.innerText);
    const total    = parseRpStr(totalEl.innerText);
    kembaliEl.innerText = 'Rp' + Math.max(0, tunai - total).toLocaleString('id-ID');
}

function syncTotalToStorage() {
    if (!window.pendingTrx) return;
    const totalEl  = document.getElementById('editorGrandTotal');
    const tunaiEl  = document.getElementById('editorTunai');
    if (!totalEl) return;
    const grandTotal = parseRpStr(totalEl.innerText);
    const tunai      = tunaiEl ? parseRpStr(tunaiEl.innerText) : 0;
    window.pendingTrx.total  = grandTotal;
    window.pendingTrx.change = Math.max(0, tunai - grandTotal);
}

async function commitTrx() {
    if (window.pendingTrx) {
        try {
            await API.createTransaction(window.pendingTrx);
            transactions.push({ ...window.pendingTrx });
        } catch (e) {
            toast('Gagal simpan transaksi ke server: ' + e.message, 'error');
            // Tetap lanjut print meski gagal simpan, biar ga block kasir
        }
        window.pendingTrx = null;
    }
}

async function printFinalReceipt() {
    await commitTrx();
    const editorHTML = document.getElementById('receiptEditorCanvas').innerHTML;
    const printArea  = document.getElementById('receiptArea');
    printArea.innerHTML = editorHTML;
    printArea.querySelectorAll('[contenteditable]').forEach(el => {
        el.removeAttribute('contenteditable');
        el.classList.remove('editable-field');
    });
    window.print();
    _resetAfterPrint();
}

function _resetAfterPrint() {
    // Clear draft — transaksi sudah selesai
    window.pendingTrxDraft = null;
    if (window._draftObserver) {
        window._draftObserver.disconnect();
        window._draftObserver = null;
    }
    closeModal('editorModal');
    const aN = document.getElementById('payAmount');
    if (aN) aN.value = '';
    const bN = document.getElementById('atasNamaInput');
    if (bN) bN.value = '';
    cart = [];
    updateCartUI();
    switchView('home');
}

// ── BLUETOOTH ESC/POS ─────────────────────────────────────────
async function printBluetooth(reprintTrx = null) {
    if (!navigator.bluetooth) {
        // ✅ Diganti dari alert() ke customAlert()
        customAlert(
            'Browser ini tidak support Web Bluetooth. Gunakan Chrome di Android dan pastikan koneksi HTTPS atau localhost.',
            { title: 'Bluetooth Tidak Tersedia', type: 'error' }
        );
        return;
    }

    const statusDiv = _createBtStatus('Menghubungkan printer...<br><small style="opacity:0.6">Pilih printer Bluetooth Anda</small>', 'fa-bluetooth-b', '#34d399');
    document.body.appendChild(statusDiv);

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters:          [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
            optionalServices: [
                '000018f0-0000-1000-8000-00805f9b34fb',
                'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
                '49535343-fe7d-4ae5-8fa9-9fafd205e455',
            ],
        });

        _updateBtStatus(statusDiv, 'Terhubung! Mengirim data...', 'fa-spinner fa-spin', '#60a5fa');

        const server = await device.gatt.connect();
        let characteristic = null;
        const serviceUUIDs = ['000018f0-0000-1000-8000-00805f9b34fb','e7810a71-73ae-499d-8c15-faa9aef0c3f2','49535343-fe7d-4ae5-8fa9-9fafd205e455'];
        const charUUIDs    = ['00002af1-0000-1000-8000-00805f9b34fb','bef8d6c9-9c21-4c9e-b632-bd58c1009f9f','49535343-8841-43f4-a8d4-ecbe34729bb3'];

        for (const svcUUID of serviceUUIDs) {
            try {
                const service = await server.getPrimaryService(svcUUID);
                for (const charUUID of charUUIDs) {
                    try { characteristic = await service.getCharacteristic(charUUID); if (characteristic) break; } catch(e) {}
                }
                if (characteristic) break;
            } catch(e) {}
        }
        if (!characteristic) throw new Error('Karakteristik printer tidak ditemukan. Pastikan ini printer termal ESC/POS Bluetooth.');

        const data = buildEscPos(reprintTrx || null);
        const CHUNK = 100;   // ↓ dari 512 → kompatibel RPP02N & printer BT budget (MTU ~128-200 bytes)
        for (let i = 0; i < data.length; i += CHUNK) {
            await characteristic.writeValueWithoutResponse(data.slice(i, i + CHUNK));
            await new Promise(r => setTimeout(r, 30));  // 30ms cukup untuk chunk kecil
        }

        _updateBtStatus(statusDiv, '<b>Berhasil dicetak!</b>', 'fa-check-circle', '#34d399');
        if (!reprintTrx) await commitTrx();
        setTimeout(() => {
            document.body.removeChild(statusDiv);
            if (!reprintTrx) _resetAfterPrint();
        }, 2000);

    } catch (err) {
        document.body.removeChild(statusDiv);
        if (err.name !== 'NotFoundError' && !err.message.includes('cancelled')) {
            // ✅ Diganti dari alert() ke customAlert()
            customAlert(
                `Gagal cetak Bluetooth: ${err.message}<br><br><small>Tips: Pastikan printer menyala & dalam jangkauan.</small>`,
                { title: 'Cetak Gagal', type: 'error' }
            );
        }
    }
}

function _createBtStatus(html, icon, color) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1e293b;color:white;padding:20px 28px;border-radius:16px;z-index:9999;font-family:Inter,sans-serif;font-size:14px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);min-width:240px;';
    div.innerHTML = `<i class="fas ${icon}" style="font-size:24px;color:${color};"></i><br><br>${html}`;
    return div;
}

function _updateBtStatus(div, html, icon, color) {
    div.innerHTML = `<i class="fas ${icon}" style="font-size:24px;color:${color};"></i><br><br>${html}`;
}

function buildEscPos(trxData = null) {
    const ESC = 0x1B, GS = 0x1D;
    const bytes = [];
    const push        = (...args) => bytes.push(...args);
    const text        = str => { for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); push(c < 256 ? c : 0x3F); } };
    const lf          = () => push(0x0A);
    const center      = () => push(ESC, 0x61, 0x01);
    const left        = () => push(ESC, 0x61, 0x00);
    const bold        = on => push(ESC, 0x45, on ? 1 : 0);
    const dashes      = () => { text('--------------------------------'); lf(); };
    const fmtNum      = n => Number(n).toLocaleString('id-ID');
    const padLine     = (l, r) => { const rs = String(r); const maxL = 32 - rs.length - 1; const ls = l.length > maxL ? l.slice(0, maxL) : l; return ls + ' '.repeat(Math.max(1, 32 - ls.length - rs.length)) + rs; };
    const infoRow     = (label, value) => { text(padLine(label, value)); lf(); };

    push(ESC, 0x40);
    push(ESC, 0x4D, 0x00);

    center(); bold(true);
    text((settings.shop || 'WARUNG').toUpperCase()); lf();
    bold(false);
    if (settings.address) { text(settings.address); lf(); }
    if (settings.phone)   { text('Telp/WA: ' + settings.phone); lf(); }
    dashes();
    left();

    if (trxData) {
        const isCash = !trxData.payMethod || trxData.payMethod === 'TUNAI';
        if (trxData.atasNama) infoRow('Atas Nama', trxData.atasNama);
        infoRow('No', trxData.id);
        infoRow('Tanggal', trxData.date);
        if (settings.cashier) infoRow('Kasir', settings.cashier);
        infoRow('Pembayaran', trxData.payMethod || 'TUNAI');
        dashes();
        (trxData.items || []).forEach(i => {
            bold(true); text(String(i.name).toUpperCase()); lf(); bold(false);
            text(padLine('Rp' + fmtNum(i.price) + ' x ' + i.qty, 'Rp' + fmtNum(i.price * i.qty))); lf();
        });
        dashes();
        text(padLine('TOTAL', 'Rp' + fmtNum(trxData.total))); lf();
        if (isCash && settings.showTunaiKembali !== false) {
            text(padLine('Tunai',   'Rp' + fmtNum(trxData.pay||0))); lf();
            text(padLine('Kembali', 'Rp' + fmtNum(Math.max(0,(trxData.pay||0) - trxData.total)))); lf();
        } else if (!isCash) {
            text(padLine('Pembayaran', trxData.payMethod)); lf();
        }
    } else {
        const t = window.pendingTrx;
        if (!t) return new Uint8Array([]);
        const isCashNew = !t.payMethod || t.payMethod === 'TUNAI';
        if (t.atasNama) infoRow('Atas Nama', t.atasNama);
        infoRow('No', t.id);
        infoRow('Tanggal', t.date);
        if (settings.cashier) infoRow('Kasir', settings.cashier);
        infoRow('Pembayaran', t.payMethod || 'TUNAI');
        dashes();
        document.querySelectorAll('#editorTable .item-detail-row').forEach(row => {
            const nameEl  = row.previousElementSibling?.querySelector('.font-bold, [contenteditable]');
            const qtyEl   = row.querySelector('.calc-qty');
            const priceEl = row.querySelector('.calc-price');
            const subEl   = row.querySelector('.calc-subtotal');
            const name    = nameEl  ? nameEl.innerText.trim().toUpperCase() : '';
            const qty     = qtyEl   ? qtyEl.innerText.trim()   : '';
            const price   = priceEl ? priceEl.innerText.trim()  : '';
            const sub     = subEl   ? subEl.innerText.trim()    : '';
            bold(true); text(name); lf(); bold(false);
            text(padLine('Rp' + price + ' x ' + qty, 'Rp' + sub)); lf();
        });
        dashes();
        const totalEl   = document.getElementById('editorGrandTotal');
        const tunaiEl   = document.getElementById('editorTunai');
        const kembaliEl = document.getElementById('editorKembali');
        const editedTotal   = totalEl   ? parseRpStr(totalEl.innerText)   : t.total;
        const editedTunai   = tunaiEl   ? parseRpStr(tunaiEl.innerText)   : (t.pay||0);
        const editedKembali = kembaliEl ? parseRpStr(kembaliEl.innerText) : Math.max(0,(t.pay||0)-t.total);
        text(padLine('TOTAL', 'Rp' + fmtNum(editedTotal))); lf();
        if (isCashNew && settings.showTunaiKembali !== false) {
            text(padLine('Tunai',   'Rp' + fmtNum(editedTunai)));   lf();
            text(padLine('Kembali', 'Rp' + fmtNum(editedKembali))); lf();
        } else if (!isCashNew) {
            text(padLine('Pembayaran', t.payMethod)); lf();
        }
    }

    dashes();
    center();
    text('Terima Kasih!'); lf();
    text('Selamat Belanja Kembali'); lf();
    lf(); lf(); lf(); lf(); lf();          // extra feed supaya konten tidak terpotong
    push(GS, 0x56, 0x42, 0x20);           // GS V B 32 = feed 32 dots lalu partial cut (RPP02N-friendly)
    return new Uint8Array(bytes);
}

// ─── KONFIRMASI TUTUP EDITOR ──────────────────────────────────────────────────
// Tombol TUTUP di editorModal → buka modal konfirmasi custom dulu
function confirmCloseEditor() {
    openModal('confirmCloseModal');
}

// Dipanggil tombol "Ya, Batalkan" di confirmCloseModal
function doCloseEditor() {
    window.pendingTrx      = null;
    window.pendingTrxDraft = null;
    closeModal('confirmCloseModal');
    closeModal('editorModal');
    switchView('pos');
    updateCartUI();
}
