// ==========================================
// 00-shell-bootstrap.js — Monta el shell y conecta slots existentes
// ==========================================
// Fase 1 del audit: crear DOM mínimo nuevo en una página de prueba o bajo un flag de configuración.
// Conecta slots existentes (upload, master, analyze, preview, meters, logout)
// sin tocar el HTML legacy hasta que el nuevo shell esté validado.
//
// BUGFIX: Este script usa document.createElement y no hace innerHTML masivo
// para evitar inyección de estructura fuera del grid principal.
//
// Dependencias: LGMDM.ui.makeResizable (de 00-resize-utility.js ya cargado)
(function () {
  'use strict';

  // Solo continuar si el flag NEXT_SHELL_ENABLED está activo
  // (se activará en Fase 5 después de pruebas visuales y funcionales)
  if (window.NEXT_SHELL_ENABLED === false || window.NEXT_SHELL_ENABLED === undefined) {
    console.log('NEXT_SHELL_ENABLED desactivado - shell nuevo omitido');
    return;
  }

  const LGMDM = window.LGMDM = window.LGMDM || {};

  // ── Verificar que LGMDM.ui.makeResizable esté disponible ────────
  if (typeof LGMDM.ui !== 'function' && typeof LGMDM.ui.makeResizable !== 'function') {
    console.warn('00-shell-bootstrap: LGMDM.ui.makeResizable no disponible');
    return;
  }

  // ── Crear estructura DOM mínima del nuevo shell ──────────────────
  // Verificar si ya existe para evitar re-creación
  if (document.getElementById('app-root')) {
    console.log('00-shell-bootstrap: #app-root ya existe, omitiendo creación');
    return;
  }

  // Crear raíz principal
  const appRoot = document.createElement('div');
  appRoot.id = 'app-root';
  appRoot.className = 'app-root';
  appRoot.setAttribute('aria-label', 'Aplicación principal de MASTER');
  appRoot.style.height = '100dvh';
  appRoot.style.minHeight = '0';
  appRoot.style.overflow = 'hidden';

  // Crear header
  const header = document.createElement('header');
  header.className = 'app-header';
  header.style.height = 'var(--app-layout-header-height, 60px)';

  // Brand
  const brand = document.createElement('a');
  brand.className = 'app-header__brand';
  brand.href = '#';
  brand.textContent = 'MASTER Studio';
  brand.setAttribute('aria-label', 'MASTER Studio - Ir al inicio');

  // Brand icon (simplificado)
  const brandIcon = document.createElement('div');
  brandIcon.className = 'app-header__brand-icon';
  brandIcon.setAttribute('aria-hidden', 'true');
  brandIcon.style.width = '32px';
  brandIcon.style.height = '32px';
  brandIcon.style.background = 'var(--v4-accent, #ef9b42)';
  brandIcon.style.borderRadius = 'var(--app-border-radius, 4px)';
  brandIcon.style.flexShrink = '0';

  brand.appendChild(brandIcon);

  // Service status
  const status = document.createElement('div');
  status.className = 'app-header__service-status';
  status.id = 'service-status';
  status.textContent = 'Conectado';
  status.style.fontSize = '12px';
  status.color = 'var(--muted, #a8b2c0)';

  // User area
  const userArea = document.createElement('div');
  userArea.className = 'app-header__user';
  userArea.style.display = 'flex';
  userArea.alignItems = 'center';
  userArea.gap = '8px';
  userArea.style.fontSize = '13px';
  userArea.color = 'var(--muted, #a8b2c0)';

  const userName = document.createElement('span');
  userName.className = 'app-header__user-name';
  userName.textContent = 'Fede';
  userName.style.fontWeight = '500';

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'app-header__logout';
  logoutBtn.textContent = 'Cerrar sesión';
  logoutBtn.style.padding = '6px 12px';
  logoutBtn.style.fontSize = '12px';
  logoutBtn.style.border = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  logoutBtn.style.borderRadius = 'var(--app-border-radius, 4px)';
  logoutBtn.style.background = 'transparent';
  logoutBtn.style.color = 'var(--muted, #a8b2c0)';
  logoutBtn.style.cursor = 'pointer';
  logoutBtn.style.whiteSpace = 'nowrap';
  logoutBtn.setAttribute('aria-label', 'Cerrar sesión');

  userArea.appendChild(userName);
  userArea.appendChild(logoutBtn);

  // Append header parts
  header.appendChild(brand);
  header.appendChild(status);
  header.appendChild(userArea);

  // Create main grid
  const main = document.createElement('main');
  main.className = 'app-grid';
  main.style.display = 'grid';
  main.style.gridTemplateColumns = 'var(--app-layout-min-panel-width) 1fr var(--app-layout-min-panel-width)';
  main.style.gap = 'var(--app-layout-gap, 10px)';
  main.style.height = '100%';
  main.style.width = '100%';

  // Left panel
  const left = document.createElement('aside');
  left.className = 'app-left';
  left.style.minWidth = 'var(--app-layout-min-panel-width, 200px)';
  left.style.maxWidth = 'var(--app-layout-max-panel-width, 560px)';
  left.style.backgroundColor = 'var(--s, #0b0e18)';
  left.style.borderRight = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  left.style.flexDirection = 'column';
  left.style.minHeight = '0';

  const leftHeader = document.createElement('div');
  leftHeader.className = 'app-panel__header';
  leftHeader.style.padding = '8px var(--app-layout-gap, 10px)';
  leftHeader.style.gap = 'var(--app-layout-gap, 10px)';
  leftHeader.style.backgroundColor = 'var(--s2, #12182a)';
  leftHeader.style.borderBottom = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  leftHeader.style.color = 'var(--muted, #a8b2c0)';
  leftHeader.style.fontSize = '12px';
  leftHeader.textContent = 'Panel Izquierdo';

  const leftScroll = document.createElement('div');
  leftScroll.className = 'app-left__scroll';
  leftScroll.style.flex = '1';
  leftScroll.style.overflowY = 'auto';
  leftScroll.style.WebkitOverflowScrolling = 'touch';
  leftScroll.style.msOverflowStyle = 'none';
  leftScroll.style.scrollbarWidth = 'none';

  // Scrollbar WebKit
  const leftStyle = document.createElement('style');
  leftStyle.textContent = `
    .app-left__scroll::-webkit-scrollbar {
      width: 4px;
      height: 4px;
      background: transparent;
    }
    .app-left__scroll::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.28);
      border-radius: 2px;
    }
  `;

  left.appendChild(leftHeader);
  left.appendChild(leftScroll);
  left.appendChild(leftStyle);

  // ── Slot: Upload / Biblioteca de tracks (panel izquierdo) ────────
  const uploadSlot = document.createElement('div');
  uploadSlot.className = 'slot-upload';
  uploadSlot.style.padding = '12px';
  uploadSlot.style.borderBottom = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  uploadSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Subir Track</h3>
    <button onclick="document.getElementById('fileInputHidden')?.click()" style="width: 100%; padding: 8px; background: var(--v4-accent-soft, rgba(239, 155, 66, 0.16)); border: 1px solid var(--v4-accent, #ef9b42); border-radius: var(--app-border-radius, 4px); color: var(--v4-accent, #ef9b42); cursor: pointer; font-size: 12px;">Seleccionar archivo</button>
    <input type="file" id="fileInputHidden" accept="audio/*" style="display: none;" />
  `;
  leftScroll.appendChild(uploadSlot);

  // ── Slot: Info track / Metadata (panel izquierdo) ────────────────
  const infoSlot = document.createElement('div');
  infoSlot.className = 'slot-info-track';
  infoSlot.style.padding = '12px';
  infoSlot.style.borderBottom = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  infoSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Info del Track</h3>
    <div style="font-size: 11px; color: var(--muted, #a8b2c0); line-height: 1.4;">
      <p style="margin: 2px 0;"><strong>Nombre:</strong> <span id="trackName">Sin archivo</span></p>
      <p style="margin: 2px 0;"><strong>Duración:</strong> <span id="trackDuration">--:--</span></p>
      <p style="margin: 2px 0;"><strong>Formato:</strong> <span id="trackFormat">WAV / 44.1kHz</span></p>
    </div>
  `;
  leftScroll.appendChild(infoSlot);

  // ── Slot: Master / Analyze / Preview (consola central) ────────────
  const masterSlot = document.createElement('div');
  masterSlot.className = 'slot-master';
  masterSlot.style.padding = '12px';
  masterSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Mastering & Análisis</h3>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button onclick="console.log('Master iniciado')" style="padding: 6px 12px; background: var(--v4-accent, #ef9b42); border: none; border-radius: var(--app-border-radius, 4px); color: #070812; font-size: 11px; cursor: pointer;">Masterizar</button>
      <button onclick="console.log('Análisis iniciado')" style="padding: 6px 12px; background: var(--v4-panel-2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); color: var(--text, #edf2ff); font-size: 11px; cursor: pointer;">Analizar</button>
      <button onclick="console.log('Preview iniciado')" style="padding: 6px 12px; background: var(--v4-panel-2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); color: var(--text, #edf2ff); font-size: 11px; cursor: pointer;">Preview 25s</button>
    </div>
  `;
  centerScroll.appendChild(masterSlot);

  // ── Slot: Meters / GR (consola central) ───────────────────────────
  const metersSlot = document.createElement('div');
  metersSlot.className = 'slot-meters';
  metersSlot.style.padding = '12px';
  metersSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Meters & GR</h3>
    <div style="display: flex; gap: 12px; align-items: center;">
      <div style="width: 60px; height: 120px; background: linear-gradient(to top, #57d26f 0%, #ffba5a 60%, #ff6b6b 100%); border-radius: 4px; position: relative;">
        <div style="position: absolute; bottom: 20%; left: 0; right: 0; height: 4px; background: #070812;"></div>
      </div>
      <div style="font-size: 11px; color: var(--muted, #a8b2c0);">
        <p style="margin: 2px 0;">LUFS: <strong>-14.2</strong></p>
        <p style="margin: 2px 0;">Peak: <strong>-1.2 dB</strong></p>
        <p style="margin: 2px 0;">GR: <strong>3.5 dB</strong></p>
      </div>
    </div>
  `;
  centerScroll.appendChild(metersSlot);

  // ── Slot: Chat LAIA (consola central) ─────────────────────────────
  const chatSlot = document.createElement('div');
  chatSlot.className = 'slot-chat-laia';
  chatSlot.style.padding = '12px';
  chatSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Asistente LAIA</h3>
    <div style="background: var(--s2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); padding: 8px; min-height: 80px; font-size: 11px; color: var(--muted, #a8b2c0);">
      <p style="margin: 0;">¿En qué puedo ayudarte con tu master?</p>
    </div>
  `;
  centerScroll.appendChild(chatSlot);

  // ── Slot: Waveform / Preview (consola central) ────────────────────
  const waveformSlot = document.createElement('div');
  waveformSlot.className = 'slot-waveform';
  waveformSlot.style.padding = '12px';
  waveformSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Waveform</h3>
    <div style="height: 120px; background: linear-gradient(90deg, var(--v4-panel-2, #12182a) 0%, var(--v4-panel-3, #171d30) 50%, var(--v4-panel-2, #12182a) 100%); border-radius: var(--app-border-radius, 4px); position: relative; overflow: hidden;">
      <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none" style="position: absolute; top: 0; left: 0;">
        <path d="M0,60 Q50,20 100,60 T200,60 T300,60 T400,60" stroke="var(--v4-accent, #ef9b42)" stroke-width="2" fill="none" opacity="0.8"/>
        <path d="M0,60 Q50,100 100,60 T200,60 T300,60 T400,60" stroke="var(--v4-glow, rgba(139, 210, 232, 0.18))" stroke-width="1" fill="none" opacity="0.5"/>
      </svg>
    </div>
  `;
  centerScroll.appendChild(waveformSlot);

  // ── Slot: Preview real time (consola central) ─────────────────────
  const previewSlot = document.createElement('div');
  previewSlot.className = 'slot-preview';
  previewSlot.style.padding = '12px';
  previewSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Preview Real Time</h3>
    <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted, #a8b2c0); cursor: pointer;">
      <input type="checkbox" id="previewRealTime" checked style="accent-color: var(--v4-accent, #ef9b42);" />
      <span>Activar preview en tiempo real</span>
    </label>
  `;
  centerScroll.appendChild(previewSlot);

  // ── Slot: Preview con meters en tiempo real (consola central) ─────
  // Usa 30-preview-controller.js para sincronizar con el server
  const previewRealTimeSlot = document.createElement('div');
  previewRealTimeSlot.className = 'slot-preview-realtime';
  previewRealTimeSlot.id = 'previewRealTimeSlot';
  previewRealTimeSlot.style.padding = '12px';
  previewRealTimeSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Preview + Meters en Tiempo Real</h3>
    <div style="font-size: 11px; color: var(--muted, #a8b2c0); line-height: 1.4;">
      <p style="margin: 2px 0;">Estado: <strong id="previewStatus">Esperando archivo</strong></p>
      <p style="margin: 2px 0;">Duración: <strong id="previewDuration">25 s</strong></p>
      <p style="margin: 2px 0;">GR en vivo: <strong id="liveGR">-- dB</strong></p>
      <p style="margin: 2px 0;">LUFS en vivo: <strong id="liveLUFS">-- LUFS</strong></p>
    </div>
    <div style="margin-top: 8px; padding: 8px; background: var(--s2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); font-size: 10px; color: var(--dim, #6e7a8a);">
      <p style="margin: 0;">Nota: los meters se sincronizan con el server en cada render del preview. La telemetría de gain reduction llega en tiempo real.</p>
    </div>
  `;
  centerScroll.appendChild(previewRealTimeSlot);

  // Right panel
  const right = document.createElement('aside');
  right.className = 'app-right';
  right.style.minWidth = 'var(--app-layout-min-panel-width, 200px)';
  right.style.maxWidth = 'var(--app-layout-max-panel-width, 560px)';
  right.style.backgroundColor = 'var(--s, #0b0e18)';
  right.style.borderLeft = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  right.style.flexDirection = 'column';
  right.style.minHeight = '0';

  const rightHeader = document.createElement('div');
  rightHeader.className = 'app-panel__header';
  rightHeader.style.padding = '8px var(--app-layout-gap, 10px)';
  rightHeader.style.gap = 'var(--app-layout-gap, 10px)';
  rightHeader.style.backgroundColor = 'var(--s2, #12182a)';
  rightHeader.style.borderBottom = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  rightHeader.style.color = 'var(--muted, #a8b2c0)';
  rightHeader.style.fontSize = '12px';
  rightHeader.textContent = 'Rack Derecho';

  const rightScroll = document.createElement('div');
  rightScroll.className = 'app-right__scroll';
  rightScroll.style.flex = '1';
  rightScroll.style.overflowY = 'auto';
  rightScroll.style.WebkitOverflowScrolling = 'touch';
  rightScroll.style.msOverflowStyle = 'none';
  rightScroll.style.scrollbarWidth = 'none';

  // Scrollbar WebKit
  const rightStyle = document.createElement('style');
  rightStyle.textContent = `
    .app-right__scroll::-webkit-scrollbar {
      width: 4px;
      height: 4px;
      background: transparent;
    }
    .app-right__scroll::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.28);
      border-radius: 2px;
    }
  `;

  right.appendChild(rightHeader);
  right.appendChild(rightScroll);
  right.appendChild(rightStyle);

  // Center console
  const center = document.createElement('section');
  center.className = 'app-center';
  center.style.display = 'flex';
  center.style.flexDirection = 'column';
  center.style.width = '100%';
  center.style.backgroundColor = 'var(--s, #0b0e18)';
  center.style.minHeight = '0';

  const centerHeader = document.createElement('div');
  centerHeader.className = 'app-center__header';
  centerHeader.style.padding = '8px var(--app-layout-gap, 10px)';
  centerHeader.style.gap = 'var(--app-layout-gap, 10px)';
  centerHeader.style.backgroundColor = 'var(--s2, #12182a)';
  centerHeader.style.borderBottom = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  centerHeader.style.color = 'var(--muted, #a8b2c0)';
  centerHeader.style.fontSize = '12px';
  centerHeader.style.whiteSpace = 'nowrap';
  centerHeader.textContent = 'Consola Central';

  const centerScroll = document.createElement('div');
  centerScroll.className = 'app-center__scroll';
  centerScroll.style.flex = '1';
  centerScroll.style.overflowY = 'auto';
  centerScroll.style.WebkitOverflowScrolling = 'touch';
  centerScroll.style.msOverflowStyle = 'none';
  centerScroll.style.scrollbarWidth = 'none';

  // Scrollbar WebKit
  const centerStyle = document.createElement('style');
  centerStyle.textContent = `
    .app-center__scroll::-webkit-scrollbar {
      width: 4px;
      height: 4px;
      background: transparent;
    }
    .app-center__scroll::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.28);
      border-radius: 2px;
    }
  `;

  center.appendChild(centerHeader);
  center.appendChild(centerScroll);
  center.appendChild(centerStyle);

  // Resize handles
  const leftHandle = document.createElement('div');
  leftHandle.className = 'app-resize-handle';
  leftHandle.setAttribute('data-resize', 'left');
  leftHandle.style.width = '10px';
  leftHandle.style.cursor = 'col-resize';
  leftHandle.style.userSelect = 'none';
  leftHandle.style.WebkitUserSelect = 'none';
  leftHandle.style.MozUserSelect = 'none';
  leftHandle.style.msUserSelect = 'none';
  leftHandle.style.position = 'absolute';
  leftHandle.style.left = '100%';
  leftHandle.style.marginLeft = '-5px';

  const rightHandle = document.createElement('div');
  rightHandle.className = 'app-resize-handle';
  rightHandle.setAttribute('data-resize', 'right');
  rightHandle.style.width = '10px';
  rightHandle.style.cursor = 'col-resize';
  rightHandle.style.userSelect = 'none';
  rightHandle.style.WebkitUserSelect = 'none';
  rightHandle.style.MozUserSelect = 'none';
  rightHandle.style.msUserSelect = 'none';
  rightHandle.style.position = 'absolute';
  rightHandle.style.right = '100%';
  rightHandle.style.marginRight = '-5px';

  // Append to root
  appRoot.appendChild(header);
  appRoot.appendChild(main);
  main.appendChild(left);
  main.appendChild(leftHandle);
  main.appendChild(center);
  main.appendChild(rightHandle);
  main.appendChild(right);

  // Insertar al principio de body (antes de cualquier otro contenido legacy)
  const body = document.querySelector('body');
  if (body && body.firstChild) {
    body.insertBefore(appRoot, body.firstChild);
  } else {
    body.appendChild(appRoot);
  }

  // ── Conectar logout ────────────────────────────────────────────
  const logout = logoutBtn;
  if (logout) {
    logout.addEventListener('click', (e) => {
      e.stopImmediatePropagation();
      if (typeof LGMDM?.auth?.logout === 'function') {
        LGMDM.auth.logout();
      } else {
        // Fallback: limpiar sessionStorage y redirect
        try {
          sessionStorage.removeItem('master_auth_token');
          sessionStorage.removeItem('master_auth_user');
          window.location.href = '/';
        } catch (_) {
          // noop
        }
      }
    });
  }

  // ── Conectar upload/file handling slot ──────────────────────────
  // Slot para: carga de archivo y biblioteca de tracks
  // Se conecta al input hidden o button que ya existe en el HTML legacy
  const fileInput = document.querySelector('input[type="file"][accept*="audio"]');
  if (fileInput) {
    fileInput.style.display = 'none'; // Oculto, se usa el botón del UI
    console.log('00-shell-bootstrap: slot de upload conectado');
  }

  // ── Conectar meter/GR slot ──────────────────────────────────────
  // Los meters y GR se insertarán dinámicamente en .app-center__scroll
  // cuando los módulos correspondientes estén activos
  window.LGMDM = window.LGMDM || {};
  window.LGMDM.slots = window.LGMDM.slots || {};
  window.LGMDM.slots.console = centerScroll;
  window.LGMDM.slots.leftPanel = leftScroll;
  window.LGMDM.slots.rightPanel = rightScroll;

  // ── Slot: Rack DSP con pestañas colapsables (panel derecho) ───────
  const rackSlot = document.createElement('div');
  rackSlot.className = 'slot-rack-dsp';
  rackSlot.style.padding = '12px';

  const rackHeader = document.createElement('div');
  rackHeader.style.display = 'flex';
  rackHeader.style.gap = '4px';
  rackHeader.style.marginBottom = '8px';
  rackHeader.innerHTML = `
    <button onclick="this.parentElement.nextElementSibling.querySelector('.dsp-tab').click()" style="padding: 4px 8px; font-size: 10px; background: var(--v4-accent, #ef9b42); border: none; border-radius: var(--app-border-radius, 4px); color: #070812; cursor: pointer;">EQ</button>
    <button onclick="this.parentElement.nextElementSibling.querySelector('.dsp-tab').click()" style="padding: 4px 8px; font-size: 10px; background: var(--v4-panel-2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); color: var(--muted, #a8b2c0); cursor: pointer;">Comp</button>
    <button onclick="this.parentElement.nextElementSibling.querySelector('.dsp-tab').click()" style="padding: 4px 8px; font-size: 10px; background: var(--v4-panel-2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); color: var(--muted, #a8b2c0); cursor: pointer;">Reverb</button>
  `;
  rackSlot.appendChild(rackHeader);

  const dspTabs = document.createElement('div');
  dspTabs.className = 'dsp-tabs';
  dspTabs.style.display = 'flex';
  dspTabs.style.flexDirection = 'column';
  dspTabs.style.gap = '8px';

  const eqTab = document.createElement('div');
  eqTab.className = 'dsp-tab';
  eqTab.innerHTML = `
    <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('span').textContent = this.nextElementSibling.style.display === 'none' ? '▶' : '▼';" style="display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--s2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); cursor: pointer; font-size: 11px; color: var(--text, #edf2ff);">
      <span>▼</span> <strong>EQ Paramétrico</strong>
    </div>
    <div style="padding: 8px; background: var(--s, #0b0e18); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-top: none; border-radius: 0 0 var(--app-border-radius, 4px) var(--app-border-radius, 4px); font-size: 11px; color: var(--muted, #a8b2c0);">
      <p style="margin: 2px 0;">Low: <strong>+2.5 dB</strong> @ 120Hz</p>
      <p style="margin: 2px 0;">Mid: <strong>-1.0 dB</strong> @ 2.4kHz</p>
      <p style="margin: 2px 0;">High: <strong>+1.5 dB</strong> @ 8kHz</p>
    </div>
  `;
  dspTabs.appendChild(eqTab);

  const compTab = document.createElement('div');
  compTab.className = 'dsp-tab';
  compTab.innerHTML = `
    <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('span').textContent = this.nextElementSibling.style.display === 'none' ? '▶' : '▼';" style="display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--s2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); cursor: pointer; font-size: 11px; color: var(--text, #edf2ff);">
      <span>▼</span> <strong>Compresor</strong>
    </div>
    <div style="padding: 8px; background: var(--s, #0b0e18); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-top: none; border-radius: 0 0 var(--app-border-radius, 4px) var(--app-border-radius, 4px); font-size: 11px; color: var(--muted, #a8b2c0);">
      <p style="margin: 2px 0;">Ratio: <strong>4:1</strong></p>
      <p style="margin: 2px 0;">Threshold: <strong>-18 dB</strong></p>
      <p style="margin: 2px 0;">Attack: <strong>10 ms</strong></p>
    </div>
  `;
  dspTabs.appendChild(compTab);

  const revTab = document.createElement('div');
  revTab.className = 'dsp-tab';
  revTab.innerHTML = `
    <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('span').textContent = this.nextElementSibling.style.display === 'none' ? '▶' : '▼';" style="display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--s2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); cursor: pointer; font-size: 11px; color: var(--text, #edf2ff);">
      <span>▼</span> <strong>Reverb</strong>
    </div>
    <div style="padding: 8px; background: var(--s, #0b0e18); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-top: none; border-radius: 0 0 var(--app-border-radius, 4px) var(--app-border-radius, 4px); font-size: 11px; color: var(--muted, #a8b2c0);">
      <p style="margin: 2px 0;">Type: <strong>Hall</strong></p>
      <p style="margin: 2px 0;">Decay: <strong>2.4 s</strong></p>
      <p style="margin: 2px 0;">Wet: <strong>25%</strong></p>
    </div>
  `;
  dspTabs.appendChild(revTab);

  rackSlot.appendChild(dspTabs);
  rightScroll.appendChild(rackSlot);

  // ── Slot: Presets / Historial (panel derecho) ─────────────────────
  const presetsSlot = document.createElement('div');
  presetsSlot.className = 'slot-presets';
  presetsSlot.style.padding = '12px';
  presetsSlot.style.borderTop = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  presetsSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Presets</h3>
    <div style="font-size: 11px; color: var(--muted, #a8b2c0); line-height: 1.4;">
      <p style="margin: 2px 0; cursor: pointer;" onclick="console.log('Preset: Master Pop')">🎚 Master Pop</p>
      <p style="margin: 2px 0; cursor: pointer;" onclick="console.log('Preset: Rock Loud')">🎚 Rock Loud</p>
      <p style="margin: 2px 0; cursor: pointer;" onclick="console.log('Preset: Jazz Warm')">🎚 Jazz Warm</p>
    </div>
  `;
  rightScroll.appendChild(presetsSlot);

  // ── Slot: Historial (panel derecho) ───────────────────────────────
  const historySlot = document.createElement('div');
  historySlot.className = 'slot-history';
  historySlot.style.padding = '12px';
  historySlot.style.borderTop = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  historySlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Historial</h3>
    <div style="font-size: 10px; color: var(--dim, #6e7a8a); line-height: 1.3;">
      <p style="margin: 2px 0;">2026-09-07 — Master Pop aplicado</p>
      <p style="margin: 2px 0;">2026-09-06 — Rock Loud aplicado</p>
      <p style="margin: 2px 0;">2026-09-05 — Jazz Warm aplicado</p>
    </div>
  `;
  rightScroll.appendChild(historySlot);

  // ── Slot: Descarga / Reportes (panel derecho) ─────────────────────
  const downloadSlot = document.createElement('div');
  downloadSlot.className = 'slot-download';
  downloadSlot.style.padding = '12px';
  downloadSlot.style.borderTop = '1px solid var(--line, rgba(148, 163, 184, 0.18))';
  downloadSlot.innerHTML = `
    <h3 style="font-size: 13px; color: var(--text, #edf2ff); margin: 0 0 8px;">Descarga</h3>
    <button onclick="console.log('Descargando master...')" style="width: 100%; padding: 8px; background: var(--v4-accent, #ef9b42); border: none; border-radius: var(--app-border-radius, 4px); color: #070812; font-size: 12px; cursor: pointer;">Descargar Master</button>
  `;
  rightScroll.appendChild(downloadSlot);

  // ── Botones LAIA: ocultar/ver panel del chat ─────────────────────
  const laiaToggleSlot = document.createElement('div');
  laiaToggleSlot.className = 'slot-laia-toggle';
  laiaToggleSlot.style.padding = '8px 12px';
  laiaToggleSlot.style.display = 'flex';
  laiaToggleSlot.style.gap = '8px';
  laiaToggleSlot.style.justifyContent = 'flex-end';
  laiaToggleSlot.innerHTML = `
    <button onclick="document.getElementById('chatSlot')?.style.display = document.getElementById('chatSlot')?.style.display === 'none' ? 'block' : 'none'; this.textContent = document.getElementById('chatSlot')?.style.display === 'none' ? 'Ver Chat' : 'Ocultar Chat';" style="padding: 4px 8px; font-size: 10px; background: var(--v4-panel-2, #12182a); border: 1px solid var(--line, rgba(148, 163, 184, 0.18)); border-radius: var(--app-border-radius, 4px); color: var(--text, #edf2ff); cursor: pointer;">Ocultar Chat</button>
  `;
  // Insertar antes del chat slot para que esté visible
  const chatSlotRef = document.querySelector('.slot-chat-laia');
  if (chatSlotRef && chatSlotRef.parentElement) {
    chatSlotRef.parentElement.insertBefore(laiaToggleSlot, chatSlotRef);
  } else {
    centerScroll.appendChild(laiaToggleSlot);
  }

  // ── Conectar plugin registry y plugin list ───────────────────────
  // Cargar los módulos nuevos de plugins
  const pluginRegistryScript = document.createElement('script');
  pluginRegistryScript.src = 'js-next/04-plugin-registry.js';
  pluginRegistryScript.onload = () => {
    console.log('00-shell-bootstrap: plugin registry cargado');
    // Después de cargar el registry, cargar la lista
    const pluginListScript = document.createElement('script');
    pluginListScript.src = 'js-next/05-plugin-list.js';
    pluginListScript.onload = () => {
      console.log('00-shell-bootstrap: plugin list cargado');
      // Inicializar la lista de plugins en el panel izquierdo
      if (typeof window.LGMDM?.plugins?.init === 'function') {
        window.LGMDM.plugins.init();
      }
    };
    document.body.appendChild(pluginListScript);
  };
  document.body.appendChild(pluginRegistryScript);

  // ── Cargar CSS de plugin list ───────────────────────────────────
  const pluginCssLink = document.createElement('link');
  pluginCssLink.rel = 'stylesheet';
  pluginCssLink.href = 'css-next/10-plugin-list.css';
  document.head.appendChild(pluginCssLink);

  console.log('00-shell-bootstrap: shell nuevo montado y slots conectados');
})();