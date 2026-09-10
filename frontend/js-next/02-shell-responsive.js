// ==========================================
// 02-shell-responsive.js — Breakpoint y modo móvil
// ==========================================
// Fase 4 del audit: breakpoints mínimos.
// - >= 1200 px: tres columnas visibles
// - 768-1199 px: paneles laterales reducidos y scroll independiente
// - < 768 px: una columna, tabs o drawer para paneles laterales
// La consola central debe conservar sus controles esenciales en móvil.
// No se debe ocultar contenido sin una alternativa de navegación.
//
// Escucha los cambios de breakpoint y ajusta la clase del body o del grid.
(function () {
  'use strict';

  // Solo ejecutar si la shell nueva está activa
  if (!window.NEXT_SHELL_ENABLED) return;

  const STFX = window.STFX = window.STFX || {};
  const body = document.body;
  const appRoot = document.getElementById('app-root');

  if (!appRoot) {
    console.log('02-shell-responsive: #app-root no encontrado - saltando');
    return;
  }

  // Definir breakpoints como variables CSS para que el CSS pueda usarlas
  // pero también estar disponibles en JS
  body.style.setProperty('--breakpoint-large', '1200px');
  body.style.setProperty('--breakpoint-medium', '768px');
  body.style.setProperty('--breakpoint-small', '0px');

  // Función para determinar el modo actual
  function getCurrentMode() {
    const width = window.innerWidth;

    if (width >= 1200) {
      return 'desktop';
    } else if (width >= 768) {
      return 'tablet';
    } else {
      return 'mobile';
    }
  }

  // Aplicar clase al body para que el CSS pueda targetear
  function applyModeClass() {
    const mode = getCurrentMode();

    // Remover clases anteriores
    body.classList.remove('mode-desktop', 'mode-tablet', 'mode-mobile');

    // Aplicar nueva clase
    body.classList.add(`mode-${mode}`);

    // Dispatch event para que otros scripts puedan reaccionar
    const event = new CustomEvent('lgmdm:resize:mode', {
      detail: { mode, width: window.innerWidth },
      bubbles: true,
    });
    body.dispatchEvent(event);
  }

  // Aplicar al cargar y en cada resize
  applyModeClass();
  window.addEventListener('resize', applyModeClass, { passive: true });

  // Exponer para que otros módulos puedan escuchar
  STFX.resize = STFX.resize || {};
  STFX.resize.currentMode = getCurrentMode;
  STFX.resize.breakpoints = {
    large: 1200,
    medium: 768,
    small: 0,
  };

  console.log(`02-shell-responsive: modo ${getCurrentMode()} activado`);
})();