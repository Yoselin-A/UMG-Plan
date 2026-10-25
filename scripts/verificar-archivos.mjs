import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(base, 'src');
const suffixes = ['', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.json', '.css', '.png', '.jpg', '.jpeg', '.svg', '/index.js', '/index.jsx', '/index.mjs'];
const errors = [];
let files = 0;
let resolved = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    if (!/\.(js|jsx|mjs|ts|tsx)$/.test(entry.name)) continue;
    files++;
    const contents = fs.readFileSync(full, 'utf8');
    // Incluye importacion estandar, side-effect imports y reexportaciones.
    const pattern = /\b(?:import|export)\s*(?:[\s\S]*?\s+from\s*)?['"](\.{1,2}\/[^'"\n]+)['"]/g;
    // Regex mas estable para la forma habitual usada por el proyecto.
    const matches = [...contents.matchAll(/\bfrom\s*['"](\.{1,2}\/[^'"\n]+)['"]|\bimport\s*['"](\.{1,2}\/[^'"\n]+)['"]/g)];
    for (const match of matches) {
      const spec = match[1] || match[2];
      const candidate = path.resolve(path.dirname(full), spec);
      if (!suffixes.some(ext => fs.existsSync(candidate + ext) && fs.statSync(candidate + ext).isFile())) {
        errors.push(`${path.relative(base, full)} => ${spec}`);
      } else { resolved++; }
    }
  }
}
walk(source);
const critical = [
  'src/pages/Maintenance.jsx',
  'src/components/AdvancedUI.jsx',
  'src/lib/repository.mjs',
  'src/lib/logoData.js',
  'src/pages/Availability.jsx',
  'src/context/AppContext.jsx',
  'src/App.jsx',
];
for (const relative of critical) {
  if (!fs.existsSync(path.join(base, relative))) errors.push(`Archivo obligatorio ausente: ${relative}`);
}
if (errors.length) {
  console.error('\nERROR: faltan archivos del proyecto:\n' + errors.map(x => ' - ' + x).join('\n'));
  console.error('\nExtrae todo el ZIP en una carpeta NUEVA y abre esa carpeta en VS Code.');
  process.exit(1);
}
console.log(`Archivos correctos: ${files} archivos JS/JSX/MJS, ${resolved} rutas locales comprobadas.`);
console.log('Los 7 archivos clave existen. Ahora puedes usar npm run dev.');
