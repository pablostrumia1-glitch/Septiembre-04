(function () {
  'use strict';

  // Safety shims and non-destructive auto-fixes to make the app more resilient
  // - Ensures window.STFX exists
  // - Provides basic STFX.storage wrapper (falls back to localStorage)
  // - Provides safe no-op STFX.ui.showToast and helpers used across modules
  // - Adds a small helper STFX.dom.requireById that returns element or logs
  // This file is intentionally conservative and should not alter app logic.

  window.STFX = window.STFX || {};

  // Storage shim: prefer existing STFX.storage, otherwise fallback to localStorage API
  if (!window.STFX.storage) {
    window.STFX.storage = (function () {
      function safeGet(key) {
        try { return localStorage.getItem(key); } catch (_) { return null; }
      }
      function safeSet(key, value) {
        try { localStorage.setItem(String(key), String(value)); } catch (_) { /* ignore */ }
      }
      function safeRemove(key) {
        try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
      }
      return { get: safeGet, set: safeSet, remove: safeRemove };
    })();
  }

  // UI shim: provide minimal toast/status functions if absent so modules can call safely
  window.STFX.ui = window.STFX.ui || {};
  if (typeof window.STFX.ui.showToast !== 'function') {
    window.STFX.ui.showToast = function (message, type = 'info', duration = 4000) {
      try {
        // Create a lightweight toast only if not already present
        let container = document.getElementById('toast-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'toast-container';
          container.setAttribute('aria-live', 'polite');
          container.style.position = 'fixed';
          container.style.right = '12px';
          container.style.top = '12px';
          container.style.zIndex = 99999;
          document.body.appendChild(container);
        }
        const item = document.createElement('div');
        item.className = 'stfx-toast';
        item.textContent = String(message || '');
        item.style.marginTop = '8px';
        item.style.padding = '8px 12px';
        item.style.borderRadius = '6px';
        item.style.background = (type === 'error') ? 'rgba(200,40,40,0.95)' : 'rgba(20,20,20,0.85)';
        item.style.color = '#fff';
        container.appendChild(item);
        setTimeout(() => { try { item.remove(); } catch (_) {} }, duration);
      } catch (_) { /* swallow errors */ }
  };
  }

  if (typeof window.STFX.ui.showStatus !== 'function') {
    window.STFX.ui.showStatus = function (idOrEl, message, type) {
      try {
        const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
        if (!el) return null;
        el.textContent = String(message || '');
        return el;
      } catch (_) { return null; }
    };
  }

  if (typeof window.STFX.ui.escapeHtml !== 'function') {
    window.STFX.ui.escapeHtml = function (s) {
      if (s == null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
  }

  // DOM helpers
  window.STFX.dom = window.STFX.dom || {};
  if (typeof window.STFX.dom.requireById !== 'function') {
    window.STFX.dom.requireById = function (id, context) {
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`STFX.dom.requireById: elemento "${id}" no encontrado` + (context ? ` (${context})` : ''));
      }
      return el;
    };
  }

  // Graceful global fallback for missing APIs used by multiple modules
  window.STFX.api = window.STFX.api || {};
  if (typeof window.STFX.api.apiFetch !== 'function') {
    window.STFX.api.apiFetch = function () {
      return Promise.reject(new Error('STFX.api.apiFetch no está implementado en este entorno'));
    };
  }

  // Expose a safe no-op applyMasteringState so undo/redo listeners won't crash
  if (typeof window.applyMasteringState !== 'function') {
    window.applyMasteringState = function () { /* noop until real implementation loads */ };
  }

  // a11y shim: screen reader announcements
  if (!window.STFX.a11y) {
    window.STFX.a11y = {
      announce: function (message, priority) {
        try {
          const el = document.getElementById('a11y-announcements');
          if (el) el.textContent = message;
          if (priority === 'assertive') console.info('[a11y assertive]', message);
        } catch (_) {}
      }
    };
  }

  // Small lint-like checks (non-fix): detect obvious unterminated strings in inline scripts
  try {
    // no-op: placeholder for future static checks
  } catch (_) {}

  console.log('✅ STFX safety shims loaded');
})();
