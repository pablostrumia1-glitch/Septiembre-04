// ============================================================
// 05-plugin-list.js — Panel izquierdo: lista de plugins DSP
// ============================================================
// Monta en .app-left__scroll (nuevo shell).
// Consume LGMDM.plugins (04-plugin-registry.js).
// No toca inputs legacy — emite eventos para que el rack
// y el sistema de params los manejen.
//
// Estado:
//   active  — Set<key> plugins en la cadena
//   bypassed — Set<key> plugins activos pero bypassed
//
// Eventos emitidos:
//   lgmdm:plugin-enabled  { key, active: [...] }
//   lgmdm:plugin-disabled { key, active: [...] }
//   lgmdm:plugin-bypass   { key, bypassed: bool }
//   lgmdm:chain-changed   { active: [...], bypassed: [...] }
// ============================================================

(function () {
  'use strict';

  const STORAGE_KEY = 'lgmdm:plugin-list-state-v1';
  const MOUNT_SELECTOR = '.app-left__scroll';

  // ── Esperar al registry ──────────────────────────────────────────────────
  function init() {
    const { PLUGINS, FAMILY_ORDER, FAMILY_COLOR, getByFamily } = window.LGMDM.plugins;

    // ── Estado ─────────────────────────────────────────────────────────────
    const state = {
      active:   new Set(['input', 'compressor', 'limiter']),
      bypassed: new Set(),
      collapsed: new Set(),   // familias colapsadas
    };

    // ── Persistencia ────────────────────────────────────────────────────────
    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          active:    [...state.active],
          bypassed:  [...state.bypassed],
          collapsed: [...state.collapsed],
        }));
      } catch (_) {}
    }

    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.active))    data.active.forEach(k => { if (PLUGINS[k]) state.active.add(k); });
        if (Array.isArray(data.bypassed))  data.bypassed.forEach(k => { if (PLUGINS[k]) state.bypassed.add(k); });
        if (Array.isArray(data.collapsed)) data.collapsed.forEach(f => state.collapsed.add(f));
      } catch (_) {}
    }

    // ── Acciones ─────────────────────────────────────────────────────────────
    function emit(name, detail) {
      window.dispatchEvent(new CustomEvent(name, { detail, bubbles: false }));
    }

    function emitChainChanged() {
      emit('lgmdm:chain-changed', {
        active:   [...state.active],
        bypassed: [...state.bypassed],
      });
      // Compatibilidad con sistema viejo
      window.dispatchEvent(new CustomEvent('lgmdm:studio-chain-changed', {
        detail: { active: [...state.active] },
      }));
    }

    function enable(key) {
      if (PLUGINS[key] && !state.active.has(key)) {
        state.active.add(key);
        state.bypassed.delete(key);
        save();
        emit('lgmdm:plugin-enabled', { key, active: [...state.active] });
        emitChainChanged();
        render();
      }
    }

    function disable(key) {
      const p = PLUGINS[key];
      if (!p || p.pinned) return;
      state.active.delete(key);
      state.bypassed.delete(key);
      save();
      emit('lgmdm:plugin-disabled', { key, active: [...state.active] });
      emitChainChanged();
      render();
    }

    function toggleBypass(key, force) {
      if (!state.active.has(key)) return;
      const next = force !== undefined ? force : !state.bypassed.has(key);
      if (next) state.bypassed.add(key);
      else state.bypassed.delete(key);
      save();
      emit('lgmdm:plugin-bypass', { key, bypassed: next });
      emitChainChanged();
      render();
    }

    function toggle(key, checked) {
      if (checked) enable(key); else disable(key);
    }

    function toggleFamily(family) {
      if (state.collapsed.has(family)) state.collapsed.delete(family);
      else state.collapsed.add(family);
      save();
      render();
    }

    // ── Render ───────────────────────────────────────────────────────────────
    function render() {
      const mount = document.querySelector(MOUNT_SELECTOR);
      if (!mount) return;
      mount.innerHTML = '';

      // Contenedor
      const list = document.createElement('div');
      list.className = 'pl-list';

      getByFamily().forEach(({ family, color, plugins }) => {
        const section = document.createElement('section');
        section.className = 'pl-family';
        section.dataset.family = family;

        // Header de familia
        const hdr = document.createElement('button');
        hdr.type = 'button';
        hdr.className = 'pl-family__header';
        hdr.setAttribute('aria-expanded', String(!state.collapsed.has(family)));

        const dot = document.createElement('span');
        dot.className = 'pl-family__dot';
        dot.style.background = color;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'pl-family__name';
        nameSpan.textContent = family;

        const countSpan = document.createElement('span');
        countSpan.className = 'pl-family__count';
        countSpan.textContent = plugins.length;

        const chevron = document.createElement('span');
        chevron.className = 'pl-family__chevron';
        chevron.setAttribute('aria-hidden', 'true');

        hdr.append(dot, nameSpan, countSpan, chevron);
        hdr.addEventListener('click', () => toggleFamily(family));
        section.appendChild(hdr);

        // Plugins de la familia
        const rows = document.createElement('div');
        rows.className = 'pl-family__rows';
        if (state.collapsed.has(family)) rows.hidden = true;

        plugins.forEach(({ key, label, pinned, hasGR }) => {
          const isActive   = state.active.has(key);
          const isBypassed = state.bypassed.has(key);

          const row = document.createElement('label');
          row.className = [
            'pl-plugin',
            isActive   ? 'pl-plugin--active'   : '',
            isBypassed ? 'pl-plugin--bypassed'  : '',
            pinned     ? 'pl-plugin--pinned'     : '',
          ].filter(Boolean).join(' ');
          row.dataset.key = key;

          // Checkbox (oculto visualmente, accesible)
          const chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.className = 'pl-plugin__checkbox';
          chk.checked = isActive;
          chk.disabled = !!pinned;
          chk.setAttribute('aria-label', `${label} ${isActive ? 'activo' : 'inactivo'}`);
          chk.addEventListener('change', e => toggle(key, e.target.checked));

          // LED
          const led = document.createElement('span');
          led.className = 'pl-plugin__led';
          led.style.setProperty('--led-color', color);

          // Nombre
          const name = document.createElement('span');
          name.className = 'pl-plugin__name';
          name.textContent = label;

          // Badges
          const badges = document.createElement('span');
          badges.className = 'pl-plugin__badges';

          if (pinned) {
            const core = document.createElement('em');
            core.className = 'pl-badge pl-badge--core';
            core.textContent = 'CORE';
            badges.appendChild(core);
          }
          if (hasGR && isActive) {
            const gr = document.createElement('em');
            gr.className = 'pl-badge pl-badge--gr';
            gr.textContent = 'GR';
            badges.appendChild(gr);
          }
          if (isBypassed) {
            const byp = document.createElement('em');
            byp.className = 'pl-badge pl-badge--bypass';
            byp.textContent = 'BYP';
            badges.appendChild(byp);
          }

          // Botón bypass (solo si activo y no pinned)
          let bypassBtn = null;
          if (isActive && !pinned) {
            bypassBtn = document.createElement('button');
            bypassBtn.type = 'button';
            bypassBtn.className = `pl-plugin__bypass ${isBypassed ? 'pl-plugin__bypass--on' : ''}`;
            bypassBtn.setAttribute('aria-label', isBypassed ? `Desactivar bypass de ${label}` : `Bypass ${label}`);
            bypassBtn.setAttribute('title', isBypassed ? 'Desactivar bypass' : 'Bypass');
            bypassBtn.addEventListener('click', e => {
              e.preventDefault();
              toggleBypass(key);
            });
          }

          row.append(chk, led, name, badges);
          if (bypassBtn) row.appendChild(bypassBtn);
          rows.appendChild(row);
        });

        section.appendChild(rows);
        list.appendChild(section);
      });

      mount.appendChild(list);
    }

    // ── API pública ──────────────────────────────────────────────────────────
    const LGMDM = window.LGMDM = window.LGMDM || {};
    LGMDM.pluginList = {
      enable,
      disable,
      toggleBypass,
      isActive:   key => state.active.has(key),
      isBypassed: key => state.bypassed.has(key),
      getActive:  ()  => [...state.active],
      getBypassed:()  => [...state.bypassed],
      render,
    };

    // ── Escuchar eventos del rack (si el rack activa/desactiva) ──────────────
    window.addEventListener('lgmdm:rack-remove', e => {
      if (e.detail?.key) disable(e.detail.key);
    });
    window.addEventListener('lgmdm:rack-bypass', e => {
      if (e.detail?.key !== undefined) toggleBypass(e.detail.key, e.detail.bypassed);
    });

    // ── Montar ────────────────────────────────────────────────────────────────
    load();

    // Si el mount ya existe, render inmediato; si no, esperar al DOM
    if (document.querySelector(MOUNT_SELECTOR)) {
      render();
    } else {
      const obs = new MutationObserver(() => {
        if (document.querySelector(MOUNT_SELECTOR)) {
          obs.disconnect();
          render();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    window.dispatchEvent(new CustomEvent('lgmdm:plugin-list-ready'));
  }

  // ── Esperar al registry ──────────────────────────────────────────────────
  if (window.LGMDM?.plugins) {
    init();
  } else {
    window.addEventListener('lgmdm:plugin-registry-ready', init, { once: true });
  }

})();
