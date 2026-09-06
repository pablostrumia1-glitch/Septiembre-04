#!/usr/bin/env node
/**
 * Audit de variables CSS duplicadas.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_DIR = join(__dirname, '../frontend/css');

const varCounts = {};
const varFiles = {};
const varDefs = {}; // { varName: [{ file, value }] }

for (const file of readdirSync(CSS_DIR).filter(f => f.endsWith('.css'))) {
  const css = readFileSync(join(CSS_DIR, file), 'utf8');
  // Remove comments
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Find --var-name: value;
  const matches = [...clean.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g)];
  for (const m of matches) {
    const name = m[1];
    const value = m[2].trim();
    varCounts[name] = (varCounts[name] || 0) + 1;
    varFiles[name] = varFiles[name] || [];
    varFiles[name].push(file);
    varDefs[name] = varDefs[name] || [];
    varDefs[name].push({ file, value });
  }
}

console.log('=== VARIABLES CSS DEFINIDAS MÚLTIPLES VECES ===');
let found = 0;
for (const [name, count] of Object.entries(varCounts).sort((a, b) => b[1] - a[1])) {
  if (count < 2) continue;
  found++;
  console.log(`\n  ${name}  (${count}x)`);
  varDefs[name].forEach(({ file, value }) => {
    console.log(`    → ${file}: ${value.substring(0, 80)}`);
  });
}
if (found === 0) console.log('  (ninguna)');

console.log('\n\n=== VARIABLES CSS > 80 CARACTERES DE VALOR (posibles queries complejas) ===');
for (const [name, defs] of Object.entries(varDefs)) {
  const long = defs.filter(d => d.value.length > 80);
  if (long.length > 0) {
    console.log(`  ${name} (${long[0].value.length} chars)`);
    long.forEach(d => console.log(`    → ${d.file}: ${d.value.substring(0, 100)}...`));
  }
}

console.log('\n✓ Auditoría CSS completa');
