/* STFX — AI Actions Overlay
 * Overlay de "AI Mastering Insight" con análisis + recomendación + chat.
 * Extraído de 20-pro-upgrades.js (solo la funcionalidad AI).
 */
(function () {
  'use strict';

  const el = (id) => document.getElementById(id);
  const qs = (s, root = document) => root.querySelector(s);
  const toast = (msg, type = 'info') => window.STFX?.ui?.showToast?.(msg, type, 2600);
  const escapeHtml = (s) => window.STFX?.ui?.escapeHtml?.(s) || String(s);

  function closeOverlay(id) {
    el(id)?.classList.remove('is-open');
  }

  function overlayBase(id, title, subtitle, body) {
    let root = el('aiActionsOverlayRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'aiActionsOverlayRoot';
      document.body.appendChild(root);
    }
    root.innerHTML = `
      <div class="pro-overlay ${id}" id="${id}" role="dialog" aria-modal="true">
        <div class="pro-dialog">
          <div class="pro-dialog-head">
            <div><div class="pro-eyebrow">AI ACTIONS</div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(subtitle)}</p></div>
            <button class="pro-close" data-close="${id}" aria-label="Cerrar">×</button>
          </div>
          <div class="pro-dialog-body">${body}</div>
        </div>
      </div>`;
    qs(`[data-close="${id}"]`)?.addEventListener('click', () => closeOverlay(id));
    qs(`.${id}`)?.addEventListener('click', (e) => {
      if (e.target.classList.contains('pro-overlay')) closeOverlay(id);
    });
  }

  async function openAI() {
    const file = window.selectedFile;
    overlayBase('proAiOverlay', 'AI Mastering Insight', 'La IA analiza tu track y propone parámetros revisables antes de masterizar.',
      `<div id="proAiContent">
        <div class="pro-ai-intro">Ejecutá una recomendación para cargar parámetros en la cadena actual.</div>
        <div class="pro-dialog-actions">
          <button class="btn btn-primary" id="proAiRun">✦ Analizar y recomendar</button>
          <button class="btn btn-secondary" id="proAiChat">Abrir AI Chat</button>
        </div>
        <div id="proAiResult"></div>
      </div>`);
    el('proAiOverlay')?.classList.add('is-open');

    el('proAiRun')?.addEventListener('click', async () => {
      if (!file) { el('proAiResult').innerHTML = '<div class="pro-empty">Seleccioná un audio primero.</div>'; return; }
      const btn = el('proAiRun');
      btn.disabled = true;
      btn.textContent = 'Analizando…';
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await STFX.api.apiFetch(`${STFX.api.apiBase()}/ai/suggest`, { method: 'POST', body: fd });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const data = await res.json();
        if (typeof window.STFX?.ai?.setContext === 'function') {
          window.STFX.ai.setContext(data.analysis || null);
        } else {
          window.dispatchEvent(new CustomEvent('analysis-updated', { detail: data.analysis || null }));
        }
        const d = data.ai_decision || {};
        const { platform, reasoning, ...params } = d;
        if (Object.keys(params).length && typeof window.STFX?.presets?.applyToUI === 'function') {
          window.STFX.presets.applyToUI(params);
          if (typeof window.STFX?.params?.renderPreview === 'function') {
            window.STFX.params.renderPreview(params, {
              title: '✦ AI Insight — revisá antes de masterizar',
              confirmLabel: 'Confirmar y masterizar',
              onConfirm: window.STFX?.mastering?.submitJob
            });
          }
        }
        el('proAiResult').innerHTML = `
          <div class="pro-ai-result">
            <div class="pro-ai-badge">RECOMMENDED</div>
            <h4>${escapeHtml(platform || 'Adaptive Mastering')}</h4>
            <p>${escapeHtml(reasoning || 'La IA cargó una cadena adaptativa en tus controles. Revisala y escuchá el preview antes de confirmar.')}</p>
          </div>`;
      } catch (e) {
        const box = el('proAiResult');
        if (box) box.innerHTML = `<div class="pro-error">Error: ${escapeHtml(e.message)}</div>`;
      } finally {
        btn.disabled = false;
        btn.textContent = '✦ Analizar y recomendar';
      }
    });

    el('proAiChat')?.addEventListener('click', () => {
      closeOverlay('proAiOverlay');
      el('aiFab')?.click();
    });
  }

  function boot() {
    const btn = el('btnAiSuggest');
    if (btn) {
      btn.disabled = false;
      btn.addEventListener('click', openAI);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
