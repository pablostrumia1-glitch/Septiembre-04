# Auditoría de CSS — Bugs y Conflicts
**Fecha:** 2026-09-06  
**Proyecto:** MASTER — Intelligent Mastering Console

---

## 1. Conflictos de Tokens CSS (`--var` redefinidos múltiples veces)

### `--v4-accent` — 13 definiciones en `@layer variables`

| Archivo | Línea | Valor | Contexto/Theme |
|---------|-------|-------|----------------|
| `00-variables-theme.css` | 47 | `#ef9b42` | base (naranja cálido) |
| `00-variables-theme.css` | 84 | `#ef9b42` | override (comentario: "mantenemos el naranja") |
| `00-variables-theme.css` | 93 | `#d69b58` | — |
| `00-variables-theme.css` | 102 | `#e79b68` | — |
| `00-variables-theme.css` | 111 | `#d3ab62` | — |
| `00-variables-theme.css` | 120 | `#c28ff0` | púrpura |
| `00-variables-theme.css` | 136 | `#ff9f43` | — |
| `00-variables-theme.css` | 153 | `#ff9c43` | — |
| `00-variables-theme.css` | 174 | `#d48c3c` | naranja sobrio fondo claro |
| `00-variables-theme.css` | 186 | `#ef9b42` | — |
| `00-variables-theme.css` | 205 | `#d48c3c` | — |
| `00-variables-theme.css` | 229 | `#ef9b42` | — |
| `00-variables-theme.css` | 259 | `#ffcc00` | **amarillo máximo contraste** ← ÚLTIMO, gana |

**Último valor efectivo:** `#ffcc00` (amarillo) — la última definición en `@layer variables` gana por cascade.

**Severidad:** ⚠️ MEDIA — No rompe funcionalidad pero genera comportamiento confuso. Si el theme intenta usar `--v4-accent` para un color púrpura, obtendrá amarillo.

---

### `--p` — 9 definiciones en `@layer variables`

| Archivo | Línea | Valor |
|---------|-------|-------|
| `00-variables-theme.css` | 22 | `#8bd2e8` |
| `00-variables-theme.css` | 81 | `#69e7ff` |
| `00-variables-theme.css` | 90 | `#86b5c8` |
| `00-variables-theme.css` | 99 | `#54e3da` |
| `00-variables-theme.css` | 108 | `#d2ad6d` |
| `00-variables-theme.css` | 117 | `#9b8cff` |
| `00-variables-theme.css` | 133 | `#ffb26b` |
| `00-variables-theme.css` | 150 | `#7ae1ff` |
| `00-variables-theme.css` | 183 | `#8bd2e8` ← ÚLTIMO, gana |

**Último valor efectivo:** `#8bd2e8` (celeste)

**Severidad:** ⚠️ MEDIA — Mismo problema que `--v4-accent`.

---

### `--cns-left-max` / `--cns-right-max` — CONFLICTO CRÍTICO RESUELTO ✅

| Archivo | Layer | `--cns-left-max` | `--cns-right-max` |
|---------|-------|-----------------|-------------------|
| `console-shell.css` | `console-shell` (antes de `stage-visibility`) | 420px | 420px |
| `10-stage-visibility.css` | `stage-visibility` (gana) | **260px** | **300px** |

**Problema:** El JS en `35-console-shell.js` hardcodea `max=420` para los handles, pero `stage-visibility` limitaba a 260px/300px, causando que los paneles no llegaran al tamaño que el JS permitía.

**Estado:** ✅ RESUELTO — `10-stage-visibility.css` actualizado a 420px/420px.

---

## 2. `overflow: auto` / `overflow: scroll` — Elementos que generan scrollbars

### Críticos (afectan layout principal)

| Archivo | Selector | Línea | Tipo | ¿Necesario? |
|---------|----------|-------|------|-------------|
| `01-main-grid.css` | `.lg-main-stack` | 47 | `overflow: auto` | ❌ NO — genera scroll en consola. **CORREGIDO** a `hidden` |
| `01-reset-base.css` | `.lg-main-stack` | 11 | `overflow: hidden` | ✅ CORREGIDO |
| `10-stage-visibility.css` | `.lg-main-stack` | 44 | `overflow: auto !important` | ❌ NO — **CORREGIDO** a `hidden !important` |
| `responsive.css` | `.lg-main-stack` | 97 | `overflow: visible !important` | ⚠️ Solo en mobile (<768px) |
| `console-shell.css` | `.cns-block-grow` | — | `overflow-y: auto` | ⚠️ Depende — contenido interno de paneles |

### Internos (scroll interno correcto)

| Archivo | Selector | Línea | Razón |
|---------|----------|-------|-------|
| `02-panel-left.css` | `.process-card` | 6, 513, 895, 978 | Scroll interno de cards |
| `03-console-center.css` | `.lg-chain` | 520 | Chain horizontal scroll |
| `03-console-center.css` | `.studio-chain-flow` | 734 | Chain flow scroll |
| `03-console-center.css` | `.ai-messages` | 856 | Chat messages |
| `03-console-center.css` | `.ai-suggestions` | 885 | Chat suggestions |
| `03-console-center.css` | `.meters-wrap` | 1375 | Meters |
| `04-panel-right.css` | `#studioRackMount` | 8 | Rack scroll interno |
| `10-stage-visibility.css` | (varios) | 135, 350, 418 | Scroll interno de secciones |
| `console-shell.css` | `.cns-card` | 312 | Cards scroll |

