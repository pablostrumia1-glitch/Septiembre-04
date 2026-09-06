#!/usr/bin/env node
/**
 * Audit de duplicados en el frontend:
 * 1. Funciones definidas múltiples veces
 * 2. Variables globales en window
 * 3. Constantes duplicadas
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JS_DIR = join(__dirname, '../frontend/js');

// ── 1. Funciones definidas múltiples veces ──────────────────────
function extractFunctions(code) {
  // function name(...) { ... }
  const fnDecl = [...code.matchAll(/^function\s+([a-zA-Z0-9_$]+)\s*\(/gm)]
    .map(m => m[1]);
  // const name = function(...) { ... }
  const fnExpr = [...code.matchAll(/^const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:function|\()/gm)]
    .map(m => m[1]);
  // const name = (...) => { ... }
  const arrow = [...code.matchAll(/^const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm)]
    .map(m => m[1]);
  // let name = function(...) { ... }
  const letExpr = [...code.matchAll(/^let\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?(?:function|\()/gm)]
    .map(m => m[1]);
  return [...fnDecl, ...fnExpr, ...arrow, ...letExpr];
}

const fnCounts = {};
const fnFiles = {};

for (const file of readdirSync(JS_DIR).filter(f => f.endsWith('.js'))) {
  const code = readFileSync(join(JS_DIR, file), 'utf8');
  // Solo cuerpos de función (evitar strings y comentarios)
  const body = code
    .replace(/```[\s\S]*?```/g, '')  // remove template literals
    .replace(/'[^']*'/g, "''")       // remove string literals
    .replace(/"[^"]*"/g, '""')
    .replace(/\/\/[^\n]*/g, '')      // remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments

  for (const fn of extractFunctions(body)) {
    fnCounts[fn] = (fnCounts[fn] || 0) + 1;
    fnFiles[fn] = fnFiles[fn] || [];
    fnFiles[fn].push(file);
  }
}

console.log('=== FUNCIONES DEFINIDAS MÚLTIPLES VECES ===');
let found = 0;
for (const [fn, count] of Object.entries(fnCounts).sort((a, b) => b[1] - a[1])) {
  if (count < 2) continue;
  found++;
  console.log(`  ${count}x  ${fn}()`);
  fnFiles[fn].forEach(f => console.log(`         → ${f}`));
}
if (found === 0) console.log('  (ninguna)');

// ── 2. Variables globales en window directo (NO LGMDM.namespaced) ──
// IMPORTANTE: window.LGMDM.foo NO es window.foo. Son namespaces distintos.
// Solo reportar asignaciones a window.X donde X no es LGMDM.
console.log('\n=== VARIABLES GLOBALES EN window DIRECTO (window.X, no window.LGMDM.X) ===');
// Patrón: window.NOMBRE donde NOMBRE no es "LGMDM"
const globalDirectPattern = /window\.(?!LGMDM)([a-zA-Z0-9_$]+)\s*=|window\['([^']+)'\]|=|\["([^"]+)"\]=/g;

const globals = {};
for (const file of readdirSync(JS_DIR).filter(f => f.endsWith('.js'))) {
  const code = readFileSync(join(JS_DIR, file), 'utf8');
  // Solo líneas que tienen window.X = donde X no es LGMDM
  const matches = code.matchAll(/window\.(?!LGMDM)([a-zA-Z0-9_$]+)\s*=/g);
  for (const m of matches) {
    const name = m[1];
    globals[name] = globals[name] || [];
    globals[name].push(file);
  }
}
if (Object.keys(globals).length === 0) {
  console.log('  (ninguna — todos los window.* están bajo window.LGMDM.namespaced)');
} else {
  for (const [name, files] of Object.entries(globals).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  window.${name}  ← ${[...new Set(files)].join(', ')}`);
  }
}

// ── 2b. LGMDM.namespaced duplicado (mismo sub-namespace en varios archivos) ──
console.log('\n=== window.LGMDM.* ASIGNADO EN MÚLTIPLES ARCHIVOS (shim pattern) ===');
const lgmdmPattern = /window\.LGMDM\.([a-zA-Z0-9_$]+)\s*=/g;
const lgmdmWrites = {};
for (const file of readdirSync(JS_DIR).filter(f => f.endsWith('.js'))) {
  const code = readFileSync(join(JS_DIR, file), 'utf8');
  for (const m of code.matchAll(lgmdmPattern)) {
    const name = m[1];
    lgmdmWrites[name] = lgmdmWrites[name] || [];
    lgmdmWrites[name].push(file);
  }
}
let lgmdupCount = 0;
for (const [name, files] of Object.entries(lgmdmWrites).sort((a, b) => a[0].localeCompare(b[0]))) {
  if (files.length < 2) continue;
  lgmdupCount++;
  console.log(`  LGMDM.${name}  ← ${[...new Set(files)].join(', ')}`);
  // Mostrar cómo está escrito (shim ||={} vs asignación directa)
  const sampleFile = files[0];
  const sampleCode = readFileSync(join(JS_DIR, sampleFile), 'utf8');
  const sampleLine = sampleCode.split('\n').find(l => l.includes(`window.LGMDM.${name}`));
  if (sampleLine) console.log(`    ej: ${sampleLine.trim().substring(0, 80)}`);
}
if (lgmdupCount === 0) console.log('  (ninguna)');
else console.log('\n  ℹ️  Los patrones ||={} son shims seguros (solo definen si no existen).');
console.log('     Las asignaciones directas sin || sobrescriben el valor previo.');

// ── 3. Constantes duplicadas (IIFEs con el mismo nombre) ──────────
console.log('\n=== IIFEs CON NOMBRES DUPLICADOS ===');
const iifeNames = {};
for (const file of readdirSync(JS_DIR).filter(f => f.endsWith('.js'))) {
  const code = readFileSync(join(JS_DIR, file), 'utf8');
  const names = [...code.matchAll(/\(function\s+([a-zA-Z0-9_$]+)/g)].map(m => m[1]);
  for (const n of names) {
    iifeNames[n] = iifeNames[n] || [];
    iifeNames[n].push(file);
  }
}
found = 0;
for (const [name, files] of Object.entries(iifeNames)) {
  if (files.length < 2) continue;
  found++;
  console.log(`  ${name}  ←  ${[...new Set(files)].join(', ')}`);
}
if (found === 0) console.log('  (ninguna)');

// ── 4. IDs duplicados en el HTML ─────────────────────────────────
console.log('\n=== IDs DUPLICADOS EN index.html ===');
const html = readFileSync(join(__dirname, '../frontend/index.html'), 'utf8');
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const idCounts = {};
for (const id of ids) idCounts[id] = (idCounts[id] || 0) + 1;
found = 0;
for (const [id, count] of Object.entries(idCounts).sort((a, b) => b[1] - a[1])) {
  if (count < 2) continue;
  found++;
  console.log(`  #${id}  (${count}x)`);
}
if (found === 0) console.log('  (ninguno)');

console.log('\n✓ Auditoría completa');
