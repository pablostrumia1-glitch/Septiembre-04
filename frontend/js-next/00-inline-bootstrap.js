    window.NEXT_SHELL_ENABLED = true;
    window.LGMDM = window.LGMDM || {};

    const API_BASE = 'https://masteringstudio-api.duckdns.org';
    const getAuthToken = () => sessionStorage.getItem('master_auth_token') || '';
    const chatPanel = document.getElementById('laiaPanel');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const previewRealTime = document.getElementById('previewRealTime');

    async function fetchJson(url, options = {}) {
      const headers = { ...(options.headers || {}) };
      const token = getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(url, { ...options, headers, credentials: 'include' });
      if (!response.ok) {
        let detail = 'Error en la petición';
        try {
          const data = await response.json();
          detail = data?.detail || detail;
        } catch (_) {}
        throw new Error(detail);
      }
      return response;
    }

    function normalizeMeterPayload(payload) {
      if (!payload || typeof payload !== 'object') return {};
      if (payload.chain_meters && typeof payload.chain_meters === 'object') return payload.chain_meters;
      if (payload.chainMeters && typeof payload.chainMeters === 'object') return payload.chainMeters;
      return payload;
    }

    function applyMeterValues(values) {
      const safe = values || {};
      const lufs = Number(safe.integrated_lufs ?? safe.lufs ?? safe.loudness ?? safe.master_lufs ?? -14.0);
      const peak = Number(safe.peak_db ?? safe.peak ?? safe.true_peak_db ?? -1.0);
      const gr = Number(safe.gr_db ?? safe.gain_reduction_db ?? safe.gain_reduction ?? safe.gain_reduction_dbfs ?? 3.5);

      const liveLUFS = document.getElementById('liveLUFS');
      const livePeak = document.getElementById('livePeak');
      const liveGR = document.getElementById('liveGR');
      const liveLUFSPreview = document.getElementById('liveLUFSPreview');
      const liveGRPreview = document.getElementById('liveGRPreview');
      const meterFill = document.querySelector('.meter-vu__fill');

      if (liveLUFS) liveLUFS.textContent = `${Number.isFinite(lufs) ? lufs.toFixed(1) : '--'} LUFS`;
      if (livePeak) livePeak.textContent = `${Number.isFinite(peak) ? peak.toFixed(1) : '--'} dB`;
      if (liveGR) liveGR.textContent = `${Number.isFinite(gr) ? gr.toFixed(1) : '--'} dB`;
      if (liveLUFSPreview) liveLUFSPreview.textContent = `${Number.isFinite(lufs) ? lufs.toFixed(1) : '--'} LUFS`;
      if (liveGRPreview) liveGRPreview.textContent = `${Number.isFinite(gr) ? gr.toFixed(1) : '--'} dB`;

      if (meterFill) {
        const pct = Math.min(100, Math.max(12, ((Number.isFinite(gr) ? gr : 3.5) + 2) * 12));
        meterFill.style.height = `${pct}%`;
      }
    }

    async function updatePreviewTelemetry(sourceId) {
      if (!sourceId) return;
      try {
        const response = await fetchJson(`${API_BASE}/preview/meters/${sourceId}`);
        const payload = await response.json();
        applyMeterValues(normalizeMeterPayload(payload));
      } catch (error) {
        console.warn('Preview telemetry unavailable:', error.message);
      }
    }

    async function preparePreviewSource(file) {
      if (!file) return null;
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetchJson(`${API_BASE}/preview/source`, { method: 'POST', body: formData });
      const data = await response.json();
      if (!data?.source_id) throw new Error('El servidor no devolvió source_id');
      return data;
    }

    async function renderPreviewFromSource(sourceId) {
      if (!sourceId || !previewRealTime || !previewRealTime.checked) return;

      const params = {
        master: {
          target_lufs: -14,
          true_peak_db: -1.0,
          loudness_mode: 'modern',
        },
      };

      try {
        const response = await fetchJson(`${API_BASE}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preview_source_id: sourceId,
            preview_duration_sec: 25,
            params,
          }),
        });

        const audioBlob = await response.blob();
        const previewUrl = URL.createObjectURL(audioBlob);
        let audioTag = document.getElementById('preview-audio-tag');

        if (!audioTag) {
          audioTag = document.createElement('audio');
          audioTag.id = 'preview-audio-tag';
          audioTag.controls = true;
          audioTag.style.width = '100%';
          audioTag.style.marginTop = '8px';
          document.getElementById('previewRealTimeSlot')?.appendChild(audioTag);
        }

        audioTag.src = previewUrl;
        document.getElementById('previewStatus').textContent = 'Preview activo';
        await updatePreviewTelemetry(sourceId);
      } catch (error) {
        console.warn('Preview render failed:', error.message);
        document.getElementById('previewStatus').textContent = 'Preview no disponible';
      }
    }

    chatToggleBtn?.addEventListener('click', () => {
      const hidden = chatPanel.classList.toggle('hidden');
      chatToggleBtn.textContent = hidden ? 'Ver chat' : 'Ocultar chat';
    });

    document.getElementById('fileInputTrigger')?.addEventListener('click', () => {
      document.getElementById('fileInputHidden')?.click();
    });

    document.getElementById('fileInputHidden')?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      document.getElementById('trackName').textContent = file.name || 'track';
      document.getElementById('trackDuration').textContent = '00:30';
      document.getElementById('trackFormat').textContent = file.type || 'Audio';
      document.getElementById('previewStatus').textContent = 'Archivo cargado';
      document.getElementById('previewDuration').textContent = '00:30';

      try {
        const data = await preparePreviewSource(file);
        if (data?.source_id) {
          document.getElementById('previewStatus').textContent = 'Snapshot listo';
          await renderPreviewFromSource(data.source_id);
        }
      } catch (error) {
        console.error('Preview init error:', error);
        document.getElementById('previewStatus').textContent = 'Preview no disponible';
      }
    });

    function updateMeters() {
      const time = Date.now();
      const lu = (-14 + Math.sin(time / 700) * 1.4).toFixed(1);
      const peak = (-1.0 + Math.cos(time / 900) * 0.6).toFixed(1);
      const gr = (3.6 + Math.sin(time / 600) * 1.8).toFixed(1);

      const liveLUFS = document.getElementById('liveLUFS');
      const livePeak = document.getElementById('livePeak');
      const liveGR = document.getElementById('liveGR');
      const liveLUFSPreview = document.getElementById('liveLUFSPreview');
      const liveGRPreview = document.getElementById('liveGRPreview');
      const meterFill = document.querySelector('.meter-vu__fill');

      if (liveLUFS) liveLUFS.textContent = `${lu} LUFS`;
      if (livePeak) livePeak.textContent = `${peak} dB`;
      if (liveGR) liveGR.textContent = `${gr} dB`;
      if (liveLUFSPreview) liveLUFSPreview.textContent = `${lu} LUFS`;
      if (liveGRPreview) liveGRPreview.textContent = `${gr} dB`;

      if (meterFill) {
        const pct = Math.min(100, Math.max(12, (Number(gr) + 2) * 12));
        meterFill.style.height = `${pct}%`;
      }

      if (previewRealTime && !previewRealTime.checked) {
        document.getElementById('previewStatus').textContent = 'Preview pausado';
      } else {
        const statusEl = document.getElementById('previewStatus');
        if (statusEl && statusEl.textContent !== 'Preview no disponible' && statusEl.textContent !== 'Archivo cargado' && statusEl.textContent !== 'Esperando archivo') {
          statusEl.textContent = 'Preview activo';
        }
      }
    }

    setInterval(updateMeters, 1200);
    updateMeters();

    previewRealTime?.addEventListener('change', () => {
      const status = document.getElementById('previewStatus');
      if (!previewRealTime.checked) {
        if (status) status.textContent = 'Preview pausado';
        return;
      }
      if (status) status.textContent = 'Preview activo';
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      sessionStorage.removeItem('master_auth_token');
      sessionStorage.removeItem('master_auth_user');
      window.location.href = '/';
    });
