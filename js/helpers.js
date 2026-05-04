// ═══════════════════════════════════════════════════════════════
//  helpers.js — Utility functions, Toast, Custom Modals
// ═══════════════════════════════════════════════════════════════

// ── FORMAT & PARSE ────────────────────────────────────────────
function fmtInput(el) {
    const raw = el.value.replace(/[^\d]/g, '');
    if (!raw) { el.value = ''; return; }
    el.value = Number(raw).toLocaleString('id-ID');
}

function parseRaw(str) {
    return Number(String(str).replace(/\./g, '').replace(/,/g, '')) || 0;
}

function parseRpStr(str) {
    return parseFloat(String(str).replace(/Rp/g, '').replace(/\./g, '').replace(/,/g, '')) || 0;
}

function vibrate(ms = 40) {
    if (navigator.vibrate) navigator.vibrate(ms);
}

// ── TOAST NOTIFICATION ────────────────────────────────────────
// Menggantikan alert() untuk notifikasi non-blocking
function toast(message, type = 'success', duration = 3000) {
    const configs = {
        success: { bg: 'bg-emerald-600 shadow-emerald-300', icon: 'fa-check-circle' },
        error:   { bg: 'bg-red-500 shadow-red-300',         icon: 'fa-times-circle' },
        warning: { bg: 'bg-amber-500 shadow-amber-300',     icon: 'fa-exclamation-triangle' },
        info:    { bg: 'bg-blue-600 shadow-blue-300',       icon: 'fa-info-circle' },
    };
    const { bg, icon } = configs[type] || configs.info;

    const el = document.createElement('div');
    el.style.cssText = [
        'position:fixed', 'top:20px', 'left:50%',
        'transform:translateX(-50%) translateY(-120px)',
        'z-index:99999',
        'transition:transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s',
        'opacity:0',
        'max-width:340px',
        'width:calc(100% - 32px)',
    ].join(';');

    el.innerHTML = `
        <div class="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-bold shadow-xl ${bg}">
            <i class="fas ${icon} flex-shrink-0 text-base"></i>
            <span class="leading-snug">${message}</span>
        </div>`;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
        el.style.transform = 'translateX(-50%) translateY(0)';
        el.style.opacity   = '1';
    });

    setTimeout(() => {
        el.style.transform = 'translateX(-50%) translateY(-120px)';
        el.style.opacity   = '0';
        setTimeout(() => el.remove(), 400);
    }, duration);
}

// ── CUSTOM CONFIRM ────────────────────────────────────────────
// Menggantikan confirm() — pakai callback karena non-blocking
function customConfirm(message, onConfirm, options = {}) {
    const {
        title       = 'Konfirmasi',
        confirmText = 'Ya, Lanjutkan',
        cancelText  = 'Batal',
        danger      = false,
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-6';
    overlay.innerHTML = `
        <div style="animation:modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both"
             class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
            <div class="text-center mb-5">
                <div class="w-14 h-14 ${danger ? 'bg-red-50' : 'bg-blue-50'} rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fas ${danger ? 'fa-trash-alt text-red-500' : 'fa-question text-blue-500'} text-2xl"></i>
                </div>
                <h3 class="text-lg font-black">${title}</h3>
                <p class="text-sm text-slate-500 mt-2 leading-relaxed">${message}</p>
            </div>
            <div class="grid grid-cols-2 gap-3">
                <button id="cc-cancel"
                    class="bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold active:scale-95 transition-transform">
                    ${cancelText}
                </button>
                <button id="cc-ok"
                    class="${danger
                        ? 'bg-red-500 shadow-red-200'
                        : 'bg-blue-600 shadow-blue-200'
                    } text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">
                    ${confirmText}
                </button>
            </div>
        </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#cc-ok').onclick     = () => { overlay.remove(); onConfirm(); };
    overlay.querySelector('#cc-cancel').onclick = () => overlay.remove();
}

// ── CUSTOM ALERT ──────────────────────────────────────────────
// Menggantikan alert() untuk pesan error/info yang butuh acknowledgement
function customAlert(message, options = {}) {
    const { title = 'Perhatian', type = 'warning' } = options;
    const configs = {
        warning: { wrap: 'bg-amber-50',   icon: 'fa-exclamation-triangle text-amber-500', btn: 'bg-amber-500' },
        error:   { wrap: 'bg-red-50',     icon: 'fa-times-circle text-red-500',           btn: 'bg-red-500'   },
        success: { wrap: 'bg-emerald-50', icon: 'fa-check-circle text-emerald-500',       btn: 'bg-emerald-600' },
        info:    { wrap: 'bg-blue-50',    icon: 'fa-info-circle text-blue-500',           btn: 'bg-blue-600'  },
    };
    const c = configs[type] || configs.warning;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-6';
    overlay.innerHTML = `
        <div style="animation:modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both"
             class="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
            <div class="text-center mb-5">
                <div class="w-14 h-14 ${c.wrap} rounded-full flex items-center justify-center mx-auto mb-3">
                    <i class="fas ${c.icon} text-2xl"></i>
                </div>
                <h3 class="text-lg font-black">${title}</h3>
                <p class="text-sm text-slate-500 mt-2 leading-relaxed">${message}</p>
            </div>
            <button id="ca-ok"
                class="${c.btn} text-white w-full py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">
                OK, Mengerti
            </button>
        </div>`;

    document.body.appendChild(overlay);
    overlay.querySelector('#ca-ok').onclick = () => overlay.remove();
}
