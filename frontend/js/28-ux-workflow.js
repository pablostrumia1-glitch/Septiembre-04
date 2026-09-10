
(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root=document) => root.querySelector(sel);
  const qsa = (sel, root=document) => [...root.querySelectorAll(sel)];

  const showToast = (message, type='info') => STFX.ui.showToast(message, type, 1800);

  // ---------------- Preset comparison ----------------
  function collectCurrentParams(){
    const map = window.STFX?.sliderIdToParam || {};
    const out = {};
    Object.entries(map).forEach(([id,key])=>{
      const el=STFX.dom.byId(id); if(el) out[key]=el.value;
    });
    qsa('input[type="checkbox"]').forEach(el=>{ if(el.id) out[el.id]=el.checked; });
    qsa('select').forEach(el=>{ if(el.id) out[el.id]=el.value; });
    return out;
  }
  function prettyLabel(key){
    const map={
      input_gain_db:'Input Gain', target_peak:'Target Peak', comp_threshold_db:'Comp Threshold', comp_ratio:'Comp Ratio',
      comp_attack_ms:'Comp Attack', comp_release_ms:'Comp Release', comp_makeup_db:'Comp Makeup',
      stereo_width_amount:'Stereo Width', limiter_ceiling:'Limiter Ceiling', limiter_release_ms:'Limiter Release',
      target_lufs:'Target LUFS', hp_cutoff:'HP Cutoff', high_shelf_gain_db:'Air Gain', saturation_drive:'Saturation Drive',
      saturation_mix:'Saturation Mix', mid_gain_db:'Mid Gain', side_gain_db:'Side Gain'
    };
    return map[key] || key.replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  }
  function formatValue(value,key){
    if(value===true) return 'ON'; if(value===false) return 'OFF';
    const n=Number(value);
    if(Number.isNaN(n)) return String(value);
    const suffix=/lufs/i.test(key)?' LUFS':/dbtp|ceiling|gain|threshold|makeup|peak|release|attack/i.test(key)?' dB':'';
    return `${Number.isInteger(n)?n:n.toFixed(2)}${suffix}`;
  }
  function buildPresetDiff(preset){
    const current=collectCurrentParams();
    const rows=[];
    Object.entries(preset).forEach(([key,next])=>{
      const now=current[key];
      if(now==null || key==='name') return;
      const a=String(now), b=String(next);
      if(a!==b) rows.push({key,label:prettyLabel(key),from:formatValue(now,key),to:formatValue(next,key)});
    });
    return rows;
  }
  function closePresetCompare(){ STFX.dom.byId('stfxPresetCompare')?.remove(); }
  function openPresetCompare(name,data,sourceButton){
    closePresetCompare();
    const changes=buildPresetDiff(data.params||data.settings||data);
    const overlay=document.createElement('div'); overlay.id='stfxPresetCompare'; overlay.className='stfx-modal-overlay';
    const modal=document.createElement('section'); modal.className='stfx-preset-compare'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    const title=sourceButton?.textContent?.trim() || name;
    modal.innerHTML=`<div class="stfx-preset-compare-head"><div><span class="stfx-kicker">PRESET PREVIEW</span><h3>${title.replace(/[<>&]/g,'')}</h3><p>Comparación contra los parámetros actuales.</p></div><button type="button" class="stfx-modal-close" aria-label="Cerrar">×</button></div>`;
    const body=document.createElement('div'); body.className='stfx-preset-diff';
    if(!changes.length){ body.innerHTML='<div class="stfx-empty-state">Este preset no cambia los parámetros actualmente cargados.</div>'; }
    else changes.slice(0,80).forEach(r=>{
      const row=document.createElement('div'); row.className='stfx-diff-row';
      const labelEl=document.createElement('span'); labelEl.textContent=r.label;
      const fromEl=document.createElement('b'); fromEl.textContent=r.from;
      const arrowEl=document.createElement('span'); arrowEl.className='stfx-arrow'; arrowEl.textContent='→';
      const toEl=document.createElement('strong'); toEl.textContent=r.to;
      row.append(labelEl,fromEl,arrowEl,toEl); body.appendChild(row);
    });
    if(changes.length>80){ const more=document.createElement('small'); more.textContent=`+ ${changes.length-80} cambios adicionales`; body.appendChild(more); }
    const actions=document.createElement('div'); actions.className='stfx-modal-actions';
    const cancel=document.createElement('button'); cancel.className='stfx-btn-secondary'; cancel.textContent='CANCELAR';
    const apply=document.createElement('button'); apply.className='stfx-btn-primary'; apply.textContent='APLICAR PRESET';
    actions.append(cancel,apply); modal.append(body,actions); overlay.appendChild(modal); document.body.appendChild(overlay);
    const close=()=>closePresetCompare(); overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    modal.querySelector('.stfx-modal-close').addEventListener('click',close); cancel.addEventListener('click',close);
    apply.addEventListener('click',()=>{
      try{
        const payload=data.params||data.settings||data;
        if(typeof window.STFX?.presets?.applyToUI==='function') window.STFX.presets.applyToUI(payload);
        qsa('.preset-btn').forEach(b=>b.classList.toggle('active',b===sourceButton));
        document.querySelector('.lg-workspace-workspace-tab[data-workspace="console"]')?.click();
        showToast(`Preset aplicado: ${title}`,'success');
      }catch(err){ console.error(err); showToast('No se pudo aplicar el preset','error'); }
      close();
    });
  }
  async function interceptPresetClick(e){
    const btn=e.target.closest?.('.preset-btn');
    if(!btn || e.defaultPrevented) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const name=btn.dataset.preset; if(!name) return;
    try{
      const res=await STFX.api.apiFetch(`${STFX.api.apiBase()}/preset/${name}`);
      if(!res.ok) throw new Error(await res.text());
      openPresetCompare(name,await res.json(),btn);
    }catch(err){ console.error('Preset compare',err); showToast('No se pudo cargar la comparación del preset','error'); }
  }
  document.addEventListener('click',interceptPresetClick,true);

  // Expose mapping used by preset compare.
  if(window.sliderIdToParam){ window.STFX=window.STFX||{}; window.STFX.sliderIdToParam=window.sliderIdToParam; }

  // ---------------- Keyboard workflow ----------------
  function isTyping(){ const a=document.activeElement; return !!a && ['INPUT','TEXTAREA','SELECT'].includes(a.tagName); }
  const WORKSPACES=['console','analysis','presets'];
  function switchWorkspace(name){ document.querySelector(`.lg-workspace-workspace-tab[data-workspace="${name}"]`)?.click(); }
  function toggleExpert(){ STFX.dom.byId('expertModeToggle')?.click(); }
  function togglePlayback(){ window.STFX?.playback?.toggle?.(); }
  function handleWorkflowKey(e){
    if(isTyping() || e.ctrlKey || e.metaKey || e.altKey) return;
    const key=String(e?.key ?? e?.code ?? '').toLowerCase();
    if(!key) return;
    if(['1','2','3','4','e','p','m','a','b'].includes(key)) e.preventDefault();
    switch(key){
      case '1': switchWorkspace('console'); break;
      case '2': switchWorkspace('analysis'); break;
      case '3': switchWorkspace('presets'); break;
      case '4': break;
      case 'e': toggleExpert(); break;
      case 'p': togglePlayback(); break;
      case 'a': case 'b': STFX.dom.byId('btnABToggle')?.click(); break;
      case 'm': showToast('Usá BYPASS en el módulo seleccionado para aislar el procesamiento','info'); break;
      default: return;
    }
  }
  document.addEventListener('keydown',handleWorkflowKey);

  // ---------------- Parameter micro-feedback ----------------
  const lastValues=new WeakMap();
  function flash(el){
    const host=el.closest('.param,.lg-compact-param,.lg-pro-mini-param,.control-block,.process-card-body') || el.parentElement;
    if(!host) return;
    host.classList.remove('stfx-param-changed'); void host.offsetWidth; host.classList.add('stfx-param-changed');
    setTimeout(()=>host.classList.remove('stfx-param-changed'),420);
  }
  document.addEventListener('input',e=>{
    const el=e.target;
    if(!(el instanceof HTMLInputElement) || el.type!=='range') return;
    const previous=lastValues.get(el);
    if(previous!==el.value){ lastValues.set(el,el.value); flash(el); }
  },true);

  // Annotate workspace shortcuts in a lightweight status hint.
  window.STFX=window.STFX||{};
})();
