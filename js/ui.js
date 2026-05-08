// ═══════════════════════════════════════════════════════════════
//  ui.js — Navigation, Modal Control, Dark Mode, Ripple
// ═══════════════════════════════════════════════════════════════

// ── NAVIGATION ────────────────────────────────────────────────
function switchView(view) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('active-nav');
        n.classList.add('text-slate-400');
    });
    const activeNav = document.querySelector(`[data-path="${view}"]`);
    if (activeNav) {
        activeNav.classList.add('active-nav');
        activeNav.classList.remove('text-slate-400');
    }

    const titles = {
        home:      'Dashboard',
        pos:       'Kasir Utama',
        inventory: 'Gudang Barang',
        history:   'Laporan Finansial',
        customers: 'Database Pelanggan',
    };
    document.getElementById('viewTitle').innerText = titles[view] || '';

    if (view === 'home')      refreshDashboard();
    if (view === 'pos')       renderPosProducts();
    if (view === 'inventory') renderInventory();
    if (view === 'history')   renderHistory();
    if (view === 'customers') renderCustomers();

    updateCartUI();
}

// ── MODAL CONTROL ─────────────────────────────────────────────
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

// ── DARK MODE ─────────────────────────────────────────────────
function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('wp_darkmode', isDark ? '1' : '0');
    _applyDarkModeBtn(isDark);
    vibrate(30);
}

function _applyDarkModeBtn(isDark) {
    const btn = document.getElementById('darkModeBtn');
    if (!btn) return;
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.className = isDark
        ? 'w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center text-yellow-400'
        : 'w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600';
}

// ── RIPPLE EFFECT ─────────────────────────────────────────────
function _addRipple(e) {
    const btn = e.currentTarget;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left  = (e.clientX - rect.left  - size / 2) + 'px';
    ripple.style.top   = (e.clientY - rect.top   - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}

function initRipples() {
    document.querySelectorAll('.ripple-btn').forEach(btn => {
        btn.removeEventListener('click', _addRipple);
        btn.addEventListener('click', _addRipple);
    });
}
