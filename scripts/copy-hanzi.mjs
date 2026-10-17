// Copie dans public/hanzi/ les données de tracé (hanzi-writer-data) des caractères
// utilisés par le contenu chinois, pour que le tracé marche hors ligne.
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
