// Prépare les fichiers servis tels quels, pour que l'appli marche hors ligne :
// - public/hanzi/ : données de tracé (hanzi-writer-data) des caractères du contenu chinois ;
// - public/pyodide/ : interpréteur Python (Pyodide) du parcours Code.
import { readFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content', 'chinese');
const dataDir = join(root, 'node_modules', 'hanzi-writer-data');
const outDir = join(root, 'public', 'hanzi');
mkdirSync(outDir, { recursive: true });

const chars = new Set();
for (const file of readdirSync(contentDir).filter((f) => f.endsWith('.json'))) {
  const text = readFileSync(join(contentDir, file), 'utf8');
  for (const ch of text) if (/\p{Script=Han}/u.test(ch)) chars.add(ch);
}

let copied = 0;
const missing = [];
for (const ch of chars) {
  const src = join(dataDir, `${ch}.json`);
  if (existsSync(src)) {
    copyFileSync(src, join(outDir, `${ch}.json`));
    copied++;
  } else missing.push(ch);
}
console.log(`hanzi: ${copied} caractères copiés${missing.length ? `, absents : ${missing.join('')}` : ''}`);

const pyOut = join(root, 'public', 'pyodide');
mkdirSync(pyOut, { recursive: true });
const pySrc = join(root, 'node_modules', 'pyodide');
for (const f of ['pyodide.js', 'pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json']) {
  copyFileSync(join(pySrc, f), join(pyOut, f));
}
console.log('pyodide : interpréteur copié');
