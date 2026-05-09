// ═══════════════════════════════════════════════════════════════
//  pos.js — Kasir / Point-of-Sale Logic
// ═══════════════════════════════════════════════════════════════

// ── RENDER ────────────────────────────────────────────────────
function renderPosProducts() {
    const grid   = document.getElementById('posProductGrid');
    const search = document.getElementById('searchPos').value.toLowerCase();
    const filtered = products.filter(p =>
        (currentCategory === 'All' || p.category === currentCategory) &&
        (p.name.toLowerCase().includes(search) || (p.barcode && p.barcode.includes(search)))
    );

    grid.innerHTML = filtered.length > 0
        ? filtered.map(p => {
            const inCart = cart.find(c => c.id === p.id);
            return `
            <div onclick="addToCart(${p.id}, this)" oncontextmenu="return false"
                 ontouchstart="_lpStart(event,${p.id})" ontouchend="_lpEnd()" ontouchcancel="_lpEnd()"
                 data-pid="${p.id}"
                 class="relative bg-white p-4 rounded-[2rem] border-2 ${inCart ? 'border-blue-500 bg-blue-50' : 'border-slate-100'} card-shadow active:scale-95 transition-all text-center cursor-pointer select-none">
                ${inCart ? `<span class="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-blue-300 ring-2 ring-white z-10">${inCart.qty}</span>` : ''}
                <div class="w-10 h-10 ${inCart ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center mx-auto mb-3 transition-colors">
                    <i class="fas fa-shopping-bag text-xs"></i>
                </div>
                <p class="text-[11px] font-bold truncate uppercase">${p.name}</p>
                <p class="text-xs font-black text-blue-600 mt-1">Rp ${p.price.toLocaleString()}</p>
            </div>`;
        }).join('')
        : `<div class="col-span-2 text-center py-16 text-slate-300">
               <i class="fas fa-search text-4xl mb-3 block"></i>
               <p class="font-bold text-sm">Produk tidak ditemukan</p>
           </div>`;

    _renderCategories();
}

function _renderCategories() {
    const slider = document.getElementById('categorySlider');
    const cats   = ['All', ...new Set(products.map(p => p.category).filter(Boolean))].sort();
    slider.innerHTML = cats.map(c => `
        <button onclick="filterCategory('${c}')"
            class="px-5 py-2.5 rounded-2xl whitespace-nowrap text-[10px] font-bold uppercase transition-all
                   ${currentCategory === c
                       ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                       : 'bg-white text-slate-400 border border-slate-100'}">
            ${c === 'All' ? 'Semua' : c}
        </button>`).join('');
}

function filterCategory(c) {
    currentCategory = c;
    renderPosProducts();
}

// ── CART ──────────────────────────────────────────────────────
function flyToCart(fromEl) {
    const cartDrawer = document.getElementById('cartDrawer');
    const srcRect    = fromEl.getBoundingClientRect();
    const dstRect    = cartDrawer.getBoundingClientRect();

    const dot = document.createElement('div');
    dot.className = 'fly-dot';
    const startX = srcRect.left + srcRect.width  / 2 - 9;
    const startY = srcRect.top  + srcRect.height / 2 - 9;
    dot.style.left = startX + 'px';
    dot.style.top  = startY + 'px';
    dot.style.setProperty('--fly-x', (dstRect.left + dstRect.width  / 2 - startX - 9) + 'px');
    dot.style.setProperty('--fly-y', (dstRect.top  + dstRect.height / 2 - startY - 9) + 'px');
    document.body.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
}

// ── SURGICAL CARD REFRESH (no full re-render, no flicker) ─────
function refreshProductCard(id) {
    const card = document.querySelector(`[data-pid="${id}"]`);
    if (!card) return;
    const inCart = cart.find(c => c.id === id);

    // Border + background
    if (inCart) {
        card.classList.remove('border-slate-100');
        card.classList.add('border-blue-500', 'bg-blue-50');
    } else {
        card.classList.remove('border-blue-500', 'bg-blue-50');
        card.classList.add('border-slate-100');
    }

    // Icon circle
    const iconEl = card.querySelector('.rounded-full');
    if (iconEl) {
        if (inCart) {
            iconEl.classList.remove('bg-blue-50', 'text-blue-600');
            iconEl.classList.add('bg-blue-600', 'text-white');
        } else {
            iconEl.classList.remove('bg-blue-600', 'text-white');
            iconEl.classList.add('bg-blue-50', 'text-blue-600');
        }
    }

    // Qty badge
    let badge = card.querySelector('.qty-badge');
    if (inCart) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'qty-badge absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-blue-300 ring-2 ring-white z-10';
            card.appendChild(badge);
        }
        badge.textContent = inCart.qty;
    } else if (badge) {
        badge.remove();
    }
}

