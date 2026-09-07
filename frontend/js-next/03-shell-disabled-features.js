// ==========================================
// 03-shell-disabled-features.js — Garantiza mixer/stems/reference fuera de la UI
// ==========================================
// Fase 1 H5 del audit: "se mantendrán fuera del nuevo HTML activo
// y no se cargarán sus scripts de UI. Los módulos backend y archivos
// históricos no se eliminan."
//
// Este script:
// 1. Oculta cualquier elemento que intente inyectar mixer/stems/reference
// 2. Evita que los scripts legacy carguen sus módulos en el nuevo shell
// 3. Proporciona un mecanismo de guard para que los módulos DSP
//    solo se carguen si hay un slot activo
// ==========================================
(function () {
  'use strict';

  const LGMDM = window.LGMDM = window.LGMDM || {};

  // Lista de módulos que deben permanecer desactivados en esta fase
  const DISABLED_MODULES = [
    'mixer',
    'stems',
    'reference-mastering',
    'stem-separation',
    'reference-library',
  ];

  // Lista de scripts que NO deben cargarse en el nuevo shell
  const DISABLED_SCRIPTS = [
    '13-mixer-model.js',
    '13-mixer-engine.js',
    '13-mixer-library.js',
    '13-mixer-ui.js',
    '08-reference-mastering.js',
    'reference-library-picker.js',
    '07-mastering-actions.js', // solo la parte de stems
  ];

  // Función para ocultar cualquier elemento inyectado por módulos desactivados
  function hideDisabledElements() {
    // Ocultar elementos con IDs específicos de módulos desactivados
    const disabledIds = [
      'pitchCorrectionPanel',
      'proToolsShell',
      'compactConsoleDrawer',
      'mixerPanel',
      'stemPanel',
      'referencePanel',
    ];

    disabledIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.setAttribute('hidden', '');
        el.setAttribute('aria-hidden', 'true');
      }
    });

    // Ocultar cualquier elemento con clases de módulos desactivados
    const disabledClasses = [
      '.mixer-module',
      '.stem-module',
      '.reference-module',
      '.lgjs-mixer',
      '.lgjs-stem',
      '.lgjs-reference',
    ];

    disabledClasses.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.setAttribute('hidden', '');
        el.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // Función para verificar que los scripts desactivados no se carguen
  function checkDisabledScripts() {
    const loadedScripts = Array.from(document.querySelectorAll('script[src]'));
    const loadedSrcs = loadedScripts.map(s => s.getAttribute('src'));

    DISABLED_SCRIPTS.forEach(scriptName => {
      if (loadedSrcs.some(src => src && src.includes(scriptName))) {
        console.warn(`03-shell-disabled-features: script desactivado cargado: ${scriptName}`);
      }
    });
  }

  // Función para proporcionar un mecanismo de guard para módulos DSP
  LGMDM.slots = LGMDM.slots || {};
  LGMDM.slots.hasActiveSlot = function (slotName) {
    // Un slot está activo si existe en el DOM y no está oculto
    const slot = LGMDM.slots[slotName];
    if (!slot) return false;
    if (slot.nodeType === 1) { // Element
      return !slot.hidden && slot.style.display !== 'none';
    }
    return false;
  };

  // Función para que los módulos DSP verifiquen antes de cargar
  LGMDM.slots.checkBeforeLoad = function (moduleName) {
    if (DISABLED_MODULES.includes(moduleName)) {
      console.log(`03-shell-disabled-features: módulo ${moduleName} desactivado en esta fase`);
      return false;
    }
    return true;
  };

  // Ocultar elementos desactivados inmediatamente
  hideDisabledElements();

  // Verificar scripts cargados
  checkDisabledScripts();

  // Observar cambios en el DOM para ocultar nuevos elementos inyectados
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { // Element
          // Verificar si es un elemento desactivado
          const id = node.getAttribute('id');
          if (id && ['pitchCorrectionPanel', 'proToolsShell', 'compactConsoleDrawer', 'mixerPanel', 'stemPanel', 'referencePanel'].includes(id)) {
            node.style.display = 'none';
            node.style.visibility = 'hidden';
            node.setAttribute('hidden', '');
            node.setAttribute('aria-hidden', 'true');
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('03-shell-disabled-features: módulos desactivados protegidos');
})();