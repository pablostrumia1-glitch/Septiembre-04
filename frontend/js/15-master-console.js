(() => {
  'use strict';
  const root = window.STFX = window.STFX || {};
  root.console = root.console || {};
  const $ = (id) => document.getElementById(id);
  const state = {
    raf: 0, start: performance.now(), playing: false, audio: null,
    ab: 'master', applying: false,
    stageBypass: { input: false, comp: false, stereo: false, limiter: false },
    metrics: null, spectrum: [], waveHistory: [],
  };

  const refs = {
    input: ['s-ingain', 'consoleInputFader'],
    compThreshold: ['s-thresh', 'consoleCompThreshold'],
    compRatio: ['s-ratio', 'consoleCompRatio'],
    stereo: ['s-width', 'consoleStereoFader'],
    limiter: ['s-ceiling', 'consoleLimiterFader'],
  };

  // Q14 (audit): mirror() antes acumulaba listeners si se llamaba dos
  // veces sobre el mismo par (e.g. si el sidepanel se recreaba).
  // Hoy 25-workspace-tabs.js garantiza que el DOM de los workspaces
  // es estático, así que mirror() se llama 1 vez. Aún así, dejamos
  // un guard con WeakSet para que un futuro cambio no genere
  // duplicados silenciosos.
  const _mirrored = new WeakSet();
  function mirror(srcId, dstId) {
    const src = STFX.dom.byId(srcId), dst = STFX.dom.byId(dstId);
    if (!src || !dst) return;
    if (_mirrored.has(src) || _mirrored.has(dst)) return;
    _mirrored.add(src);
    _mirrored.add(dst);
    dst.value = src.value;
    const event = dst.tagName === 'SELECT' || dst.type === 'checkbox' ? 'change' : 'input';
    dst.addEventListener(event, () => {
      src.value = dst.value;
      src.dispatchEvent(new Event(event, { bubbles: true }));
      updateReadouts();
      updateStageCards();
    });
    src.addEventListener('input', () => { dst.value = src.value; updateReadouts(); });
    src.addEventListener('change', () => { dst.value = src.value; updateReadouts(); updateStageCards(); });
  }

    function formatDb(v) { return `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)} dB`; }
  function ceilingDb(v) { return 20 * Math.log10(Math.max(0.01, Number(v))); }

      function toggleStage(stage) {
    state.stageBypass[stage] = !state.stageBypass[stage];
    const related = {
      comp: ['s-thresh', 's-ratio'],
      stereo: ['s-width'],
      limiter: ['s-ceiling'],
    }[stage] || [];
    related.forEach((id) => {
      const el = STFX.dom.byId(id);
      if (!el) return;
      if (state.stageBypass[stage]) {
        if (el.dataset.consoleSaved == null) el.dataset.consoleSaved = el.value;
        if (stage === 'comp') el.value = id === 's-ratio' ? '1' : '0';
        if (stage === 'stereo') el.value = '1';
        if (stage === 'limiter') el.value = '0.999';
      } else if (el.dataset.consoleSaved != null) {
        el.value = el.dataset.consoleSaved;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    updateReadouts(); updateStageCards();
  }

  function updateReadouts() {
    const input = Number(STFX.dom.byId('s-ingain')?.value ?? 0);
    const ct = Number(STFX.dom.byId('s-thresh')?.value ?? -18);
    const cr = Number(STFX.dom.byId('s-ratio')?.value ?? 4);
    const sw = Number(STFX.dom.byId('s-width')?.value ?? 1);
    const ceil = Number(STFX.dom.byId('s-ceiling')?.value ?? .891);
    if (STFX.dom.byId('consoleInputReadout')) STFX.dom.byId('consoleInputReadout').textContent = formatDb(input);
    if (STFX.dom.byId('consoleCompReadout')) STFX.dom.byId('consoleCompReadout').textContent = `${ct.toFixed(1)} dB · ${cr.toFixed(1)}:1`;
    if (STFX.dom.byId('consoleStereoReadout')) STFX.dom.byId('consoleStereoReadout').textContent = `${Math.round(sw * 100)}%`;
    if (STFX.dom.byId('consoleLimiterControlReadout')) STFX.dom.byId('consoleLimiterControlReadout').textContent = `${ceilingDb(ceil).toFixed(1)} dB`;
    if (STFX.dom.byId('consoleInputGr')) STFX.dom.byId('consoleInputGr').textContent = formatDb(input);
    if (STFX.dom.byId('consoleStereoGr')) STFX.dom.byId('consoleStereoGr').textContent = `WIDTH ${Math.round(sw * 100)}%`;
    if (STFX.dom.byId('consoleLimiterReadout')) STFX.dom.byId('consoleLimiterReadout').textContent = `CEILING ${ceilingDb(ceil).toFixed(1)}`;
    if (STFX.dom.byId('consoleCompGr')) STFX.dom.byId('consoleCompGr').textContent = `GR 0.0 dB`;
  }

  function updateStageCards() {
    document.querySelectorAll('.lg-stage-card').forEach(card => {
      const stage = card.dataset.stage;
      card.classList.toggle('bypassed', !!state.stageBypass[stage]);
      const em = card.querySelector('em');
      if (em) em.textContent = state.stageBypass[stage] ? 'BYPASS' : 'ACTIVE';
    });
  }

  function setAB(mode) {
    state.ab = mode;
    STFX.dom.byId('consoleAbReadout')?.replaceChildren(document.createTextNode(mode === 'master' ? 'MASTER' : 'ORIGINAL'));
    STFX.dom.byId('consoleABMaster')?.classList.toggle('active', mode === 'master');
    STFX.dom.byId('consoleABOriginal')?.classList.toggle('active', mode === 'original');
    // A7 (audit): sincronizar aria-pressed del botón A/B. Sin esto,
    // los screen readers no anuncian el estado actual (MASTER vs ORIGINAL).
    // WCAG 4.1.2.
    const abBtn = STFX.dom.byId('consoleABToggle');
    if (abBtn) abBtn.setAttribute('aria-pressed', mode === 'master' ? 'true' : 'false');
    const audio = getPreviewAudio();
    if (audio) audio.dataset.abMode = mode;
  }

  function toggleAB() { setAB(state.ab === 'master' ? 'original' : 'master'); }

  function getPreviewAudio() {
    return document.querySelector('#previewAudioWrap audio, #mxrServerPreviewAudio');
  }
  function formatTime(sec) {
    if (!Number.isFinite(sec)) return '--:--';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function clamp01(v) { return Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0)); }
  function metricAmp(db, floor = -72) { return clamp01((Number(db ?? floor) - floor) / (0 - floor)); }

  function drawWaveform() {
    const canvas = STFX.dom.byId('waveformCanvas'); if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(320, Math.floor(rect.width * dpr)), h = Math.max(120, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(116,230,255,.09)'; ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const y = h / 8 * i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    const m = state.metrics || {};
    const peakAmp = metricAmp(m.peak_db, -72);
    const rmsAmp = metricAmp(m.rms_db, -72);
    const gr = Math.max(0, Math.min(1, Math.abs(Number(m.comp_gr_db ?? 0)) / 12));
    state.waveHistory.push({ peak: peakAmp, rms: rmsAmp, gr });
    if (state.waveHistory.length > 90) state.waveHistory.shift();
    const hist = state.waveHistory;
    const grad = ctx.createLinearGradient(0,0,w,0);
    grad.addColorStop(0,'rgba(87,230,255,.25)'); grad.addColorStop(.5,'rgba(169,140,255,.85)'); grad.addColorStop(1,'rgba(87,230,255,.25)');
    const mid=h/2;
    ctx.strokeStyle=grad; ctx.lineWidth=Math.max(1,1.4*dpr);
    ctx.beginPath();
    const phase=(performance.now()-state.start)/500;
    for(let i=0;i<220;i++){
      const t=i/219, idx=Math.min(hist.length-1, Math.floor(t*(hist.length-1)));
      const item=hist[idx]||{peak:peakAmp,rms:rmsAmp,gr:0};
      const env=Math.max(.03, item.rms*.75 + item.peak*.25);
      const texture=.45*Math.sin(t*34+phase) + .2*Math.sin(t*87-phase*.6) + .12*Math.sin(t*13+phase*.3);
      const y=mid-texture*env*h*.38;
      i?ctx.lineTo(t*w,y):ctx.moveTo(t*w,y);
    }
    ctx.stroke();
    // Dynamic envelope: real RMS/peak + gain-reduction history.
    ctx.beginPath();
    hist.forEach((item,i)=>{
      const x = hist.length===1 ? 0 : i/(hist.length-1)*w;
      const y = mid - item.rms*h*.36;
      i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    });
    ctx.strokeStyle='rgba(255,202,101,.9)'; ctx.lineWidth=Math.max(1,1*dpr); ctx.stroke();
    const liveX = w*.78, liveH = Math.max(2, peakAmp*h*.32);
    ctx.fillStyle='rgba(87,230,255,.12)'; ctx.fillRect(liveX, mid-liveH, w-liveX, liveH*2);
  }

  function updateConsoleStereoVu() {
    const l = STFX.dom.byId('consoleMeterL'), r = STFX.dom.byId('consoleMeterR'); if(!l || !r) return;
    const m=state.metrics||{}; const peak=metricAmp(m.peak_db,-60); const corr=Math.max(-1,Math.min(1,Number(m.stereo_correlation ?? 1)));
    const spread=(1-Math.max(0,corr))*0.18;
    l.style.height=`${Math.max(3,Math.min(100,(peak*(1+spread))*100))}%`;
    r.style.height=`${Math.max(3,Math.min(100,(peak*(1-spread))*100))}%`;
    l.style.opacity = corr < 0 ? '1' : '.92'; r.style.opacity = corr < 0 ? '1' : '.92';
  }

  function setStatus(text, active=false) { STFX.dom.byId('consoleStatus')?.replaceChildren(document.createTextNode(text)); document.querySelector('.lg-status-dot')?.classList.toggle('active',active); }
  function syncTrackInfo() {
    const file=window.selectedFile;
    if(!file){
      STFX.dom.byId('consoleTrackTitle')?.replaceChildren(document.createTextNode('Sin archivo cargado'));
      STFX.dom.byId('consoleTrackMeta')?.replaceChildren(document.createTextNode('Esperando señal'));
      return;
    }
    const title=file.name.replace(/\.[^/.]+$/,'');
    STFX.dom.byId('consoleTrackTitle')?.replaceChildren(document.createTextNode(title));
    STFX.dom.byId('consoleTrackMeta')?.replaceChildren(document.createTextNode(`${file.type||'audio'} · ${(file.size/1024/1024).toFixed(1)} MB`));
    setStatus('Audio cargado · listo para analizar',true);
  }
  function syncMetersFromDom(){
    const map=[['meterPeakReadout','consolePeak'],['meterLufsReadout','consoleLufs'],['meterTruePeakReadout','consoleTruePeak'],['meterRmsReadout','consoleRms'],['stereoMeterReadout','consoleCorr']];
    for(const [src,dst] of map){const a=STFX.dom.byId(src),b=STFX.dom.byId(dst);if(a&&b&&a.textContent)b.textContent=a.textContent.replace(/^corr:\s*/i,'');}
    updateConsoleStereoVu();
  }

  function syncChainMeters(metrics){
    if (!metrics) return;
    const chain = metrics.chain_meters || metrics.chainMeters || {};
    const comp = chain.comp || metrics.comp_meters || {};
    const glue = chain.glue || metrics.glue_meters || {};
    const limiter = chain.limiter || metrics.limiter_meters || {};
    const compGr = Number(comp.gr_db ?? metrics.comp_gr_db ?? 0);
    const glueGr = Number(glue.gr_db ?? 0);
    const limGr = Number(limiter.gr_db ?? metrics.limiter_gr_db ?? 0);
    if (STFX.dom.byId('consoleCompGr')) STFX.dom.byId('consoleCompGr').textContent = `GR ${(Number.isFinite(compGr)?compGr:0).toFixed(1)} dB`;
    if (STFX.dom.byId('consoleLimiterGr')) STFX.dom.byId('consoleLimiterGr').textContent = `GR ${(Number.isFinite(limGr)?limGr:0).toFixed(1)} dB`;
    const glueReadout = STFX.dom.byId('consoleGlueGr'); if (glueReadout) glueReadout.textContent = `GR ${(Number.isFinite(glueGr)?glueGr:0).toFixed(1)} dB`;
    if (STFX.dom.byId('consoleOutputReadout')) STFX.dom.byId('consoleOutputReadout').textContent = metrics.output_lufs != null ? `${Number(metrics.output_lufs).toFixed(1)} LUFS` : (STFX.dom.byId('consoleLufs')?.textContent || '-∞ LUFS');
  }

  root.console.syncChainMeters = syncChainMeters;

  let wired = false;
  function wire(){
    if (wired) return;
    wired = true;
    mirror(...refs.input); mirror(...refs.compThreshold); mirror(...refs.compRatio); mirror(...refs.stereo); mirror(...refs.limiter);
    STFX.dom.byId('consoleAnalyzeBtn')?.addEventListener('click',()=>{STFX.dom.byId('btnAnalyze')?.click();setStatus('Analizando audio…',true);});
    STFX.dom.byId('consoleAnalyzeSmall')?.addEventListener('click',()=>{STFX.dom.byId('btnAnalyze')?.click();setStatus('Analizando audio…',true);});
    STFX.dom.byId('consoleMasterBtn')?.addEventListener('click',()=>{STFX.dom.byId('btnMasterAsync')?.click();setStatus('Mastering en cola…',true);});
    STFX.dom.byId('consoleMasterSmall')?.addEventListener('click',()=>{STFX.dom.byId('btnMasterAsync')?.click();setStatus('Mastering en cola…',true);});
    STFX.dom.byId('consolePlayBtn')?.addEventListener('click',()=>{
      const audio=getPreviewAudio();
      if(!audio || !window.STFX?.previewController?.isReady?.()) {
        return setStatus('El Preview todavía no está listo: debe terminar el procesamiento del servidor.');
      }
      if(audio.paused){audio.play().catch((e)=>setStatus('No se pudo reproducir el Preview: '+e.message));STFX.dom.byId('consolePlayBtn').textContent='❚❚';state.playing=true;state.start=performance.now();setStatus('Preview reproduciendo',true);}else{audio.pause();STFX.dom.byId('consolePlayBtn').textContent='▶';state.playing=false;setStatus('Preview en pausa');}
    });
    STFX.dom.byId('consoleStopBtn')?.addEventListener('click',()=>{
      // Preview is server-rendered; stopping the controller invalidates any active render.
      const audio=getPreviewAudio();if(audio){audio.pause();audio.currentTime=0;}
      window.STFX?.previewController?.stop?.();
      state.playing=false;STFX.dom.byId('consolePlayBtn').textContent='▶';setStatus('Preview detenido');
    });
    // Preview server-side: el único propietario del toggle y debounce es
    // js/30-preview-controller.js. Este controlador solo refleja su estado
    // mediante el evento stfx:preview-state.
        STFX.dom.byId('consoleABMaster')?.addEventListener('click',()=>setAB('master')); STFX.dom.byId('consoleABOriginal')?.addEventListener('click',()=>setAB('original')); STFX.dom.byId('consoleABToggle')?.addEventListener('click',toggleAB);
    document.querySelectorAll('.lg-stage-card').forEach(btn=>btn.addEventListener('click',()=>toggleStage(btn.dataset.stage)));
    document.querySelectorAll('.lg-chain-node').forEach(btn=>btn.addEventListener('click',()=>document.querySelector(`.sidebar-tab[data-pane="${btn.dataset.pane}"]`)?.click()));
    STFX.dom.byId('consoleShowChain')?.addEventListener('click',()=>document.querySelector('.sidebar-tab[data-pane="pane-cadena"]')?.click());
    STFX.dom.byId('btnAnalyze')?.addEventListener('click',()=>setStatus('Analizando audio…',true)); STFX.dom.byId('btnMasterAsync')?.addEventListener('click',()=>setStatus('Mastering en cola…',true)); STFX.dom.byId('btnMasterSync')?.addEventListener('click',()=>setStatus('Mastering en proceso…',true));
    STFX.dom.byId('fileInput')?.addEventListener('change',syncTrackInfo);
    window.addEventListener('stfx:preview-state', (ev) => {
      const btn = STFX.dom.byId('consolePlayBtn');
      const detail = ev.detail || {};
      if (btn) btn.disabled = detail.state !== 'ready';
      if (detail.state === 'ready') setStatus('Preview completo listo para reproducir', true);
      else if (detail.state === 'processing') setStatus(detail.text || 'Procesando Preview en servidor…', true);
      else if (detail.state === 'disabled') setStatus(detail.text || 'Preview deshabilitado');
    });
    syncTrackInfo(); updateReadouts(); updateStageCards();
    const observer=new MutationObserver(syncTrackInfo); const fileName=STFX.dom.byId('fileName'); if(fileName)observer.observe(fileName,{childList:true,subtree:true,characterData:true});
    // P5 (audit): antes tick() corría a 60fps y llamaba drawWaveform()
    // en cada frame. La animación de phase cambia con el tiempo,
    // así que el draw no es 100% cacheable, pero sí podemos
    // reducir la frecuencia a 30fps (mismo patrón que
    // 19-performance-optimization.js:OptimizedMeterDisplay) y skipear
    // el draw cuando el workspace no es 'console'.
    const TARGET_FPS = 30;
    const FRAME_MS = 1000 / TARGET_FPS;
    let lastFrame = 0;
    const tick=(now)=>{
      const onConsole = document.body.dataset.workspace === "console";
      if (onConsole && (now - lastFrame) >= FRAME_MS) {
        drawWaveform();
        syncMetersFromDom();
        window.STFX?.spectrum?.redraw?.();
        lastFrame = now;
      }
      state.audio=getPreviewAudio();
      const audio=state.audio;
      if(audio && onConsole){STFX.dom.byId('consoleTime').textContent=formatTime(audio.currentTime);STFX.dom.byId('consoleDuration').textContent=formatTime(audio.duration);const ph=STFX.dom.byId('consolePlayhead');if(Number.isFinite(audio.duration)&&audio.duration>0&&ph)ph.style.left=`${audio.currentTime/audio.duration*100}%`; } state.raf=requestAnimationFrame(tick);};
    state.raf=requestAnimationFrame(tick);
    // Consume the shared Metrics Store instead of wrapping another producer.
    const metricsStore = window.STFX?.metrics;
    if (metricsStore) {
      state.unsubscribeMetrics?.();
      state.unsubscribeMetrics = metricsStore.subscribe(({ metrics }) => {
        state.metrics = metrics || null;
        root.console.syncChainMeters?.(metrics);
      });
    }
  }
  root.console.setStageBypass = (stage, bypass) => {
    if (!(stage in state.stageBypass)) throw new Error(`[Master Console] etapa desconocida: ${stage}`);
    state.stageBypass[stage] = Boolean(bypass);
    const related = {
      comp: ['s-thresh', 's-ratio'],
      stereo: ['s-width'],
      limiter: ['s-ceiling'],
    }[stage] || [];
    related.forEach((controlId) => {
      const el = STFX.dom.byId(controlId);
      if (!el) throw new Error(`[Master Console] falta control técnico #${controlId}`);
      if (state.stageBypass[stage]) {
        if (el.dataset.consoleSaved == null) el.dataset.consoleSaved = el.value;
        if (stage === 'comp') el.value = controlId === 's-ratio' ? '1' : '0';
        if (stage === 'stereo') el.value = '1';
        if (stage === 'limiter') el.value = '0.999';
      } else if (el.dataset.consoleSaved != null) {
        el.value = el.dataset.consoleSaved;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    updateReadouts(); updateStageCards();
    window.STFX?.previewController?.request?.();
  };
  root.console.getChainOverrides = () => ({
    comp_bypass: !!state.stageBypass.comp,
    stereo_bypass: !!state.stageBypass.stereo,
    limiter_bypass: !!state.stageBypass.limiter,
  });
  root.console.setAB=setAB; root.console.toggleAB=toggleAB;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})();
