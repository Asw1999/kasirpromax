// ═══════════════════════════════════════════════════════════════
//  inventory.js — Inventory / Product Management (API version)
// ═══════════════════════════════════════════════════════════════

function renderInventoryCategories() {
  const slider = document.getElementById('inventoryCategorySlider');
  if (!slider) return;
  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))].sort();
  slider.innerHTML = cats.map(c => `
    <button onclick="filterInventoryCategory('${c}')"
      class="px-4 py-2 rounded-2xl whitespace-nowrap text-[10px] font-bold uppercase transition-all
             ${currentInventoryCategory === c
                 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                 : 'bg-white text-slate-400 border border-slate-100'}">
      ${c === 'All' ? 'Semua' : c}
    </button>`).join('');
}

function filterInventoryCategory(c) {
  currentInventoryCategory = c;
  renderInventory();
}

function highlightMatch(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>');
}

function renderInventory() {
  const list   = document.getElementById('inventoryList');
  const search = (document.getElementById('searchInventory')?.value || '').toLowerCase().trim();

  const filtered = products.filter(p => {
    const matchCat    = currentInventoryCategory === 'All' || p.category === currentInventoryCategory;
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search) ||
      (p.category || '').toLowerCase().includes(search) ||
      (p.barcode || '').includes(search);
    return matchCat && matchSearch;
  });

  const countEl = document.getElementById('inventoryCount');
  if (countEl) {
    countEl.innerText = (search || currentInventoryCategory !== 'All')
      ? `${filtered.length} dari ${products.length} produk`
      : `${products.length} produk`;
  }

  renderInventoryCategories();

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="text-center py-16 text-slate-300">
        <i class="fas fa-search text-4xl mb-3 block"></i>
        <p class="font-bold text-sm">Produk tidak ditemukan</p>
        <p class="text-xs mt-1">"${search || currentInventoryCategory}" tidak ada di daftar</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(p => `
    <div class="bg-white p-5 rounded-[2rem] border border-slate-100 card-shadow flex justify-between items-center">
      <div class="flex-1 min-w-0">
        <p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest">${highlightMatch(p.category || 'Umum', search)}</p>
        <p class="font-black text-sm uppercase truncate">${highlightMatch(p.name, search)}</p>
        <div class="flex gap-4 mt-1">
          <p class="text-[10px] text-slate-400 font-bold">Modal: Rp ${p.cost.toLocaleString()}</p>
          <p class="text-[10px] text-emerald-500 font-black">Jual: Rp ${p.price.toLocaleString()}</p>
        </div>
      </div>
      <div class="flex gap-2 ml-2">
        <button onclick="openProductModal(${p.id})" class="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
          <i class="fas fa-pen text-xs"></i>
        </button>
        <button onclick="deleteProduct(${p.id})" class="w-10 h-10 bg-red-50 text-red-400 rounded-full flex items-center justify-center">
          <i class="fas fa-trash-alt text-xs"></i>
        </button>
      </div>
    </div>`).join('');
}

function openProductModal(editId = null) {
  document.getElementById('pEditId').value = editId || '';
  if (editId) {
    const p = products.find(x => x.id === editId);
    if (!p) return;
    document.getElementById('productModalTitle').innerText = 'Edit Produk';
    document.getElementById('pName').value     = p.name;
    document.getElementById('pCost').value     = p.cost  ? Number(p.cost).toLocaleString('id-ID')  : '';
    document.getElementById('pPrice').value    = p.price ? Number(p.price).toLocaleString('id-ID') : '';
    document.getElementById('pCategory').value = p.category;
    document.getElementById('pBarcode').value  = p.barcode || '';
  } else {
    document.getElementById('productModalTitle').innerText = 'Tambah Produk';
    ['pName','pCost','pPrice','pCategory','pBarcode'].forEach(id => document.getElementById(id).value = '');
  }
  openModal('productModal');
}

async function saveProduct() {
  const name   = document.getElementById('pName').value.trim();
  const cost   = parseRaw(document.getElementById('pCost').value);
  const price  = parseRaw(document.getElementById('pPrice').value);
  const cat    = document.getElementById('pCategory').value.trim() || 'Umum';
  const bar    = document.getElementById('pBarcode').value.trim();
  const editId = document.getElementById('pEditId').value;

  if (!name || !price) {
    customAlert('Nama produk dan harga jual wajib diisi!', { title: 'Form Belum Lengkap', type: 'warning' });
    return;
  }

  try {
    if (editId) {
      const updated = await API.updateProduct(editId, { name, cost, price, category: cat, barcode: bar });
      const idx = products.findIndex(p => p.id == editId);
      if (idx !== -1) products[idx] = updated;
    } else {
      const created = await API.createProduct({ name, cost, price, category: cat, barcode: bar });
      products.push(created);
    }

    closeModal('productModal');
    renderInventory();
    toast(editId ? 'Produk berhasil diperbarui' : 'Produk baru berhasil ditambahkan', 'success');
  } catch (e) {
    toast('Gagal simpan produk: ' + e.message, 'error');
  }
}

async function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  customConfirm(
    `<strong>${p.name}</strong> akan dihapus secara permanen.`,
    async () => {
      try {
        await API.deleteProduct(id);
        products = products.filter(x => x.id !== id);
        renderInventory();
        toast('Produk berhasil dihapus', 'success');
      } catch (e) {
        toast('Gagal hapus produk: ' + e.message, 'error');
      }
    },
    { title: 'Hapus Produk?', confirmText: 'Ya, Hapus', danger: true }
  );
}

