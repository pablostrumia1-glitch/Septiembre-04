// ==========================================
// 01-shell-resize.js — Único dueño de resize header/left/right/center
// ==========================================
// Fase 3 del audit: Unificar header, panel izquierdo y panel derecho
// bajo un único controlador, eliminando la carga de:
// - 32-flex-layout.js
// - 35-console-shell.js
// - 36-header-resize.js
//
// Reutiliza LGMDM.ui.makeResizable de 00-resize-utility.js
// en lugar de reimplementar la lógica 3 veces.
//
// Persistir tamaños con nuevas claves de storage para no mezclar
// estados antiguos.
//
// NOTA: Este script solo se ejecuta cuando NEXT_SHELL_ENABLED=true
// (Fase 5 del audit, después de validaciones visuales y funcionales).
(function () {
  'use strict';

  const LGMDM = window.LGMDM = window.LGMDM || {};
  const root = document.documentElement;

  // Solo continuar si el shell nuevo está montado
  if (!document.getElementById('app-root')) {
    console.log('01-shell-resize: #app-root no encontrado - shell nuevo no montado');
    return;
  }

  // Helper shared: bindOnce desde LGMDM.ui
  const bindOnce = LGMDM.ui?.bindOnce || ((el, ev, fn, key, opts) => {
    if (el) el.addEventListener(ev, fn, opts);
    return true;
  });

  // ── Configuración de resize header ───────────────────────────────
  const headerHandle = document.querySelector('.app-header__resize-handle');
  if (headerHandle) {
    function getHeaderSize() {
      const val = getComputedStyle(root).getPropertyValue('--lg-shell-header-h').trim();
      const px = parseFloat(val);
      if (!isNaN(px)) return px;
      // Fallback: medir header real
      const header = document.querySelector('.app-header');
      if (header) return header.getBoundingClientRect().height;
      return 60; // default
    }

    function setHeaderSize(next) {
      root.style.setProperty('--lg-shell-header-h', next + 'px');
    }

    bindOnce(headerHandle, 'mousedown', (e) => {
      if (typeof LGMDM.ui.makeResizable !== 'function') {
        console.warn('01-shell-resize: LGMDM.ui.makeResizable no disponible para header');
        return;
      }

      LGMDM.ui.makeResizable(headerHandle, {
        axis: 'y',
        getSize: getHeaderSize,
        setSize: setHeaderSize,
        min: () => window.innerWidth < 768 ? 40 : 60,
        max: () => window.innerWidth < 768 ? 100 : 140,
        invert: false,
        onStart: () => {
          // Visual feedback opcional
          headerHandle.classList.add('dragging');
        },
        onEnd: () => {
          headerHandle.classList.remove('dragging');
          // Persistir tamaño
          try {
            const final = getComputedStyle(root).getPropertyValue('--lg-shell-header-h').trim();
            window.LGMDM?.storage?.set?.('lgmdm.headerHeight', final);
          } catch (_) {
            /* noop */
          }
        },
      });
    });
  }

  // ── Configuración de resize panel izquierdo ──────────────────────
  const leftHandle = document.querySelector('.app-resize-handle[data-resize="left"]');
  if (leftHandle) {
    function getLeftWidth() {
      return parseFloat(getComputedStyle(root).getPropertyValue('--lg-sidebar-w')) || 320;
    }

    function setLeftWidth(w) {
      root.style.setProperty('--lg-sidebar-w', w + 'px');
    }

    bindOnce(leftHandle, 'mousedown', (e) => {
      if (typeof LGMDM.ui.makeResizable !== 'function') {
        console.warn('01-shell-resize: LGMDM.ui.makeResizable no disponible para panel izquierdo');
        return;
      }

      LGMDM.ui.makeResizable(leftHandle, {
        axis: 'x',
        getSize: getLeftWidth,
        setSize: setLeftWidth,
        min: () => 250,
        max: () => Math.round(window.innerWidth * 0.42),
        invert: true, /* arrastrar izquierda/arriba agranda panel anclado a derecha */
        onStart: () => {
          leftHandle.classList.add('dragging');
        },
        onEnd: () => {
          leftHandle.classList.remove('dragging');
          try {
            window.LGMDM?.storage?.set?.('lgmdm:flex-sidebar-w', getLeftWidth());
          } catch (_) {
            /* noop */
          }
        },
      });
    });
  }

  // ── Configuración de resize panel derecho ────────────────────────
  const rightHandle = document.querySelector('.app-resize-handle[data-resize="right"]');
  if (rightHandle) {
    // El resize del panel derecho calcula el ancho restante
    function getRightWidth() {
      const sidebarW = parseFloat(getComputedStyle(root).getPropertyValue('--lg-sidebar-w')) || 320;
      const maxRight = window.innerWidth - sidebarW - 10; // 10px gap
      return Math.max(200, Math.min(560, maxRight));
    }

    function setRightWidth(w) {
      // Ajustar el grid: sidebar fijo + gap + panel derecho = width total
      root.style.setProperty('--lg-sidebar-w', (window.innerWidth - w - 10) + 'px');
    }

    bindOnce(rightHandle, 'mousedown', (e) => {
      if (typeof LGMDM.ui.makeResizable !== 'function') {
        console.warn('01-shell-resize: LGMDM.ui.makeResizable no disponible para panel derecho');
        return;
      }

      LGMDM.ui.makeResizable(rightHandle, {
        axis: 'x',
        getSize: getRightWidth,
        setSize: setRightWidth,
        min: () => 200,
        max: () => 560,
        invert: false,
        onStart: () => {
          rightHandle.classList.add('dragging');
        },
        onEnd: () => {
          rightHandle.classList.remove('dragging');
          try {
            window.LGMDM?.storage?.set?.('lgmdm.shellRightWidth', getRightWidth());
          } catch (_) {
            /* noop */
          }
        },
      });
    });
  }

  // ── Desactivar resize en móvil y convertir a estado estático ─────
  function handleResizeViewportChange() {
    if (window.innerWidth <= 767) {
      // En móvil, quitar listeners de drag y mostrar estado fijo
      const handles = document.querySelectorAll('.app-resize-handle, .app-header__resize-handle');
      handles.forEach(h => {
        h.style.display = 'none';
        h.removeEventListener('mousedown', handleStart);
        h.classList.remove('dragging');
      });
    }
  }

  // Escuchar cambios de viewport
  window.addEventListener('resize', handleResizeViewportChange);
  // Ejecutar una vez al cargar
  handleResizeViewportChange();

  console.log('01-shell-resize: controlador único de resize activado');
})();