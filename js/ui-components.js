// ═══════════════════════════════════════════════════════════════
//  ui-components.js — Reusable UI Components (Loading, Validation, etc)
// ═══════════════════════════════════════════════════════════════

// ── LOADING SPINNER (Modal Full Screen) ────────────────────────
function showLoadingSpinner(message = 'Memproses...') {
  let spinner = document.getElementById('loadingSpinner');
  
  if (!spinner) {
    spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.innerHTML = `
      <div class="fixed inset-0 bg-black/50 z-[999] flex items-center justify-center">
        <div class="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm">
          <div class="w-16 h-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
          <p id="spinnerMsg" class="text-center font-semibold text-slate-700 text-sm">Memproses...</p>
        </div>
      </div>
    `;
    document.body.appendChild(spinner);
  }
  
  const msgEl = spinner.querySelector('#spinnerMsg');
  if (msgEl) msgEl.innerText = message;
  spinner.style.display = 'flex';
}

function hideLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'none';
}

// ── MINI LOADING BADGE (untuk tombol, icon) ────────────────────
function addLoadingState(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  
  btn._originalHTML = btn.innerHTML;
  btn._originalDisabled = btn.disabled;
  btn.disabled = true;
  btn.innerHTML = `
    <div class="inline-flex items-center gap-2">
      <div class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
      <span>Tunggu...</span>
    </div>
  `;
}

function removeLoadingState(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  
  btn.innerHTML = btn._originalHTML;
  btn.disabled = btn._originalDisabled;
}

// ── INPUT VALIDATION (Visual Feedback) ─────────────────────────
function validateInput(inputId, rules = {}) {
  const input = document.getElementById(inputId);
  if (!input) return true;
  
  const value = input.value.trim();
  const errors = [];
  
  // Check rules
  if (rules.required && !value) {
    errors.push('Wajib diisi');
  }
  if (rules.minLength && value.length < rules.minLength) {
    errors.push(`Minimal ${rules.minLength} karakter`);
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push(rules.patternMsg || 'Format tidak valid');
  }
  if (rules.custom) {
    const customErr = rules.custom(value);
    if (customErr) errors.push(customErr);
  }
  
  // Visual feedback
  const wrapper = input.parentElement;
  const errorEl = wrapper?.querySelector('.input-error');
  
  if (errors.length > 0) {
    input.classList.add('ring-2', 'ring-red-500', 'bg-red-50');
    input.classList.remove('focus:ring-blue-500');
    
    if (errorEl) {
      errorEl.innerText = errors[0];
    } else {
      const newError = document.createElement('p');
      newError.className = 'input-error text-xs text-red-500 mt-1 font-semibold';
      newError.innerText = errors[0];
      wrapper?.appendChild(newError);
    }
    return false;
  } else {
    input.classList.remove('ring-2', 'ring-red-500', 'bg-red-50');
    input.classList.add('focus:ring-blue-500');
    
    if (errorEl) errorEl.remove();
    return true;
  }
}

function clearInputError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  input.classList.remove('ring-2', 'ring-red-500', 'bg-red-50');
  const errorEl = input.parentElement?.querySelector('.input-error');
  if (errorEl) errorEl.remove();
}

// ── ENHANCED TOAST dengan Action Button ────────────────────────
function toastWithAction(message, action, actionText = 'Retry', duration = 5000) {
  const configs = {
    success: { bg: 'bg-emerald-600 shadow-emerald-300', icon: 'fa-check-circle' },
    error:   { bg: 'bg-red-500 shadow-red-300',         icon: 'fa-times-circle' },
    warning: { bg: 'bg-amber-500 shadow-amber-300',     icon: 'fa-exclamation-triangle' },
    info:    { bg: 'bg-blue-600 shadow-blue-300',       icon: 'fa-info-circle' },
  };
  
  const type = 'error'; // Default ke error untuk action toast
  const { bg, icon } = configs[type];
  
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed', 'top:20px', 'left:50%',
    'transform:translateX(-50%) translateY(-120px)',
    'z-index:99999',
    'transition:transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.3s',
    'opacity:0',
    'max-width:380px',
    'width:calc(100% - 32px)',
  ].join(';');
  
  el.innerHTML = `
    <div class="flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-bold shadow-xl ${bg}">
      <div class="flex items-center gap-3">
        <i class="fas ${icon} flex-shrink-0 text-base"></i>
        <span class="leading-snug">${message}</span>
      </div>
      <button id="actionBtn" class="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex-shrink-0">
        ${actionText}
      </button>
    </div>`;
  
  document.body.appendChild(el);
  el.querySelector('#actionBtn').onclick = () => {
    el.style.transform = 'translateX(-50%) translateY(-120px)';
    el.style.opacity = '0';
    action();
    setTimeout(() => el.remove(), 400);
  };
  
  requestAnimationFrame(() => {
    el.style.transform = 'translateX(-50%) translateY(0)';
    el.style.opacity = '1';
  });
  
  setTimeout(() => {
    el.style.transform = 'translateX(-50%) translateY(-120px)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, duration);
}

// ── SMOOTH VIEW FADE TRANSITION ────────────────────────────────
function switchViewWithTransition(viewName) {
  const currentView = document.querySelector('section:not(.hidden)');
  
  // Fade out current
  if (currentView) {
    currentView.style.transition = 'opacity 0.2s ease';
    currentView.style.opacity = '0';
    
    setTimeout(() => {
      switchView(viewName); // Call existing function
      
      // Fade in new
      const newView = document.getElementById(`view-${viewName}`);
      if (newView) {
        newView.style.opacity = '0';
        newView.style.transition = 'opacity 0.2s ease';
        newView.offsetHeight; // Force reflow
        newView.style.opacity = '1';
      }
    }, 200);
  } else {
    switchView(viewName);
  }
}

// ── CONFIRMATION DIALOG dengan Loading State ───────────────────
function customConfirmAsync(message, options = {}) {
  return new Promise((resolve) => {
    const {
      title = 'Konfirmasi',
      confirmText = 'Ya, Lanjutkan',
      cancelText = 'Batal',
      danger = false,
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
            class="${danger ? 'bg-red-500 shadow-red-200' : 'bg-blue-600 shadow-blue-200'} text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-transform">
            ${confirmText}
          </button>
        </div>
      </div>`;
    
    document.body.appendChild(overlay);
    
    overlay.querySelector('#cc-ok').onclick = () => {
      overlay.remove();
      resolve(true);
    };
    overlay.querySelector('#cc-cancel').onclick = () => {
      overlay.remove();
      resolve(false);
    };
  });
}
