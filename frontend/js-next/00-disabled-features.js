// ==========================================
// 00-disabled-features.js — Oculta features desactivadas
// ==========================================
// Refuerzo JS para 11-disabled-features.css.
// Si algún módulo inyecta elementos de mixer/stems/reference,
// este script los oculta después del DOMContentLoaded.
// ==========================================
(function () {
  'use strict';

  const DISABLED_SELECTORS = [
    '[data-workspace="mixer"]',
    '.sidebar-pane-mixer',
    '#mixerContentArea',
    '#mixerSidePanel',
    '#s-stems-mode',
    '#btnStems',
    '#matchMasteringBlock',
    '#btnMasterRef',
    '#btnRefPreview',
    '#refPreviewPanel',
    '#btnOpenRefLib',
    '#quickReference',
    '#proRefBtn',
  ];

  function hideDisabledElements() {
    DISABLED_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.display = 'none';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hideDisabledElements);
  } else {
    hideDisabledElements();
  }

  // Proteger contra inyección tardía
  var observer = new MutationObserver(function () {
    hideDisabledElements();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
