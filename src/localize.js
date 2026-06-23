(function(){
  const DEFAULT_LANG = 'en';
  let current = localStorage.getItem('lang') || (navigator.language && navigator.language.startsWith('pt') ? 'pt' : DEFAULT_LANG);
  const resources = {};
  const listeners = [];

  async function load(lang) {
    // If opened via file:// or fetch fails (CORS), try inline JSON script fallback
    const tryInline = () => {
      try {
        const el = (typeof document !== 'undefined') ? document.getElementById('i18n-' + lang) : null;
        if (el && el.textContent) {
          resources[lang] = JSON.parse(el.textContent);
          current = lang;
          localStorage.setItem('lang', lang);
          listeners.forEach(fn => { try { fn(); } catch(e){} });
          return true;
        }
      } catch (e) { /* ignore json parse errors */ }
      return false;
    };

    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return tryInline();
    }

    try {
      const res = await fetch('./src/localization/' + lang + '.json');
      if (!res.ok) throw new Error('Failed to load');
      resources[lang] = await res.json();
      current = lang;
      localStorage.setItem('lang', lang);
      listeners.forEach(fn => { try { fn(); } catch(e){} });
      return true;
    } catch (e) {
      console.warn('Localization load failed for', lang, e);
      // fallback to inline JSON if available
      return tryInline();
    }
  }

  function t(path) {
    const obj = (resources[current] || resources[DEFAULT_LANG] || {});
    // First try flat key (element id -> text)
    if (obj && Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
    // Fallback to nested path lookup (backwards compatibility)
    const parts = path.split('.');
    let p = obj;
    for (let k of parts) {
      if (p && typeof p === 'object' && k in p) p = p[k];
      else { p = null; break; }
    }
    return (p === null || p === undefined) ? path : p;
  }

  function onChange(fn) { listeners.push(fn); }

  // init - try to preload default and current
  (function init(){
    // try synchronous inline parse first for immediate availability
    try {
      if (typeof document !== 'undefined') {
        const tryParse = (lang) => {
          const el = document.getElementById('i18n-' + lang);
          if (el && el.textContent) {
            try { resources[lang] = JSON.parse(el.textContent); } catch(e) { /* ignore */ }
          }
        };
        tryParse(DEFAULT_LANG);
        if (current !== DEFAULT_LANG) tryParse(current);
      }
    } catch (e) {}
    // then async ensure remote copies are loaded when available
    (async function(){
      await load(DEFAULT_LANG);
      if (current !== DEFAULT_LANG) await load(current);
    })();
  })();

  window.Localization = {
    t,
    load,
    setLang: load,
    getLang: () => current,
    onChange
  };
})();

// helper: apply translations by element id
(function(){
  function canSetText(el) {
    const tag = el.tagName && el.tagName.toLowerCase();
    return ['button','div','span','label','h1','h2','h3','h4','h5','h6','p'].includes(tag);
  }
  function applyAll() {
    try {
      if (!window.Localization) return;
      const L = window.Localization;
      const els = document.querySelectorAll('[id]');
      els.forEach(el => {
        const id = el.id;
        if (!id) return;
        const txt = L.t(id);
        if (typeof txt === 'string' && txt !== id && canSetText(el)) {
          el.textContent = txt;
        }
      });
    } catch (e) { }
  }
  if (window.Localization && typeof window.Localization.onChange === 'function') window.Localization.onChange(applyAll);
  // also run once after DOM ready
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyAll); else applyAll();
})();