function addToCart(id, fromEl = null) {
    const p      = products.find(i => i.id === id);
    const inCart = cart.find(c => c.id === id);
    if (inCart) inCart.qty++; else cart.push({ ...p, qty: 1 });
    vibrate(40);
    if (fromEl) flyToCart(fromEl);
    updateCartUI();
    refreshProductCard(id);
}

function updateCartUI() {
    const drawer = document.getElementById('cartDrawer');
    const isPos  = !document.getElementById('view-pos').classList.contains('hidden');

    if (cart.length > 0 && isPos) {
        const wasHidden = drawer.classList.contains('hidden');
        drawer.classList.remove('hidden');
        const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
        document.getElementById('cartItemsInfo').innerText = `${cart.reduce((s, i) => s + i.qty, 0)} BARANG DI KERANJANG`;
        document.getElementById('cartTotalInfo').innerText = `Rp ${total.toLocaleString()}`;
        drawer.classList.remove('cart-bounce', 'cart-pulse');
        void drawer.offsetWidth;
        drawer.classList.add(wasHidden ? 'cart-bounce' : 'cart-pulse');
        setTimeout(() => drawer.classList.remove('cart-bounce', 'cart-pulse'), 500);
    } else {
        drawer.classList.add('hidden');
    }
}

// ── CHECKOUT ──────────────────────────────────────────────────
function openCheckout() {
    openModal('checkoutModal');
    const list  = document.getElementById('checkoutList');
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

    list.innerHTML = cart.map((item, i) => `
        <div class="flex justify-between items-center gap-2">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold uppercase truncate">${item.name}</p>
                <p class="text-[10px] text-slate-400 font-bold">@Rp ${item.price.toLocaleString()} x ${item.qty}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
                <button onclick="adjQty(${i},-1)" class="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-xs font-bold active:scale-90 transition-transform">−</button>
                <span class="text-sm font-black w-5 text-center">${item.qty}</span>
                <button onclick="adjQty(${i},1)"  class="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-lg text-xs font-bold active:scale-90 transition-transform">+</button>
                <button onclick="removeFromCart(${i})" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-lg text-xs active:scale-90 transition-transform ml-1">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>`).join('');

    document.getElementById('checkSubtotal').innerText = `Rp ${total.toLocaleString()}`;
    document.getElementById('checkTotal').innerText    = `Rp ${total.toLocaleString()}`;
    selectPayMethod(currentPayMethod);
    renderQuickAmounts();
    calcChange();
    initCustomerAutocomplete();
}

function removeFromCart(idx) {
    const removedId = cart[idx].id;
    cart.splice(idx, 1);
    if (cart.length === 0) { closeModal('checkoutModal'); updateCartUI(); refreshProductCard(removedId); return; }
    openCheckout();
    updateCartUI();
    refreshProductCard(removedId);
    vibrate(30);
}

function selectPayMethod(method) {
    currentPayMethod = method;
    document.querySelectorAll('.pay-method-btn').forEach(btn => {
        const isActive = btn.dataset.method === method;
        btn.className = `pay-method-btn flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 text-[11px] font-black transition-all ${
            isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-400'
        }`;
    });
    calcChange();
}

function adjQty(idx, val) {
    const itemId = cart[idx].id;
    cart[idx].qty += val;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    if (cart.length === 0) { currentPayMethod = 'TUNAI'; closeModal('checkoutModal'); updateCartUI(); refreshProductCard(itemId); return; }
    openCheckout();
    updateCartUI();
    refreshProductCard(itemId);
}

function renderQuickAmounts(selectedAmount = null) {
    const total   = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const options = new Set([total]);
    const rounds  = [1000, 2000, 5000, 10000, 20000, 50000, 100000];
    rounds.forEach(r => {
        const rounded = Math.ceil(total / r) * r;
        if (rounded >= total && options.size < 6) options.add(rounded);
    });
    const sorted    = [...options].sort((a, b) => a - b).slice(0, 6);
    const container = document.getElementById('quickAmountBtns');
    if (!container) return;
    container.innerHTML = sorted.map(n => {
        const isPas    = n === total;
        const isActive = selectedAmount === n;
        return `
            <button onclick="setQuickAmount(${n})"
                class="py-2.5 rounded-2xl text-xs font-black border-2 transition-all
                       ${isActive ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500 active:bg-slate-50'}">
                ${isActive && isPas ? '✓ PAS' : isPas ? 'PAS' : 'Rp ' + n.toLocaleString('id-ID')}
            </button>`;
    }).join('');
}

