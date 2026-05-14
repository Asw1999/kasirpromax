// ═══════════════════════════════════════════════════════════════
//  loading-state-manager.js — Centralized Loading State Management
// ═══════════════════════════════════════════════════════════════

const LoadingManager = (() => {
  const _states = {};
  
  /**
   * Set loading state untuk section tertentu
   * @param {string} key - unique identifier (e.g., 'checkout', 'sync', 'export')
   * @param {boolean} loading - true/false
   */
  function setLoading(key, loading) {
    _states[key] = loading;
    
    if (loading) {
      showLoadingSpinner(`Memproses ${key}...`);
    } else {
      hideLoadingSpinner();
    }
  }
  
  function isLoading(key) {
    return _states[key] === true;
  }
  
  function isAnyLoading() {
    return Object.values(_states).some(v => v === true);
  }
  
  // Disable all interactive elements saat loading
  function disableUI() {
    document.querySelectorAll('button, input, select').forEach(el => {
      el._originalDisabled = el.disabled;
      el.disabled = true;
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
    });
  }
  
  function enableUI() {
    document.querySelectorAll('button, input, select').forEach(el => {
      el.disabled = el._originalDisabled || false;
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    });
  }
  
  return { setLoading, isLoading, isAnyLoading, disableUI, enableUI };
})();
