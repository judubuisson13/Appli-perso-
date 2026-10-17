// Construit un aperçu « une seule page » de l'appli (JS et CSS en ligne) dans artifact/,
// pour le publier comme page consultable sans installer quoi que ce soit.
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = 'dist-artifact';
execSync(`npx vite build --mode artifact --outDir ${out} --emptyOutDir`, { stdio: 'inherit' });
const html = readFileSync(join(out, 'index.html'), 'utf8');
const js = [...html.matchAll(/<script type="module"[^>]*src="\.?\/?([^"]+)"/g)].map((m) => m[1]);
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="\.?\/?([^"]+)"/g)].map((m) => m[1]);
const read = (f) => readFileSync(join(out, f), 'utf8');
const theme = html.match(/<script>[\s\S]*?<\/script>/)[0];

const page = `<title>Mon espace</title>
<style>${css.map(read).join('\n')}</style>
${theme}
<div id="root"></div>
<script type="module">${js.map(read).join('\n').replace(/<\/script/gi, '<\\/script')}</script>
`;
rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/index.html', page);
cpSync(join(out, 'hanzi'), 'artifact/hanzi', { recursive: true });
cpSync(join(out, 'icons'), 'artifact/icons', { recursive: true });
cpSync(join(out, 'pyodide'), 'artifact/pyodide', { recursive: true });
// Les .zip ne sont pas servis par l'hébergeur d'aperçu : même contenu, autre extension.
renameSync('artifact/pyodide/python_stdlib.zip', 'artifact/pyodide/python_stdlib.wasm');
console.log(`artifact/index.html : ${(page.length / 1024).toFixed(0)} Ko`);