---

## 3. `display: flex` sin `min-width: 0` / `min-height: 0`

**Regla general:** Todo elemento flex/grid hijo que tiene hijos con `flex: 1` necesita `min-width:0` (para flex-direction:row) o `min-height:0` (para flex-direction:column) para poder shrink below content size.

### Hallazgos en cadena de layout principal

| Selector | Archivo | ¿Tiene min-width:0? | ¿Tiene min-height:0? |
|----------|---------|---------------------|----------------------|
| `.cns-shell` | console-shell.css | ✅ | ✅ (agregado) |
| `.cns-body` | console-shell.css | ✅ | ✅ (agregado) |
| `.cns-console-wrap` | console-shell.css | ✅ | ✅ |
| `.cns-console` | console-shell.css | ✅ | ✅ |
| `.cns-panel` | console-shell.css | ✅ | ✅ |
| `.cns-block` | console-shell.css | ✅ | ✅ |
| `.lg-workspace-workspace-shell` | 03-console-center.css | ✅ | ✅ |
| `.lg-workspace-workspace` | 03-console-center.css | ❌ | ⚠️ Solo `flex:1 1 auto` |
| `.lg-workspace-surface` | 03-console-center.css | ✅ | ✅ (agregado) |
| `.lg-main-stack` | 01-main-grid.css | ✅ | ✅ (agregado) |
| `#content` | console-shell.css | ✅ (agregado) | ✅ (agregado) |

---

## 4. Conflictos de altura (`height: auto` vs `height: 100%`)

### `height: auto` en `stage-visibility` (media query 960px)

```css
@media (max-width: 960px) {
  .cns-body { height: auto; }  /* ⚠️ Override innecesario */
  .cns-shell,
  .cns-console-wrap,
  .lg-workspace-workspace-shell { height: auto; }  /* ⚠️ */
  .cns-console { height: auto; }  /* ⚠️ */
}
```

**Problema:** Estos `height: auto` pisan el `height: 100%` necesario para el viewport-fit. El fix agregó `min-height: 0` como compromise para mobile.

**Severidad:** ⚠️ MEDIA — Solo afecta mobile (<960px), pero genera scroll inesperado en dispositivos pequeños.

---

## 5.duplicados de selectores CSS

### `.lg-main-stack` — 3 definiciones

| Archivo | Línea | Selector completo |
|---------|-------|------------------|
| `01-main-grid.css` | 44 | `.lg-main-stack` |
| `01-reset-base.css` | 11 | `.lg-main-stack` |
| `10-stage-visibility.css` | 42 | `.lg-main-stack` |
| `responsive.css` | 95 | `.lg-main-stack` |

**Conflicto:** `01-reset-base.css` (sin `@layer`) gana sobre todos. Los otros redefinen con `!important`.

### `.cns-shell` — múltiples definiciones

| Archivo | Layer | Líneas |
|---------|-------|--------|
| `console-shell.css` | `console-shell` | 12, 67 |
| `10-stage-visibility.css` | `stage-visibility` | 57, 214, 545, 552 |

### `.cns-body` — múltiples definiciones

| Archivo | Layer | Líneas |
|---------|-------|--------|
| `console-shell.css` | `console-shell` | 27, 152 |
| `10-stage-visibility.css` | `stage-visibility` | 61, 158, 226, 556 |

### `.cns-console` — múltiples definiciones

| Archivo | Layer | Líneas |
|---------|-------|--------|
| `console-shell.css` | `console-shell` | 113, 268 |
| `10-stage-visibility.css` | `stage-visibility` | 108, 169, 380, 563 |

---

## 6. `!important` OVERLOAD

| Archivo | Selector | Propiedad | Severidad |
|---------|----------|----------|-----------|
| `10-stage-visibility.css:44` | `.lg-main-stack` | `overflow: auto !important` | 🔴 CRÍTICA (pisaba scroll fix) |
| `10-stage-visibility.css:36` | `.lg-console-transport` | `display: none !important` | 🟡 MEDIA |
| `10-stage-visibility.css:40` | `.lg-workspace-tab-actions` | `display: none !important` | 🟡 MEDIA |
| `responsive.css:97` | `.lg-main-stack` | `overflow: visible !important` | 🟡 MEDIA (mobile) |

---

## Resumen de Severidad

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 CRÍTICA | 1 | ✅ RESUELTA |
| 🟡 MEDIA | 12+ | ⚠️ Parcialmente resueltas |
| ⚠️ INFO | — | Monitorear |

---

## Recomendaciones

1. **Tokens CSS** — Consolidar `--v4-accent` y `--p` en blocks por theme usando `[data-theme="x"]` o similar, no redefiniciones sucesivas en el mismo layer.
2. **Height chain** — Agregar `height: 100%` a todos los contenedores de la cadena `.lg-app → .lg-main-stack → #content → .cns-shell → .cns-body`.
3. **CSS Layers** — Revisar orden de `@layer` para que `console-shell` venga DESPUÉS de `stage-visibility` si quiere overridear valores, o viceversa según necesidad.
4. **`!important`** — Eliminar `!important` de `.lg-main-stack { overflow }` en `stage-visibility` ya que bloquea cualquier fix posterior.
5. **Mobile** — Resolver el conflicto de `height: auto` en responsive que genera scroll no deseado en pantallas pequeñas.
