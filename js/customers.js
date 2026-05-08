// ═══════════════════════════════════════════════════════════════
//  customers.js — Database Pelanggan / Member
// ═══════════════════════════════════════════════════════════════

// ID pelanggan yang sedang dipilih di checkout (null = tamu biasa)
window._selectedCustomerId = null;

// ── RENDER LIST ───────────────────────────────────────────────
function renderCustomers() {
    const list   = document.getElementById('customerList');
    const search = (document.getElementById('searchCustomer')?.value || '').toLowerCase().trim();

    const filtered = customers.filter(c =>
        !search ||
        c.name.toLowerCase().includes(search) ||
        (c.phone || '').includes(search)
    );

    const countEl = document.getElementById('customerCount');
    if (countEl) {
        countEl.innerText = search
            ? `${filtered.length} dari ${customers.length} pelanggan`
            : `${customers.length} pelanggan`;
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="text-center py-16 text-slate-300">
                <i class="fas fa-users text-4xl mb-3 block"></i>
                <p class="font-bold text-sm">${search ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}</p>
                <p class="text-xs mt-1">${search ? '"' + search + '" tidak ada di daftar' : 'Tap + untuk tambah pelanggan baru'}</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(c => {
        // Hitung statistik dari transaksi (computed live, selalu akurat)
        const cTrxs      = transactions.filter(t => t.customerId === c.id);
        const totalSpent = cTrxs.reduce((s, t) => s + (t.total || 0), 0);
        const trxCount   = cTrxs.length;
        const initial    = c.name.charAt(0).toUpperCase();

        // Warna avatar berdasarkan huruf pertama (A-Z → 5 warna cycling)
        const avatarColors = [
            'bg-blue-100 text-blue-600',
            'bg-emerald-100 text-emerald-600',
            'bg-purple-100 text-purple-600',
            'bg-amber-100 text-amber-600',
            'bg-rose-100 text-rose-600',
        ];
        const avatarClass = avatarColors[initial.charCodeAt(0) % avatarColors.length];

        return `
        <div class="bg-white p-5 rounded-[2rem] border border-slate-100 card-shadow">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-12 h-12 ${avatarClass} rounded-full flex items-center justify-center font-black text-lg flex-shrink-0">
                    ${initial}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-black text-sm uppercase truncate">${c.name}</p>
                    <p class="text-xs text-slate-400 font-bold">${c.phone || '—'}</p>
                    <p class="text-[9px] text-slate-300 mt-0.5">Bergabung ${c.joinDate || '—'}</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="openCustomerModal('${c.id}')"
                        class="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-pen text-xs"></i>
                    </button>
                    <button onclick="confirmDeleteCustomer('${c.id}')"
                        class="w-10 h-10 bg-red-50 text-red-400 rounded-full flex items-center justify-center">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50">
                <div class="bg-slate-50 rounded-2xl p-3 text-center">
                    <p class="text-[9px] text-slate-400 font-bold uppercase">Total Transaksi</p>
                    <p class="text-base font-black text-slate-700">${trxCount}×</p>
                </div>
                <div class="bg-emerald-50 rounded-2xl p-3 text-center">
                    <p class="text-[9px] text-emerald-500 font-bold uppercase">Total Belanja</p>
                    <p class="text-sm font-black text-emerald-600">Rp ${totalSpent.toLocaleString('id-ID')}</p>
                </div>
            </div>
            ${c.notes ? `
            <p class="text-[10px] text-slate-400 italic mt-3 pt-3 border-t border-slate-50 leading-relaxed">
                <i class="fas fa-sticky-note mr-1 opacity-50"></i>${c.notes}
            </p>` : ''}
        </div>`;
    }).join('');
}

// ── ADD / EDIT MODAL ──────────────────────────────────────────
function openCustomerModal(editId = null) {
    document.getElementById('custEditId').value = editId || '';
    if (editId) {
        const c = customers.find(x => x.id === editId);
        if (!c) return;
        document.getElementById('customerModalTitle').innerText = 'Edit Pelanggan';
        document.getElementById('custName').value  = c.name;
        document.getElementById('custPhone').value = c.phone || '';
        document.getElementById('custNotes').value = c.notes || '';
    } else {
        document.getElementById('customerModalTitle').innerText = 'Tambah Pelanggan';
        ['custName', 'custPhone', 'custNotes'].forEach(id => document.getElementById(id).value = '');
    }
    openModal('customerModal');
    setTimeout(() => document.getElementById('custName').focus(), 150);
}

async function saveCustomer() {
    const name   = document.getElementById('custName').value.trim();
    const phone  = document.getElementById('custPhone').value.trim();
    const notes  = document.getElementById('custNotes').value.trim();
    const editId = document.getElementById('custEditId').value;

    if (!name) {
        customAlert('Nama pelanggan wajib diisi!', { title: 'Form Belum Lengkap', type: 'warning' });
        return;
    }

    try {
        if (editId) {
            const updated = await API.updateCustomer(editId, { name, phone, notes });
            const idx = customers.findIndex(c => c.id === editId);
            if (idx !== -1) customers[idx] = updated;
            toast('Data pelanggan diperbarui', 'success');
        } else {
            const created = await API.createCustomer({ name, phone, notes });
            customers.push(created);
            toast(`${name} ditambahkan ke daftar pelanggan!`, 'success');
        }
        closeModal('customerModal');
        renderCustomers();
    } catch (e) {
        toast('Gagal simpan pelanggan: ' + e.message, 'error');
    }
}

function confirmDeleteCustomer(id) {
    const c = customers.find(x => x.id === id);
    if (!c) return;
    const cTrxs = transactions.filter(t => t.customerId === id).length;
    const note  = cTrxs > 0
        ? `<br><span class="text-amber-500 text-xs">(${cTrxs} riwayat transaksi terkait tidak akan terhapus)</span>`
        : '';
    customConfirm(
        `<strong>${c.name}</strong> akan dihapus dari daftar pelanggan.${note}`,
        async () => {
            try {
                await API.deleteCustomer(id);
                customers = customers.filter(x => x.id !== id);
                renderCustomers();
                toast('Pelanggan dihapus', 'success');
            } catch (e) {
                toast('Gagal hapus: ' + e.message, 'error');
            }
        },
        { title: 'Hapus Pelanggan?', confirmText: 'Ya, Hapus', danger: true }
    );
}

// ── CHECKOUT AUTOCOMPLETE ─────────────────────────────────────
// Dipanggil saat openCheckout() — attach autocomplete ke atasNamaInput
function initCustomerAutocomplete() {
    const input = document.getElementById('atasNamaInput');
    const drop  = document.getElementById('customerDropdown');
    if (!input || !drop) return;

    // Reset state
    window._selectedCustomerId = null;

    input.oninput = () => {
        const q = input.value.toLowerCase().trim();
        window._selectedCustomerId = null;   // reset saat user ketik manual
        if (!q || customers.length === 0) { drop.classList.add('hidden'); return; }

        const results = customers
            .filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
            .slice(0, 5);

        if (results.length === 0) { drop.classList.add('hidden'); return; }

        drop.innerHTML = results.map(c => {
            const cTrxs = transactions.filter(t => t.customerId === c.id).length;
            return `
            <button type="button" onclick="_selectCustomerFromDrop('${c.id}', '${c.name.replace(/'/g, "\\'")}')"
                class="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 active:bg-blue-100 transition-colors text-left border-b border-slate-50 last:border-0">
                <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0">
                    ${c.name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold uppercase truncate">${c.name}</p>
                    <p class="text-[10px] text-slate-400">${c.phone || '—'} · ${cTrxs}× transaksi</p>
                </div>
                <i class="fas fa-check text-blue-400 text-xs opacity-0 check-icon"></i>
            </button>`;
        }).join('');
        drop.classList.remove('hidden');
    };

    // Tutup dropdown kalau klik di luar
    document.addEventListener('click', _closeCustomerDrop);
}

function _selectCustomerFromDrop(id, name) {
    const input = document.getElementById('atasNamaInput');
    const drop  = document.getElementById('customerDropdown');
    if (input) input.value = name;
    window._selectedCustomerId = id;
    if (drop) drop.classList.add('hidden');
    vibrate(30);
}

function _closeCustomerDrop(e) {
    const drop  = document.getElementById('customerDropdown');
    const input = document.getElementById('atasNamaInput');
    if (!drop || !input) return;
    if (!drop.contains(e.target) && e.target !== input) {
        drop.classList.add('hidden');
    }
}

// ── RIWAYAT TRANSAKSI PELANGGAN ───────────────────────────────
function openCustomerHistory(customerId) {
    const c    = customers.find(x => x.id === customerId);
    if (!c) return;
    const cTrxs = [...transactions]
        .filter(t => t.customerId === customerId)
        .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center';
    const total = cTrxs.reduce((s, t) => s + t.total, 0);

    overlay.innerHTML = `
        <div style="animation:modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both"
             class="bg-white w-full max-w-md rounded-t-[2rem] p-6 max-h-[80vh] flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <div>
                    <h3 class="text-base font-black uppercase">${c.name}</h3>
                    <p class="text-xs text-slate-400">${cTrxs.length} transaksi · Rp ${total.toLocaleString('id-ID')}</p>
                </div>
                <button onclick="this.closest('.fixed').remove()"
                    class="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                    <i class="fas fa-times text-sm"></i>
                </button>
            </div>
            <div class="overflow-y-auto space-y-3 flex-1">
                ${cTrxs.length === 0
                    ? '<p class="text-center text-slate-300 italic py-8">Belum ada transaksi</p>'
                    : cTrxs.map(t => `
                        <div class="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                            <div>
                                <p class="text-xs font-black text-blue-600">${t.id}</p>
                                <p class="text-[10px] text-slate-400">${t.date}</p>
                                <p class="text-[10px] text-slate-400">${t.payMethod || 'TUNAI'}</p>
                            </div>
                            <p class="font-black text-sm">Rp ${t.total.toLocaleString('id-ID')}</p>
                        </div>`).join('')
                }
            </div>
        </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}
