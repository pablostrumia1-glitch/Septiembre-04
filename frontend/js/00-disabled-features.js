/* Disabled product areas for the current release. */
(function (global) {
  'use strict';
  const config = global.LGMDM?.config || {};

  function disable(selector) {
    document.querySelectorAll(selector).forEach((node) => {
      node.hidden = true;
      node.setAttribute('aria-hidden', 'true');
      if ('disabled' in node) node.disabled = true;
    });
  }

  function apply() {
    if (config.mixerEnabled !== true) {
      disable('[data-workspace="mixer"], .sidebar-pane-mixer, #mixerContentArea, #mixerSidePanel');
    }
    if (config.stemsEnabled !== true) {
      disable('#s-stems-mode, #btnStems');
    }
    if (config.referenceMasteringEnabled !== true) {
      disable('#matchMasteringBlock, #btnMasterRef, #btnRefPreview, #refPreviewPanel, #btnOpenRefLib, #quickReference, #proRefBtn');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})(window);