function setQuickAmount(amount) {
    document.getElementById('payAmount').value = amount.toLocaleString('id-ID');
    vibrate(30);
    renderQuickAmounts(amount);
    calcChange();
}

function calcChange() {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const pay   = parseRaw(document.getElementById('payAmount').value);
    const diff  = pay - total;
    document.getElementById('payChange').innerText = `Rp ${(diff < 0 ? 0 : diff).toLocaleString()}`;
}

// ── LONG PRESS QTY SHORTCUT ───────────────────────────────────
let _lpTimer = null;

function _lpStart(e, productId) {
    _lpTimer = setTimeout(() => {
        _lpTimer = null;
        vibrate(60);
        // Prevent click event yang akan muncul setelah touchend
        e.target.closest('[data-pid]')?.addEventListener('click', _blockNextClick, { once: true, capture: true });
        openQtyModal(productId);
    }, 800); // 800ms = long press (diperpanjang untuk menghindari salah tekan)
}

function _lpEnd() {
    if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; }
}

function _blockNextClick(e) { e.stopImmediatePropagation(); }

function openQtyModal(productId) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const inCart = cart.find(c => c.id === productId);

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-6';
    overlay.innerHTML = `
        <div style="animation:modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both"
             class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
            <div class="text-center mb-5">
                <div class="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-shopping-bag text-blue-600"></i>
                </div>
                <h3 class="text-base font-black uppercase">${p.name}</h3>
                <p class="text-xs text-slate-400 mt-1">Rp ${p.price.toLocaleString('id-ID')}</p>
            </div>
            <div class="flex items-center gap-4 mb-6">
                <button onclick="this.nextElementSibling.stepDown(); this.nextElementSibling.dispatchEvent(new Event('input'))"
                    class="w-12 h-12 flex-shrink-0 bg-slate-100 rounded-2xl text-xl font-black active:scale-90 transition-transform">−</button>
                <input id="qtyModalInput" type="number" min="0" max="9999"
                    value="${inCart ? inCart.qty : 1}"
                    class="flex-1 text-center text-3xl font-black bg-slate-50 rounded-2xl py-3 outline-none focus:ring-2 focus:ring-blue-500"
                    oninput="document.getElementById('qtyModalTotal').innerText = 'Rp ' + (${p.price} * (parseInt(this.value)||0)).toLocaleString('id-ID')">
                <button onclick="this.previousElementSibling.stepUp(); this.previousElementSibling.dispatchEvent(new Event('input'))"
                    class="w-12 h-12 flex-shrink-0 bg-blue-600 rounded-2xl text-xl font-black text-white active:scale-90 transition-transform">+</button>
            </div>
            <p class="text-center text-sm font-bold text-blue-600 mb-5" id="qtyModalTotal">
                Rp ${(p.price * (inCart ? inCart.qty : 1)).toLocaleString('id-ID')}
            </p>
            <div class="grid grid-cols-2 gap-3">
                <button onclick="this.closest('.fixed').remove()"
                    class="bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold active:scale-95 transition-transform">
                    Batal
                </button>
                <button onclick="_applyQtyModal(${productId}, parseInt(document.getElementById('qtyModalInput').value)||0); this.closest('.fixed').remove()"
                    class="bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">
                    Terapkan
                </button>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    // Auto focus + select input
    setTimeout(() => {
        const inp = document.getElementById('qtyModalInput');
        if (inp) { inp.focus(); inp.select(); }
    }, 320);
}

function _applyQtyModal(productId, qty) {
    const p = products.find(x => x.id === productId);
    if (!p) return;
    const idx = cart.findIndex(c => c.id === productId);

    if (qty <= 0) {
        if (idx !== -1) cart.splice(idx, 1);
    } else if (idx !== -1) {
        cart[idx].qty = qty;
    } else {
        cart.push({ ...p, qty });
    }

    vibrate(30);
    updateCartUI();
    refreshProductCard(productId);
}