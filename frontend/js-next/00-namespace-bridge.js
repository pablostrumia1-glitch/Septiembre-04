// ==========================================
// 00-namespace-bridge.js — Puente LGMDM ↔ STFX
// ==========================================
// La shell nueva (js-next) usa window.LGMDM.*.
// El código actual (js/) usa window.STFX.*.
// Este bridge alias LGMDM a STFX para que
// la shell nueva acceda a todas las funciones reales.
(function () {
  'use strict';
  const STFX = window.STFX = window.STFX || {};
  const LGMDM = window.LGMDM = window.LGMDM || {};

  // ── Core: LGMDM = STFX (shallow copy) ──────────────────────
  // Copia todas las propiedades de STFX a LGMDM.
  // Si LGMDM ya tiene algo propio, no se pisa.
  for (const key of Object.keys(STFX)) {
    if (!(key in LGMDM)) {
      LGMDM[key] = STFX[key];
    }
  }

  // ── Alias específicos ───────────────────────────────────────
  // UI helpers
  LGMDM.ui = LGMDM.ui || {};
  if (STFX.ui) {
    LGMDM.ui.makeResizable = LGMDM.ui.makeResizable || STFX.ui.makeResizable;
    LGMDM.ui.bindOnce = LGMDM.ui.bindOnce || STFX.ui.bindOnce;
    LGMDM.ui.showToast = LGMDM.ui.showToast || STFX.ui.showToast;
    LGMDM.ui.escapeHtml = LGMDM.ui.escapeHtml || STFX.ui.escapeHtml;
    LGMDM.ui.clearResults = LGMDM.ui.clearResults || STFX.ui.clearResults;
    LGMDM.ui.showStatus = LGMDM.ui.showStatus || STFX.ui.showStatus;
  }

  // Auth
  LGMDM.auth = LGMDM.auth || {};
  if (STFX.auth) {
    LGMDM.auth.logout = LGMDM.auth.logout || STFX.auth.logout;
    LGMDM.auth.getToken = LGMDM.auth.getToken || STFX.auth.getToken;
    LGMDM.auth.getUser = LGMDM.auth.getUser || STFX.auth.getUser;
  }

  // Storage
  LGMDM.storage = LGMDM.storage || {};
  if (STFX.storage) {
    LGMDM.storage.get = LGMDM.storage.get || STFX.storage.get;
    LGMDM.storage.set = LGMDM.storage.set || STFX.storage.set;
    LGMDM.storage.remove = LGMDM.storage.remove || STFX.storage.remove;
  }

  // API
  LGMDM.api = LGMDM.api || {};
  if (STFX.api) {
    LGMDM.api.apiFetch = LGMDM.api.apiFetch || STFX.api.apiFetch;
    LGMDM.api.apiBase = LGMDM.api.apiBase || STFX.api.apiBase;
  }

  // DOM
  LGMDM.dom = LGMDM.dom || {};
  if (STFX.dom) {
    LGMDM.dom.requireById = LGMDM.dom.requireById || STFX.dom.requireById;
    LGMDM.dom.value = LGMDM.dom.value || STFX.dom.value;
  }

  // Plugins namespace (will be populated by 04-plugin-registry.js)
  LGMDM.plugins = LGMDM.plugins || {};
  LGMDM.pluginList = LGMDM.pluginList || {};
  LGMDM.slots = LGMDM.slots || {};
  LGMDM.resize = LGMDM.resize || {};

  // Forward-references: keep LGMDM in sync when STFX gains new properties
  // (e.g. after late-loaded modules add STFX.mastering, STFX.previewController, etc.)
  const PROXY_KEYS = ['mastering', 'masteringActions', 'previewController',
    'meters', 'spectrum', 'state', 'params', 'ai', 'aiAssistantUX',
    'reference', 'loader', 'polling'];

  for (const key of PROXY_KEYS) {
    if (STFX[key] && !LGMDM[key]) {
      LGMDM[key] = STFX[key];
    }
    // Also: if LGMDM[key] doesn't exist yet but will later, the bootstrap
    // should access via window.LGMDM?.[key]?. which will resolve at call time.
  }

  console.log('00-namespace-bridge: LGMDM ↔ STFX bridge activo');
})();
