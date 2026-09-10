// ============================================================
// 04-plugin-registry.js — Registro canónico de plugins DSP
// ============================================================
// Módulo de DATOS PUROS — sin DOM, sin eventos, sin imports.
// Fuente única de verdad para:
//   - Panel izquierdo (lista de plugins)
//   - Rack derecho (controles expandidos)
//   - Meters de GR (qué plugins reportan gain reduction)
//   - Preview (bypass/enable state → params del servidor)
//
// Extraído y limpiado de 33-studio-controller.js (PLUGINS + FAMILY_ORDER).
// Agregado: `color`, `hasGR`, `grKey` por plugin para el meter system.
// ============================================================

(function () {
  'use strict';

  // ── Paleta de colores por familia ──────────────────────────────────────────
  // Usada en: LEDs del panel izquierdo, headers del rack, borders del meter
  const FAMILY_COLOR = {
    INPUT:    '#64748b',   // slate
    EQ:       '#3b82f6',   // blue
    DYNAMICS: '#f59e0b',   // amber
    COLOR:    '#ec4899',   // pink
    STEREO:   '#8b5cf6',   // violet
    OUTPUT:   '#10b981',   // emerald
  };

  // ── Orden de renderizado del panel izquierdo ───────────────────────────────
  const FAMILY_ORDER = ['INPUT', 'EQ', 'DYNAMICS', 'COLOR', 'STEREO', 'OUTPUT'];

  // ── Registro de plugins ────────────────────────────────────────────────────
  // Campos:
  //   family      — grupo al que pertenece (usado para agrupar en el panel)
  //   label       — nombre completo mostrado en la UI
  //   short       — nombre corto para espacios reducidos
  //   pinned      — no se puede desactivar (siempre en cadena)
  //   hasGR       — reporta gain reduction (el server manda meters)
  //   grKey       — clave dentro de chain_meters donde llega el GR del server
  //   grBands     — array de sub-bandas si es multiband (para el meter MB)
  //   stageBypass — nombre del stage en el server para bypass directo
  //   bypassInput — ID del input HTML legacy que activa bypass
  //   virtualBypass — lista de inputs que se setean a 0 para bypass virtual
  //   controls    — parámetros editables en el rack
  // ──────────────────────────────────────────────────────────────────────────
  const PLUGINS = {

    // ── INPUT ─────────────────────────────────────────────────────────────
    input: {
      family: 'INPUT',
      label:  'Gain / Trim',
      short:  'INPUT',
      pinned: true,
      hasGR:  false,
      controls: [
        { key: 'input_gain_db', label: 'Gain', type: 'range',
          min: -12, max: 12, step: 0.1, input: 's-ingain', suffix: ' dB' },
      ],
    },

    // ── EQ ────────────────────────────────────────────────────────────────
    eq: {
      family: 'EQ',
      label:  'Parametric EQ',
      short:  'EQ',
      hasGR:  false,
      virtualBypass: {
        inputs: ['s-eq1gain','s-eq2gain','s-eq3gain',
                 's-eq4gain','s-eq5gain','s-eq6gain',
                 's-air','s-lowshelf'],
        inactiveValue: 0,
      },
      controls: [
        { key: 'eq1_freq',  label: 'Band 1 Freq',  type: 'range', min: 20,  max: 20000, step: 1,    input: 's-eq1freq',  suffix: ' Hz' },
        { key: 'eq1_gain',  label: 'Band 1 Gain',  type: 'range', min: -18, max: 18,    step: 0.1,  input: 's-eq1gain',  suffix: ' dB' },
        { key: 'eq1_q',     label: 'Band 1 Q',     type: 'range', min: 0.1, max: 10,    step: 0.01, input: 's-eq1q',     suffix: '' },
        { key: 'eq2_freq',  label: 'Band 2 Freq',  type: 'range', min: 20,  max: 20000, step: 1,    input: 's-eq2freq',  suffix: ' Hz' },
        { key: 'eq2_gain',  label: 'Band 2 Gain',  type: 'range', min: -18, max: 18,    step: 0.1,  input: 's-eq2gain',  suffix: ' dB' },
        { key: 'eq2_q',     label: 'Band 2 Q',     type: 'range', min: 0.1, max: 10,    step: 0.01, input: 's-eq2q',     suffix: '' },
      ],
    },

    dynamic_eq: {
      family: 'EQ',
      label:  'Dynamic EQ',
      short:  'DYN EQ',
      hasGR:  true,
      grKey:  'dyneq_meters',   // { gr_db }
      controls: [
        { key: 'dyneq_freq',         label: 'Frequency', type: 'range', min: 20,  max: 20000, step: 1,   input: 's-dyneq-freq',    suffix: ' Hz' },
        { key: 'dyneq_q',            label: 'Q',         type: 'range', min: 0.2, max: 10,    step: 0.05, input: 's-dyneq-q',      suffix: '' },
        { key: 'dyneq_threshold_db', label: 'Threshold', type: 'range', min: -60, max: 0,     step: 0.5,  input: 's-dyneq-thresh', suffix: ' dB' },
        { key: 'dyneq_ratio',        label: 'Ratio',     type: 'range', min: 1,   max: 20,    step: 0.1,  input: 's-dyneq-ratio',  suffix: ':1' },
        { key: 'dyneq_attack_ms',    label: 'Attack',    type: 'range', min: 0.1, max: 200,   step: 0.1,  input: 's-dyneq-attack', suffix: ' ms' },
        { key: 'dyneq_release_ms',   label: 'Release',   type: 'range', min: 10,  max: 1000,  step: 5,    input: 's-dyneq-release',suffix: ' ms' },
      ],
    },

    // ── DYNAMICS ──────────────────────────────────────────────────────────
    compressor: {
      family: 'DYNAMICS',
      label:  'Compressor',
      short:  'COMP',
      hasGR:  true,
      grKey:  'comp_meters',    // { gr_db }
      stageBypass: 'comp',
      controls: [
        { key: 'comp_threshold_db', label: 'Threshold', type: 'range', min: -60, max: 0,   step: 0.5, input: 's-thresh',  suffix: ' dB' },
        { key: 'comp_ratio',        label: 'Ratio',     type: 'range', min: 1,   max: 20,  step: 0.1, input: 's-ratio',   suffix: ':1' },
        { key: 'comp_attack_ms',    label: 'Attack',    type: 'range', min: 0.1, max: 200, step: 0.1, input: 's-cattack', suffix: ' ms' },
        { key: 'comp_release_ms',   label: 'Release',   type: 'range', min: 10,  max: 1000,step: 5,   input: 's-crelease',suffix: ' ms' },
        { key: 'comp_makeup_db',    label: 'Make-up',   type: 'range', min: -12, max: 24,  step: 0.5, input: 's-cmakeup', suffix: ' dB' },
      ],
    },

    multiband: {
      family: 'DYNAMICS',
      label:  'Comp-Multiband',
      short:  'MB COMP',
      hasGR:  true,
      grKey:  'mb',             // { low_gr_db, mid_gr_db, high_gr_db }
      grBands: ['low', 'mid', 'high'],
      bypassInput: 'mb-bypass',
      controls: [
        { key: 'mb_low_x',  label: 'Low → Mid', type: 'range', min: 20,  max: 2000,  step: 10, input: 's-mb-lowx',  suffix: ' Hz', global: true },
        { key: 'mb_high_x', label: 'Mid → High',type: 'range', min: 500, max: 12000, step: 10, input: 's-mb-highx', suffix: ' Hz', global: true },
      ],
      bands: {
        low: [
          { key: 'mb_low_threshold_db', label: 'Threshold', input: 's-mb-low-th',    suffix: ' dB', min: -60, max: 0,   step: 0.5 },
          { key: 'mb_low_ratio',        label: 'Ratio',     input: 's-mb-low-ratio', suffix: ':1',  min: 1,   max: 20,  step: 0.1 },
          { key: 'mb_low_attack_ms',    label: 'Attack',    input: 's-mb-low-att',   suffix: ' ms', min: 0.1, max: 200, step: 0.1 },
          { key: 'mb_low_release_ms',   label: 'Release',   input: 's-mb-low-rel',   suffix: ' ms', min: 10,  max: 1000,step: 5   },
          { key: 'mb_low_makeup_db',    label: 'Make-up',   input: 's-mb-low-mu',    suffix: ' dB', min: -12, max: 24,  step: 0.5 },
        ],
        mid: [
          { key: 'mb_mid_threshold_db', label: 'Threshold', input: 's-mb-mid-th',    suffix: ' dB', min: -60, max: 0,   step: 0.5 },
          { key: 'mb_mid_ratio',        label: 'Ratio',     input: 's-mb-mid-ratio', suffix: ':1',  min: 1,   max: 20,  step: 0.1 },
          { key: 'mb_mid_attack_ms',    label: 'Attack',    input: 's-mb-mid-att',   suffix: ' ms', min: 0.1, max: 200, step: 0.1 },
          { key: 'mb_mid_release_ms',   label: 'Release',   input: 's-mb-mid-rel',   suffix: ' ms', min: 10,  max: 1000,step: 5   },
          { key: 'mb_mid_makeup_db',    label: 'Make-up',   input: 's-mb-mid-mu',    suffix: ' dB', min: -12, max: 24,  step: 0.5 },
        ],
        high: [
          { key: 'mb_high_threshold_db', label: 'Threshold', input: 's-mb-high-th',    suffix: ' dB', min: -60, max: 0,   step: 0.5 },
          { key: 'mb_high_ratio',        label: 'Ratio',     input: 's-mb-high-ratio', suffix: ':1',  min: 1,   max: 20,  step: 0.1 },
          { key: 'mb_high_attack_ms',    label: 'Attack',    input: 's-mb-high-att',   suffix: ' ms', min: 0.1, max: 200, step: 0.1 },
          { key: 'mb_high_release_ms',   label: 'Release',   input: 's-mb-high-rel',   suffix: ' ms', min: 10,  max: 1000,step: 5   },
          { key: 'mb_high_makeup_db',    label: 'Make-up',   input: 's-mb-high-mu',    suffix: ' dB', min: -12, max: 24,  step: 0.5 },
        ],
      },
    },

    transient: {
      family: 'DYNAMICS',
      label:  'Transient Shaper',
      short:  'TRANSIENT',
      hasGR:  false,
      virtualBypass: { inputs: ['s-tatt', 's-tsus'], inactiveValue: 0 },
      controls: [
        { key: 'transient_attack',  label: 'Attack',  input: 's-tatt', suffix: ' %', min: -100, max: 100, step: 1 },
        { key: 'transient_sustain', label: 'Sustain', input: 's-tsus', suffix: ' %', min: -100, max: 100, step: 1 },
      ],
    },

    glue: {
      family: 'DYNAMICS',
      label:  'Glue Compressor',
      short:  'GLUE',
      hasGR:  true,
      grKey:  'glue_meters',   // { gr_db }
      bypassInput: 's-glue-bypass',
      controls: [
        { key: 'glue_threshold_db', label: 'Threshold', input: 's-glue-thresh',  suffix: ' dB', min: -24, max: 0,   step: 0.5 },
        { key: 'glue_ratio',        label: 'Ratio',     input: 's-glue-ratio',   suffix: ':1',  min: 1,   max: 10,  step: 0.5 },
        { key: 'glue_attack_ms',    label: 'Attack',    input: 's-glue-attack',  suffix: ' ms', min: 0.1, max: 200, step: 0.1 },
        { key: 'glue_release_ms',   label: 'Release',   input: 's-glue-release', suffix: ' ms', min: 10,  max: 1000,step: 5   },
        { key: 'glue_makeup_db',    label: 'Make-up',   input: 's-glue-makeup',  suffix: ' dB', min: -12, max: 12,  step: 0.5 },
      ],
    },

    ms_comp: {
      family: 'STEREO',
      label:  'M/S Compressor',
      short:  'M/S COMP',
      hasGR:  true,
      grKey:  'mscomp_meters',  // { mid_gr_db, side_gr_db }
      grBands: ['mid', 'side'],
      bypassInput: 's-mscomp-bypass',
      controls: [
        { key: 'ms_comp_mid_threshold_db',  label: 'Mid Threshold',  input: 's-mscomp-mid-thresh',  suffix: ' dB', min: -60, max: 0,   step: 0.5 },
        { key: 'ms_comp_mid_ratio',         label: 'Mid Ratio',      input: 's-mscomp-mid-ratio',   suffix: ':1',  min: 1,   max: 20,  step: 0.5 },
        { key: 'ms_comp_side_threshold_db', label: 'Side Threshold', input: 's-mscomp-side-thresh', suffix: ' dB', min: -60, max: 0,   step: 0.5 },
        { key: 'ms_comp_side_ratio',        label: 'Side Ratio',     input: 's-mscomp-side-ratio',  suffix: ':1',  min: 1,   max: 20,  step: 0.5 },
        { key: 'ms_comp_side_attack_ms',    label: 'Side Attack',    input: 's-mscomp-side-attack', suffix: ' ms', min: 0.1, max: 200, step: 0.1 },
        { key: 'ms_comp_side_release_ms',   label: 'Side Release',   input: 's-mscomp-side-release',suffix: ' ms', min: 5,   max: 2000,step: 5   },
      ],
    },

    // ── COLOR ─────────────────────────────────────────────────────────────
    saturation: {
      family: 'COLOR',
      label:  'Saturation',
      short:  'SAT',
      hasGR:  false,
      virtualBypass: { input: 's-satdrive', inactiveValue: 0 },
      controls: [
        { key: 'saturation_drive', label: 'Drive', input: 's-satdrive', suffix: ' dB', min: 0, max: 24, step: 0.1 },
        { key: 'saturation_mix',   label: 'Mix',   input: 's-satmix',   suffix: ' %',  min: 0, max: 1,  step: 0.01, displayScale: 100 },
      ],
    },

    // ── STEREO ────────────────────────────────────────────────────────────
    stereo: {
      family: 'STEREO',
      label:  'Stereo Width',
      short:  'STEREO',
      hasGR:  false,
      stageBypass: 'stereo',
      controls: [
        { key: 'stereo_width_amount', label: 'Width', input: 's-width', suffix: '×', min: 0.5, max: 1.5, step: 0.01 },
      ],
    },

    mb_stereo: {
      family: 'STEREO',
      label:  'Multiband Stereo',
      short:  'MB STEREO',
      hasGR:  false,
      bypassInput: 'mb-stereo-bypass',
      controls: [
        { key: 'mb_stereo_low_width',  label: 'Low width',  input: 's-mb-sw-low',  suffix: '×', min: 0, max: 2, step: 0.01 },
        { key: 'mb_stereo_mid_width',  label: 'Mid width',  input: 's-mb-sw-mid',  suffix: '×', min: 0, max: 2, step: 0.01 },
        { key: 'mb_stereo_high_width', label: 'High width', input: 's-mb-sw-high', suffix: '×', min: 0, max: 2, step: 0.01 },
      ],
    },

    // ── OUTPUT ────────────────────────────────────────────────────────────
    clipper: {
      family: 'OUTPUT',
      label:  'Clipper',
      short:  'CLIP',
      hasGR:  true,
      grKey:  'clipper_meters',  // { gr_db }
      bypassInput: 's-clip-bypass',
      controls: [
        { key: 'clipper_ceiling',  label: 'Ceiling', input: 's-clip-ceiling', suffix: ' dB', min: -6, max: 0,  step: 0.1 },
        { key: 'clipper_drive_db', label: 'Drive',   input: 's-clip-drive',   suffix: ' dB', min: 0,  max: 12, step: 0.1 },
      ],
    },

    limiter: {
      family: 'OUTPUT',
      label:  'True Peak Limiter',
      short:  'LIMITER',
      hasGR:  true,
      grKey:  'limiter_meters',  // { gr_db }
      stageBypass: 'limiter',
      controls: [
        { key: 'limiter_ceiling',    label: 'Ceiling', input: 's-ceiling',  suffix: ' dB', min: -3,  max: -0.1, step: 0.1 },
        { key: 'limiter_release_ms', label: 'Release', input: 's-lrelease', suffix: ' ms', min: 10,  max: 1000, step: 5   },
      ],
    },

  };

  // ── Helpers públicos ───────────────────────────────────────────────────────

  /** Todos los plugins con GR, en orden de cadena */
  function getGRPlugins() {
    return Object.entries(PLUGINS)
      .filter(([, p]) => p.hasGR)
      .map(([key, p]) => ({ key, ...p }));
  }

  /** Plugins agrupados por familia, en FAMILY_ORDER */
  function getByFamily() {
    return FAMILY_ORDER.map(family => ({
      family,
      color: FAMILY_COLOR[family],
      plugins: Object.entries(PLUGINS)
        .filter(([, p]) => p.family === family)
        .map(([key, p]) => ({ key, ...p })),
    }));
  }

  /** Color de la familia de un plugin dado su key */
  function familyColor(key) {
    const p = PLUGINS[key];
    return p ? (FAMILY_COLOR[p.family] || '#64748b') : '#64748b';
  }

  // ── Exportar al namespace global STFX ────────────────────────────────────
  const STFX = window.STFX = window.STFX || {};
  STFX.plugins = {
    PLUGINS,
    FAMILY_ORDER,
    FAMILY_COLOR,
    getGRPlugins,
    getByFamily,
    familyColor,
  };

  // Señal para módulos que carguen después
  window.dispatchEvent(new CustomEvent('lgmdm:plugin-registry-ready'));

})();
