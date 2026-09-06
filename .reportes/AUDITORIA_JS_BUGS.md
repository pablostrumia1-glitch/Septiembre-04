# Auditoría de JavaScript — Bugs y Conflicts
**Fecha:** 2026-09-06
**Proyecto:** MASTER — Intelligent Mastering Console

---

## 1. Auth Bypass Activo (DEBUG)

**Archivo:** `frontend/js/00-auth.js` (línea 302-308)

```javascript
// === AUTH DESACTIVADO PARA DEBUG ===
// Forzamos el usuario dev y ocultamos el overlay sin pedir credenciales.
const devUser = { id: 'dev', email: 'dev@local', name: 'Dev User', role: 'admin' };
saveSession('dev-bypass-token', devUser);
document.getElementById('auth-overlay')?.classList.add('hidden');
onAuthenticated(devUser);
return;
```

**Severidad:** 🔴 CRÍTICA — Este bypass DEBE removerse antes de producción.

**Acción requerida:** Comentar o eliminar este bloque en `00-auth.js:302-308`.

---

## 2. Falsos Positivos del Audit Script de Duplicados

El script `scripts/audit_duplicates.mjs` tenía errores de regex que producían falsos positivos:

### `window.LGMDM.X` detectado como `window.X`

| Falso positivo | Causa |
|----------------|-------|
| `window.api` | `window.LGMDM.api` — NO es un global directo |
| `window.dom` | `window.LGMDM.dom` — NO es un global directo |
| `window.state` | `window.LGMDM.state` — NO es un global directo |
| `window.renderAnalysisSingle` | `window.renderAnalysisSingle(data)` — es CALL, no asignación |
| `window.renderFFT` | `window.renderFFT([...])` — es CALL, no asignación |

**Fix aplicado:** Regex corregido con negative lookahead `window\.(?!LGMDM)` para filtrar `window.LGMDM.*`.

---

## 3. Shim Patterns — Globals Seguros

### `window.LGMDM.sliderIdToParam` — Asignación directa (NO es bug)

**Archivo:** `frontend/js/03-presets.js` (línea 106)

```javascript
window.LGMDM.sliderIdToParam = sliderIdToParam;
```

**Análisis:** Es asignación directa a `LGMDM`, no a `window` directamente. No es un bug — es el patrón correcto para namespacing.

---

### `window.applyMasteringState` — No-op shim seguro

**Archivo:** `frontend/js/00-auto-fixes.js` (línea 104-105)

```javascript
if (typeof window.applyMasteringState !== 'function') {
    window.applyMasteringState = function() {};
}
```

**Análisis:** Shim defensivo con `typeof` guard. Los callers también usan `typeof` antes de llamar. **Seguro.**

---

## 4. Duplicación de Función `API()` — FALSO POSITIVO

**Hallazgo inicial:** "API() definida dos veces en `00-bootstrap.js`"

**Investigación:** Solo existe UNA definición de `API()` en todo el proyecto:

```
frontend/js/00-bootstrap.js:14:const API = () => {
```

**Conclusión:** El summary de sesión estaba errado. No hay bug de duplicación de `API()`.

---

## 5. Shim Patterns — Revisados y Seguros

| Variable | Archivo | Pattern | ¿Bug? |
|----------|---------|---------|-------|
| `window.LGMDM` | `00-auth.js` | `\|\| {}` shim | ✅ Seguro |
| `window.LGMDM.dom` | `00-auto-fixes.js` | `\|\| {}` shim | ✅ Seguro |
| `window.LGMDM.api` | `00-auto-fixes.js` | `\|\| {}` shim | ✅ Seguro |
| `window.asyncApi` | `00-async-safety.js` | `\|\| {}` shim | ✅ Seguro |
| `window.PerformanceMonitoring` | `00-performance-monitoring.js` | Asignación directa (1 archivo) | ✅ Seguro |
| `window.safeSetInnerHTML` | `00-xss-protection.js` | Asignación directa (1 archivo) | ✅ Seguro |
| `window.XSSProtection` | `00-xss-protection.js` | Asignación directa (1 archivo) | ✅ Seguro |

---

## 6. Resize Handle JS — Anti-Reentry Fix

**Archivo:** `frontend/js/35-console-shell.js`

### Problema original
- Handles de 6px de ancho con gradiente transparente — prácticamente no clickeables.
- Sin protección anti-reentry (re-entrar durante drag causaba glitches).
- Sin `user-select: none` durante drag.

### Fix aplicado
```javascript
// Anti-reentry guard
if (dragging) return;

// En onDown:
dragging = true;
handle.classList.add('dragging');
document.body.style.userSelect = 'none';

// En onUp:
dragging = false;
handle.classList.remove('dragging');
document.body.style.removeProperty('user-select');
document.body.style.removeProperty('-webkit-user-select');
```

**Severidad del fix:** ✅ RESUELTO

---

## 7. CSS Resize Limits — Conflicto JS vs CSS

**Problema:** JS en `35-console-shell.js` hardcodea:
```javascript
setupHandle('cnsHandleLeft', shell, '--cns-left-w', 'x', 200, 420, false);
setupHandle('cnsHandleRight', shell, '--cns-right-w', 'x', 220, 420, true);
```

Pero `10-stage-visibility.css` declaraba:
```css
--cns-left-max: 260px;
--cns-right-max: 300px;
```

Como `stage-visibility` gana en el layer cascade, el resize se limitaba a 260px aunque el JS esperaba 420px.

**Fix:** Actualizado `10-stage-visibility.css` a 420px/420px.

**Severidad:** ✅ RESUELTO

---

## Resumen de Bugs JS

| Bug | Severidad | Estado |
|-----|-----------|--------|
| Auth bypass activo | 🔴 CRÍTICA | ⚠️ PENDIENTE (revertir para prod) |
| Falsos positivos audit script | 🟡 MEDIA | ✅ RESUELTO |
| Shim `window.applyMasteringState` | ✅ Seguro | N/A |
| Shim `window.LGMDM.*` | ✅ Seguro | N/A |
| `API()` duplicada | ❌ FALSO + | N/A |
| Handles no clickeables (6px) | 🔴 CRÍTICA | ✅ RESUELTO |
| Conflicto resize max 260px vs 420px | 🟡 MEDIA | ✅ RESUELTO |