// ── EXPORT / IMPORT ───────────────────────────────────────────
function exportProducts() {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `produk_${settings.shop.replace(/\s+/g,'_')}_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}.json`;
  a.click();
  toast('Data produk berhasil diexport!', 'success');
}

function importProducts(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) throw new Error('Format file tidak valid');
      if (!imported.every(p => p.name && p.price !== undefined)) throw new Error('Struktur data produk tidak valid');

      const existingNames = new Set(products.map(p => p.name.toLowerCase().trim()));
      const duplicates    = imported.filter(p => existingNames.has(p.name.toLowerCase().trim()));
      const newItems      = imported.filter(p => !existingNames.has(p.name.toLowerCase().trim()));

      _showImportModeModal({ imported, newItems, duplicates });
    } catch (err) {
      customAlert(`Gagal membaca file: ${err.message}`, { title: 'Import Gagal', type: 'error' });
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function _showImportModeModal({ imported, newItems, duplicates }) {
  const hasDupes  = duplicates.length > 0;
  const dupeLabel = hasDupes
    ? `<span class="text-amber-600 font-bold">⚠️ ${duplicates.length} duplikat</span>`
    : `<span class="text-emerald-600 font-bold">✅ Tidak ada duplikat</span>`;

  const overlay = document.createElement('div');
  overlay.id        = 'importModeOverlay';
  overlay.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-end justify-center p-4';
  overlay.innerHTML = `
    <div style="animation:modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both"
         class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl mb-2">
      <div class="text-center mb-4">
        <div class="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <i class="fas fa-file-import text-blue-500 text-2xl"></i>
        </div>
        <h3 class="text-lg font-black">Import Produk</h3>
        <p class="text-sm text-slate-500 mt-1">
          <strong>${imported.length} produk</strong> di file &nbsp;·&nbsp;
          <strong>${newItems.length} baru</strong> &nbsp;·&nbsp; ${dupeLabel}
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <button id="imp-merge"
          class="bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow shadow-emerald-200 active:scale-95 transition-transform text-sm">
          <i class="fas fa-plus-circle mr-1"></i> Tambah Baru Saja
          <span class="block text-xs font-normal opacity-80 mt-0.5">Skip duplikat, tambah ${newItems.length} produk baru</span>
        </button>
        <button id="imp-replace" ${!hasDupes ? 'disabled' : ''}
          class="py-4 rounded-2xl font-bold active:scale-95 transition-transform text-sm
                 ${hasDupes ? 'bg-amber-500 text-white shadow shadow-amber-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}">
          <i class="fas fa-sync-alt mr-1"></i> Timpa Duplikat
          <span class="block text-xs font-normal opacity-80 mt-0.5">Update ${duplicates.length} duplikat + tambah yang baru</span>
        </button>
        <button id="imp-reset"
          class="bg-red-500 text-white py-4 rounded-2xl font-bold shadow shadow-red-200 active:scale-95 transition-transform text-sm">
          <i class="fas fa-redo mr-1"></i> Reset & Ganti Semua
          <span class="block text-xs font-normal opacity-80 mt-0.5">Hapus semua produk lama, pakai file ini</span>
        </button>
        <button id="imp-cancel"
          class="bg-slate-100 text-slate-500 py-3 rounded-2xl font-bold active:scale-95 transition-transform text-sm mt-1">
          Batal
        </button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('#imp-merge').onclick = async () => {
    overlay.remove();
    if (newItems.length === 0) {
      customAlert('Semua produk di file sudah ada. Tidak ada yang ditambahkan.', { title: 'Tidak Ada yang Baru', type: 'info' });
      return;
    }
    try {
      await API.importProducts({ products: imported, mode: 'merge' });
      const fresh = await API.getProducts();
      products = fresh;
      renderInventory();
      toast(`${newItems.length} produk baru berhasil ditambahkan!`, 'success');
    } catch (e) { toast('Import gagal: ' + e.message, 'error'); }
  };

  overlay.querySelector('#imp-replace').onclick = async () => {
    if (!hasDupes) return;
    overlay.remove();
    try {
      await API.importProducts({ products: imported, mode: 'replace' });
      const fresh = await API.getProducts();
      products = fresh;
      renderInventory();
      toast(`${duplicates.length} produk ditimpa, ${newItems.length} produk baru ditambahkan!`, 'success');
    } catch (e) { toast('Import gagal: ' + e.message, 'error'); }
  };

  overlay.querySelector('#imp-reset').onclick = () => {
    overlay.remove();
    customConfirm(
      `Semua <strong>${products.length} produk</strong> yang ada sekarang akan <strong>dihapus permanen</strong> dan diganti dengan ${imported.length} produk dari file.`,
      async () => {
        try {
          await API.importProducts({ products: imported, mode: 'reset' });
          const fresh = await API.getProducts();
          products = fresh;
          renderInventory();
          toast(`Produk direset! ${imported.length} produk berhasil dimuat.`, 'success');
        } catch (e) { toast('Import gagal: ' + e.message, 'error'); }
      },
      { title: 'Yakin Reset Semua?', confirmText: 'Ya, Reset & Ganti', danger: true }
    );
  };

  overlay.querySelector('#imp-cancel').onclick = () => overlay.remove();
}
