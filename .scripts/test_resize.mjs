#!/usr/bin/env node
/**
 * Simula el DOM y el JS de la consola para detectar bugs en el resize
 * de los paneles laterales. Usa jsdom si está disponible; si no,
 * imprime un diagnóstico basado en el análisis estático.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const consoleShell = readFileSync('frontend/js/35-console-shell.js', 'utf8');

// Buscar un patrón que sepamos que rompe
const handleSetupCalls = (consoleShell.match(/setupHandle\([^)]+\)/g) || []);
console.log('=== setupHandle calls ===');
handleSetupCalls.forEach(call => console.log(' ', call));

// Verificar firma
const signatureMatch = consoleShell.match(/function setupHandle\(([^)]+)\)/);
console.log('\n=== setupHandle signature ===');
console.log('  ', signatureMatch?.[1]);

// Verificar que los listeners se agregan en document, no en handle
const docAddEvent = (consoleShell.match(/document\.addEventListener\('(\w+)'/g) || []);
console.log('\n=== document-level listeners added ===');
console.log(' ', docAddEvent.join('\n  '));

const docRemoveEvent = (consoleShell.match(/document\.removeEventListener\('(\w+)'/g) || []);
console.log('\n=== document-level listeners removed ===');
console.log(' ', docRemoveEvent.join('\n  '));

console.log('\n=== Diagnóstico ===');
if (JSON.stringify(docAddEvent.sort()) !== JSON.stringify(docRemoveEvent.sort())) {
  console.log('  ⚠️  Listeners desbalanceados (add vs remove)');
} else {
  console.log('  ✓ Listeners simétricos');
}